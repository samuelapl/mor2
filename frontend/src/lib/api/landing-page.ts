import { api, getAccessToken, API_BASE_URL } from './client';

export interface NavItemConfig {
  id: string;
  labelEn: string;
  labelAm: string;
  href: string;
  isVisible: boolean;
  isExternal?: boolean;
  desktopOnly?: boolean;
  order: number;
}

export interface StatItemConfig {
  id: string;
  value: string;
  labelEn: string;
  labelAm: string;
  subtextEn?: string;
  subtextAm?: string;
  isVisible: boolean;
  order: number;
}

export interface WorkflowStepConfig {
  id: string;
  stepNumber: number;
  titleEn: string;
  titleAm: string;
  descriptionEn: string;
  descriptionAm: string;
  isVisible: boolean;
  order: number;
}

export interface FaqItemConfig {
  id: string;
  questionEn: string;
  questionAm: string;
  answerEn: string;
  answerAm: string;
  isVisible: boolean;
  order: number;
}

export interface LandingPageConfig {
  version: number;
  branding: {
    systemNameEn: string;
    systemNameAm: string;
    subtitleEn: string;
    subtitleAm: string;
    logoUrl: string;
    showGovBadge: boolean;
    showTopBanner: boolean;
    topBannerTextEn: string;
    topBannerTextAm: string;
  };
  header: {
    navLinks: NavItemConfig[];
    showSignInButton: boolean;
    showGetStartedButton: boolean;
  };
  hero: {
    badgeTextEn: string;
    badgeTextAm: string;
    headlineEn: string;
    headlineAm: string;
    subtitleEn: string;
    subtitleAm: string;
    primaryButtonTextEn: string;
    primaryButtonTextAm: string;
    primaryButtonHref: string;
    showPrimaryButton: boolean;
    secondaryButtonTextEn: string;
    secondaryButtonTextAm: string;
    secondaryButtonHref: string;
    showSecondaryButton: boolean;
  };
  stats: StatItemConfig[];
  workflow: {
    sectionTitleEn: string;
    sectionTitleAm: string;
    sectionSubtitleEn: string;
    sectionSubtitleAm: string;
    steps: WorkflowStepConfig[];
  };
  desktopApp: {
    isVisible: boolean;
    titleEn: string;
    titleAm: string;
    descriptionEn: string;
    descriptionAm: string;
    version: string;
    downloadUrl: string;
  };
  faqs: FaqItemConfig[];
  footer: {
    descriptionEn: string;
    descriptionAm: string;
    contact: {
      headquartersEn: string;
      headquartersAm: string;
      phone: string;
      email: string;
      workingHoursEn: string;
      workingHoursAm: string;
    };
    links: NavItemConfig[];
    copyrightEn: string;
    copyrightAm: string;
  };
}

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  version: 1,
  branding: {
    systemNameEn: 'MoR LMS',
    systemNameAm: '',
    subtitleEn: 'Ministry of Revenues',
    subtitleAm: '',
    logoUrl: '/logo.jpg',
    showGovBadge: true,
    showTopBanner: true,
    topBannerTextEn: 'Federal Democratic Republic of Ethiopia Ministry of Revenues',
    topBannerTextAm: '',
  },
  header: {
    navLinks: [
      {
        id: 'nav-platform',
        labelEn: 'Platform Overview',
        labelAm: '',
        href: '/#capabilities',
        isVisible: true,
        desktopOnly: false,
        order: 1,
      },
      {
        id: 'nav-news',
        labelEn: 'News',
        labelAm: '',
        href: '/news',
        isVisible: true,
        desktopOnly: false,
        order: 2,
      },
      {
        id: 'nav-desktop',
        labelEn: 'Desktop App',
        labelAm: '',
        href: '/#desktop',
        isVisible: true,
        desktopOnly: true,
        order: 3,
      },
      {
        id: 'nav-faq',
        labelEn: 'FAQ',
        labelAm: '',
        href: '/#faq',
        isVisible: true,
        desktopOnly: false,
        order: 4,
      },
    ],
    showSignInButton: true,
    showGetStartedButton: true,
  },
  hero: {
    badgeTextEn: 'Unified National Tax & Customs Training Platform',
    badgeTextAm: '',
    headlineEn: 'Learning Management System',
    headlineAm: '',
    subtitleEn:
      'A single, standardized infrastructure bridging regional branches, customs checkpoints, and headquarters with continuous accreditation and role-based training.',
    subtitleAm: '',
    primaryButtonTextEn: 'Sign In to Platform',
    primaryButtonTextAm: '',
    primaryButtonHref: '/login',
    showPrimaryButton: true,
    secondaryButtonTextEn: 'How It Works',
    secondaryButtonTextAm: '',
    secondaryButtonHref: '#learner-flow',
    showSecondaryButton: true,
  },
  stats: [
    {
      id: 'stat-courses',
      value: '7+',
      labelEn: 'Accredited Courses',
      labelAm: '',
      subtextEn: 'Audited tax curricula',
      subtextAm: '',
      isVisible: true,
      order: 1,
    },
    {
      id: 'stat-users',
      value: '22+',
      labelEn: 'Active Personnel',
      labelAm: '',
      subtextEn: 'Branch & HQ officers',
      subtextAm: '',
      isVisible: true,
      order: 2,
    },
    {
      id: 'stat-sessions',
      value: '12+',
      labelEn: 'Virtual Classrooms',
      labelAm: '',
      subtextEn: 'Synchronous sessions',
      subtextAm: '',
      isVisible: true,
      order: 3,
    },
    {
      id: 'stat-certs',
      value: '100%',
      labelEn: 'Verifiable Certificates',
      labelAm: '',
      subtextEn: 'Tamper-proof credentials',
      subtextAm: '',
      isVisible: true,
      order: 4,
    },
  ],
  workflow: {
    sectionTitleEn: 'Standardized Learning Workflow',
    sectionTitleAm: '',
    sectionSubtitleEn:
      'From institutional onboarding to cryptographic certification, every stage is structured and monitored.',
    sectionSubtitleAm: '',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        titleEn: 'Sign-Up & Account Setup',
        titleAm: '',
        descriptionEn:
          'Register using your Ministry credentials or institutional domain email. Your identity and branch role determine your curriculum track.',
        descriptionAm: '',
        isVisible: true,
        order: 1,
      },
      {
        id: 'step-2',
        stepNumber: 2,
        titleEn: 'Explore & Enroll in Courses',
        titleAm: '',
        descriptionEn:
          'Browse the institutional catalog covering Customs Valuation, Domestic Tax Directives, Risk Management, and Digital Invoicing.',
        descriptionAm: '',
        isVisible: true,
        order: 2,
      },
      {
        id: 'step-3',
        stepNumber: 3,
        titleEn: 'Interactive Learning & Live Sessions',
        titleAm: '',
        descriptionEn:
          'Complete multimedia modules at your own pace and participate in scheduled synchronous webinars hosted by senior tax directors.',
        descriptionAm: '',
        isVisible: true,
        order: 3,
      },
      {
        id: 'step-4',
        stepNumber: 4,
        titleEn: 'Assessments & Knowledge Checks',
        titleAm: '',
        descriptionEn:
          'Reinforce understanding through module quizzes, scenario-based evaluations, and timed comprehensive final assessments.',
        descriptionAm: '',
        isVisible: true,
        order: 4,
      },
      {
        id: 'step-5',
        stepNumber: 5,
        titleEn: 'Earn Verifiable Certificate',
        titleAm: '',
        descriptionEn:
          'Upon meeting all completion and attendance thresholds, receive a cryptographically signed, QR-verifiable certificate recognized across all branches.',
        descriptionAm: '',
        isVisible: true,
        order: 5,
      },
    ],
  },
  desktopApp: {
    isVisible: true,
    titleEn: 'Official Desktop Client for Windows',
    titleAm: '',
    descriptionEn:
      'Designed for high-reliability training in regional branches and low-bandwidth customs environments with offline package sync and secure local caching.',
    descriptionAm: '',
    version: 'v1.2.0',
    downloadUrl: '/downloads/MoR-ELTMS-Setup.exe',
  },
  faqs: [
    {
      id: 'faq-1',
      questionEn: 'What is the Ministry of Revenues e-Learning Platform?',
      questionAm: '',
      answerEn:
        'The MoR ELTMS is the official, centralized enterprise training portal of the Ministry of Revenues of Ethiopia, engineered to deliver accredited tax, customs, compliance, and leadership curricula to officers, inspectors, and revenue personnel nationwide.',
      answerAm: '',
      isVisible: true,
      order: 1,
    },
    {
      id: 'faq-2',
      questionEn: 'How does a learner earn and verify a course certificate?',
      questionAm: '',
      answerEn:
        'Learners must complete all lessons, satisfy attendance requirements for live sessions, and achieve passing marks on all quizzes and final assessments. Issued certificates feature an immutable SHA-256 digital signature and a secure verification QR code.',
      answerAm: '',
      isVisible: true,
      order: 2,
    },
    {
      id: 'faq-3',
      questionEn: 'Can I attend live sessions from low-bandwidth regional branch offices?',
      questionAm: '',
      answerEn:
        'Yes. Synchronous live sessions run on an adaptive-bitrate WebRTC infrastructure that automatically downsamples video resolution to maintain clear, uninterrupted audio in constrained network environments.',
      answerAm: '',
      isVisible: true,
      order: 3,
    },
    {
      id: 'faq-4',
      questionEn: 'Is the platform fully available in Amharic?',
      questionAm: '',
      answerEn:
        'Yes. The system is architected with bilingual support across all user-facing interfaces, navigational elements, course materials, notifications, and generated documents.',
      answerAm: '',
      isVisible: true,
      order: 4,
    },
  ],
  footer: {
    descriptionEn:
      'Federal Democratic Republic of Ethiopia Ministry of Revenues. The centralized learning management infrastructure driving professional excellence across tax administration and customs compliance.',
    descriptionAm: '',
    contact: {
      headquartersEn: 'Addis Ababa, Megenagna, Ministry of Revenues HQ',
      headquartersAm: '',
      phone: '+251 11 662 9800 / 8199',
      email: 'support@mor.gov.et',
      workingHoursEn: 'Mon – Fri: 8:30 AM – 5:30 PM (UTC+3)',
      workingHoursAm: '',
    },
    links: [
      {
        id: 'footer-news',
        labelEn: 'News',
        labelAm: '',
        href: '/news',
        isVisible: true,
        desktopOnly: false,
        order: 1,
      },
      {
        id: 'footer-desktop',
        labelEn: 'Windows Client',
        labelAm: '',
        href: '/#desktop',
        isVisible: true,
        desktopOnly: true,
        order: 2,
      },
      {
        id: 'footer-faq',
        labelEn: 'FAQ',
        labelAm: '',
        href: '/#faq',
        isVisible: true,
        desktopOnly: false,
        order: 3,
      },
      {
        id: 'footer-signin',
        labelEn: 'Sign In',
        labelAm: '',
        href: '/login',
        isVisible: true,
        desktopOnly: false,
        order: 4,
      },
    ],
    copyrightEn: 'Ministry of Revenues. All rights reserved.',
    copyrightAm: '',
  },
};

