import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  RawBodyRequest,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';
import { LiveSessionsService } from './live-sessions.service';
import { CreateSessionDto, UpdateSessionDto } from './dto';
import { CurrentUser, Permissions, Public } from '@common/decorators';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';
import { LiveKitProvider } from './providers/livekit.provider';
import { AttendanceService } from '@modules/attendance/attendance.service';

@ApiTags('live-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class LiveSessionsController {
  private readonly logger = new Logger(LiveSessionsController.name);

  constructor(
    private readonly liveSessionsService: LiveSessionsService,
    private readonly liveKitProvider: LiveKitProvider,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Get('live-sessions')
  @Public()
  @ApiOperation({ summary: 'List live sessions' })
  async findAll(@Query() query: PaginationQuery & { status?: SessionStatus; courseId?: string; trainerId?: string }) {
    return this.liveSessionsService.findAll(query);
  }

  @Get('live-sessions/upcoming/me')
  @Public()
  @ApiOperation({ summary: 'Upcoming sessions for my enrolled courses' })
  async upcoming(@CurrentUser() user: AuthenticatedUser | undefined, @Query() query: PaginationQuery) {
    return this.liveSessionsService.upcomingForUser(user?.id, query);
  }

  // ─── IMPORTANT: specific routes before :id wildcard ───────────────────────

  /**
   * LiveKit webhook receiver — called by the LiveKit server when events occur
   * (participant_joined, participant_left, room_finished).
   * Must be public and must receive the raw body for HMAC signature verification.
   */
  @Post('live-sessions/webhook')
  @Public()
  @ApiOperation({ summary: 'LiveKit server webhook endpoint (internal)' })
  async handleLiveKitWebhook(
    @Request() req: RawBodyRequest<any>,
    @Headers('authorization') authHeader: string,
  ) {
    const rawBody =
      req.rawBody ||
      (Buffer.isBuffer(req.body) ? req.body : typeof req.body === 'string' ? Buffer.from(req.body) : undefined);
    if (!rawBody) {
      this.logger.warn('LiveKit webhook received without raw body — ensure rawBody: true in main.ts');
      return { ok: false };
    }

    let event: any;
    try {
      event = await this.liveKitProvider.verifyWebhook(rawBody, authHeader);
    } catch (err) {
      this.logger.warn(`LiveKit webhook signature verification failed: ${(err as Error).message}`);
      return { ok: false };
    }

    const roomName: string = event.room?.name;
    const participantIdentity: string = event.participant?.identity;

    this.logger.log(`LiveKit event: ${event.event}, room=${roomName}, participant=${participantIdentity}`);

    try {
      if (event.event === 'participant_joined' && roomName && participantIdentity) {
        await this.attendanceService.handleParticipantJoined(roomName, participantIdentity);
      } else if (event.event === 'participant_left' && roomName && participantIdentity) {
        // LiveKit protobuf uses BigInt for timestamps (joinedAt and createdAt are in seconds)
        let durationSeconds = 0;
        if (event.participant?.duration) {
          durationSeconds = Number(event.participant.duration);
        } else if (event.participant?.joinedAt) {
          const joinedAtSec = Number(event.participant.joinedAt);
          const nowSec = event.createdAt ? Number(event.createdAt) : Math.floor(Date.now() / 1000);
          durationSeconds = Math.max(0, nowSec - joinedAtSec);
        }
        await this.attendanceService.handleParticipantLeft(roomName, participantIdentity, durationSeconds);
      } else if (event.event === 'room_finished' && roomName) {
        await this.attendanceService.handleRoomFinished(roomName);
      }
    } catch (err) {
      // Log but do not throw — LiveKit expects a 2xx response to avoid retries
      this.logger.error(`Error processing LiveKit event ${event.event}: ${(err as Error).message}`);
    }

    return { ok: true };
  }

  @Get('live-sessions/:id')
  @Public()
  @ApiOperation({ summary: 'Get live session details' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.liveSessionsService.findById(id);
  }

  @Get('live-sessions/:id/join-url')
  @Public()
  @ApiOperation({ summary: 'Get resolved join URL — no authentication required' })
  @ApiParam({ name: 'id', type: String })
  async getJoinUrl(@Param('id') id: string, @Request() req: any) {
    // User may be undefined if not authenticated — guests still get the join URL
    const user: AuthenticatedUser | undefined = req?.user;
    return this.liveSessionsService.getJoinUrl(id, user);
  }

  /**
   * Generate a signed LiveKit room access token for the authenticated user.
   * Returns 403 if the user is a learner not enrolled in the session's course.
   */
  @Get('live-sessions/:id/livekit-token')
  @ApiOperation({ summary: 'Get LiveKit access token for a session room' })
  @ApiParam({ name: 'id', type: String })
  async getLiveKitToken(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.liveSessionsService.getLiveKitToken(id, user);
  }

  @Post('courses/:courseId/live-sessions')
  @Permissions('live_session.manage_all', 'live_session.manage_own')
  @ApiOperation({ summary: 'Schedule a live session for a course' })
  @ApiParam({ name: 'courseId', type: String })
  async create(@Param('courseId') courseId: string, @Body() dto: CreateSessionDto) {
    return this.liveSessionsService.create(courseId, dto);
  }

  @Patch('live-sessions/:id')
  @Permissions('live_session.manage_all')
  @ApiOperation({ summary: 'Update or reschedule a live session' })
  @ApiParam({ name: 'id', type: String })
  async update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.liveSessionsService.update(id, dto);
  }

  @Patch('live-sessions/:id/status')
  @Permissions('live_session.manage_all', 'live_session.manage_own')
  @ApiOperation({ summary: 'Change session status (start, complete, cancel)' })
  @ApiParam({ name: 'id', type: String })
  async changeStatus(@Param('id') id: string, @Body('status') status: SessionStatus) {
    return this.liveSessionsService.changeStatus(id, status);
  }

  @Delete('live-sessions/:id')
  @Permissions('live_session.manage_all')
  @ApiOperation({ summary: 'Soft delete a live session' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string) {
    return this.liveSessionsService.softDelete(id);
  }
}
