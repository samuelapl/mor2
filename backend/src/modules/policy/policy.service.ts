import { Injectable } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { CourseProgressionMode } from '@prisma/client';
import { UpdatePolicyDto } from './dto';

const SETTINGS_ID = 'default';

@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Reads (creating on first access) the singleton course-policy settings row. */
  async getSettings() {
    const existing = await this.prisma.coursePolicySettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (existing) return existing;
    return this.prisma.coursePolicySettings.create({ data: { id: SETTINGS_ID } });
  }

  async updateSettings(dto: UpdatePolicyDto, updatedBy?: string) {
    await this.getSettings(); // ensure the row exists
    return this.prisma.coursePolicySettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...(dto.timeSpentPercent !== undefined ? { timeSpentPercent: dto.timeSpentPercent } : {}),
        ...(dto.retakeCooldownMinutes !== undefined
          ? { retakeCooldownMinutes: dto.retakeCooldownMinutes }
          : {}),
        ...(dto.progressionMode !== undefined ? { progressionMode: dto.progressionMode } : {}),
        ...(dto.passingScorePercent !== undefined
          ? { passingScorePercent: dto.passingScorePercent }
          : {}),
        updatedBy: updatedBy ?? null,
      },
    });
  }

  /** Fraction (0-1) of a lesson/module's durationMinutes that must be spent before completion. */
  async getTimeRatio(): Promise<number> {
    const settings = await this.getSettings();
    return settings.timeSpentPercent / 100;
  }

  /** Minutes to wait after exhausting attempts before a retake is allowed (0 = never). */
  async getRetakeCooldownMinutes(): Promise<number> {
    const settings = await this.getSettings();
    return settings.retakeCooldownMinutes;
  }

  /** Course progression mode (LOCKED = sequential, OPEN = flexible). */
  async getProgressionMode(): Promise<CourseProgressionMode> {
    const settings = await this.getSettings();
    return settings.progressionMode ?? CourseProgressionMode.LOCKED;
  }

  /** Global pass mark percentage (1-100) required for individual assessments and cumulative course grade. */
  async getPassingScorePercent(): Promise<number> {
    const settings = await this.getSettings();
    return settings.passingScorePercent ?? 50;
  }
}
