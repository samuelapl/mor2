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
import { PrismaService } from '@config/prisma.service';
import { JwtPayload } from '@common/interfaces';
import { BCRYPT_ROUNDS } from '@config/constants';
import { passwordIssues } from '@common/utils';
import { MailService } from '@modules/mail/mail.service';
import { PermissionsService } from '@modules/permissions/permissions.service';
import { RegisterDto, LoginDto, RefreshTokenDto, ResetPasswordDto } from './dto';

const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

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
    private readonly mailService: MailService,
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

    // Public signups are created as PENDING and activated by a System Admin.
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
      select: { id: true, firstName: true, lastName: true, email: true, registrationStatus: true },
    });

    return {
      message: 'Registration submitted for approval',
      user,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.registrationStatus === 'PENDING') {
      throw new UnauthorizedException('Your registration is awaiting administrator approval');
    }

    if (user.registrationStatus === 'REJECTED') {
      throw new UnauthorizedException('Your registration was rejected. Contact an administrator');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
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
    const tokenHash = await bcrypt.hash(dto.refreshToken, 5);

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

    // Invalidate any still-pending codes before issuing a new one.
    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate a 6-digit code in the range [100000, 999999].
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS);

    await this.prisma.passwordReset.create({
      data: { userId: user.id, codeHash: hashToken(code), expiresAt },
    });

    try {
      await this.mailService.sendPasswordResetCode(user.email, code);
    } catch (err) {
      this.logger.error(`Failed to send password reset code to ${user.email}: ${err}`);
    }

    return { message: 'If that email exists, a code has been sent.' };
  }

  /**
   * Verifies the 6-digit code + sets the new password.
   * Uses constant-time comparison to resist timing attacks.
   * Locks out after PASSWORD_RESET_MAX_ATTEMPTS wrong guesses.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const normalized = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    // Use a generic message — do not reveal whether the email exists.
    const genericError = 'Invalid or expired code.';
    if (!user) throw new BadRequestException(genericError);

    // Find the most recent active (non-expired, non-used) reset record for this user.
    const reset = await this.prisma.passwordReset.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
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
    if (!safeEqualHex(hashToken(dto.code), reset.codeHash)) {
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

    const policyError = passwordIssues(dto.newPassword);
    if (policyError) throw new BadRequestException(policyError);

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    // Single transaction: mark reset used, update password, revoke all refresh tokens.
    await this.prisma.$transaction([
      this.prisma.passwordReset.updateMany({
        where: { userId: reset.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: reset.userId }, data: { password: hashedPassword } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully. You can now sign in.' };
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
    const tokenHash = await bcrypt.hash(refreshToken, 5);
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
