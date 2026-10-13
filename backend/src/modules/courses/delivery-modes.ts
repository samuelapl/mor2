import { BadRequestException } from '@nestjs/common';
import { CourseDeliveryMode } from '@prisma/client';

/**
 * Delivery modes new courses may use. Now consolidated to:
 * - ONLINE_ONLY: Pure digital e-learning (with optional virtual webinars)
 * - IN_PERSON_ONLY: Digital curriculum + mandatory in-person classroom sessions at branch venues
 *
 * BOTH (hybrid) is retired for new courses; existing courses may retain it until updated.
 * Mirrors ENABLED_DELIVERY_MODES in frontend/src/constants/delivery-modes.ts.
 */
export const ENABLED_DELIVERY_MODES: readonly CourseDeliveryMode[] = [
  CourseDeliveryMode.ONLINE_ONLY,
  CourseDeliveryMode.IN_PERSON_ONLY,
];

export const DEFAULT_DELIVERY_MODE = CourseDeliveryMode.ONLINE_ONLY;

/**
 * New courses must use an enabled mode. An existing course may keep the mode it already
 * has (`current`), but cannot switch to a disabled one.
 */
export function assertDeliveryModeAllowed(mode: CourseDeliveryMode, current?: CourseDeliveryMode) {
  if (ENABLED_DELIVERY_MODES.includes(mode) || mode === current) return;
  throw new BadRequestException(
    `Delivery mode ${mode} is not available for courses right now. Allowed: ${ENABLED_DELIVERY_MODES.join(', ')}.`,
  );
}
