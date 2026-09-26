/**
 * Live sessions feature — upcoming/past sessions, join, attendance heartbeat, QR/PIN/GPS check-in.
 * Spec §8 · Architecture §6.8.
 */
export {
  liveSessionApi,
  sessionKeys,
  useAttendanceVisibility,
  useCheckIn,
  useMyAttendance,
  useSession,
  useUpcomingSessions,
} from './api/live-session-api';
export { LiveKitRoom } from './components/LiveKitRoom';
export { SessionCard } from './components/SessionCard';
export { useMeetingHeartbeat } from './hooks/useMeetingHeartbeat';
export { useMeetingStore } from './store/meeting-store';
export type * from './types/live-session.types';
export { isValidPin, pinFor, sessionIdFromQr } from './utils/check-in';
export {
  dayKey,
  isCheckInOpen,
  isInPerson,
  isJoinable,
  sessionEnd,
  sessionStart,
} from './utils/session-time';
