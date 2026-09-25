import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { CreateVenueDto, UpdateVenueDto } from './dto';
import { InPersonSessionsService } from '@modules/live-sessions/in-person/in-person-sessions.service';

@Injectable()
export class VenuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inPersonSessions: InPersonSessionsService,
  ) {}

  async findAll(query?: { branch?: string; search?: string; isActive?: boolean }) {
    const where: any = {};

    if (query?.branch) {
      where.branch = { contains: query.branch, mode: 'insensitive' };
    }

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { branch: { contains: query.search, mode: 'insensitive' } },
        { building: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const venues = await this.prisma.venue.findMany({
      where,
      orderBy: [{ branch: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            sessions: true,
            trainers: true,
            enrollments: true,
          },
        },
      },
    });

    return venues;
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        trainers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        sessions: {
          where: {
            status: { in: ['SCHEDULED', 'LIVE'] },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 10,
          include: {
            course: {
              select: {
                id: true,
                titleEn: true,
                code: true,
              },
            },
            trainer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            sessions: true,
          },
        },
      },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID "${id}" not found.`);
    }

    return venue;
  }

  async create(dto: CreateVenueDto) {
    return this.prisma.venue.create({
      data: {
        name: dto.name.trim(),
        building: dto.building?.trim() || null,
        branch: dto.branch.trim(),
        capacity: dto.capacity,
        facilities: dto.facilities || [],
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async update(id: string, dto: UpdateVenueDto) {
    await this.findOne(id);

    return this.prisma.venue.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        building: dto.building !== undefined ? dto.building?.trim() || null : undefined,
        branch: dto.branch !== undefined ? dto.branch.trim() : undefined,
        capacity: dto.capacity !== undefined ? dto.capacity : undefined,
        facilities: dto.facilities !== undefined ? dto.facilities : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if there are active sessions scheduled
    const activeSessions = await this.prisma.liveSession.count({
      where: {
        venueId: id,
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
    });

    if (activeSessions > 0) {
      throw new BadRequestException(
        `Cannot delete venue because it has ${activeSessions} active scheduled session(s). Deactivate it instead.`,
      );
    }

    return this.prisma.venue.delete({
      where: { id },
    });
  }

  /**
   * Check if a venue is available (no conflicting live or scheduled sessions)
   * for a given start time and duration.
   */
  async checkAvailability(
    venueId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeSessionId?: string,
  ) {
    const venue = await this.findOne(venueId);

    // Same overlap rule the server enforces when a session is scheduled.
    const conflictingSession = await this.inPersonSessions.findVenueConflict(
      venueId,
      scheduledAt,
      durationMinutes,
      excludeSessionId,
    );

    return {
      available: !conflictingSession,
      venue,
      conflictingSession: conflictingSession || null,
    };
  }
}

