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
    systemNameAm: 'የገቢዎች ሚኒስቴር',
    subtitleEn: 'Ministry of Revenues',
    subtitleAm: 'የገቢዎች ሚኒስቴር',
    logoUrl: '/logo.jpg',
    showGovBadge: true,
    showTopBanner: true,
    topBannerTextEn: 'Federal Democratic Republic of Ethiopia Ministry of Revenues',
    topBannerTextAm: 'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ የገቢዎች ሚኒስቴር',
  },
  header: {
    navLinks: [
      {
        id: 'nav-platform',
        labelEn: 'Platform Overview',
        labelAm: 'የመድረኩ አጠቃላይ እይታ',
        href: '/#capabilities',
        isVisible: true,
        desktopOnly: false,
        order: 1,
      },
      {
        id: 'nav-news',
        labelEn: 'News & Directives',
        labelAm: 'ዜናዎች እና መመሪያዎች',
        href: '/news',
        isVisible: true,
        desktopOnly: false,
        order: 2,
      },
      {
        id: 'nav-desktop',
        labelEn: 'Desktop App',
        labelAm: 'የዴስክቶፕ መተግበሪያ',
        href: '/#desktop',
        isVisible: true,
        desktopOnly: true,
        order: 3,
      },
      {
        id: 'nav-faq',
        labelEn: 'FAQ',
        labelAm: 'ተደጋጋሚ ጥያቄዎች',
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
    badgeTextAm: 'የተቀናጀ ብሔራዊ የታክስ እና ጉምሩክ ስልጠና መድረክ',
    headlineEn: 'Learning Management System',
    headlineAm: 'የገቢዎች ሚኒስቴር የኤሌክትሮኒክስ ትምህርት እና ስልጠና ማኔጅመንት ስርዓት',
    subtitleEn:
      'A single, standardized infrastructure bridging regional branches, customs checkpoints, and headquarters with continuous accreditation and role-based training.',
    subtitleAm:
      'የክልል ቅርንጫፎችን፣ የጉምሩክ ኬላዎችን እና ዋና መስሪያ ቤቱን ቀጣይነት ባለው እውቅና እና የስራ ድርሻ ላይ ያተኮረ ስልጠና የሚያስተሳስር ወጥ የሆነ መሠረተ ልማት።',
    primaryButtonTextEn: 'Sign In to Platform',
    primaryButtonTextAm: 'ወደ መድረኩ ይግቡ',
    primaryButtonHref: '/login',
    showPrimaryButton: true,
    secondaryButtonTextEn: 'How It Works',
    secondaryButtonTextAm: 'አሰራሩ እንዴት ነው',
    secondaryButtonHref: '#learner-flow',
    showSecondaryButton: true,
  },
  stats: [
    {
      id: 'stat-courses',
      value: '7+',
      labelEn: 'Accredited Courses',
      labelAm: 'እውቅና የተሰጣቸው ኮርሶች',
      subtextEn: 'Audited tax curricula',
      subtextAm: 'የታክስ እና ጉምሩክ ሥርዓተ ትምህርት',
      isVisible: true,
      order: 1,
    },
    {
      id: 'stat-users',
      value: '22+',
      labelEn: 'Active Personnel',
      labelAm: 'ተሳታፊ ሰራተኞች',
      subtextEn: 'Branch & HQ officers',
      subtextAm: 'የቅርንጫፍና ዋና መ/ቤት ሰራተኞች',
      isVisible: true,
      order: 2,
    },
    {
      id: 'stat-sessions',
      value: '12+',
      labelEn: 'Virtual Classrooms',
      labelAm: 'የቀጥታ ስልጠና ክፍለ ጊዜያት',
      subtextEn: 'Synchronous sessions',
      subtextAm: 'የቀጥታ በይነመረብ ስልጠናዎች',
      isVisible: true,
      order: 3,
    },
    {
      id: 'stat-certs',
      value: '100%',
      labelEn: 'Verifiable Certificates',
      labelAm: 'ተአማኒ የምስክር ወረቀቶች',
      subtextEn: 'Tamper-proof credentials',
      subtextAm: 'በQR ኮድ የተረጋገጡ ሰርተፊኬቶች',
      isVisible: true,
      order: 4,
    },
  ],
  workflow: {
    sectionTitleEn: 'Standardized Learning Workflow',
    sectionTitleAm: 'ደረጃውን የጠበቀ የመማር ሂደት',
    sectionSubtitleEn:
      'From institutional onboarding to cryptographic certification, every stage is structured and monitored.',
    sectionSubtitleAm:
      'ከተጠቃሚ ምዝገባ ጀምሮ እስከ ዲጂታል ሰርተፊኬት ድረስ እያንዳንዱ ደረጃ የተዋቀረና ክትትል የሚደረግበት ነው።',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        titleEn: 'Sign-Up & Account Setup',
        titleAm: 'ምዝገባ እና የመለያ ዝግጅት',
        descriptionEn:
          'Register using your Ministry credentials or institutional domain email. Your identity and branch role determine your curriculum track.',
        descriptionAm:
          'በሚኒስቴሩ መለያ ወይም ተቋማዊ ኢሜይል ይመዝገቡ። የስራ ድርሻዎ እና ቅርንጫፍዎ የስልጠና መስመርዎን ይወስናሉ።',
        isVisible: true,
        order: 1,
      },
      {
        id: 'step-2',
        stepNumber: 2,
        titleEn: 'Explore & Enroll in Courses',
        titleAm: 'ኮርሶችን ያስሱ እና ይመዝገቡ',
        descriptionEn:
          'Browse the institutional catalog covering Customs Valuation, Domestic Tax Directives, Risk Management, and Digital Invoicing.',
        descriptionAm:
          'የጉምሩክ ዋጋ አተማመን፣ የአገር ውስጥ ታክስ መመሪያዎች፣ የአደጋ ስጋት አስተዳደር እና የኤሌክትሮኒክስ ደረሰኝ ሥርዓቶችን ያካተቱ ኮርሶችን ያስሱ።',
        isVisible: true,
        order: 2,
      },
      {
        id: 'step-3',
        stepNumber: 3,
        titleEn: 'Interactive Learning & Live Sessions',
        titleAm: 'በይነተገናኝ ትምህርት እና የቀጥታ ክፍለ ጊዜያት',
        descriptionEn:
          'Complete multimedia modules at your own pace and participate in scheduled synchronous webinars hosted by senior tax directors.',
        descriptionAm:
          'የመልቲሚዲያ ትምህርቶችን በራስዎ ፍጥነት ያጠናቅቁ እና በከፍተኛ የስራ ኃላፊዎች የሚሰጡ የቀጥታ ስልጠናዎችን ይከታተሉ።',
        isVisible: true,
        order: 3,
      },
      {
        id: 'step-4',
        stepNumber: 4,
        titleEn: 'Assessments & Knowledge Checks',
        titleAm: 'ምዘናዎች እና የዕውቀት መመዘኛ ፈተናዎች',
        descriptionEn:
          'Reinforce understanding through module quizzes, scenario-based evaluations, and timed comprehensive final assessments.',
        descriptionAm:
          'በሞጁል መጨረሻ ፈተናዎች፣ በተግባራዊ ምዘናዎች እና አጠቃላይ የፈተና ውጤቶች እውቀትዎን ያረጋግጡ።',
        isVisible: true,
        order: 4,
      },
      {
        id: 'step-5',
        stepNumber: 5,
        titleEn: 'Earn Verifiable Certificate',
        titleAm: 'ተአማኒ የምስክር ወረቀት ይቀበሉ',
        descriptionEn:
          'Upon meeting all completion and attendance thresholds, receive a cryptographically signed, QR-verifiable certificate recognized across all branches.',
        descriptionAm:
          'የስልጠናውን እና የፈተናውን መስፈርቶች ሲያሟሉ በሁሉም ቅርንጫፎች ተቀባይነት ያለው የዲጂታል ሰርተፊኬት ይቀበሉ።',
        isVisible: true,
        order: 5,
      },
    ],
  },
  desktopApp: {
    isVisible: true,
    titleEn: 'Official Desktop Client for Windows',
    titleAm: 'ኦፊሴላዊ የዊንዶውስ ዴስክቶፕ መተግበሪያ',
    descriptionEn:
      'Designed for high-reliability training in regional branches and low-bandwidth customs environments with offline package sync and secure local caching.',
    descriptionAm:
      'በክልል ቅርንጫፎች እና ደካማ የኢንተርኔት ግንኙነት ባለባቸው የጉምሩክ ኬላዎች አስተማማኝ ስልጠና ለመስጠት በከፊል ከመስመር ውጭ የሚሰራ የዴስክቶፕ መተግበሪያ።',
    version: 'v1.2.0',
    downloadUrl: '/downloads/MoR-ELTMS-Setup.exe',
  },
  faqs: [
    {
      id: 'faq-1',
      questionEn: 'What is the Ministry of Revenues e-Learning Platform?',
      questionAm: 'የገቢዎች ሚኒስቴር የኤሌክትሮኒክስ መማሪያ መድረክ ምንድን ነው?',
      answerEn:
        'The MoR ELTMS is the official, centralized enterprise training portal of the Ministry of Revenues of Ethiopia, engineered to deliver accredited tax, customs, compliance, and leadership curricula to officers, inspectors, and revenue personnel nationwide.',
      answerAm:
        'የገቢዎች ሚኒስቴር የኤሌክትሮኒክስ መማሪያ መድረክ በመላው አገሪቱ ለሚገኙ የገቢዎች ሚኒስቴር ባለሙያዎች የታክስ፣ የጉምሩክ፣ የህግ ተገዢነት እና የአመራር ክህሎት ስልጠናዎችን የሚሰጥ ማዕከላዊ ተቋማዊ ስርዓት ነው።',
      isVisible: true,
      order: 1,
    },
    {
      id: 'faq-2',
      questionEn: 'How does a learner earn and verify a course certificate?',
      questionAm: 'አንድ ሰልጣኝ እንዴት የምስክር ወረቀት ሊያገኝ እና ሊያረጋግጥ ይችላል?',
      answerEn:
        'Learners must complete all lessons, satisfy attendance requirements for live sessions, and achieve passing marks on all quizzes and final assessments. Issued certificates feature an immutable SHA-256 digital signature and a secure verification QR code.',
      answerAm:
        'ሰልጣኞች ሁሉንም ትምህርቶች ማጠናቀቅ፣ የቀጥታ ስልጠናዎችን መከታተል እና በፈተናዎች ማለፊያ ውጤት ማግኘት አለባቸው። የተሰጡ የምስክር ወረቀቶች በQR ኮድ እና በዲጂታል ፊርማ የተረጋገጡ ናቸው።',
      isVisible: true,
      order: 2,
    },
    {
      id: 'faq-3',
      questionEn: 'Can I attend live sessions from low-bandwidth regional branch offices?',
      questionAm: 'ዝቅተኛ የኢንተርኔት ፍጥነት ካላቸው የክልል ቅርንጫፍ ቢሮዎች የቀጥታ ስልጠናዎችን መከታተል ይቻላል?',
      answerEn:
        'Yes. Synchronous live sessions run on an adaptive-bitrate WebRTC infrastructure that automatically downsamples video resolution to maintain clear, uninterrupted audio in constrained network environments.',
      answerAm:
        'አዎ። የቀጥታ ስልጠናዎች የኔትወርክ ፍጥነትን መሰረት በማድረግ ቪዲዮውን በማስተካከል ያልተቋረጠ ድምፅ እና ምስል እንዲደርስ በሚያስችል ቴክኖሎጂ የተገነቡ ናቸው።',
      isVisible: true,
      order: 3,
    },
    {
      id: 'faq-4',
      questionEn: 'Is the platform fully available in Amharic?',
      questionAm: 'መድረኩ በአማርኛ ቋንቋ ሙሉ በሙሉ ይገኛል?',
      answerEn:
        'Yes. The system is architected with bilingual support across all user-facing interfaces, navigational elements, course materials, notifications, and generated documents.',
      answerAm:
        'አዎ። ስርዓቱ የተጠቃሚ በይነገጾችን፣ አሰሳዎችን፣ የኮርስ ይዘቶችን፣ ማሳወቂያዎችን እና የተዘጋጁ ሰነዶችን ጨምሮ በአማርኛ እና በእንግሊዝኛ ሙሉ በሙሉ እንዲሰራ ሆኖ የተዘጋጀ ነው።',
      isVisible: true,
      order: 4,
    },
  ],
  footer: {
    descriptionEn:
      'Federal Democratic Republic of Ethiopia Ministry of Revenues. The centralized learning management infrastructure driving professional excellence across tax administration and customs compliance.',
    descriptionAm:
      'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ የገቢዎች ሚኒስቴር። በታክስ አስተዳደር እና በጉምሩክ አሰራር የላቀ ሙያዊ ብቃትን የሚያረጋግጥ ማዕከላዊ የመማሪያ መሠረተ ልማት።',
    contact: {
      headquartersEn: 'Addis Ababa, Megenagna, Ministry of Revenues HQ',
      headquartersAm: 'አዲስ አበባ፣ መገናኛ፣ የገቢዎች ሚኒስቴር ዋና መ/ቤት',
      phone: '+251 11 662 9800 / 8199',
      email: 'support@mor.gov.et',
      workingHoursEn: 'Mon – Fri: 8:30 AM – 5:30 PM (UTC+3)',
      workingHoursAm: 'ከሰኞ – አርብ፡ ከጠዋቱ 2:30 – 11:30',
    },
    links: [
      {
        id: 'footer-news',
        labelEn: 'News & Directives',
        labelAm: 'ዜናዎች እና መመሪያዎች',
        href: '/news',
        isVisible: true,
        desktopOnly: false,
        order: 1,
      },
      {
        id: 'footer-desktop',
        labelEn: 'Windows Client',
        labelAm: 'የዊንዶውስ መተግበሪያ',
        href: '/#desktop',
        isVisible: true,
        desktopOnly: true,
        order: 2,
      },
      {
        id: 'footer-faq',
        labelEn: 'FAQ',
        labelAm: 'ተደጋጋሚ ጥያቄዎች',
        href: '/#faq',
        isVisible: true,
        desktopOnly: false,
        order: 3,
      },
      {
        id: 'footer-signin',
        labelEn: 'Sign In',
        labelAm: 'መግቢያ',
        href: '/login',
        isVisible: true,
        desktopOnly: false,
        order: 4,
      },
    ],
    copyrightEn: 'Ministry of Revenues. All rights reserved.',
    copyrightAm: 'የገቢዎች ሚኒስቴር። መብቱ በህግ የተጠበቀ ነው።',
  },
};

