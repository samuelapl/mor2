import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { JoinableSession, JoinParticipant, JoinUrlProvider } from './video-provider';

export interface BbbMeetingConfig {
  meetingId: string;
  meetingName: string;
  attendeePw?: string;
  moderatorPw?: string;
  welcomeMessage?: string;
  maxParticipants?: number;
}

export interface BbbJoinConfig {
  meetingId: string;
  fullName: string;
  isModerator: boolean;
  password?: string;
}

@Injectable()
export class BigBlueButtonProvider implements JoinUrlProvider {
  private readonly logger = new Logger(BigBlueButtonProvider.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor() {
    this.baseUrl = (process.env.BBB_URL || '').replace(/\/+$/, '');
    this.secret = process.env.BBB_SECRET || '';

    if (this.isConfigured()) {
      this.logger.log(`BigBlueButton provider initialized for URL: ${this.baseUrl}`);
    } else {
      this.logger.warn(
        'BigBlueButton provider is running in unconfigured/fallback mode. Set BBB_URL and BBB_SECRET in environment to activate.',
      );
    }
  }

  /**
   * Check whether BigBlueButton endpoint and shared secret are configured.
   */
  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.secret);
  }

  /**
   * Calculate SHA-1 checksum as required by the BigBlueButton API standard:
   * sha1(callName + queryString + secret)
   */
  private calculateChecksum(callName: string, queryString: string): string {
    return crypto
      .createHash('sha1')
      .update(callName + queryString + this.secret)
      .digest('hex');
  }

  /**
   * Build a signed BigBlueButton API URL for a specific call.
   */
  private buildSignedUrl(
    callName: string,
    params: Record<string, string | number | boolean | undefined>,
  ): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    const checksum = this.calculateChecksum(callName, queryString);
    const separator = queryString.length > 0 ? '&' : '';
    const apiEndpoint = this.baseUrl.endsWith('/api') ? this.baseUrl : `${this.baseUrl}/api`;

    return `${apiEndpoint}/${callName}?${queryString}${separator}checksum=${checksum}`;
  }

  /** BigBlueButton sessions are recognised by a `bbb-` meeting id or a BBB server link. */
  supports(session: JoinableSession, externalUrl: string): boolean {
    return Boolean(session.meetingId?.startsWith('bbb-')) || externalUrl.includes('/bigbluebutton/');
  }

  buildJoinUrl(session: JoinableSession, _externalUrl: string, participant: JoinParticipant): string {
    return this.generateJoinUrl({
      meetingId: session.meetingId || `bbb-${session.id}`,
      fullName: participant.displayName,
      isModerator: participant.isModerator,
      password: session.meetingPassword || undefined,
    });
  }

  /**
   * Generate an attendee or moderator join URL.
   */
  generateJoinUrl(config: BbbJoinConfig): string {
    const password = config.password || (config.isModerator ? 'mp' : 'ap');

    if (!this.isConfigured()) {
      // Fallback preview URL when BBB server credentials are not yet provisioned
      const role = config.isModerator ? 'moderator' : 'attendee';
      return `https://demo.bigbluebutton.org/gl/join?meetingId=${encodeURIComponent(config.meetingId)}&name=${encodeURIComponent(config.fullName)}&role=${role}`;
    }

    return this.buildSignedUrl('join', {
      meetingID: config.meetingId,
      fullName: config.fullName,
      password,
      redirect: 'true',
    });
  }

  /**
   * Generate a meeting creation URL (call standard create API).
   */
  generateCreateUrl(config: BbbMeetingConfig): string {
    const attendeePW = config.attendeePw || 'ap';
    const moderatorPW = config.moderatorPw || 'mp';

    if (!this.isConfigured()) {
      return '';
    }

    return this.buildSignedUrl('create', {
      meetingID: config.meetingId,
      name: config.meetingName,
      attendeePW,
      moderatorPW,
      welcome:
        config.welcomeMessage ||
        `Welcome to MoR Tele eLMS Live Training Session: ${config.meetingName}`,
      maxParticipants: config.maxParticipants || 100,
      record: true,
      autoStartRecording: false,
      allowStartStopRecording: true,
    });
  }
}
