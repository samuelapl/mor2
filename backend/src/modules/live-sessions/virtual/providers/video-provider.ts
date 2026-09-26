/** The session fields a video platform needs to build a join link. */
export interface JoinableSession {
  id: string;
  meetingId: string | null;
  meetingPassword: string | null;
  platform: string;
}

export interface JoinParticipant {
  displayName: string;
  isModerator: boolean;
}

/**
 * A video platform reached through a browser join URL. Providers are checked in order and the
 * first one that `supports` the session builds the link, so adding a platform means adding a
 * provider class, not editing the session service.
 *
 * `externalUrl` is the session's link already normalised to include a protocol ('' when unset).
 */
export interface JoinUrlProvider {
  supports(session: JoinableSession, externalUrl: string): boolean;
  buildJoinUrl(session: JoinableSession, externalUrl: string, participant: JoinParticipant): string;
}
