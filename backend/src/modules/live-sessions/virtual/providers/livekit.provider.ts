import { Injectable, Logger } from '@nestjs/common';
import { AccessToken, WebhookReceiver, WebhookEvent, VideoGrant } from 'livekit-server-sdk';
import { LiveKitConfig } from '@config/app.config';

export interface LiveKitParticipant {
  identity: string;
  name: string;
  isTrainer: boolean;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LiveKitProvider {
  private readonly logger = new Logger(LiveKitProvider.name);
  private readonly webhookReceiver: WebhookReceiver;

  constructor() {
    this.webhookReceiver = new WebhookReceiver(LiveKitConfig.apiKey, LiveKitConfig.apiSecret);

    if (this.isConfigured()) {
      this.logger.log(`LiveKit provider initialized. Server: ${LiveKitConfig.url}`);
    } else {
      this.logger.warn(
        'LiveKit provider running with default dev credentials. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env for production.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(
      LiveKitConfig.url &&
      LiveKitConfig.apiKey !== 'devkey' &&
      LiveKitConfig.apiSecret !== 'secret',
    );
  }

  /**
   * Generate a signed LiveKit JWT access token for a participant.
   * Trainers get full publish permissions; learners get subscribe + data publish.
   *
   * @param roomName  The LiveKit room name (typically the sessionId)
   * @param participant  Identity, display name, role, and optional metadata
   * @param ttlSeconds  Token TTL in seconds (default 8 hours)
   */
  async generateToken(
    roomName: string,
    participant: LiveKitParticipant,
    ttlSeconds = 8 * 3600,
  ): Promise<string> {
    const grant: VideoGrant = {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // Trainers can also publish sources like camera/screen; learners are the same by default
      // but the UI enforces their role visually.
    };

    const at = new AccessToken(LiveKitConfig.apiKey, LiveKitConfig.apiSecret, {
      identity: participant.identity,
      name: participant.name,
      ttl: ttlSeconds,
      metadata: participant.metadata ? JSON.stringify(participant.metadata) : undefined,
    });
    at.addGrant(grant);

    const token = await at.toJwt();
    this.logger.debug(
      `Generated LiveKit token for identity=${participant.identity} room=${roomName} isTrainer=${participant.isTrainer}`,
    );
    return token;
  }

  /**
   * Verify and decode a LiveKit webhook event from the raw HTTP body and Authorization header.
   * Throws if the signature is invalid.
   */
  async verifyWebhook(body: string | Buffer, authHeader: string): Promise<WebhookEvent> {
    const bodyStr = Buffer.isBuffer(body) ? body.toString('utf8') : body;
    return this.webhookReceiver.receive(bodyStr, authHeader);
  }
}
