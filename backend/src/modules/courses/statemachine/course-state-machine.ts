import { BadRequestException, Injectable } from '@nestjs/common';
import { CourseStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  [CourseStatus.DRAFT]: [CourseStatus.PENDING_APPROVAL, CourseStatus.ARCHIVED],
  [CourseStatus.PENDING_APPROVAL]: [
    CourseStatus.APPROVED,
    CourseStatus.REJECTED,
    CourseStatus.DRAFT,
  ],
  [CourseStatus.APPROVED]: [CourseStatus.PUBLISHED, CourseStatus.ARCHIVED],
  [CourseStatus.PUBLISHED]: [CourseStatus.ARCHIVED, CourseStatus.DRAFT, CourseStatus.APPROVED],
  [CourseStatus.REJECTED]: [CourseStatus.DRAFT, CourseStatus.ARCHIVED],
  [CourseStatus.ARCHIVED]: [CourseStatus.DRAFT],
};

@Injectable()
export class CourseStateMachine {
  canTransition(from: CourseStatus, to: CourseStatus): boolean {
    if (from === to) {
      return true;
    }
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  assertCanTransition(from: CourseStatus, to: CourseStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(`Invalid course status transition: ${from} → ${to}`);
    }
  }

  get allowedTransitions(): Record<CourseStatus, CourseStatus[]> {
    return ALLOWED_TRANSITIONS;
  }
}
