import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';

/**
 * SSO integration stub.
 *
 * Designed for Microsoft Entra ID / Google Workspace federation.
 * The actual OIDC flow is implemented by pairing Identity Provider
 * (IdP) callbacks with this adapter. The refresh token rotation in the
 * Auth module is already configured to accept a compiled user.
 *
 * To enable:
 *   1. Register redirect URIs for the IdP.
 *   2. Implement the OIDC token exchange.
 *   3. Map provider claims → CreateUserDto payload.
 *   4. Upsert the user and link provider sid.
 */
@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async linkProvider(userId: string, provider: string, providerSid: string) {
    this.logger.log(`Linking ${provider} identity ${providerSid} to user ${userId}`);

    return this.prisma.ssoSession.create({
      data: {
        userId,
        provider,
        providerSid,
        lastSyncAt: new Date(),
      },
    });
  }

  async findProviderSid(userId: string, provider: string) {
    return this.prisma.ssoSession.findFirst({
      where: { userId, provider },
    });
  }

  async syncEntityDirectory() {
    throw new Error('SSO directory sync not configured');
  }
}
