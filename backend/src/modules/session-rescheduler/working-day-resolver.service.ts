import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { appDateKey, appDayOfWeek, nextAppDay } from '@common/utils';

@Injectable()
export class WorkingDayResolverService {
  private readonly logger = new Logger(WorkingDayResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates candidateDate and advances day-by-day if it hits Sunday or an active registered Public Holiday.
   * In Ethiopia, Monday through Saturday are valid working/training days; only Sunday is skipped.
   * Days are read in the app time zone (EAT), whatever the server's own zone, and the start time
   * of day stays the same.
   */
  async resolveNextValidWorkingDay(candidateDate: Date): Promise<Date> {
    let resolved = new Date(candidateDate.getTime());
    const maxLookaheadDays = 60; // Safety guard to prevent infinite loops

    for (let attempts = 0; attempts < maxLookaheadDays; attempts++) {
      const isSunday = appDayOfWeek(resolved) === 0;
      const isHoliday = await this.isPublicHoliday(resolved);
      if (!isSunday && !isHoliday) return resolved;

      const reason = isSunday ? 'Sunday' : 'Public Holiday';
      this.logger.log(
        `Candidate date ${appDateKey(resolved)} is a ${reason}. Advancing +1 calendar day.`,
      );
      resolved = nextAppDay(resolved);
    }

    this.logger.warn(`Max lookahead reached for candidate date. Falling back to candidate.`);
    return candidateDate;
  }

  /**
   * Checks if a date matches an active registered Ethiopian Public Holiday in the database.
   */
  async isPublicHoliday(date: Date): Promise<boolean> {
    try {
      // Holidays are calendar dates (stored at UTC midnight); compare the app-time-zone date.
      const dateString = appDateKey(date);

      const count = await this.prisma.publicHoliday.count({
        where: {
          holidayDate: new Date(dateString),
          isActive: true,
        },
      });

      return count > 0;
    } catch (err) {
      this.logger.error(`Error querying public holidays: ${(err as Error).message}`);
      return false;
    }
  }
}
