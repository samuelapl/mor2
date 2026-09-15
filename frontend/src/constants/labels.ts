import type { Lang } from "@/types";

const TRANSLATIONS = {
  dashboard: { en: "Dashboard", am: "ዳሽቦርድ" },
  myCourses: { en: "My Courses", am: "የእኔ ኮርሶች" },
  continueLearning: { en: "Continue learning", am: "ትምህርት ቀጥል" },
  startLearning: { en: "Start learning", am: "መማር ጀምር" },
  completed: { en: "Completed", am: "የተጠናቀቀ" },
  inProgress: { en: "In progress", am: "በመካሄድ ላይ" },
  takeQuiz: { en: "Take quiz", am: "ፈተና ውሰድ" },
  progress: { en: "Progress", am: "እድገት" },
  certificates: { en: "Certificates", am: "ሰርተፊኬቶች" },
  liveSessions: { en: "Live sessions", am: "የቀጥታ ስልጠና" },
  upcoming: { en: "Upcoming sessions", am: "የመጪ ስልጠና" },
  join: { en: "Join", am: "ተቀላቀል" },
  averageProgress: { en: "Average progress", am: "አማካይ እድገት" },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS;

export function tr(lang: Lang, key: TranslationKey): string {
  return TRANSLATIONS[key][lang];
}