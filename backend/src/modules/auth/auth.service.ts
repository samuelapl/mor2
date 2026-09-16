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
import { RegisterDto, LoginDto, RefreshTokenDto, ResetPasswordDto } from './dto';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 60 minutes

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
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

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
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

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Self-service "forgot password". Always succeeds (no user enumeration):
   * if the email exists a hashed, expiring reset token is stored and emailed.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.isActive) {
      // No user — respond identically to avoid email enumeration.
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
      },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const resetUrl = `${frontendUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await this.mailService.sendPasswordReset(user.email, resetUrl);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${err}`);
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = hashToken(dto.token);

    const reset = await this.prisma.passwordReset.findUnique({
      where: { tokenHash },
    });

    if (!reset || reset.usedAt) {
      throw new BadRequestException('Invalid or already-used reset token.');
    }

    if (reset.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired.');
    }

    const policyError = passwordIssues(dto.newPassword);
    if (policyError) {
      throw new BadRequestException(policyError);
    }

    const user = await this.prisma.user.findUnique({ where: { id: reset.userId } });
    if (!user) {
      throw new BadRequestException('Account no longer exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      // One-time use: mark this token and invalidate every other pending one.
      this.prisma.passwordReset.updateMany({
        where: { userId: reset.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: reset.userId }, data: { password: hashedPassword } }),
      // Force re-authentication everywhere after a password change.
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
