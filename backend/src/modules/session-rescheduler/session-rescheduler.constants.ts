export const LIVE_SESSION_ENDED_EVENT = 'live_session.ended';
export const LIVE_SESSION_RESCHEDULE_DAY_GAP_KEY = 'live_session_reschedule_day_gap';
export const DEFAULT_RESCHEDULE_DAY_GAP = 10;

export interface LiveSessionEndedEvent {
  sessionId: string;
  courseId: string;
  sessionPlanId?: string | null;
  endedAt: Date;
}

/**
 * Standard statutory Ethiopian National Public Holidays.
 * Can be seeded into `public_holidays` database table.
 */
export const DEFAULT_ETHIOPIAN_HOLIDAYS: Array<{ nameEn: string; nameAm: string; holidayDate: string }> = [
  { nameEn: 'Ethiopian Christmas (Genna)', nameAm: 'ገና (የገና በዓል)', holidayDate: '2026-01-07' },
  { nameEn: 'Epiphany (Timket)', nameAm: 'ጥምቀት', holidayDate: '2026-01-19' },
  { nameEn: 'Adwa Victory Day', nameAm: 'የአድዋ ድል በዓል', holidayDate: '2026-03-02' },
  { nameEn: 'Eid al-Fitr', nameAm: 'ኢድ አልፈጥር', holidayDate: '2026-03-20' },
  { nameEn: 'Ethiopian Good Friday (Siklet)', nameAm: 'ስቅለት', holidayDate: '2026-04-10' },
  { nameEn: 'Ethiopian Easter (Fasika)', nameAm: 'ፋሲካ', holidayDate: '2026-04-12' },
  { nameEn: 'International Workers’ Day', nameAm: 'የሰራተኞች ቀን', holidayDate: '2026-05-01' },
  { nameEn: 'Patriots’ Victory Day', nameAm: 'የአርበኞች ቀን', holidayDate: '2026-05-05' },
  { nameEn: 'Eid al-Adha (Arefa)', nameAm: 'አረፋ (ኢድ አል-አድሃ)', holidayDate: '2026-05-27' },
  { nameEn: 'Derg Downfall Day (Ginbot 20)', nameAm: 'ግንቦት 20', holidayDate: '2026-05-28' },
  { nameEn: 'Mawlid (Prophet’s Birthday)', nameAm: 'መውሊድ', holidayDate: '2026-08-26' },
  { nameEn: 'Ethiopian New Year (Enkutatash)', nameAm: 'እንቁጣጣሽ (አዲስ ዓመት)', holidayDate: '2026-09-11' },
  { nameEn: 'Finding of True Cross (Meskel)', nameAm: 'መስቀል', holidayDate: '2026-09-27' },
  // 2027 Projections
  { nameEn: 'Ethiopian Christmas (Genna) 2027', nameAm: 'ገና 2027', holidayDate: '2027-01-07' },
  { nameEn: 'Epiphany (Timket) 2027', nameAm: 'ጥምቀት 2027', holidayDate: '2027-01-19' },
  { nameEn: 'Adwa Victory Day 2027', nameAm: 'የአድዋ ድል በዓል 2027', holidayDate: '2027-03-02' },
  { nameEn: 'Ethiopian New Year (Enkutatash) 2027', nameAm: 'እንቁጣጣሽ 2027', holidayDate: '2027-09-12' },
  { nameEn: 'Finding of True Cross (Meskel) 2027', nameAm: 'መስቀል 2027', holidayDate: '2027-09-28' },
];

