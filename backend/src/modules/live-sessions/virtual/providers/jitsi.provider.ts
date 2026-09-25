import { Injectable } from '@nestjs/common';
import { JoinableSession, JoinParticipant, JoinUrlProvider } from './video-provider';

/** Jitsi Meet — injects the display name and suppresses the "Asking to join / Log in" screen. */
@Injectable()
export class JitsiProvider implements JoinUrlProvider {
  supports(_session: JoinableSession, externalUrl: string): boolean {
    return Boolean(externalUrl) && (externalUrl.includes('meet.jit.si') || externalUrl.includes('jitsi'));
  }

  buildJoinUrl(_session: JoinableSession, externalUrl: string, participant: JoinParticipant): string {
    const baseUrl = externalUrl.split('#')[0];
    // prejoinConfig.enabled=false disables the pre-join page; requireDisplayName=false
    // prevents the login prompt from blocking guest entry; enableWelcomePage=false prevents welcome page
    return `${baseUrl}#userInfo.displayName="${encodeURIComponent(participant.displayName)}"&config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false&config.requireDisplayName=false&config.enableWelcomePage=false&config.disableDeepLinking=true`;
  }
}
