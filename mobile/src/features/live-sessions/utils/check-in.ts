/**
 * Classroom check-in codes, matching the web app (frontend …/in-person/ClassroomQrModal.tsx):
 * - PIN  = last 6 characters of the session id, upper-case (the web validates it client-side too)
 * - QR   = "ELTMS-CHECKIN:<sessionId>:<PIN>"; a bare session id is accepted as well
 * The backend itself does not validate codes (spec §8.6) — these checks stop mistaken check-ins.
 */

export const pinFor = (sessionId: string) => sessionId.slice(-6).toUpperCase();

export function isValidPin(sessionId: string, pin: string): boolean {
  return pin.trim().toUpperCase() === pinFor(sessionId);
}

/** Returns the session id encoded in a scanned QR, or null if it isn't an ELTMS check-in code. */
export function sessionIdFromQr(data: string): string | null {
  const text = data.trim();
  const match = /^ELTMS-CHECKIN:([0-9a-f-]{36})(?::([A-Z0-9]{6}))?$/i.exec(text);
  if (match) {
    const [, sessionId, pin] = match;
    if (pin && pin.toUpperCase() !== pinFor(sessionId!)) return null;
    return sessionId!;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) ? text : null;
}
