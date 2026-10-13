import type { CourseDeliveryMode } from '@/types';

/**
 * Delivery modes new courses may use. Now consolidated to:
 * - ONLINE_ONLY: Pure digital e-learning (with optional virtual webinars)
 * - IN_PERSON_ONLY: Digital curriculum + mandatory in-person classroom sessions at branch venues
 *
 * BOTH (hybrid) is retired for new courses; existing courses may retain it until updated.
 * Mirrors ENABLED_DELIVERY_MODES in backend/src/modules/courses/delivery-modes.ts.
 */
export const ENABLED_DELIVERY_MODES: readonly CourseDeliveryMode[] = [
  'ONLINE_ONLY',
  'IN_PERSON_ONLY',
];

export const DEFAULT_DELIVERY_MODE: CourseDeliveryMode = 'ONLINE_ONLY';

export const isDeliveryModeEnabled = (mode: CourseDeliveryMode) => ENABLED_DELIVERY_MODES.includes(mode);
