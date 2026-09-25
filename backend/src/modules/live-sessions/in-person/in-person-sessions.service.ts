import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';

/** Either the root client or an interactive-transaction client. */
type Db = PrismaService | Prisma.TransactionClient;

const ACTIVE_SESSION_STATUSES: SessionStatus[] = [SessionStatus.SCHEDULED, SessionStatus.LIVE];

/**
 * Rules that only apply to in-person (venue) sessions: room availability and seat booking.
 * Callers that write data should pass their transaction client so the check and the write
 * happen atomically — the row locks taken here only hold for the enclosing transaction.
 */
@Injectable()
export class InPersonSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getVenueOrFail(venueId: string, db: Db = this.prisma) {
    const venue = await db.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundException(`Venue ${venueId} not found`);
    }
    return venue;
  }

  /** First SCHEDULED/LIVE session in the venue whose time window overlaps the given one, if any. */
  async findVenueConflict(
    venueId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeSessionId?: string,
    db: Db = this.prisma,
  ) {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    // Only sessions starting before our end can overlap; the end-side check needs each row's duration.
    const candidates = await db.liveSession.findMany({
      where: {
        venueId,
        deletedAt: null,
        status: { in: ACTIVE_SESSION_STATUSES },
        scheduledAt: { lt: end },
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      },
      include: { course: { select: { titleEn: true, code: true } } },
    });

    return (
      candidates.find((s) => {
        const sEnd = new Date(s.scheduledAt.getTime() + s.durationMinutes * 60000);
        return start < sEnd;
      }) ?? null
    );
  }

  /**
   * Throws if the venue is missing, inactive, or already booked for an overlapping time.
   * Locks the venue row so concurrent schedulers can't both pass the check.
   */
  async assertVenueAvailable(
    venueId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeSessionId: string | undefined,
    db: Db,
  ) {
    await db.$queryRaw`SELECT id FROM venues WHERE id = ${venueId} FOR UPDATE`;
    const venue = await this.getVenueOrFail(venueId, db);
    if (!venue.isActive) {
      throw new BadRequestException(`Venue "${venue.name}" (${venue.branch}) is inactive and cannot be scheduled`);
    }

    const conflict = await this.findVenueConflict(venueId, scheduledAt, durationMinutes, excludeSessionId, db);
    if (conflict) {
      throw new ConflictException(
        `Venue "${venue.name}" (${venue.branch}) is already booked at that time by ` +
          `"${conflict.titleEn}"${conflict.course?.code ? ` (${conflict.course.code})` : ''}, ` +
          `starting ${conflict.scheduledAt.toISOString()} for ${conflict.durationMinutes} min.`,
      );
    }
    return venue;
  }

  /** Active enrollments holding a seat in the session — the one seat count used everywhere. */
  countBookedSeats(sessionId: string, db: Db = this.prisma) {
    return db.enrollment.count({
      where: { sessionId, status: EnrollmentStatus.ACTIVE },
    });
  }

  /**
   * Validates an in-person session booking and checks there is a free seat.
   * Must run inside the transaction that writes the enrollment: the session row is locked
   * so two learners can't both take the last seat.
   */
  async reserveSeat(tx: Prisma.TransactionClient, sessionId: string, courseId: string) {
    await tx.$queryRaw`SELECT id FROM live_sessions WHERE id = ${sessionId} FOR UPDATE`;

    const session = await tx.liveSession.findUnique({
      where: { id: sessionId },
      include: { venue: true },
    });
    if (!session || session.deletedAt) {
      throw new NotFoundException('Selected in-person session not found');
    }
    if (session.courseId !== courseId) {
      throw new BadRequestException('Selected session does not belong to this course');
    }
    if (!ACTIVE_SESSION_STATUSES.includes(session.status)) {
      throw new BadRequestException('Selected session is no longer open for booking');
    }
    const venue = session.venue;
    if (!venue) {
      throw new BadRequestException('Selected session does not have a physical venue assigned');
    }

    const booked = await this.countBookedSeats(sessionId, tx);
    if (booked >= venue.capacity) {
      throw new BadRequestException(
        `Classroom full! Venue "${venue.name}" (${venue.branch}) has reached its maximum seat capacity (${venue.capacity} seats). Please select another session or venue.`,
      );
    }

    return { sessionId: session.id, venueId: venue.id };
  }
}
