import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@config/prisma.service';
import { JwtPayload, AuthenticatedUser } from '@common/interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload & { purpose?: string }): Promise<AuthenticatedUser> {
    // Purpose-scoped tokens (e.g. the first-login challenge) are never access tokens.
    if (payload.purpose) {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { courseOwnerships: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (user.registrationStatus === 'PENDING' || user.registrationStatus === 'REJECTED') {
      throw new UnauthorizedException('Account is not approved for access');
    }

    // Covers sessions that predate an admin password reset.
    if (user.mustChangePassword) {
      throw new UnauthorizedException('You must change your password before continuing');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: payload.roles,
      sid: payload.sid,
    };
  }
}