/**
 * Fetch public landing page configuration. Falls back gracefully to default configuration if offline or uninitialized.
 */
export async function fetchPublicLandingConfig(): Promise<LandingPageConfig> {
  try {
    const data = await api<LandingPageConfig>('public/landing-config');
    if (data && typeof data === 'object' && data.branding) {
      return data;
    }
    return DEFAULT_LANDING_PAGE_CONFIG;
  } catch {
    return DEFAULT_LANDING_PAGE_CONFIG;
  }
}

/**
 * Fetch landing page configuration for Admin CMS studio.
 */
export async function fetchAdminLandingConfig(): Promise<LandingPageConfig> {
  return api<LandingPageConfig>('admin/landing-config');
}

/**
 * Update landing page configuration (Admin only).
 */
export async function updateLandingConfig(
  config: Partial<LandingPageConfig>,
): Promise<LandingPageConfig> {
  return api<LandingPageConfig>('admin/landing-config', {
    method: 'PUT',
    body: config,
  });
}

/**
 * Reset landing page configuration to defaults (Admin only).
 */
export async function resetLandingConfig(): Promise<LandingPageConfig> {
  return api<LandingPageConfig>('admin/landing-config/reset', {
    method: 'POST',
  });
}

/**
 * Upload logo file for landing page branding.
 */
export async function uploadLandingLogo(file: File): Promise<{ logoUrl: string }> {
  const form = new FormData();
  form.append('file', file);

  const token = getAccessToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const base = API_BASE_URL.replace(/\/+$/, '');
  const res = await fetch(`${base}/admin/landing-config/logo`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!res.ok) {
    let msg = 'Failed to upload logo';
    try {
      const err = await res.json();
      msg = err.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const json = await res.json();
  return json?.data ?? json;
}

