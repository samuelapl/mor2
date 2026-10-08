import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { PasswordResetPurpose, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { JwtPayload } from '@common/interfaces';
import { BCRYPT_ROUNDS } from '@config/constants';
import { passwordIssues } from '@common/utils';
import { EmailQueue } from '@modules/mail/email.queue';
import { toEmailLocale } from '@modules/mail/email.types';
import { PermissionsService } from '@modules/permissions/permissions.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  VerifyResetCodeDto,
  FirstLoginVerifyCodeDto,
  FirstLoginCompleteDto,
  VerifyEmailDto,
} from './dto';

const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

const FIRST_LOGIN_PURPOSE = 'first_login';
const FIRST_LOGIN_CHALLENGE_TTL = '15m';
/** Minimum gap between two emailed codes of the same purpose for one user. */
const CODE_RESEND_COOLDOWN_MS = 60 * 1000;

type UserWithRoles = Prisma.UserGetPayload<{ include: { roles: true } }>;

interface FirstLoginChallengePayload {
  sub: string;
  purpose: typeof FIRST_LOGIN_PURPOSE;
}

/** "abebe.kebede@mor.gov.et" -> "ab•••@mor.gov.et" — enough for the user to recognise. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, Math.min(2, local.length))}•••@${domain}`;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison of two hex strings to prevent timing attacks.
 * Returns true only if both strings are equal in length AND content.
 */
