import { Injectable } from '@nestjs/common';
import { JoinableSession, JoinUrlProvider } from './video-provider';

/** Fallback for any other platform (Zoom, Google Meet, Teams, custom): the stored link as-is. */
@Injectable()
export class ExternalLinkProvider implements JoinUrlProvider {
  supports(): boolean {
    return true;
  }

  buildJoinUrl(_session: JoinableSession, externalUrl: string): string {
    return externalUrl;
  }
}
