import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';

@Injectable()
export class WorkingDayResolverService {
  private readonly logger = new Logger(WorkingDayResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates candidateDate and advances day-by-day if it hits Sunday or an active registered Public Holiday.
   * In Ethiopia, Monday through Saturday are valid working/training days; only Sunday is skipped.
   * Preserves the exact hours, minutes, and seconds of candidateDate.
   */
  async resolveNextValidWorkingDay(candidateDate: Date): Promise<Date> {
    const resolved = new Date(candidateDate.getTime());
    const originalHours = candidateDate.getHours();
    const originalMinutes = candidateDate.getMinutes();
    const originalSeconds = candidateDate.getSeconds();

    const maxLookaheadDays = 60; // Safety guard to prevent infinite loops
    let attempts = 0;

    while (attempts < maxLookaheadDays) {
      const isSunday = resolved.getDay() === 0; // 0 = Sunday
      const isHoliday = await this.isPublicHoliday(resolved);

      if (!isSunday && !isHoliday) {
        resolved.setHours(originalHours, originalMinutes, originalSeconds, 0);
        return resolved;
      }

      const reason = isSunday ? 'Sunday' : 'Public Holiday';
      const dateStr = resolved.toISOString().split('T')[0];
      this.logger.log(`Candidate date ${dateStr} is a ${reason}. Advancing +1 calendar day.`);

      // Advance by +1 day
      resolved.setDate(resolved.getDate() + 1);
      attempts++;
    }

    this.logger.warn(`Max lookahead reached for candidate date. Falling back to candidate.`);
    candidateDate.setHours(originalHours, originalMinutes, originalSeconds, 0);
    return candidateDate;
  }

  /**
   * Checks if a date matches an active registered Ethiopian Public Holiday in the database.
   */
  async isPublicHoliday(date: Date): Promise<boolean> {
    try {
      // Normalize to date-only boundary (UTC midnight) for comparison
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

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

