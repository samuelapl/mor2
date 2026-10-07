'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  CalendarRange,
  Check,
  ChevronDown,
  Download,
  GraduationCap,
  Monitor,
  Presentation,
  ShieldCheck,
  Landmark,
  FileCheck2,
  LockKeyhole,
  BarChart3,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';

import { fetchLandingStats } from '@/lib/api/dashboard';
import type { ApiLandingStats as LandingStats } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

// Dynamic Institutional Curriculum Explorer
function DynamicTrainingExplorer({ stats }: { stats: LandingStats | null }) {
  const { tBilingual } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: tBilingual('All Tracks', 'ሁሉም ዘርፎች') },
    { id: 'customs', name: tBilingual('Customs & ASYCUDA', 'ጉምሩክ እና አሲኩዳ') },
    { id: 'audit', name: tBilingual('Tax Audit & Investigation', 'ታክስ ኦዲት እና ምርመራ') },
    { id: 'compliance', name: tBilingual('Ethics & Legal Compliance', 'ስነ-ምግባር እና ህግ') },
  ];

  const courses = [
    {
      id: 'c1',
      code: 'MoR-CUST-301',
      title: tBilingual('Customs Tariff & HS Classification Framework', 'የጉምሩክ ታሪፍ እና የዕቃዎች ምደባ መመሪያ'),
      directorate: tBilingual('Customs Operations Directorate', 'የጉምሩክ ስራዎች ዳይሬክቶሬት'),
      category: 'customs',
      duration: '40 Hours',
      level: tBilingual('Advanced', 'ከፍተኛ'),
      progress: 92,
      badge: 'ASYCUDA World',
    },
    {
      id: 'c2',
      code: 'MoR-AUD-204',
      title: tBilingual('Comprehensive Tax Audit & Fraud Risk Identification', 'የተሟላ የታክስ ኦዲት እና የታክስ ስወራ ስጋት ቅኝት'),
      directorate: tBilingual('Domestic Revenue Audit Directorate', 'የሀገር ውስጥ ገቢ ኦዲት ዳይሬክቶሬት'),
      category: 'audit',
      duration: '32 Hours',
      level: tBilingual('Intermediate', 'መካከለኛ'),
      progress: 78,
      badge: 'Risk Engine',
    },
    {
      id: 'c3',
      code: 'MoR-ETH-101',
      title: tBilingual('Public Service Ethics, Integrity & Anti-Corruption', 'የመንግስት ሰራተኞች ስነ-ምግባር እና ፀረ-ሙስና አሰራር'),
      directorate: tBilingual('Ethics & Compliance Directorate', 'የስነ-ምግባር እና ክትትል ዳይሬክቶሬት'),
      category: 'compliance',
      duration: '16 Hours',
      level: tBilingual('Mandatory', 'የግዴታ'),
      progress: 100,
      badge: 'Proclamation 1097',
    },
  ];

  const filtered =
    selectedCategory === 'all'
      ? courses
      : courses.filter((c) => c.category === selectedCategory);

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-sky-600/15 via-blue-700/10 to-amber-500/15 blur-3xl dark:from-sky-500/10 dark:via-blue-800/10 dark:to-amber-500/10" />

      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-2xl shadow-sky-950/10 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-md shadow-sky-700/20">
              <Landmark className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                  {tBilingual('National Revenue Curriculum Console', 'የብሔራዊ ገቢዎች ስልጠና መቆጣጠሪያ')}
                </h3>
                <span className="rounded-md border border-amber-500/30 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  MoR GovCloud
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tBilingual(
                  'Unified syllabus repository for customs, taxation, and legal enforcement',
                  'ለጉምሩክ፣ ታክስ እና ህግ ማስከበር የተዘጋጀ የተዋሃደ ስርአተ-ትምህርት',
                )}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 sm:mt-0">
            <div className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-900/60 dark:bg-sky-950/50">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300">
                {stats?.courses ? `${stats.courses} Active Courses` : 'Dynamic Network'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-3.5 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  selectedCategory === cat.id
                    ? 'bg-sky-600 text-white shadow-sm dark:bg-sky-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-medium text-slate-400">
            {tBilingual('Directive 2026 Compatible', 'በ2018/2026 መመሪያ መሰረት የተዘጋጀ')}
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col justify-between gap-4 p-5 transition hover:bg-sky-50/40 sm:flex-row sm:items-center sm:px-6 dark:hover:bg-slate-800/40"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400">
                    {item.code}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {item.badge}
                  </span>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {item.level}
                  </span>
                </div>
                <h4 className="font-display text-sm font-bold text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.directorate} • {item.duration}
                </p>
              </div>

              <div className="flex items-center gap-6 sm:justify-end">
                <div className="w-36">
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      {tBilingual('Completion', 'ማጠናቀቂያ')}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {item.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        item.progress === 100
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-sky-500 to-blue-600',
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>

                <Link
                  href="/login"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-sky-500 hover:bg-sky-600 hover:text-white dark:border-slate-700 dark:hover:bg-sky-500"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>
              {tBilingual(
                'Accredited through the Ethiopian Civil Service Commission & MoR HR Division',
                'በኢትዮጵያ ሲቪል ሰርቪስ ኮሚሽን እና በገቢዎች የሰው ኃይል ልማት እውቅና የተሰጠው',
              )}
            </span>
          </div>

          <Link
            href="/login"
            className="font-semibold text-sky-700 hover:underline dark:text-sky-400"
          >
            {tBilingual('Access all staff curricula →', 'ሁሉንም የስልጠና ዝርዝሮች ይመልከቱ →')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { tBilingual, lang } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).electronAPI?.isDesktop ||
      (window as any).isElectron ||
      /electron/i.test(navigator.userAgent) ||
      document.documentElement.getAttribute('data-is-desktop') === 'true' ||
      document.documentElement.classList.contains('is-electron')
    );
  });

  useEffect(() => {
    // Detect whether page is running inside Electron desktop shell
    if (
      typeof window !== 'undefined' &&
      ((window as any).electronAPI?.isDesktop ||
        (window as any).isElectron ||
        /electron/i.test(navigator.userAgent) ||
        document.documentElement.getAttribute('data-is-desktop') === 'true')
    ) {
      setIsDesktop(true);
    }

    let cancelled = false;
    fetchLandingStats()
      .then((data) => {
        if (!cancelled && data) {
          setStats(data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const allNavLinks = [
    {
      label: tBilingual('Platform Overview', 'አጠቃላይ እይታ'),
      href: '#capabilities',
    },
    {
      label: tBilingual('Role Workspaces', 'የስራ ድርሻ ቦታዎች'),
      href: '#roles',
    },
    {
      label: tBilingual('Workflow', 'የስራ ሂደት'),
      href: '#how-it-works',
    },
    {
      label: tBilingual('Desktop App', 'የዴስክቶፕ መተግበሪያ'),
      href: '#desktop',
      hideOnDesktop: true,
    },
    {
      label: tBilingual('FAQ', 'ተደጋጋሚ ጥያቄዎች'),
      href: '#faq',
    },
  ];

  const navLinks = isDesktop
    ? allNavLinks.filter((link) => !link.hideOnDesktop)
    : allNavLinks;

  const enterpriseFeatures = [
    {
      icon: BookOpen,
      title: tBilingual('Course Lifecycle Architecture', 'የኮርስ ዝግጅት መዋቅር'),
      description: tBilingual(
        'Author structured, tax-domain curricula composed of multi-tier modules, lesson quizzes, and mandatory compliance checkpoints.',
        'የታክስ እና የጉምሩክ ዘርፍ ሞጁሎችን፣ ፈተናዎችን እና የግዴታ የስልጠና መስፈርቶችን ያካተተ የተደራጀ የትምህርት መዋቅር ይገንቡ።',
      ),
    },
    {
      icon: FileCheck2,
      title: tBilingual('Four-Eye Review & Quality Gates', 'ባለ ሁለት-ደረጃ ይዘት ማጽደቂያ'),
      description: tBilingual(
        'Enforce institutional accountability. Content authors submit drafts directly to designated Directorates for rigorous approval before broadcast.',
        'ስልጠናዎች ለሰራተኞች ከመሰራጨታቸው በፊት በተመደቡ የይዘት አጽዳቂዎች እና የስራ ኃላፊዎች ጥራታቸው ተረጋግጦ ይጸድቃል።',
      ),
    },
    {
      icon: CalendarRange,
      title: tBilingual('Synchronous & Virtual Classroom', 'የቀጥታ ስልጠና እና መርሃ-ግብር'),
      description: tBilingual(
        'Host scheduled webinars with automated biometric/credentialed attendance tracking, interactive slides, and branch-wide broadcast capabilities.',
        'ስልጠናዎችን በጊዜ ሰሌዳ ያቅዱ፤ ተሳትፎን በስርዓቱ በኩል በራስ-ሰር ይከታተሉ፤ የቀጥታ ትምህርቶችንም ያካሂዱ።',
      ),
    },
    {
      icon: BarChart3,
      title: tBilingual('Auditable Competency Analytics', 'የብቃት እና ሂደት ክትትል'),
      description: tBilingual(
        'Real-time dashboards aggregate completion rates, assessment scores, and training progress filtered by branch office and employee role.',
        'በቅርንጫፍ መስሪያ ቤት እና በስራ መደብ የተከፋፈለ የተማሪዎችን ውጤት፣ ማጠናቀቂያ እና የተቋም አቅም ግንባታ ሂደት ይከታተሉ።',
      ),
    },
    {
      icon: Award,
      title: tBilingual('Cryptographically Signed Certs', 'የተረጋገጡ ዲጂታል ሰርተፍኬቶች'),
      description: tBilingual(
        'Generate tamper-evident, verifiable certificates featuring unique institutional serials and QR-verifiable authenticity codes.',
        'የተጭበረበረ ሰርተፍኬት እንዳይኖር የሚያግዝ፣ በልዩ መለያ ቁጥር እና በQR ኮድ የሚረጋገጥ ዲጂታል ሰርተፍኬት በራስ-ሰር ያመንጩ።',
      ),
    },
    {
      icon: ShieldCheck,
      title: tBilingual('Gov-Grade Access & Audit Logs', 'የመንግስት ደረጃ ደህንነት እና ቁጥጥር'),
      description: tBilingual(
        'Granular role-based controls (RBAC) ensure strict principle of least privilege alongside immutable audit trails for ministry compliance.',
        'ጥብቅ በሆነ የስራ ድርሻ ፈቃድ እና በዝርዝር የኦዲት መዝገብ የተደገፈ አስተማማኝ የመረጃ ደህንነት ጥበቃ።',
      ),
    },
  ];

  const roleWorkspaces = [
    {
      id: 'owner',
      title: tBilingual('Course Owner', 'የኮርስ ባለቤት'),
      badge: tBilingual('Curriculum Authoring', 'ስርአተ-ትምህርት ዝግጅት'),
      headline: tBilingual(
        'Curate, structure, and stage authoritative revenue training modules.',
        'የገቢዎች ዘርፍ የስልጠና ሞጁሎችን ያዘጋጁ እና ያደራጁ።',
      ),
      description: tBilingual(
        'Course owners construct interactive syllabus outlines, embed SCORM/video assets, define multiple-choice or scenario evaluations, and forward finalized drafts to quality approvers.',
        'የኮርስ ባለቤቶች የትምህርት እቅዶችን ያዘጋጃሉ፤ ቪዲዮዎችን እና ሰነዶችን ያካትታሉ፤ ፈተናዎችን በማዘጋጀት ለግምገማ ያቀርባሉ።',
      ),
      icon: BookOpen,
      highlights: [
        tBilingual('Drag-and-drop module hierarchy', 'ቀላል የሞጁል አደረጃጀት'),
        tBilingual('Rich assessment builder with passing scores', 'የፈተና እና ውጤት ማስተካከያ'),
        tBilingual('Draft state isolation & review queues', 'የረቂቅ እና ግምገማ ዝርዝር'),
      ],
    },
    {
      id: 'approver',
      title: tBilingual('Content Approver', 'ይዘት አጽዳቂ'),
      badge: tBilingual('Compliance & Verification', 'ህጋዊነት እና ጥራት ቁጥጥር'),
      headline: tBilingual(
        'Maintain regulatory precision, legal validity, and MoR training standards.',
        'የስልጠና ይዘቱን ህጋዊነት፣ ጥራት እና የተቋም መመሪያዎችን ያረጋግጡ።',
      ),
      description: tBilingual(
        'Content approvers inspect proposed courses against Ministry regulations and tax proclamation amendments. Courses can be rejected with structured editorial feedback or approved for catalog deployment.',
        'ኮርሶች በቅርብ የወጡ የግብር አዋጆችን እና የተቋሙን መመሪያዎች ማሟላታቸውን ገምግመው አስተያየት በመስጠት ያጸድቃሉ ወይም እንዲስተካከሉ ይመልሳሉ።',
      ),
      icon: BadgeCheck,
      highlights: [
        tBilingual('Side-by-side revision audit', 'የይዘት ማነጻጸሪያ እና ግምገማ'),
        tBilingual('Actionable correction annotations', 'የማስተካከያ ማስታወሻ መስጫ'),
        tBilingual('Sign-off digital audit log', 'ህጋዊ የይሁንታ ማረጋገጫ'),
      ],
    },
    {
      id: 'admin',
      title: tBilingual('Training Admin', 'የስልጠና አስተዳዳሪ'),
      badge: tBilingual('Logistics & Enrollment', 'የስልጠና መርሃ-ግብር እና ምዝገባ'),
      headline: tBilingual(
        'Coordinate national cohorts, branch scheduling, and institutional quotas.',
        'የሰራተኞችን የስልጠና ምደባ፣ መርሃ-ግብር እና የቅርንጫፍ ኮታዎችን ያስተዳድሩ።',
      ),
      description: tBilingual(
        'Training admins map active curricula into live semester sessions, target specific staff directorates, monitor room or bandwidth capacities, and track enterprise participation trends.',
        'ስልጠናዎችን በወቅቱ ካላንደር ይመድባሉ፤ ለተወሰኑ ዳይሬክቶሬቶች ስልጠና ያሰራጫሉ፤ የመሳተፊያ አቅምን ይቆጣጠራሉ።',
      ),
      icon: CalendarRange,
      highlights: [
        tBilingual('Batch staff enrollment by department', 'በየክፍሉ በቡድን የመመዝገቢያ ዘዴ'),
        tBilingual('Session calendar & reminder automation', 'የቀን መቁጠሪያ እና የማስታወሻ መልእክቶች'),
        tBilingual('Directorate completion quotas', 'የዳይሬክቶሬቶች የማጠናቀቂያ ኮታ'),
      ],
    },
    {
      id: 'trainer',
      title: tBilingual('Trainer / Instructor', 'አሰልጣኝ / መምህር'),
      badge: tBilingual('Classroom Facilitation', 'የቀጥታ ስልጠና መምሪያ'),
      headline: tBilingual(
        'Lead interactive live sessions, grade assignments, and mentor staff cohorts.',
        'የቀጥታ ስልጠናዎችን ይመሩ፣ የተግባር ስራዎችን ይመዝኑ እና ሰልጣኞችን ያግዙ።',
      ),
      description: tBilingual(
        'Trainers conduct virtual seminars, initiate dynamic Q&As, verify attendance records in real time, and deliver rapid evaluations on submitted case studies.',
        'አሰልጣኞች የቀጥታ ስልጠናዎችን ያካሂዳሉ፤ ጥያቄ እና መልሶችን ይመራሉ፤ የተሰጡ የተግባር ስራዎችን እና ፈተናዎችን ያርማሉ።',
      ),
      icon: Presentation,
      highlights: [
        tBilingual('Live session console with presence sync', 'የቀጥታ ስብሰባ እና የተሳትፎ መቆጣጠሪያ'),
        tBilingual('Direct learner grading & rubric feedback', 'የፈተና ውጤት እና ማብራሪያ መስጫ'),
        tBilingual('Live poll & knowledge pulse checks', 'የፈጣን ግንዛቤ መፈተሻ ጥያቄዎች'),
      ],
    },
    {
      id: 'learner',
      title: tBilingual('MoR Staff / Learner', 'የገቢዎች ሰራተኛ / ሰልጣኝ'),
      badge: tBilingual('Continuous Upskilling', 'የሙያ ማሻሻያ'),
      headline: tBilingual(
        'Personalized workspace for career development and statutory accreditation.',
        'ለሙያዊ እድገት እና ለተቋማዊ እውቅና የተዘጋጀ የተማሪዎች መድረክ።',
      ),
      description: tBilingual(
        'Ministry employees track required compliance coursework, participate in webinars, access offline study materials, and download their verified qualification credentials.',
        'ሰራተኞች የተመደቡላቸውን ኮርሶች ይወስዳሉ፤ በቀጥታ ስልጠናዎች ይሳተፋሉ፤ ትምህርቱን ሲያጠናቅቁም እውቅና ያለው ሰርተፍኬት ያገኛሉ።',
      ),
      icon: GraduationCap,
      highlights: [
        tBilingual('Self-paced progress bookmarking', 'የትምህርት ሂደትን በቀላሉ የመቀጠያ ዘዴ'),
        tBilingual('Interactive self-assessment quizzes', 'የራስን ግንዛቤ መፈተሻ ፈተናዎች'),
        tBilingual('Downloadable tamper-proof diploma', 'ሊወርድ የሚችል የታመነ ሰርተፍኬት'),
      ],
    },
    {
      id: 'sysadmin',
      title: tBilingual('System Administrator', 'የስርዓት አስተዳዳሪ'),
      badge: tBilingual('Platform Governance', 'የስርዓት አስተዳደር እና ቁጥጥር'),
      headline: tBilingual(
        'Enterprise directory sync, system telemetry, and audit readiness.',
        'የተጠቃሚዎች ማዕከላዊ አስተዳደር፣ የቴክኒክ ክትትል እና የደህንነት ኦዲት።',
      ),
      description: tBilingual(
        'System administrators manage Active Directory/LDAP single sign-on integration, assign hierarchical permission roles, audit critical system mutations, and supervise operational uptime.',
        'የተጠቃሚዎችን ፈቃድ ያስተካክላሉ፤ የመረጃ ደህንነትን ይቆጣጠራሉ፤ የስርዓቱን ቀጣይነት ያለው አገልግሎት ያረጋግጣሉ።',
      ),
      icon: ShieldCheck,
      highlights: [
        tBilingual('Institutional RBAC enforcement', 'የስራ ድርሻ ፈቃድ መቆጣጠሪያ'),
        tBilingual('Comprehensive system access logs', 'ዝርዝር የተጠቃሚዎች እንቅስቃሴ መዝገብ'),
        tBilingual('Database retention & backup controls', 'የመረጃ ቋት ጥበቃ እና መጠባበቂያ'),
      ],
    },
  ];

  const workflowSteps = [
    {
      num: '01',
      title: tBilingual('Curriculum Authoring', 'የስልጠና ይዘት ማዘጋጀት'),
      description: tBilingual(
        'Subject matter experts and Course Owners structure modules, lessons, and diagnostic assessments.',
        'የዘርፉ ባለሙያዎች እና የኮርስ አዘጋጆች ሞጁሎችን፣ ትምህርቶችን እና የሙከራ ፈተናዎችን ያዘጋጃሉ።',
      ),
      icon: BookOpen,
    },
    {
      num: '02',
      title: tBilingual('Regulatory Review', 'ህጋዊ ግምገማና ማጽደቅ'),
      description: tBilingual(
        'Directorate approvers evaluate accuracy, aligning material with modern tax laws and directives.',
        'አጽዳቂዎች የትምህርቱን ትክክለኛነት ከወቅታዊ የታክስ አዋጆች እና መመሪያዎች ጋር አገናዝበው ያረጋግጣሉ።',
      ),
      icon: BadgeCheck,
    },
    {
      num: '03',
      title: tBilingual('Cohort Deployment', 'የመርሃ-ግብር ስርጭት'),
      description: tBilingual(
        'Admins publish verified courses, enroll target branches, and schedule live trainer-led sessions.',
        'አስተዳዳሪዎች የጸደቁትን ኮርሶች ለቅርንጫፎች ይመድባሉ፤ የቀጥታ ስልጠና መርሃ-ግብርም ያወጣሉ።',
      ),
      icon: CalendarRange,
    },
    {
      num: '04',
      title: tBilingual('Accreditation & Audit', 'ፈተና እና ሰርተፍኬት'),
      description: tBilingual(
        'Staff complete milestones, verify comprehension through quizzes, and earn verifiable credentials.',
        'ሰራተኞች ስልጠናውን አጠናቀው ፈተናዎችን በማለፍ እውቅና ያለው ዲጂታል ሰርተፍኬት ያገኛሉ።',
      ),
      icon: Award,
    },
  ];

  const faqs = [
    {
      question: tBilingual(
        'What is the Ministry of Revenues Learning Management System (MoR LMS)?',
        'የገቢዎች ሚኒስቴር የስልጠና ማስተዳደሪያ ስርዓት (MoR LMS) ምንድን ነው?',
      ),
      answer: tBilingual(
        'The MoR LMS is the official, dedicated enterprise e-learning ecosystem built specifically for the Ministry of Revenues of Ethiopia. It standardizes institutional learning across nationwide branches, providing structured curriculum authoring, legal review gates, synchronous virtual classes, and auditable staff certification.',
        'የገቢዎች ሚኒስቴር የስልጠና ማስተዳደሪያ ስርዓት (MoR LMS) በመላ አገሪቱ ላሉ የገቢዎች ሚኒስቴር ሰራተኞች የተዘጋጀ ይፋዊ የስልጠና መድረክ ነው። የኮርስ ዝግጅትን፣ የይዘት ማጽደቅን፣ የቀጥታ ስልጠናን፣ የፈተና እና የተረጋገጠ ሰርተፍኬት አሰጣጥን በአንድ ቋት ያቀናጃል።',
      ),
    },
    {
      question: tBilingual(
        'How does the multi-tier role authorization model operate?',
        'የስራ ድርሻ ፈቃድ አሰጣጥ (RBAC) እንዴት ነው የሚሰራው?',
      ),
      answer: tBilingual(
        'Access is governed by the Principle of Least Privilege across 6 distinct profiles: Course Owners, Content Approvers, Training Administrators, Trainers, Learners, and System Administrators. Each user authenticates directly into a personalized workspace tailored precisely to their administrative jurisdiction.',
        'ስርዓቱ በ6 የተከፋፈሉ የስራ ድርሻዎች የተገነባ ነው፦ የኮርስ ባለቤት፣ ይዘት አጽዳቂ፣ የስልጠና አስተዳዳሪ፣ አሰልጣኝ፣ ተማሪ እና የስርዓት አስተዳዳሪ። እያንዳንዱ ተጠቃሚ በተመደበለት ኃላፊነት ልክ የተዘጋጀ የስራ ገጽ ያገኛል።',
      ),
    },
    {
      question: tBilingual(
        'How are digital certificates validated against tampering?',
        'የተሰጡ ሰርተፍኬቶች ትክክለኛነት እንዴት ይረጋገጣል?',
      ),
      answer: tBilingual(
        'Every awarded certificate contains a cryptographically stamped serial number and a public verification link. Third-party verifiers or internal HR teams can instantly check qualification authenticity without contacting platform technicians.',
        'እያንዳንዱ ሰርተፍኬት ልዩ የመለያ ቁጥር እና ፈጣን የQR ኮድ ማረጋገጫ የያዘ በመሆኑ ማንም ሰው ወይም የሰው ኃይል አስተዳደር ክፍል የሰነዱን ትክክለኛነት በቀላሉ ማረጋገጥ ይችላል።',
      ),
    },
    {
      question: tBilingual(
        'Is the platform fully available in Amharic and English?',
        'መድረኩ በአማርኛ እና በእንግሊዝኛ ሙሉ በሙሉ ይሰራል?',
      ),
      answer: tBilingual(
        'Yes. The system is architected with bilingual localization across all user touchpoints — including navigation controls, administrative dashboards, data grids, and localized certificate typography.',
        'አዎ። መድረኩ በዳሽቦርዶች፣ በምናሌዎች፣ በኮርሶች እና በሰርተፍኬት ህትመት ላይ እንግሊዝኛን እና አማርኛን በእኩል ደረጃ ይደግፋል።',
      ),
    },
  ];

  const currentRole = roleWorkspaces[activeRoleIndex];

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-700 antialiased selection:bg-sky-600 selection:text-white dark:bg-slate-950 dark:text-slate-300">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.05]" />

      {/* INSTITUTIONAL STATUS BANNER */}
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-amber-50/50 px-4 py-2 text-center text-xs font-medium text-sky-950 dark:border-slate-800 dark:from-slate-950 dark:via-sky-950/20 dark:to-slate-950 dark:text-sky-300">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <Landmark className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            {tBilingual(
              'Federal Democratic Republic of Ethiopia • Ministry of Revenues Enterprise LMS',
              'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ • የገቢዎች ሚኒስቴር የስልጠና ማዕከል',
            )}
          </span>
        </div>
      </div>

      {/* TOPBAR NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Ministry of Revenues"
              width={42}
              height={42}
              className="h-10 w-10 object-contain"
              priority
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold tracking-tight text-slate-950 dark:text-white">
                  MoR LMS
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-amber-900 border border-amber-300/50 dark:bg-amber-950 dark:text-amber-300">
                  GOV
                </span>
              </div>
              <p className="text-[10px] font-medium text-sky-800 dark:text-sky-400">
                {tBilingual('Ministry of Revenues', 'የገቢዎች ሚኒስቴር')}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
<nav className="hidden items-center gap-8 lg:flex">
  {navLinks.map((link) => (
    <a
      key={link.href}
      href={link.href}
      {...(link.hideOnDesktop ? { 'data-desktop-app-only': 'true' } : {})}
      className="text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-400"
    >
      {link.label}
    </a>
  ))}
</nav>

          {/* Controls & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <LanguageToggle />
            <ThemeToggle isAmharic={lang === 'am'} />

            <Link
              href="/login"
              className="rounded-xl border border-slate-300/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {tBilingual('Sign In', 'ግባ')}
            </Link>

            <Link
              href="/login"
              className="hidden rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition hover:from-sky-500 hover:to-blue-600 active:scale-95 sm:inline-flex"
            >
              {tBilingual('Get Started', 'ስርዓቱን ጀምር')}
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden dark:border-slate-800 dark:text-slate-300"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  {...(link.hideOnDesktop ? { 'data-desktop-app-only': 'true' } : {})}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full rounded-xl bg-sky-600 py-2.5 text-center text-xs font-semibold text-white shadow-md"
                >
                  {tBilingual('Get Started', 'ስርዓቱን ጀምር')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-800 shadow-sm backdrop-blur dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <span>
                {tBilingual(
                  'Unified National Tax & Customs Training Platform',
                  'ሀገር አቀፍ የገቢዎች እና የጉምሩክ ስልጠና መድረክ',
                )}
              </span>
            </div>

            <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
              {tBilingual(
                'Enterprise learning built for the ',
                'ለተቋማዊ ብቃት የተገነባ ዘመናዊ ',
              )}
              <span className="bg-gradient-to-r from-sky-600 via-blue-700 to-amber-500 bg-clip-text text-transparent dark:from-sky-400 dark:via-blue-400 dark:to-amber-400">
                {tBilingual(
                  'Ministry of Revenues',
                  'የገቢዎች ሚኒስቴር የስልጠና ስርዓት',
                )}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
              {tBilingual(
                'A single standardized infrastructure bridging course authoring, multi-level editorial approvals, synchronous video training, and tamper-proof civil service certification across all directorates.',
                'የኮርስ ዝግጅትን፣ ጥብቅ የይዘት ግምገማና ማጽደቅን፣ የቀጥታ ስልጠናዎችን፣ የፈተና እና የተረጋገጡ ዲጂታል ሰርተፍኬት አሰጣጥን በሁሉም ዳይሬክቶሬቶች ውስጥ የሚያስተሳስር ማዕከላዊ መድረክ።',
              )}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-700/25 transition hover:from-sky-500 hover:to-blue-600 active:scale-[0.98]"
              >
                {tBilingual('Sign In to Platform', 'ወደ ስርዓቱ ይግቡ')}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>

              <a
                href="#roles"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300/90 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {tBilingual('Explore Workspaces', 'የስራ ድርሻዎችን ይመልከቱ')}
              </a>
            </div>

            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                tBilingual('6 Strict RBAC Roles', '6 የተለዩ የስራ ድርሻዎች'),
                tBilingual('Proclamation Aligned', 'ከአዋጆች ጋር የተጣጣመ'),
                tBilingual('Audited Completion Logs', 'የተረጋገጠ የኦዲት መዝገብ'),
                tBilingual('Amharic & English', 'በአማርኛ እና እንግሊዝኛ'),
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/60 px-3 py-2 text-xs font-medium text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  <Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 sm:mt-20">
            <DynamicTrainingExplorer stats={stats} />
          </div>
        </div>
      </section>

      {/* METRICS STRIP */}
      <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 lg:grid-cols-4">
          {[
            {
              value: stats ? `${stats.courses}+` : '60+',
              label: tBilingual('Accredited Courses', 'የተዘጋጁ ኮርሶች'),
              desc: tBilingual('Tax, Customs & Policy', 'ታክስ፣ ጉምሩክ እና ህግጋት'),
            },
            {
              value: stats ? `${stats.staff}+` : '3,500+',
              label: tBilingual('Active MoR Personnel', 'ንቁ ሰራተኞች'),
              desc: tBilingual('Across all regional branches', 'በሁሉም ቅርንጫፎች'),
            },
            {
              value: stats ? `${stats.sessions}+` : '120+',
              label: tBilingual('Live Sessions Completed', 'የተካሄዱ የቀጥታ ስልጠናዎች'),
              desc: tBilingual('Trainer-led interactive', 'በአሰልጣኞች የተመሩ'),
            },
            {
              value: stats ? `${stats.certificates}+` : '2,100+',
              label: tBilingual('Verifiable Credentials', 'የተሰጡ ሰርተፍኬቶች'),
              desc: tBilingual('QR authenticated', 'በQR የተረጋገጡ'),
            },
          ].map((item) => (
            <div key={item.label} className="p-6 text-center lg:py-8">
              <p className="font-display text-3xl font-extrabold tracking-tight text-sky-700 dark:text-sky-400 sm:text-4xl">
                {item.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-200 sm:text-sm">
                {item.label}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORM CAPABILITIES */}
      <section id="capabilities" className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {tBilingual('Enterprise Architecture', 'የስርዓቱ ዋና ዋና ክፍሎች')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {tBilingual(
                'Built for institutional governance and scale',
                'ለተቋማዊ ግልጽነትና ቀጣይነት የተገነባ',
              )}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
              {tBilingual(
                'Replace scattered spreadsheets and unverified video files with a unified, legally accountable training environment.',
                'የተበታተኑ ፋይሎችን እና ያልተረጋገጡ አሰራሮችን በአንድ ተቋማዊና ህጋዊ የስልጠና ስርዓት ይተኩ።',
              )}
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {enterpriseFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group relative rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-sky-800"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition group-hover:bg-sky-600 group-hover:text-white dark:bg-sky-950/50 dark:text-sky-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-base font-bold text-slate-950 dark:text-white">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* INTERACTIVE ROLE SHOWCASE */}
      <section
        id="roles"
        className="scroll-mt-16 border-y border-slate-200 bg-slate-100/60 px-4 py-20 dark:border-slate-800 dark:bg-slate-900/40 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {tBilingual('Role Separation', 'የስራ ድርሻ ክፍፍል')}
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {tBilingual(
                'Six tailored workspaces in harmony',
                'ስድስት የተለያዩ የስራ ክፍሎች በአንድ ላይ ሲሰሩ',
              )}
            </h2>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              {tBilingual(
                'Select any role below to examine its dedicated controls, approval gates, and administrative views.',
                'የእያንዳንዱን የስራ ድርሻ ኃላፊነት እና መሳሪያዎች ለመመልከት ከታች ካሉት ሚናዎች አንዱን ይምረጡ።',
              )}
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {roleWorkspaces.map((role, idx) => {
              const active = idx === activeRoleIndex;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setActiveRoleIndex(idx)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition',
                    active
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  <role.icon className="h-4 w-4" />
                  <span>{role.title}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-8 sm:p-12">
                <div className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <currentRole.icon className="h-3.5 w-3.5" />
                  {currentRole.badge}
                </div>

                <h3 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {currentRole.headline}
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                  {currentRole.description}
                </p>

                <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                    {tBilingual('Core Operational Capabilities', 'ዋና ዋና ተግባራት')}
                  </h4>
                  <ul className="mt-4 space-y-3">
                    {currentRole.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-center gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0 dark:text-sky-400" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400"
                  >
                    <span>{tBilingual(`Access ${currentRole.title} Console`, `ወደ ${currentRole.title} መቆጣጠሪያ ይግቡ`)}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <div className="flex flex-col justify-center border-t border-slate-200 bg-slate-900 p-8 text-white lg:border-l lg:border-t-0 dark:border-slate-800">
                <div className="rounded-xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <currentRole.icon className="h-4 w-4 text-sky-400" />
                      <span className="font-mono text-xs font-semibold text-slate-200">
                        {currentRole.title} Console
                      </span>
                    </div>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      AUTHENTICATED
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        {tBilingual('Active Duty Queue', 'የስራ ሂደት ዝርዝር')}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-200">
                        {tBilingual('Direct access to assigned directorate tasks', 'የተመደቡ የስራ ኃላፊነቶች ቀጥታ መዳረሻ')}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        {tBilingual('Directorate Node', 'የዳይሬክቶሬት ክፍል')}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-200">
                        {tBilingual('Federal Headquarters • Tax & Customs Audit', 'ዋናው መስሪያ ቤት • ታክስ እና ጉምሩክ')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 p-3">
                      <p className="text-[10px] font-semibold text-sky-300">
                        {tBilingual('Security Token Validated', 'የደህንነት ፈቃድ ተረጋግጧል')}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        MoR Internal PKI Session Active
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STRUCTURED WORKFLOW */}
      <section id="how-it-works" className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {tBilingual('Standard Operating Procedure', 'የአሰራር ሂደት ደረጃዎች')}
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {tBilingual(
                'From curriculum drafting to verified diploma',
                'ከኮርስ ዝግጅት እስከ ተረጋገጠ ሰርተፍኬት',
              )}
            </h2>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              {tBilingual(
                'A four-stage lifecycle designed around civil service governance, accountability, and pedagogical excellence.',
                'የስልጠና ጥራትን እና ተቋማዊ ተጠያቂነትን የሚያረጋግጡ አራት ወሳኝ የስራ ሂደቶች።',
              )}
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="relative rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-mono text-2xl font-black text-slate-300 dark:text-slate-700">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-base font-bold text-slate-950 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WINDOWS DESKTOP APP SECTION - ONLY SHOWN ON WEB */}
{!isDesktop && (
  <section
    id="desktop"
    data-desktop-app-only="true"
    className="scroll-mt-16 px-4 py-16 sm:px-6 lg:px-8"
  >
    <div className="mx-auto max-w-6xl">
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/60 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 p-8 text-white shadow-2xl sm:p-12 lg:p-16">
        {/* Decorative Background */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT SIDE */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300">
              <Monitor className="h-3.5 w-3.5" />

              <span>
                {tBilingual(
                  "Enterprise Client",
                  "የተቋም ዴስክቶፕ መተግበሪያ",
                )}
              </span>
            </div>

            {/* Heading */}
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {tBilingual(
                "MoR LMS for Windows Workstations",
                "የMoR LMS መተግበሪያ ለ Windows ኮምፒውተሮች",
              )}
            </h2>

            {/* Description */}
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              {tBilingual(
                "Engineered for Ministry branch training facilities and designed to provide a reliable desktop learning experience. The Windows client can support offline learning, local content caching, and controlled examination environments.",
                "በሚኒስቴሩ የቅርንጫፍ መስሪያ ቤቶች እና የስልጠና ክፍሎች ውስጥ ፈጣን፣ አስተማማኝ እና ቀላል የስልጠና ልምድ ለመስጠት የተዘጋጀ የWindows ዴስክቶፕ መተግበሪያ ነው።",
              )}
            </p>

            {/* Features */}
            <div className="mt-6 grid grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-2">
              {/* Windows Compatibility */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />

                <span>
                  {tBilingual(
                    "Windows 10 / 11 64-bit",
                    "ለ Windows 10 እና 11 64-bit",
                  )}
                </span>
              </div>

              {/* Exam Mode */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />

                <span>
                  {tBilingual(
                    "Secure Exam Kiosk Mode",
                    "አስተማማኝ የፈተና ሁኔታ",
                  )}
                </span>
              </div>

              {/* Offline Cache */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />

                <span>
                  {tBilingual(
                    "Local Course Caching",
                    "ኮርሶችን አውርዶ በአካባቢው የመያዝ አቅም",
                  )}
                </span>
              </div>

              {/* Installer */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />

                <span>
                  {tBilingual(
                    "Windows Installer",
                    "የWindows መጫኛ ፋይል",
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - DOWNLOAD CARD */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur sm:p-8">
            {/* Download Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg">
              <Download className="h-8 w-8" />
            </div>

            {/* Installer Name */}
            <h4 className="mt-4 font-display text-lg font-bold text-white">
              MoR-LMS-Setup.exe
            </h4>

            {/* Version */}
            <p className="mt-1 text-xs text-slate-400">
              {tBilingual(
                "Version 2.4.0 • Windows Installer",
                "ስሪት 2.4.0 • የWindows መጫኛ ፋይል",
              )}
            </p>

            {/* Download Button */}
            <a
              href="/downloads/MoR-LMS-Setup.exe"
              download
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs font-bold text-slate-950 shadow-md transition hover:bg-slate-100 active:scale-95"
            >
              <Download className="h-4 w-4" />

              <span>
                {tBilingual(
                  "Download for Windows",
                  "ለ Windows ያውርዱ",
                )}
              </span>
            </a>

            {/* Additional Information */}
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
              {tBilingual(
                "Compatible with supported 64-bit Windows workstations.",
                "ከሚደገፉ 64-bit Windows ኮምፒውተሮች ጋር ይሰራል።",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
)}

      {/* INSTITUTIONAL SECURITY / GOVERNANCE */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-12 lg:p-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {tBilingual(
                    'Enterprise Compliance & Data Sovereignty',
                    'የተቋም ደህንነት፣ ህጋዊነት እና የመረጃ ባለቤትነት',
                  )}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {tBilingual(
                    'Built to adhere strictly to Ethiopian Federal Data Privacy laws, Ministry operational frameworks, and internal audit policies.',
                    'የስርዓቱ የመረጃ አያያዝ እና ጥበቃ የፌዴራል የመረጃ ደህንነት መመሪያዎችን እና የገቢዎች ሚኒስቴርን የአሰራር ደንቦች ሙሉ በሙሉ ያሟላል።',
                  )}
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    {
                      title: tBilingual('Immutable Audit Logs', 'የማይፋቁ የኦዲት መዝገቦች'),
                      desc: tBilingual('Every grade modification and sign-off is logged indefinitely.', 'ሁሉም የውጤት እና የይዘት ለውጦች በቋሚነት ይመዘገባሉ።'),
                    },
                    {
                      title: tBilingual('Role Separation of Duties', 'የስራ ድርሻ ክፍፍል'),
                      desc: tBilingual('Creators cannot approve their own educational submissions.', 'አዘጋጆች ያዘጋጁትን ይዘት ራሳቸው ማጽደቅ አይችሉም።'),
                    },
                  ].map((p) => (
                    <div key={p.title} className="flex gap-3">
                      <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{p.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-center border-t border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-950/50 sm:p-12">
                <div className="space-y-4">
                  {[
                    { label: tBilingual('Database Encryption', 'የመረጃ ቋት ምስጠራ'), value: 'AES-256 bit' },
                    { label: tBilingual('Transport Security', 'የመረጃ ልውውጥ ደህንነት'), value: 'TLS 1.3 Strict' },
                    { label: tBilingual('Identity Access', 'የመግቢያ ፈቃድ'), value: 'Granular RBAC' },
                    { label: tBilingual('Hosting Environment', 'የማስተናገጃ ሁኔታ'), value: 'MoR Private Data Center' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-xs font-medium dark:border-slate-800 dark:bg-slate-900">
                      <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
                      <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="scroll-mt-16 border-t border-slate-200 bg-slate-50/50 px-4 py-20 dark:border-slate-800 dark:bg-slate-900/30 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {tBilingual('Clear Answers', 'ግልጽ ማብራሪያዎች')}
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {tBilingual('Frequently Asked Questions', 'ተደጋጋሚ ጥያቄዎች')}
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {tBilingual('Key operational and technical questions regarding the platform.', 'ስለ ስርዓቱ አሰራር እና ቴክኒካዊ ሁኔታ የተለመዱ ጥያቄዎች።')}
            </p>
          </div>

          <div className="mt-12 space-y-3">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className={cn(
                    'overflow-hidden rounded-2xl border transition',
                    open
                      ? 'border-sky-300 bg-sky-50/30 dark:border-sky-900/80 dark:bg-sky-950/20'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-bold text-slate-950 dark:text-white"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                        open && 'rotate-180 text-sky-600 dark:text-sky-400',
                      )}
                    />
                  </button>

                  {open && (
                    <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
<footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
      {/* BRAND */}
      <div className="flex items-center gap-3">
        <Image
          src="/logo.jpg"
          alt="Ministry of Revenues"
          width={38}
          height={38}
          className="h-9 w-9 object-contain"
        />

        <div>
          <p className="font-display text-sm font-bold text-slate-950 dark:text-white">
            MoR LMS
          </p>

          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {tBilingual(
              "Ministry of Revenues • Ethiopia",
              "የገቢዎች ሚኒስቴር • ኢትዮጵያ",
            )}
          </p>
        </div>
      </div>

      {/* FOOTER NAVIGATION */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500 dark:text-slate-400">
        <a
          href="#capabilities"
          className="transition hover:text-sky-700 dark:hover:text-sky-400"
        >
          {tBilingual("Capabilities", "ችሎታዎች")}
        </a>

        <a
          href="#roles"
          className="transition hover:text-sky-700 dark:hover:text-sky-400"
        >
          {tBilingual("Roles", "የስራ ድርሻዎች")}
        </a>

        <a
          href="#how-it-works"
          className="transition hover:text-sky-700 dark:hover:text-sky-400"
        >
          {tBilingual("Workflow", "የስራ ሂደት")}
        </a>

        {/* Windows Client - Web Only */}
        {!isDesktop && (
          <a
            href="#desktop"
            data-desktop-app-only="true"
            className="transition hover:text-sky-700 dark:hover:text-sky-400"
          >
            {tBilingual(
              "Windows Client",
              "የዴስክቶፕ መተግበሪያ",
            )}
          </a>
        )}

        {/* Sign In */}
        <Link
          href="/login"
          className="transition hover:text-sky-700 dark:hover:text-sky-400"
        >
          {tBilingual("Sign In", "መግቢያ")}
        </Link>
      </div>

      {/* COPYRIGHT */}
      <p className="text-center text-[11px] text-slate-400 sm:text-right">
        © {new Date().getFullYear()}{" "}
        {tBilingual(
          "Ministry of Revenues. All rights reserved.",
          "የገቢዎች ሚኒስቴር። መብቱ በህግ የተጠበቀ ነው።",
        )}
      </p>
    </div>
  </div>
</footer>
    </main>
  );
}