function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailQueue: EmailQueue,
    private readonly permissionsService: PermissionsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const policyError = passwordIssues(dto.password);
    if (policyError) {
      throw new BadRequestException(policyError);
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Public signups stay PENDING until the user verifies their email with the emailed code.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        tin: dto.tin?.trim() || null,
        locale: dto.locale || 'en',
        registrationStatus: 'PENDING',
        roles: {
          create: {
            role: 'LEARNER',
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        locale: true,
        registrationStatus: true,
      },
    });

    const code = await this.sendVerificationCode(user);
    const { locale: _locale, ...publicUser } = user;

    return {
      message: 'Registration received. Enter the code we emailed you to verify your email.',
      emailVerificationRequired: true as const,
      email: maskEmail(user.email),
      user: publicUser,
      devCode: this.devCode(code),
    };
  }

  /**
   * Checks the emailed verification code, activates the account and signs the user in.
   * Accounts rejected under the retired admin-approval flow stay blocked.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    // Same exact-match lookup as register and login, which store and find the email as typed.
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Generic message — do not reveal whether the email exists.
    if (!user || user.registrationStatus !== 'PENDING') {
      throw new BadRequestException('Invalid or expired code.');
    }
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    await this.consumeCode(user.id, PasswordResetPurpose.EMAIL_VERIFY, dto.code);

    const [, verified] = await this.prisma.$transaction([
      this.prisma.passwordReset.updateMany({
        where: { userId: user.id, purpose: PasswordResetPurpose.EMAIL_VERIFY, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date(), registrationStatus: 'APPROVED' },
        include: { roles: true },
      }),
    ]);

    return this.createSession(verified);
  }

  /**
   * Emails a new verification code. Always returns the same message (anti-enumeration);
   * within the resend cooldown no new code is sent.
   */
  async resendVerification(email: string) {
    const generic = 'If that account still needs verification, a new code has been sent.';
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.registrationStatus !== 'PENDING' || !user.isActive) {
      return { message: generic };
    }
    if ((await this.codeCooldownMs(user.id, PasswordResetPurpose.EMAIL_VERIFY)) > 0) {
      return { message: generic };
    }

    const code = await this.sendVerificationCode(user);
    return { message: generic, devCode: this.devCode(code) };
  }

  private async sendVerificationCode(user: {
    id: string;
    email: string;
    locale: string;
  }): Promise<string> {
    const code = await this.issueCode(user.id, PasswordResetPurpose.EMAIL_VERIFY);
    await this.emailQueue.emailVerificationCode(user.email, code, toEmailLocale(user.locale));
    return code;
  }

  /** Milliseconds until a new `purpose` code may be sent (0 = now). */
  private async codeCooldownMs(userId: string, purpose: PasswordResetPurpose): Promise<number> {
    const latest = await this.prisma.passwordReset.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
    });
    return latest
      ? Math.max(0, latest.createdAt.getTime() + CODE_RESEND_COOLDOWN_MS - Date.now())
      : 0;
  }

  /** In development without SMTP, codes are returned in the response so flows stay testable. */
  private devCode(code: string): string | undefined {
    const isDev =
      this.configService.get<string>('NODE_ENV') === 'development' ||
      this.configService.get<string>('APP_ENV') === 'development';
    return isDev && !this.emailQueue.isDeliveryConfigured ? code : undefined;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: true },
    });

    // Check the password before anything account-specific, so a wrong password never
    // reveals whether the account exists or what state it is in.
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.registrationStatus === 'REJECTED') {
      throw new UnauthorizedException('Your registration was rejected. Contact an administrator');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.registrationStatus === 'PENDING') {
      return this.startEmailVerification(user);
    }

    if (user.mustChangePassword) {
      return this.startFirstLogin(user);
    }

    return this.createSession(user);
  }

  private async createSession(user: UserWithRoles) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const { accessToken, refreshToken, sid } = await this.generateTokens(user);

    await this.storeRefreshToken(user.id, refreshToken, sid);

    const permissions = await this.permissionsService.effectivePermissions(
      user.roles.map((r) => r.role),
    );

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      permissions,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = hashToken(dto.refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      include: { roles: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.registrationStatus === 'PENDING' || user.registrationStatus === 'REJECTED') {
      throw new UnauthorizedException('Account is not approved for access');
    }

    if (user.mustChangePassword) {
      throw new UnauthorizedException('You must change your password before continuing');
    }

    // Revoke the old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken, tokens.sid);

    const permissions = await this.permissionsService.effectivePermissions(
      user.roles.map((r) => r.role),
    );

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      permissions,
    };
  }

  /**
   * Self-service "forgot password".
   * Always returns the same message regardless of whether the email exists (anti-enumeration).
   * Generates a 6-digit numeric code, stores its SHA-256 hash, and emails the plaintext code.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });

    if (!user || !user.isActive) {
      return { message: 'If that email exists, a code has been sent.' };
    }

    const code = await this.issueCode(user.id, PasswordResetPurpose.RESET);

    await this.emailQueue.passwordResetCode(user.email, code, toEmailLocale(user.locale));

    return { message: 'If that email exists, a code has been sent.' };
  }

  /**
   * Step one of the reset: checks the code without using it up, so the UI can move on to
   * the new-password step. `resetPassword` checks it again before changing anything.
   */
  async verifyResetCode(dto: VerifyResetCodeDto): Promise<{ message: string }> {
    const normalized = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) throw new BadRequestException('Invalid or expired code.');

    await this.consumeCode(user.id, PasswordResetPurpose.RESET, dto.code);
    return { message: 'Code verified.' };
  }

  /**
   * Verifies the 6-digit code + sets the new password.
   * Also clears `mustChangePassword`: the user proved email ownership and chose their own
   * password, which is exactly what the first-login step asks for.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const normalized = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    // Use a generic message — do not reveal whether the email exists.
    if (!user) throw new BadRequestException('Invalid or expired code.');

    await this.consumeCode(user.id, PasswordResetPurpose.RESET, dto.code);

    const policyError = passwordIssues(dto.newPassword);
    if (policyError) throw new BadRequestException(policyError);

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    // Single transaction: mark reset used, update password, revoke all refresh tokens.
    await this.prisma.$transaction([
      this.prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        // The reset code was emailed, so this also proves the address — and activates an
        // account that never finished email verification.
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          ...(user.registrationStatus === 'PENDING' ? { registrationStatus: 'APPROVED' } : {}),
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.emailQueue.passwordChanged(user.email, toEmailLocale(user.locale));

    return { message: 'Password reset successfully. You can now sign in.' };
  }

  /**
   * Called from `login` once the (admin-chosen) password checked out: emails a FIRST_LOGIN
   * code and returns a short-lived challenge token instead of a session. The token proves
   * the caller knew the temporary password; the code proves they own the email.
   */
  private async startFirstLogin(user: UserWithRoles) {
    const code = await this.sendFirstLoginCode(user);

    const payload: FirstLoginChallengePayload = { sub: user.id, purpose: FIRST_LOGIN_PURPOSE };
    const challengeToken = await this.jwtService.signAsync(payload, {
      secret: this.firstLoginSecret(),
      expiresIn: FIRST_LOGIN_CHALLENGE_TTL,
    });

    return {
      passwordChangeRequired: true as const,
      challengeToken,
      email: maskEmail(user.email),
      devCode: this.devCode(code),
    };
  }

  /**
   * Called from `login` for an unverified self-registered account with the right password:
   * emails a code (unless one was sent within the cooldown) instead of issuing a session.
   */
  private async startEmailVerification(user: UserWithRoles) {
    const code =
      (await this.codeCooldownMs(user.id, PasswordResetPurpose.EMAIL_VERIFY)) > 0
        ? undefined
        : await this.sendVerificationCode(user);

    return {
      emailVerificationRequired: true as const,
      email: maskEmail(user.email),
      devCode: code ? this.devCode(code) : undefined,
    };
  }

  async resendFirstLoginCode(challengeToken: string) {
    const user = await this.verifyFirstLoginChallenge(challengeToken);

    const waitMs = await this.codeCooldownMs(user.id, PasswordResetPurpose.FIRST_LOGIN);
    if (waitMs > 0) {
      throw new BadRequestException(
        `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting a new code.`,
      );
    }

    const code = await this.sendFirstLoginCode(user);

    return {
      message: 'A new code has been sent.',
      email: maskEmail(user.email),
      devCode: this.devCode(code),
    };
  }

  /** Step one of the first-login change: checks the code without using it up. */
  async verifyFirstLoginCode(dto: FirstLoginVerifyCodeDto): Promise<{ message: string }> {
    const user = await this.verifyFirstLoginChallenge(dto.challengeToken);
    await this.consumeCode(user.id, PasswordResetPurpose.FIRST_LOGIN, dto.code);
    return { message: 'Code verified.' };
  }

  /**
   * Finishes the forced first-login change and signs the user in. The new password must
   * pass the policy and differ from the admin-chosen one.
   */
  async completeFirstLogin(dto: FirstLoginCompleteDto) {
    const user = await this.verifyFirstLoginChallenge(dto.challengeToken);

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Confirm password must match the new password.');
    }

    await this.consumeCode(user.id, PasswordResetPurpose.FIRST_LOGIN, dto.code);

    const policyError = passwordIssues(dto.newPassword);
    if (policyError) throw new BadRequestException(policyError);

    if (await bcrypt.compare(dto.newPassword, user.password)) {
      throw new BadRequestException('Choose a new password different from the temporary one.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    const [, updated] = await this.prisma.$transaction([
      this.prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        // The first-login code was emailed, so finishing this step proves the address.
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
        include: { roles: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return this.createSession(updated);
  }

  private firstLoginSecret(): string {
    // Distinct from the access-token secret so a challenge token can never pass JwtStrategy.
    return `${this.configService.get<string>('JWT_ACCESS_SECRET')}:${FIRST_LOGIN_PURPOSE}`;
  }

  private async verifyFirstLoginChallenge(token: string): Promise<UserWithRoles> {
    const expired = new UnauthorizedException(
      'Your password-change session has expired. Please sign in again.',
    );

    let payload: FirstLoginChallengePayload;
    try {
      payload = await this.jwtService.verifyAsync<FirstLoginChallengePayload>(token, {
        secret: this.firstLoginSecret(),
      });
    } catch {
      throw expired;
    }
    if (payload.purpose !== FIRST_LOGIN_PURPOSE) throw expired;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true },
    });
    // Also rejects a token replayed after the change is done (flag already cleared).
    if (
      !user ||
      !user.isActive ||
      user.registrationStatus !== 'APPROVED' ||
      !user.mustChangePassword
    ) {
      throw expired;
    }
    return user;
  }

  private async sendFirstLoginCode(user: {
    id: string;
    email: string;
    locale: string;
  }): Promise<string> {
    const code = await this.issueCode(user.id, PasswordResetPurpose.FIRST_LOGIN);
    await this.emailQueue.firstLoginCode(user.email, code, toEmailLocale(user.locale));
    return code;
  }

  /**
   * Generates a 6-digit code for `purpose`, invalidating that purpose's pending codes,
   * and stores only its SHA-256 hash. Returns the plaintext for emailing.
   */
  private async issueCode(userId: string, purpose: PasswordResetPurpose): Promise<string> {
    await this.prisma.passwordReset.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate a 6-digit code in the range [100000, 999999].
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS);

    await this.prisma.passwordReset.create({
      data: { userId, purpose, codeHash: hashToken(code), expiresAt },
    });

    return code;
  }

  /**
   * Checks `code` against the user's latest active code for `purpose`. Uses constant-time
   * comparison and locks the code after PASSWORD_RESET_MAX_ATTEMPTS wrong guesses.
   * Throws on failure; the caller marks the code used once its own update succeeds.
   */
  private async consumeCode(userId: string, purpose: PasswordResetPurpose, code: string) {
    const genericError = 'Invalid or expired code.';

    const reset = await this.prisma.passwordReset.findFirst({
      where: { userId, purpose, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset) throw new BadRequestException(genericError);

    // Brute-force guard — too many attempts, invalidate the code immediately.
    if (reset.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      await this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      });
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    // Constant-time comparison: hash the submitted code and compare to stored hash.
    if (!safeEqualHex(hashToken(code), reset.codeHash)) {
      const nextAttempts = reset.attempts + 1;
      await this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: {
          attempts: nextAttempts,
          // Auto-lock once the attempt ceiling is hit.
          ...(nextAttempts >= PASSWORD_RESET_MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
        },
      });
      throw new BadRequestException(genericError);
    }
  }

  async logout(userId: string, sid?: string) {
    if (sid) {
      // Logout from specific session
      await this.prisma.refreshToken.updateMany({
        where: { userId, sid },
        data: { revokedAt: new Date() },
      });
    } else {
      // Logout from all sessions
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    roles?: Array<{ role: string }>;
  }) {
    const sid = uuid();
    const roles = (user.roles ?? []).map((r) => r.role);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
      sid,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return { accessToken, refreshToken, sid };
  }

  private async storeRefreshToken(userId: string, refreshToken: string, sid: string) {
    const tokenHash = hashToken(refreshToken);
    const expiresDays = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d').replace(/\D/g, ''),
      10,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        sid,
        expiresAt: new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000),
      },
    });
  }

  private sanitizeUser(user: any) {
    const { password: _password, ...rest } = user;
    return rest;
  }
}
