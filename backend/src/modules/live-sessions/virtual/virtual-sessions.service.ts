import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LiveSession, SessionStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { LiveKitConfig } from '@config/app.config';
import { AuthenticatedUser } from '@common/interfaces';
import { BigBlueButtonProvider } from './providers/bigbluebutton.provider';
import { ExternalLinkProvider } from './providers/external-link.provider';
import { JitsiProvider } from './providers/jitsi.provider';
import { LiveKitProvider } from './providers/livekit.provider';
import { JoinUrlProvider } from './providers/video-provider';
import { isInPersonSession } from '../session-mode';

const STAFF_ROLES = ['TRAINER', 'COURSE_OWNER', 'TRAINING_ADMIN', 'SYSTEM_ADMIN'];

/** In-person sessions happen in a room, not a video call — they use classroom check-in instead. */
function assertVirtual(session: LiveSession) {
  if (isInPersonSession(session)) {
    throw new BadRequestException(
      'This is an in-person classroom session and has no video room. Use classroom check-in instead.',
    );
  }
}

/** Online-only behaviour: resolving video join links and issuing LiveKit room tokens. */
@Injectable()
export class VirtualSessionsService {
  private readonly logger = new Logger(VirtualSessionsService.name);
  /** Checked in order — the first provider that supports the session builds its join link. */
  private readonly joinUrlProviders: JoinUrlProvider[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly liveKitProvider: LiveKitProvider,
    bbbProvider: BigBlueButtonProvider,
    jitsiProvider: JitsiProvider,
    externalLinkProvider: ExternalLinkProvider,
  ) {
    this.joinUrlProviders = [bbbProvider, jitsiProvider, externalLinkProvider];
  }

  getJoinUrl(session: LiveSession, user?: AuthenticatedUser) {
    assertVirtual(session);
    const displayName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'Guest';
    const isModerator = user ? (user.roles?.some((r) => STAFF_ROLES.includes(r)) ?? false) : false;

    let externalUrl = session.externalUrl?.trim() || '';
    if (externalUrl && !externalUrl.startsWith('http://') && !externalUrl.startsWith('https://')) {
      externalUrl = `https://${externalUrl}`;
    }

    const provider = this.joinUrlProviders.find((p) => p.supports(session, externalUrl))!;
    const joinUrl = provider.buildJoinUrl(session, externalUrl, { displayName, isModerator });
    return { joinUrl, platform: session.platform };
  }

  /**
   * Generate a LiveKit access token for a participant joining a LIVEKIT-platform session.
   * Verifies that the session is active, and that learners are enrolled.
   */
  async getLiveKitToken(
    session: LiveSession,
    user: AuthenticatedUser,
  ): Promise<{ token: string; wsUrl: string; roomName: string }> {
    assertVirtual(session);
    const sessionId = session.id;
    const isStaff = user.roles?.some((r) => STAFF_ROLES.includes(r)) ?? false;
    const isSessionTrainer = session.trainerId === user.id;
    const isAuthorizedStaff = isStaff || isSessionTrainer;

    if (session.status !== SessionStatus.SCHEDULED && session.status !== SessionStatus.LIVE) {
      if (isAuthorizedStaff) {
        await this.prisma.liveSession.update({
          where: { id: sessionId },
          data: { status: SessionStatus.LIVE, actualEndedAt: null },
        });
      } else {
        throw new BadRequestException('Session is not scheduled or live');
      }
    } else if (session.status === SessionStatus.SCHEDULED && isAuthorizedStaff) {
      await this.prisma.liveSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.LIVE, actualStartedAt: new Date() },
      });
    }

    // Learners must be actively enrolled in the course.
    // If not yet enrolled for an active/scheduled session, auto-enroll them so they can participate seamlessly!
    if (!isAuthorizedStaff) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: session.courseId } },
      });
      if (!enrollment || enrollment.status !== 'ACTIVE') {
        try {
          await this.prisma.enrollment.upsert({
            where: { userId_courseId: { userId: user.id, courseId: session.courseId } },
            update: {
              status: 'ACTIVE',
              droppedAt: null,
              droppedReason: null,
              droppedBy: null,
            },
            create: {
              userId: user.id,
              courseId: session.courseId,
              status: 'ACTIVE',
            },
          });
          this.logger.log(
            `Auto-enrolled learner ${user.id} into course ${session.courseId} on session ${sessionId} join`,
          );
        } catch (enrollErr) {
          this.logger.warn(
            `Could not auto-enroll learner ${user.id} in course ${session.courseId}:`,
            enrollErr,
          );
        }
      }
    }

    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const roomName = session.id;

    const token = await this.liveKitProvider.generateToken(roomName, {
      identity: user.id,
      name: displayName,
      isTrainer: isAuthorizedStaff,
      metadata: { role: isAuthorizedStaff ? 'trainer' : 'learner', sessionId },
    });

    return { token, wsUrl: LiveKitConfig.url, roomName };
  }
}
