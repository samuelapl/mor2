import type { CourseDeliveryMode } from '@/types';

/**
 * Delivery modes new courses may use. In-person and hybrid are kept in the codebase
 * but are not offered for now; add them back here to re-enable them.
 * Mirrors ENABLED_DELIVERY_MODES in backend/src/modules/courses/delivery-modes.ts.
 */
export const ENABLED_DELIVERY_MODES: readonly CourseDeliveryMode[] = ['ONLINE_ONLY'];

export const DEFAULT_DELIVERY_MODE: CourseDeliveryMode = 'ONLINE_ONLY';

export const isDeliveryModeEnabled = (mode: CourseDeliveryMode) => ENABLED_DELIVERY_MODES.includes(mode);
