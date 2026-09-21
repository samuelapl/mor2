/**
 * Comprehensive Reseed Script for MoR LMS:
 * Creates exactly 6 courses:
 *   • 2 PUBLISHED (MOR-FDN-101, TAX-AUD-201) — enrolled for learner@gmail.com
 *   • 2 APPROVED (CYBER-SEC-301, ETH-PUB-102) — approved by approver@gmail.com
 *   • 2 PENDING_APPROVAL (LEAD-MGT-202, DATA-ANA-203) — pending in approver@gmail.com queue
 *
 * Each course includes:
 *   • Cover thumbnail pointing to "/sample.jpg" (frontend/public/sample.jpg)
 *   • Full curriculum (2 modules per course, 2 detailed lessons per module)
 *   • Rich, practical, detailed markdown lesson notes for realistic learner reading
 *   • Module-level assessments (MODULE_ASSESSMENT) for knowledge checks
 *   • Final course assessments (FINAL_ASSESSMENT) for completion certification
 *   • Course questions and global reusable questions seeded into question_bank_questions table
 *   • Fully wired to demo accounts: owner@gmail.com, trainer@gmail.com, approver@gmail.com, learner@gmail.com
 *
 * Run: npm run reseed:courses (or npx ts-node prisma/seed-courses.ts)
 */

import {
  ApprovalStatus,
  AssessmentType,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  LessonContentType,
  Prisma,
  PrismaClient,
  QuestionType,
  RoleName,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const COVER = '/sample.jpg';

interface LessonData {
  titleEn: string;
  titleAm: string;
  contentType: LessonContentType;
  durationMinutes: number;
  order: number;
  contentEn: string;
  contentAm: string;
}

interface AssessmentQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  correctAnswer: number | string | null;
  points: number;
  category?: string;
}

interface AssessmentData {
  titleEn: string;
  titleAm: string;
  passingScore: number;
  timeLimitMinutes: number;
  questions: AssessmentQuestion[];
}

interface ModuleData {
  titleEn: string;
  titleAm: string;
  descriptionEn: string;
  descriptionAm: string;
  order: number;
  lessons: LessonData[];
  assessment: AssessmentData;
}

interface CourseData {
  code: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string;
  descriptionAm: string;
  level: CourseLevel;
  status: CourseStatus;
  estimatedHours: number;
  category: string;
  department: string;
  modules: ModuleData[];
  finalAssessment: AssessmentData;
}

const coursesToSeed: CourseData[] = [
  // ─────────────────────────────────────────────────────────
  // 1. PUBLISHED: Management of Risk (M_o_R®) Foundation
  // ─────────────────────────────────────────────────────────
  {
    code: 'MOR-FDN-101',
    titleEn: 'Management of Risk (M_o_R®) Foundation in Revenue Operations',
    titleAm: 'በገቢዎች ስራዎች የአደጋ እና ስጋት አስተዳደር (M_o_R®) መሰረታዊ መርሆዎች',
    descriptionEn:
      'A comprehensive foundation in public sector risk governance, probabilistic risk modeling, mitigation registers, and systematic risk response planning for revenue administrators.',
    descriptionAm:
      'የህዝብ ዘርፍ የአደጋ አስተዳደር፣ የስጋት መለኪያ፣ የመቀነሻ መዝገቦች እና ስልታዊ የአደጋ ምላሽ እቅድ ለገቢዎች አስተዳዳሪዎች የተዘጋጀ መሰረታዊ ስልጠና።',
    level: CourseLevel.BASIC,
    status: CourseStatus.PUBLISHED,
    estimatedHours: 18,
    category: 'Risk Management & Governance',
    department: 'Risk Management Directorate',
    modules: [
      {
        titleEn: 'Module 1: Principles of Risk Management & Governance',
        titleAm: 'ሞዱል 1፡ የአደጋ አስተዳደር መርሆዎች እና አስተዳደር',
        descriptionEn: 'Core risk concepts, organizational risk appetite, legal mandates, and the M_o_R 4-stage lifecycle.',
        descriptionAm: 'መሰረታዊ የስጋት ጽንሰ-ሀሳቦች፣ የተቋሙ የስጋት የመቀበል አቅም፣ የህግ ማዕቀፍ እና የ M_o_R 4-ደረጃ የህይወት ዑደት።',
        order: 1,
        lessons: [
          {
            titleEn: '1.1 Understanding Risk: Threats, Opportunities & Risk Appetite',
            titleAm: '1.1 አደጋን መረዳት፡ ስጋቶች፣ እድሎች እና የስጋት ፍላጎት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 1,
            contentEn: `## 1. Introduction & Context
In public revenue administration, risk is defined as **an uncertain event or set of events that, should it occur, will have an effect on the achievement of organizational objectives**. Crucially, risk is not merely negative (threats); it also encompasses positive uncertainties (opportunities) that can enhance revenue collection, service delivery, or operational efficiency.

---

## 2. Key Terminology
- **Inherent Risk**: The level of risk that exists in an environment before any control measures or mitigations are applied.
- **Residual Risk**: The remaining risk exposure after existing internal controls, audits, and automated validation systems have been implemented.
- **Risk Appetite**: The amount and type of risk that the Ministry of Revenue is willing to pursue or retain in pursuit of its strategic goals.
- **Risk Tolerance**: The operational boundaries and quantitative variance thresholds acceptable to management.

---

## 3. The M_o_R Framework Architecture
The Management of Risk framework is structured around four interconnected components:
1. **Principles**: High-level tenets that guide institutional risk culture (e.g., aligns with objectives, fits the context, engages stakeholders).
2. **Approach**: Institutional policies, process guides, and the formal **Risk Management Strategy**.
3. **Processes**: The cyclical 4-stage activity set: **Identify**, **Assess**, **Plan**, and **Implement**.
4. **Embedding and Reviewing**: Continuously evaluating organizational maturity and integrating risk reviews into daily workflows.

---

## 4. Ministry Scenario: Digital Customs Clearance
When deploying an automated digital customs declaration system:
- **Threat**: System downtime during high-volume import seasons leading to congestion at border checkpoints and revenue delay.
- **Opportunity**: Automated risk scoring clears 80% of compliant traders instantly, enabling audit personnel to concentrate on high-risk consignments.

---

## 5. Key Takeaways
- Always evaluate both sides of the coin: mitigate threats while systematically exploiting opportunities.
- Inherent risk minus effective controls yields residual risk. If residual risk exceeds organizational risk appetite, additional treatment plans are mandatory.`,
            contentAm: `### ማጠቃለያ
በገቢዎች አስተዳደር ውስጥ አደጋ ማለት ግቦችን ከማሳካት አንፃር የሚከሰት እርግጠኛ ያልሆነ ክስተት ነው። ይህ አሉታዊ ስጋቶችን ብቻ ሳይሆን አዎንታዊ እድሎችንም ያካትታል። ቁጥጥሮች ከመደረጋቸው በፊት ያለ ስጋት (Inherent Risk) እና ቁጥጥሮች ከተደረጉ በኋላ የሚቀረው ስጋት (Residual Risk) ተብሎ ይከፈላል።`,
          },
          {
            titleEn: '1.2 The M_o_R 4-Stage Cyclical Process: Identify to Implement',
            titleAm: '1.2 የ M_o_R 4-ደረጃ ዑደት ሂደት፡ ከመለየት እስከ መተግበር',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 50,
            order: 2,
            contentEn: `## 1. The Core Lifecycle Stages

### Stage 1: Identify
- **Context Preparation**: Define organizational scope, stakeholder objectives, and external dependencies.
- **Risk Identification**: Utilize brainstorming, SWOT/PESTLE analysis, audit logs, and past compliance histories to articulate distinct risks.
- **Formulating Cause-Event-Effect Statements**:
  - *Format*: "Due to **[Cause]**, **[Event]** may occur, leading to **[Effect]**."

### Stage 2: Assess
- **Estimating Probability & Impact**: Evaluate how likely the event is and calculate the operational/financial impact.
- **Evaluating Proximity**: When is the risk expected to materialize? (Immediate, medium-term, long-term).
- **Determining Severity**: Plotting within a probability-impact matrix.

### Stage 3: Plan
Develop suitable risk responses:
- **Avoid**: Discontinue the hazardous activity entirely.
- **Reduce**: Implement controls to diminish likelihood or impact.
- **Transfer**: Share risk with a third party (e.g., insurance, outsourcing specific hardware hosting).
- **Share**: Form joint-venture or shared responsibility models with other agencies.
- **Accept**: Consciously tolerate the risk when the mitigation cost exceeds the potential loss.

### Stage 4: Implement
- Assign a specific **Risk Owner** and **Actionee**.
- Monitor control effectiveness through periodic reviews.

---

## 2. Practical Checklist for Team Leads
1. Is every identified risk documented with a clear Cause, Event, and Effect?
2. Has every risk been mapped to an assigned Risk Owner who holds operational authority?
3. Are contingency plans documented for all risks falling in the high-severity quadrant?`,
            contentAm: `### የዑደት ደረጃዎች
1. መለየት (Identify): አደጋውን መንስኤ፣ ክስተት እና ውጤት በሚገልጽ መልኩ መመዝገብ።
2. መመዘን (Assess): የመከሰት እድሉንና የሚያስከትለውን ጉዳት መለካት።
3. ማቀድ (Plan): መከላከል፣ መቀነስ፣ ማስተላለፍ ወይም መቀበል የሚሉ አማራጮችን መምረጥ።
4. መተግበር (Implement): ሀላፊዎችን መድቦ አፈፃፀሙን መከታተል።`,
          },
        ],
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Risk Fundamentals',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ የአደጋ መሰረታዊ መርሆዎች',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'mor-m1-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'Which of the following defines Residual Risk?',
              options: [
                'The risk exposure that exists before any internal controls are applied',
                'The risk exposure remaining after internal controls and treatments are implemented',
                'The financial penalty assessed after a regulatory tax audit failure',
                'The maximum loss tolerance threshold defined by executive leadership',
              ],
              correctAnswer: 1,
              points: 25,
              category: 'Risk Terminology',
            },
            {
              id: 'mor-m1-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: In the M_o_R framework, risk only refers to negative threats, never to positive opportunities.',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 25,
              category: 'M_o_R Principles',
            },
            {
              id: 'mor-m1-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'Which risk response strategy involves modifying processes so the risk condition is eliminated entirely?',
              options: ['Reduce', 'Transfer', 'Avoid', 'Accept'],
              correctAnswer: 2,
              points: 25,
              category: 'Response Strategies',
            },
            {
              id: 'mor-m1-q4',
              type: 'SHORT_ANSWER',
              question: 'What is the term for the amount and type of risk an organization is willing to accept in pursuit of its goals?',
              options: [],
              correctAnswer: 'Risk Appetite',
              points: 25,
              category: 'Governance',
            },
          ],
        },
      },
      {
        titleEn: 'Module 2: Risk Assessment Tools, Matrices & The Risk Register',
        titleAm: 'ሞዱል 2፡ የአደጋ መገምገሚያ መሳሪያዎች፣ ማትሪክስ እና የስጋት መዝገብ',
        descriptionEn: 'Constructing 5x5 probability-impact matrices, calculating risk severity scores, and maintaining active risk registers.',
        descriptionAm: 'የ 5x5 እድል እና ተፅዕኖ ማትሪክስ ማዘጋጀት፣ የስጋት ክብደት ውጤቶችን ማስላት እና የስጋት መዝገብ ማስተዳደር።',
        order: 2,
        lessons: [
          {
            titleEn: '2.1 Building & Calibrating the 5x5 Probability-Impact Matrix',
            titleAm: '2.1 የ 5x5 እድል እና ተፅዕኖ ማትሪክስ ግንባታና ማስተካከል',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 1,
            contentEn: `## 1. Quantitative & Qualitative Scales
The standard revenue assessment matrix employs a **5x5 grid**:
- **Probability Scale (1 to 5)**:
  - 1: Rare (< 5% chance in 12 months)
  - 2: Unlikely (5% – 25%)
  - 3: Possible (26% – 50%)
  - 4: Likely (51% – 80%)
  - 5: Almost Certain (> 80%)
- **Impact Scale (1 to 5)**:
  - 1: Negligible (Minor administrative friction, < 50k ETB)
  - 2: Low (Localized delay, 50k – 500k ETB)
  - 3: Moderate (Noticeable revenue shortfall or branch disruption, 500k – 5M ETB)
  - 4: Major (Substantial revenue loss or audit breach, 5M – 50M ETB)
  - 5: Critical (Systemic failure, loss of public trust, > 50M ETB)

---

## 2. Calculating the Risk Exposure Score
$$\\text{Risk Score} = \\text{Probability} \\times \\text{Impact}$$
- **Low (Green, 1–6)**: Managed within standard operating procedures.
- **Medium (Yellow, 7–14)**: Requires defined mitigation actions and monthly reporting.
- **High (Red, 15–25)**: Escalated to Executive Committee; requires immediate intervention and dedicated budget.`,
            contentAm: `### የ 5x5 ማትሪክስ
የአደጋ ውጤት = እድል x ተፅዕኖ (Risk Score = Probability x Impact)
ከ 1 እስከ 6 ዝቅተኛ (አረንጓዴ)፣ ከ 7 እስከ 14 መካከለኛ (ቢጫ)፣ ከ 15 እስከ 25 ከፍተኛ (ቀይ) በመባል ይመደባሉ። ከፍተኛ ደረጃ ያላቸው አደጋዎች ለአስፈፃሚ ኮሚቴ ቀርበው አፋጣኝ ውሳኔ ይፈልጋሉ።`,
          },
          {
            titleEn: '2.2 Maintaining and Escalating the Risk Register',
            titleAm: '2.2 የስጋት መዝገብን መያዝ እና ሪፖርት ማድረግ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 2,
            contentEn: `## 1. Anatomy of an Enterprise Risk Register
A functional risk register must contain the following core fields:
1. **Risk ID**: Unique tracking identifier (e.g., \`RSK-REV-042\`).
2. **Date Logged**: Date of initial identification.
3. **Risk Description**: Cause, Event, and Impact statement.
4. **Risk Category**: Operational, Financial, Compliance, Technological, or Reputational.
5. **Inherent Scores**: Probability, Impact, Score before treatment.
6. **Existing Controls**: Preventive and detective measures in place.
7. **Residual Scores**: Score after active controls.
8. **Planned Treatments**: Concrete action steps, deadlines, and allocated budget.
9. **Risk Owner**: The senior individual responsible for monitoring the risk.
10. **Actionee**: The operational person assigned to execute mitigation tasks.
11. **Review Frequency**: Bi-weekly, monthly, or quarterly.`,
            contentAm: `### የስጋት መዝገብ ይዘቶች
የስጋት መለያ ቁጥር፣ የመመዝገቢያ ቀን፣ የተሟላ መግለጫ፣ የስጋት አይነት፣ የመነሻ እና የቀሪ አደጋ ውጤቶች፣ ያሉ መከላከያዎች፣ የታቀዱ እርምጃዎች እና የስጋት ባለቤት ስም ይካተታሉ።`,
          },
        ],
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Measurement & Registers',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ መለኪያ እና መዝገቦች',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'mor-m2-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'If a risk has a Probability rating of 4 (Likely) and an Impact rating of 4 (Major), what is its Risk Severity Score?',
              options: ['8', '16', '12', '20'],
              correctAnswer: 1,
              points: 25,
              category: 'Scoring',
            },
            {
              id: 'mor-m2-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: In a risk register, the Risk Owner and the Risk Actionee must always be the exact same person.',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 25,
              category: 'Governance',
            },
            {
              id: 'mor-m2-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'Which of the following is an example of a Risk Transfer strategy?',
              options: [
                'Shutting down an unsecurable payment portal',
                'Purchasing cybersecurity insurance coverage',
                'Installing automated antivirus software on employee laptops',
                'Accepting potential minor exchange rate fluctuations',
              ],
              correctAnswer: 1,
              points: 25,
              category: 'Treatment',
            },
            {
              id: 'mor-m2-q4',
              type: 'SHORT_ANSWER',
              question: 'Name the standard tabular document used across organizations to record, track, and monitor all identified risks.',
              options: [],
              correctAnswer: 'Risk Register',
              points: 25,
              category: 'Documentation',
            },
          ],
        },
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: M_o_R Foundation Certification',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የ M_o_R መሰረታዊ ሰርተፊኬት ምዘና',
      passingScore: 75,
      timeLimitMinutes: 40,
      questions: [
        {
          id: 'mor-fn-q1',
          type: 'MULTIPLE_CHOICE',
          question: 'What is the primary objective of embedding the M_o_R framework into daily revenue administrative procedures?',
          options: [
            'To guarantee that zero errors will ever occur in tax assessments',
            'To support informed decision-making and protect institutional value',
            'To completely eliminate the need for external financial audits',
            'To shift all compliance liabilities onto individual taxpayers',
          ],
          correctAnswer: 1,
          points: 20,
          category: 'Principles',
        },
        {
          id: 'mor-fn-q2',
          type: 'MULTIPLE_CHOICE',
          question: 'When should a risk be formally escalated to the Ministry Executive Management Committee?',
          options: [
            'Only when a financial loss has already happened',
            'When the residual risk score exceeds the agreed organizational risk tolerance boundary',
            'Whenever an employee files an internal grievance',
            'Only at the end of each fiscal year during annual reporting',
          ],
          correctAnswer: 1,
          points: 20,
          category: 'Escalation',
        },
        {
          id: 'mor-fn-q3',
          type: 'TRUE_FALSE',
          question: 'True or False: Establishing early warning indicators (Key Risk Indicators) helps detect probability shifts before a risk materializes.',
          options: ['True', 'False'],
          correctAnswer: 0,
          points: 20,
          category: 'Monitoring',
        },
        {
          id: 'mor-fn-q4',
          type: 'MULTIPLE_CHOICE',
          question: 'Which role in the M_o_R governance structure holds overall accountability for managing a specific risk and authorizing mitigation expenditures?',
          options: ['Risk Actionee', 'Risk Owner', 'External Auditor', 'Database Administrator'],
          correctAnswer: 1,
          points: 20,
          category: 'Roles',
        },
        {
          id: 'mor-fn-q5',
          type: 'SHORT_ANSWER',
          question: 'What term describes the quantitative difference between Inherent Risk and Residual Risk?',
          options: [],
          correctAnswer: null, // Nullable answer: open-ended/manually graded or evaluated
          points: 20,
          category: 'Advanced Concepts',
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 2. PUBLISHED: Tax Audit Standards & Revenue Compliance
  // ─────────────────────────────────────────────────────────
  {
    code: 'TAX-AUD-201',
    titleEn: 'Tax Audit Standards, Fraud Detection & Revenue Compliance',
    titleAm: 'የግብር ኦዲት ደረጃዎች፣ ማጭበርበርን መለየት እና የገቢ ተገዢነት',
    descriptionEn:
      'Rigorous field audit procedures, financial forensics, VAT discrepancy reconciliation, electronic cash register verification, and compliance legal frameworks for tax examiners.',
    descriptionAm:
      'የተሟላ የግብር ኦዲት አሰራር፣ የፋይናንስ ምርመራ ቴክኒኮች፣ የተጨማሪ እሴት ታክስ (VAT) ማስታረቂያ እና የህግ ተገዢነት ማዕቀፍ ለግብር ኦዲተሮች።',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PUBLISHED,
    estimatedHours: 24,
    category: 'Tax Audit & Compliance',
    department: 'Tax Audit & Investigation Directorate',
    modules: [
      {
        titleEn: 'Module 1: Audit Planning & Risk-Based Taxpayer Profiling',
        titleAm: 'ሞዱል 1፡ የኦዲት እቅድ እና በአደጋ ላይ የተመሰረተ የግብር ከፋይ መለያ',
        descriptionEn: 'Techniques for third-party financial data triangulation, variance flagging, and field audit readiness.',
        descriptionAm: 'የሶስተኛ ወገን የፋይናንስ መረጃዎችን ማገናዘብ፣ ልዩነቶችን መለየት እና ለኦዲት መስክ ዝግጅት።',
        order: 1,
        lessons: [
          {
            titleEn: '1.1 Risk-Based Case Selection & Third-Party Triangulation',
            titleAm: '1.1 በአደጋ ላይ የተመሰረተ መረጣ እና የሶስተኛ ወገን መረጃ ማገናዘብ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 50,
            order: 1,
            contentEn: `## 1. The Paradigm Shift: From Random Audits to Risk-Based Selection
Traditional audit programs inspected taxpayers through random sampling, resulting in low yield per auditor hour. Modern revenue bodies deploy **Data-Driven Risk Scoring** using:
- Customs import values vs. reported domestic cost of goods sold.
- Bank transaction turnovers vs. declared VAT monthly returns.
- Industry profit margin benchmarks for the specific taxpayer sector.

---

## 2. Red Flags Triggering Formal Examination
1. **Consecutive Negative Operating Margins**: High-turnover enterprises declaring perpetual losses while expanding physical branches.
2. **Excessive Input VAT Claims**: Persistent zero or negative net VAT liabilities without corresponding capital asset purchases or export sales.
3. **Mismatched Electronic Sales Register Data**: Significant discrepancies between SIM-card transmitted transaction logs and manual ledger entries.`,
            contentAm: `### በአደጋ ላይ የተመሰረተ የኦዲት መረጣ
የዘመናዊ ገቢዎች ኦዲት የባንክ ዝውውርን፣ የጉምሩክ ገቢ እቃዎችን እና ወርሃዊ የተጨማሪ እሴት ታክስ (VAT) ሪፖርቶችን በማነፃፀር አጠራጣሪ ልዩነቶች ያላቸውን ድርጅቶች ቅድሚያ ሰጥቶ ይመረምራል።`,
          },
          {
            titleEn: '1.2 Audit Notification Protocols & Pre-Audit Field Readiness',
            titleAm: '1.2 የኦዲት ማሳወቂያ ደንቦች እና የመስክ ዝግጅት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 2,
            contentEn: `## 1. Statutory Notice Requirements
Before initiating an on-site field examination, the auditor must issue a formal **Written Notice of Audit**:
- Must state the tax years and specific tax heads under review (e.g., Corporate Income Tax, VAT, Withholding).
- Must provide the taxpayer a statutory preparation window (typically 10 working days).
- Must itemize the mandatory books of account, trial balances, and electronic records required on Day 1.

---

## 2. On-Site Examination Conduct
- Professional demeanor: Adherence to the Auditor Code of Ethics.
- Maintaining the Chain of Custody for confiscated ledgers and server backups.
- Interviewing key accounting personnel using standardized interview logs.`,
            contentAm: `### የቅድመ-ኦዲት ዝግጅት
ኦዲተር ወደ ድርጅት ከመሄዱ በፊት የሚመረመሩትን አመታት፣ የታክስ አይነቶች እና የሚያስፈልጉ ሰነዶችን ዝርዝር የያዘ ህጋዊ የጽሁፍ ማስታወቂያ መስጠት አለበት።`,
          },
        ],
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Audit Planning',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ የኦዲት እቅድ',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'tax-m1-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'Which data source is most effective for cross-verifying a corporate taxpayer declared sales revenue?',
              options: [
                'Commercial bank deposits and electronic invoicing records',
                'The taxpayer marketing brochure',
                'Unverified self-declarations from social media',
                'The number of employees registered on the payroll list',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Cross-Verification',
            },
            {
              id: 'tax-m1-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: Auditors may conduct full on-site audits without issuing any prior statutory written notice.',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 25,
              category: 'Legal Standards',
            },
            {
              id: 'tax-m1-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'What is a primary red flag in corporate VAT return auditing?',
              options: [
                'Consistently filing returns 3 days before the statutory deadline',
                'Claiming substantial input VAT deductions without corresponding commercial sales',
                'Maintaining audited financial statements prepared by an authorized CPA',
                'Reporting higher profit margins than the industry average',
              ],
              correctAnswer: 1,
              points: 25,
              category: 'Fraud Detection',
            },
            {
              id: 'tax-m1-q4',
              type: 'SHORT_ANSWER',
              question: 'What is the acronym for Value Added Tax?',
              options: [],
              correctAnswer: 'VAT',
              points: 25,
              category: 'Terminology',
            },
          ],
        },
      },
      {
        titleEn: 'Module 2: Forensic Reconciliation & Finalizing Deficiency Notices',
        titleAm: 'ሞዱል 2፡ የፎረንሲክ ማስታረቂያ እና የጉድለት ማሳወቂያ ማዘጋጀት',
        descriptionEn: 'Investigating fictitious invoicing, electronic ledger audits, computation of penalty interest, and issuing deficiency assessments.',
        descriptionAm: 'የሀሰተኛ ደረሰኞችን መመርመር፣ የኤሌክትሮኒክስ መዝገብ ኦዲት፣ የወለድና መቀጮ ስሌት እና የውሳኔ ማስታወቂያ ማውጣት።',
        order: 2,
        lessons: [
          {
            titleEn: '2.1 Detecting Fictitious Invoices & Phantom Suppliers',
            titleAm: '2.1 የሀሰተኛ ደረሰኞችና ያልነበሩ አቅራቢዎችን መለየት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 50,
            order: 1,
            contentEn: `## 1. Anatomy of Invoice Mills
An invoice mill (phantom supplier) produces invoices for goods or services that were never delivered, allowing the buyer to inflate cost deductions and claim fraudulent input VAT refunds.

---

## 2. Key Forensic Detection Techniques
- **Cross-Verifying Tax Identification Numbers (TIN)**: Check if the issuing TIN is active, cancelled, or registered to an unrelated entity.
- **Cash Transaction Limits**: High-value transactions settled exclusively in physical cash rather than bank transfers.
- **Transportation & Warehousing Audits**: If a supplier claims to have delivered 500 metric tons of steel, demand waybills, truck registration logs, and warehouse receiving vouchers.`,
            contentAm: `### የሀሰተኛ ደረሰኞች ምርመራ
የቲን (TIN) ትክክለኛነት ማረጋገጥ፣ ከባንክ ውጭ የተፈፀሙ የጥሬ ገንዘብ ክፍያዎችን መፈተሽ እና የትራንስፖርትና የመጋዘን ሰነዶችን ማመሳከር ዋና ዋና የመመርመሪያ መንገዶች ናቸው።`,
          },
          {
            titleEn: '2.2 Drafting Assessment Notices & Managing Objection Windows',
            titleAm: '2.2 የውሳኔ ማሳወቂያ ረቂቅ እና የቅሬታ ጊዜ አስተዳደር',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 2,
            contentEn: `## 1. Preparing the Formal Assessment Notice
The assessment report must withstand judicial scrutiny:
1. **Statutory Legal Basis**: Exact articles of the Tax Proclamation invoked.
2. **Methodology of Recalculation**: Showing the baseline income, disallowed deductions, revised tax liability, and applicable penalties.
3. **Appeals Rights**: Informing the taxpayer of their legal right to lodge an administrative objection within the statutory window (typically 30 days).`,
            contentAm: `### የውሳኔ ማሳወቂያ አዘገጃጀት
የውሳኔ ማሳወቂያው ህጋዊ አንቀጾችን፣ የተስተካከለውን የታክስ ስሌት፣ የተጣለውን ቅጣት እና ግብር ከፋዩ በ 30 ቀናት ውስጥ ቅሬታ የማቅረብ መብት እንዳለው በግልጽ ማሳወቅ አለበት።`,
          },
        ],
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Forensic Findings',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ የፎረንሲክ ግኝቶች',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'tax-m2-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'What evidence best refutes an alleged delivery of bulk physical commodities by a phantom supplier?',
              options: [
                'Absence of genuine transport waybills, gate passes, and warehouse receiving vouchers',
                'The font style used on the printed invoice header',
                'The color of ink used by the accountant when signing the ledger',
                'The location of the taxpayer head office',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Forensics',
            },
            {
              id: 'tax-m2-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: A taxpayer has a statutory right to appeal an audit deficiency notice within the legally defined objection period.',
              options: ['True', 'False'],
              correctAnswer: 0,
              points: 25,
              category: 'Taxpayer Rights',
            },
            {
              id: 'tax-m2-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'When disallowing an expense deduction during an audit, what must the auditor cite in the assessment notice?',
              options: [
                'Only the total monetary amount being disallowed',
                'The specific legal article and proclamation provisions violated',
                'Personal opinions regarding the taxpayer integrity',
                'The auditor supervisor private phone number',
              ],
              correctAnswer: 1,
              points: 25,
              category: 'Reporting Standards',
            },
            {
              id: 'tax-m2-q4',
              type: 'SHORT_ANSWER',
              question: 'What is the standard document issued to officially demand unpaid taxes, interest, and penalties following an audit?',
              options: [],
              correctAnswer: 'Assessment Notice',
              points: 25,
              category: 'Administration',
            },
          ],
        },
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: Tax Audit Certification',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የግብር ኦዲት ሰርተፊኬት ምዘና',
      passingScore: 75,
      timeLimitMinutes: 45,
      questions: [
        {
          id: 'tax-fn-q1',
          type: 'MULTIPLE_CHOICE',
          question: 'What is the primary distinction between aggressive tax planning and criminal tax evasion?',
          options: [
            'Aggressive planning exploits statutory ambiguities; evasion deliberately misrepresents or conceals material facts',
            'There is no legal difference in public revenue statutes',
            'Planning is only done by foreign corporations while evasion is domestic',
            'Evasion never carries criminal liability under the revenue code',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Compliance Law',
        },
        {
          id: 'tax-fn-q2',
          type: 'MULTIPLE_CHOICE',
          question: 'Which financial ratio analysis is most revealing when evaluating whether an importer is understating retail gross revenue?',
          options: [
            'Gross Profit Margin comparison against industry benchmarks',
            'Current Ratio (Liquidity)',
            'Debt-to-Equity Ratio',
            'Depreciation rate on office furniture',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Ratio Analysis',
        },
        {
          id: 'tax-fn-q3',
          type: 'TRUE_FALSE',
          question: 'True or False: Third-party banking data obtained through legal warrants cannot be utilized as primary evidence in a tax dispute.',
          options: ['True', 'False'],
          correctAnswer: 1,
          points: 20,
          category: 'Evidence Rules',
        },
        {
          id: 'tax-fn-q4',
          type: 'MULTIPLE_CHOICE',
          question: 'Which tool provides real-time transaction level reporting directly from point-of-sale systems to the revenue server?',
          options: [
            'Electronic Cash Register (ECR / Electronic Fiscal Device)',
            'Manual handwritten receipt book',
            'Spreadsheet emailed quarterly to the branch office',
            'Paper cash register receipt kept in a file cabinet',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Technology',
        },
        {
          id: 'tax-fn-q5',
          type: 'SHORT_ANSWER',
          question: 'What 10-digit number uniquely identifies individual and corporate taxpayers in the tax system?',
          options: [],
          correctAnswer: 'TIN',
          points: 20,
          category: 'Taxpayer ID',
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 3. APPROVED: Government Cyber Defense & Data Protection
  // ─────────────────────────────────────────────────────────
  {
    code: 'CYBER-SEC-301',
    titleEn: 'Government Information Security & Cyber Defense Architecture',
    titleAm: 'የመንግስት የሳይበር ደህንነት እና የመረጃ ጥበቃ ስነ-ህንፃ',
    descriptionEn:
      'Advanced defense protocols for national revenue infrastructure, endpoint hardening, encrypted communications, zero-trust network segmentation, and incident response under ISO/IEC 27001.',
    descriptionAm:
      'የገቢዎች ዲጂታል መሰረተ-ልማት ጥበቃ፣ ምስጠራ፣ የኔትወርክ ከለላ እና የሳይበር ጥቃት ምላሽ አሰጣጥ ስልጠና በ ISO/IEC 27001 ደረጃ።',
    level: CourseLevel.ADVANCED,
    status: CourseStatus.APPROVED,
    estimatedHours: 30,
    category: 'Information Security & IT',
    department: 'ICT & Cybersecurity Directorate',
    modules: [
      {
        titleEn: 'Module 1: Zero-Trust Network Architecture & Identity Security',
        titleAm: 'ሞዱል 1፡ የዜሮ-ትረስት ኔትወርክ ስነ-ህንፃ እና የማንነት ደህንነት',
        descriptionEn: 'Principle of least privilege, multi-factor authentication enforcement, and boundary segmentation.',
        descriptionAm: 'አነስተኛ የፈቃድ ወሰን መርህ፣ ባለብዙ ደረጃ ማረጋገጫ (MFA) እና የኔትወርክ ክፍፍል ደህንነት።',
        order: 1,
        lessons: [
          {
            titleEn: '1.1 The Zero-Trust Paradigm: "Never Trust, Always Verify"',
            titleAm: '1.1 የዜሮ-ትረስት መርህ፡ "መቼም አትመን፣ ሁልጊዜ አረጋግጥ"',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 55,
            order: 1,
            contentEn: `## 1. Deconstructing the Traditional Perimeter
Legacy security assumed that everything inside the internal corporate network was inherently trustworthy. Modern Advanced Persistent Threats (APTs) invalidate this assumption.

---

## 2. Core Pillars of Zero-Trust
1. **Explicit Verification**: Always authenticate and authorize based on all available data points (identity, device health, location, data classification).
2. **Least Privilege Access**: Restrict user rights strictly with Just-In-Time (JIT) and Just-Enough-Access (JEA).
3. **Assume Breach**: Minimize the blast radius by segmenting networks, encrypting end-to-end, and using analytics for threat detection.`,
            contentAm: `### የዜሮ-ትረስት መርሆዎች
በውስጥ ኔትወርክ ውስጥ ያለ ማንኛውም ተጠቃሚ ወይም መሳሪያ ያለ ተጨማሪ ማረጋገጫ ሊታመን አይችልም። እያንዳንዱ የመረጃ ጥያቄ ማረጋገጫ (MFA) እና አነስተኛ የስራ ፈቃድ ሊኖረው ይገባል።`,
          },
          {
            titleEn: '1.2 Multi-Factor Authentication (MFA) & Endpoint Hardening',
            titleAm: '1.2 ባለብዙ ደረጃ ማረጋገጫ (MFA) እና የመሳሪያዎች ጥበቃ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 50,
            order: 2,
            contentEn: `## 1. Authentication Factors
- **Something you know**: Password or PIN.
- **Something you have**: Hardware security key or TOTP authenticator app.
- **Something you are**: Biometric fingerprint or facial recognition.

---

## 2. Endpoint Hardening Protocols
- Disable legacy protocols (SMBv1, Telnet).
- Full disk encryption (BitLocker / LUKS) on all mobile workstations.
- Centralized Endpoint Detection and Response (EDR) agent installation.`,
            contentAm: `### የመሳሪያዎች ጥበቃ
የሰራተኞች ኮምፒውተሮች ሙሉ ምስጠራ (Disk Encryption) ሊኖራቸው፣ አላስፈላጊ ፖርቶች መዘጋት እና ጸረ-ቫይረስና ክትትል (EDR) መጫን አለበት።`,
          },
        ],
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Zero Trust',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ ዜሮ ትረስት',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'cs-m1-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'What is the foundational philosophy of Zero-Trust Network Architecture?',
              options: [
                'Trust all devices connected via an internal office Ethernet cable',
                'Never trust, always verify every access request regardless of origin',
                'Only check passwords once per month',
                'Allow unlimited access to all internal servers for IT employees',
              ],
              correctAnswer: 1,
              points: 25,
              category: 'Architecture',
            },
            {
              id: 'cs-m1-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: Using SMS text messages for MFA is considered more secure than hardware FIDO2 security keys.',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 25,
              category: 'MFA Security',
            },
            {
              id: 'cs-m1-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'Which principle dictates that users should only receive the minimum permissions necessary to perform their specific job functions?',
              options: ['Maximum Availability', 'Principle of Least Privilege', 'Open Door Policy', 'Role Multiplication'],
              correctAnswer: 1,
              points: 25,
              category: 'Access Control',
            },
            {
              id: 'cs-m1-q4',
              type: 'SHORT_ANSWER',
              question: 'What security mechanism protects data stored on physical hard drives even if the laptop is stolen?',
              options: [],
              correctAnswer: 'Disk Encryption',
              points: 25,
              category: 'Endpoint Security',
            },
          ],
        },
      },
      {
        titleEn: 'Module 2: Cryptographic Controls & Incident Response Runbooks',
        titleAm: 'ሞዱል 2፡ የምስጠራ ቁጥጥሮች እና የአደጋ ጊዜ ምላሽ እቅድ',
        descriptionEn: 'Data-at-rest and in-transit encryption standards, digital forensics preservation, and step-by-step incident containment.',
        descriptionAm: 'የመረጃ ምስጠራ ደረጃዎች፣ ዲጂታል ማስረጃዎችን መጠበቅ እና የሳይበር አደጋዎችን የመቆጣጠር ደረጃዎች።',
        order: 2,
        lessons: [
          {
            titleEn: '2.1 Cryptographic Standards for Financial and Taxpayer Records',
            titleAm: '2.1 ለግብር ከፋዮች የፋይናንስ መረጃ የምስጠራ ደረጃዎች',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 50,
            order: 1,
            contentEn: `## 1. Cryptography in Revenue Systems
- **Data in Transit**: Mandatory TLS 1.3 encryption across all public web services and database connection strings. Deprecate TLS 1.0/1.1 and insecure ciphers.
- **Data at Rest**: AES-256 encryption for database tables containing confidential taxpayer identifications, bank account numbers, and assessment notes.
- **Key Management**: Use dedicated Hardware Security Modules (HSMs) with strict key rotation cycles.`,
            contentAm: `### የምስጠራ ደረጃዎች
በእንቅስቃሴ ላይ ያለ መረጃ በ TLS 1.3 እና የተቀመጠ መረጃ በ AES-256 ምስጠራ ሊጠበቅ ይገባል። የምስጠራ ቁልፎች በየጊዜው መቀየር አለባቸው።`,
          },
          {
            titleEn: '2.2 Incident Containment & Forensic Evidence Preservation',
            titleAm: '2.2 አደጋን መቆጣጠር እና የፎረንሲክ ማስረጃን መጠበቅ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 55,
            order: 2,
            contentEn: `## 1. The 6-Phase Incident Response Lifecycle
1. **Preparation**: Maintaining tools, call trees, and patched backup systems.
2. **Identification**: Detecting anomalous traffic via SIEM logs.
3. **Containment**: Isolating infected subnets from the central data center without powering off compromised machines (to preserve volatile RAM evidence).
4. **Eradication**: Removing malware, revoking compromised credentials.
5. **Recovery**: Restoring services from verified uncorrupted backups.
6. **Lessons Learned**: Comprehensive post-mortem reporting within 72 hours.`,
            contentAm: `### የአደጋ ምላሽ ቅደም ተከተል
1. ዝግጅት፣ 2. መለየት፣ 3. መቆጣጠር፣ 4. ማጽዳት፣ 5. መልሶ ማቋቋም እና 6. ከስህተት መማር። አደጋ ሲደርስ ኮምፒውተርን ከማጥፋት ይልቅ ኔትወርኩን ማቋረጥ የራም (RAM) ማስረጃን ያድናል።`,
          },
        ],
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Cryptography & Response',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ ምስጠራ እና ምላሽ',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'cs-m2-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'Why should an infected server NOT be immediately powered off when malware is detected?',
              options: [
                'To preserve volatile evidence stored in system RAM for forensic analysis',
                'Because the server hardware might physically catch fire',
                'To allow the malware to complete its installation',
                'Because government servers are legally forbidden from rebooting',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Forensics',
            },
            {
              id: 'cs-m2-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: AES-256 is the globally recognized standard for symmetric data-at-rest database encryption.',
              options: ['True', 'False'],
              correctAnswer: 0,
              points: 25,
              category: 'Cryptography',
            },
            {
              id: 'cs-m2-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'What is the minimum recommended protocol version for securing web traffic in transit?',
              options: ['SSL 2.0', 'TLS 1.0', 'TLS 1.3', 'HTTP 1.0'],
              correctAnswer: 2,
              points: 25,
              category: 'Web Security',
            },
            {
              id: 'cs-m2-q4',
              type: 'SHORT_ANSWER',
              question: 'What acronym refers to an enterprise system that centralizes and analyzes real-time security event logs?',
              options: [],
              correctAnswer: 'SIEM',
              points: 25,
              category: 'Monitoring',
            },
          ],
        },
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: Cyber Defense Architecture',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የሳይበር ደህንነት ስነ-ህንፃ ምዘና',
      passingScore: 75,
      timeLimitMinutes: 45,
      questions: [
        {
          id: 'cs-fn-q1',
          type: 'MULTIPLE_CHOICE',
          question: 'In the event of a suspected database credential leak, what is the immediate required first step?',
          options: [
            'Revoke and rotate the compromised credentials and active session tokens immediately',
            'Wait until the end of the quarter to conduct a full audit',
            'Delete the entire database and create an empty one',
            'Email the database password to all department staff for verification',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Response',
        },
        {
          id: 'cs-fn-q2',
          type: 'MULTIPLE_CHOICE',
          question: 'Which cyber attack relies primarily on deceptive social engineering targeting senior government leaders?',
          options: ['Spear-Phishing / Whaling', 'SQL Injection', 'SYN Flood DDoS', 'Buffer Overflow'],
          correctAnswer: 0,
          points: 20,
          category: 'Threat Types',
        },
        {
          id: 'cs-fn-q3',
          type: 'TRUE_FALSE',
          question: 'True or False: Regular immutable offsite backups are the most effective defense against total data loss from ransomware.',
          options: ['True', 'False'],
          correctAnswer: 0,
          points: 20,
          category: 'Business Continuity',
        },
        {
          id: 'cs-fn-q4',
          type: 'MULTIPLE_CHOICE',
          question: 'What international security standard defines specifications for an Information Security Management System (ISMS)?',
          options: ['ISO/IEC 27001', 'IEEE 802.11', 'HTML5 Spec', 'PCI DSS Tier 4'],
          correctAnswer: 0,
          points: 20,
          category: 'Standards',
        },
        {
          id: 'cs-fn-q5',
          type: 'SHORT_ANSWER',
          question: 'What type of malware encrypts an organization files and demands financial payment for decryption keys?',
          options: [],
          correctAnswer: 'Ransomware',
          points: 20,
          category: 'Threats',
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 4. APPROVED: Public Service Ethics & Anti-Corruption
  // ─────────────────────────────────────────────────────────
  {
    code: 'ETH-PUB-102',
    titleEn: 'Public Service Ethics, Anti-Corruption & Professional Conduct',
    titleAm: 'የመንግስት አገልግሎት ስነ-ምግባር፣ ፀረ-ሙስና እና ሙያዊ ስነ-ስርዓት',
    descriptionEn:
      'Ethical standards, conflict of interest mitigation, whistleblower protection systems, asset disclosure regulations, and maintaining high integrity in tax and customs operations.',
    descriptionAm:
      'የስነ-ምግባር ደንቦች፣ የጥቅም ግጭትን ማስቀረት፣ የጥቆማ አቅራቢዎች ጥበቃ ስርአት እና በገቢዎችና ጉምሩክ ስራዎች ውስጥ የታማኝነት አስተዳደር።',
    level: CourseLevel.BASIC,
    status: CourseStatus.APPROVED,
    estimatedHours: 16,
    category: 'Ethics & Legal Compliance',
    department: 'Ethics & Anti-Corruption Directorate',
    modules: [
      {
        titleEn: 'Module 1: Ethical Principles & Conflict of Interest Mitigation',
        titleAm: 'ሞዱል 1፡ የስነ-ምግባር መርሆዎች እና የጥቅም ግጭትን ማስቀረት',
        descriptionEn: 'Statutory ethical duties, gift policies, kinship disclosures, and impartial public service delivery.',
        descriptionAm: 'ህጋዊ የስነ-ምግባር ግዴታዎች፣ የስጦታ ፖሊሲ፣ የዝምድና መረጃ ማሳወቅ እና ፍትሃዊ የህዝብ አገልግሎት።',
        order: 1,
        lessons: [
          {
            titleEn: '1.1 Foundations of Public Trust & The Civil Service Code',
            titleAm: '1.1 የህዝብ አመኔታ መሰረቶች እና የሲቪል ሰርቪስ ደንብ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            contentEn: `## 1. The Stewardship Mandate
Civil servants hold authority not as personal privilege, but as trustees of the public interest. The core values include:
- **Impartiality**: Administering tax laws objectively regardless of taxpayer status, wealth, or political affiliation.
- **Accountability**: Willingness to submit official decisions to administrative and judicial review.
- **Transparency**: Clear communication of tax assessment standards and calculation rules.`,
            contentAm: `### የህዝብ አመኔታ
የመንግስት ሰራተኞች ስልጣንን ለግል ጥቅም ሳይሆን ለህዝብ አገልግሎት የሚጠቀሙ ባለአደራዎች ናቸው። ፍትሃዊነት፣ ተጠያቂነት እና ግልጽነት ዋና መርሆዎች ናቸው።`,
          },
          {
            titleEn: '1.2 Identifying and Disclosing Conflicts of Interest',
            titleAm: '1.2 የጥቅም ግጭትን መለየት እና ይፋ ማድረግ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 2,
            contentEn: `## 1. Forms of Conflict of Interest
- **Actual Conflict**: An officer is assigned to audit a business where their spouse is the primary shareholder.
- **Perceived Conflict**: A customs official accepting paid weekend hospitality from an importer whose goods pass through their checkpoint.
- **Potential Conflict**: An officer acquiring private business shares in a sector they regulate.

---

## 2. Recusal Procedure
When a conflict arises:
1. Immediate written notification to the Directorate Director.
2. Formal recusal from the audit or licensing panel.
3. Re-assignment of the case to an independent officer.`,
            contentAm: `### የጥቅም ግጭት አያያዝ
የጥቅም ግጭት ሲፈጠር ሰራተኛው ወዲያውኑ ለበላይ ሀላፊው በጽሁፍ ማሳወቅ እና ከጉዳዩ ውሳኔ ራሱን ማግለል (Recusal) አለበት።`,
          },
        ],
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Ethics & Conflicts',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ ስነ-ምግባርና ጥቅሞች',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'eth-m1-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'What is the mandatory action when an auditor discovers they are assigned to audit a direct family member business?',
              options: [
                'Proceed with the audit in secret without telling anyone',
                'Immediately submit a written recusal notice and transfer the case to another officer',
                'Grant an automatic tax reduction to avoid suspicion',
                'Charge a double fee to prove impartiality',
              ],
              correctAnswer: 1,
              points: 25,
              category: 'Conflict of Interest',
            },
            {
              id: 'eth-m1-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: Civil servants are permitted to accept expensive personal gifts from regulated taxpayers as long as the gift is given on a holiday.',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 25,
              category: 'Gift Policy',
            },
            {
              id: 'eth-m1-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'Which of the following defines Perceived Conflict of Interest?',
              options: [
                'A situation where a reasonable observer could doubt the fairness or neutrality of the official decision',
                'A situation that resulted in a felony criminal conviction',
                'A conflict that took place twenty years prior',
                'An imaginary scenario with zero relationship to reality',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Ethics Concepts',
            },
            {
              id: 'eth-m1-q4',
              type: 'SHORT_ANSWER',
              question: 'What formal action describes a public official voluntarily withdrawing from a proceeding due to a conflict of interest?',
              options: [],
              correctAnswer: 'Recusal',
              points: 25,
              category: 'Procedure',
            },
          ],
        },
      },
      {
        titleEn: 'Module 2: Anti-Bribery Controls & Whistleblower Protection',
        titleAm: 'ሞዱል 2፡ የፀረ-ጉቦ ቁጥጥሮች እና የጥቆማ አቅራቢዎች ጥበቃ',
        descriptionEn: 'Recognizing procurement red flags, non-retaliation policies, and formal whistleblower channels.',
        descriptionAm: 'በግዥ ውስጥ አጠራጣሪ ምልክቶችን መለየት፣ ከበቀል ጥበቃ የማድረግ ፖሊሲ እና ሚስጥራዊ የጥቆማ መስመሮች።',
        order: 2,
        lessons: [
          {
            titleEn: '2.1 Anti-Bribery Mechanisms & Red Flags in Procurement',
            titleAm: '2.1 የፀረ-ጉቦ አሰራሮች እና በግዥ ውስጥ አጠራጣሪ ምልክቶች',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 1,
            contentEn: `## 1. Red Flags in Procurement & Licensing
- Split bidding to circumvent tender approval thresholds.
- Unusually narrow technical specifications drafted to match a single proprietary vendor.
- Unjustified contract amendments approved shortly after tender award.`,
            contentAm: `### የግዥ ስጋቶች
የጨረታ ወሰንን ለማለፍ ግዥን መቆራረጥ፣ ለአንድ አቅራቢ ብቻ ተስማሚ የሆነ መስፈርት ማዘጋጀት እና ውል ከተፈረመ በኋላ ያልተገባ የዋጋ ማስተካከያ ማድረግ የሙስና ምልክቶች ናቸው።`,
          },
          {
            titleEn: '2.2 Whistleblower Channels & Non-Retaliation Protections',
            titleAm: '2.2 የጥቆማ መስመሮች እና ከበቀል ጥበቃ የማድረግ ዋስትና',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 2,
            contentEn: `## 1. Legal Protection for Whistleblowers
Whistleblowers are essential for exposing corruption that evades routine audits. Legal protections include:
- Strict identity confidentiality under encrypted submission channels.
- Absolute immunity from retaliatory demotion, salary withholding, or termination.
- Criminal penalties for managers who intimidate whistleblowers.`,
            contentAm: `### የጥቆማ አቅራቢዎች ጥበቃ
የጥቆማ አቅራቢዎች ማንነት በሚስጥር ይጠበቃል፤ እንዲሁም ከስራ ማባረር፣ ማዛወር ወይም ከማንኛውም የበቀል እርምጃ በህግ ጥበቃ ይደረግላቸዋል።`,
          },
        ],
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Anti-Corruption Tools',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ የፀረ-ሙስና መሳሪያዎች',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'eth-m2-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'Which of the following is a classic procurement red flag indicating potential bid tailoring?',
              options: [
                'Publishing open tenders in national newspapers with a 30-day submission window',
                'Drafting proprietary technical requirements that only one specific vendor can fulfill',
                'Inviting competitive public bids from verified licensed suppliers',
                'Conducting open public bid opening sessions in front of cameras',
              ],
              correctAnswer: 1,
              points: 25,
              category: 'Procurement',
            },
            {
              id: 'eth-m2-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: An employee who blows the whistle on fraudulent tax evasion is legally protected against disciplinary demotion.',
              options: ['True', 'False'],
              correctAnswer: 0,
              points: 25,
              category: 'Whistleblower Law',
            },
            {
              id: 'eth-m2-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'Why must whistleblower reporting channels maintain end-to-end identity confidentiality?',
              options: [
                'To prevent retaliation and encourage truthful reporting of corrupt acts',
                'Because government records are not allowed to store names',
                'To make it impossible for auditors to verify the claim',
                'To ensure the accused person cannot be informed of the charges',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Reporting Integrity',
            },
            {
              id: 'eth-m2-q4',
              type: 'SHORT_ANSWER',
              question: 'What term describes an employee who exposes illegal or unethical activity within an organization?',
              options: [],
              correctAnswer: 'Whistleblower',
              points: 25,
              category: 'Terminology',
            },
          ],
        },
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: Ethics & Public Integrity',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ ስነ-ምግባርና የህዝብ ታማኝነት ምዘና',
      passingScore: 75,
      timeLimitMinutes: 40,
      questions: [
        {
          id: 'eth-fn-q1',
          type: 'MULTIPLE_CHOICE',
          question: 'What is the primary consequence of corruption in a national revenue service?',
          options: [
            'Erosion of public trust, loss of critical government revenue, and distortion of market competition',
            'Slightly higher interest rates on treasury bills',
            'Increased numbers of taxpayers voluntarily filing early',
            'Faster processing times for customs declarations',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Impact of Corruption',
        },
        {
          id: 'eth-fn-q2',
          type: 'MULTIPLE_CHOICE',
          question: 'If an official inadvertently receives a monetary gift delivered to their home by an audit client, what should they do?',
          options: [
            'Keep it and donate it to an unregistered charity',
            'Formally report and surrender the gift to the Ethics Liaison Office immediately',
            'Hide it in the office desk until the audit is completed',
            'Share the money among all team members equally',
          ],
          correctAnswer: 1,
          points: 20,
          category: 'Gift Rules',
        },
        {
          id: 'eth-fn-q3',
          type: 'TRUE_FALSE',
          question: 'True or False: Whistleblower protection laws permit managers to reassign reporting employees to remote branches without cause.',
          options: ['True', 'False'],
          correctAnswer: 1,
          points: 20,
          category: 'Protection Provisions',
        },
        {
          id: 'eth-fn-q4',
          type: 'MULTIPLE_CHOICE',
          question: 'What public service value requires decisions to be based purely on statutory legal grounds rather than personal preference?',
          options: ['Impartiality', 'Discretionary favoritism', 'Opacity', 'Informal consensus'],
          correctAnswer: 0,
          points: 20,
          category: 'Values',
        },
        {
          id: 'eth-fn-q5',
          type: 'SHORT_ANSWER',
          question: 'What document or declaration must senior officials submit annually listing their personal wealth, real estate, and financial assets?',
          options: [],
          correctAnswer: null, // Nullable answer: open-ended/manually graded or evaluated
          points: 20,
          category: 'Asset Declaration',
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 5. PENDING_APPROVAL: Strategic Public Sector Leadership
  // ─────────────────────────────────────────────────────────
  {
    code: 'LEAD-MGT-202',
    titleEn: 'Strategic Leadership & Change Management in Modernizing Agencies',
    titleAm: 'ስትራቴጂካዊ የመንግስት ዘርፍ አመራር እና የለውጥ አስተዳደር',
    descriptionEn:
      'Executive capabilities in leading organizational culture transformation, high-performance coaching, milestone management, and overcoming reform resistance.',
    descriptionAm:
      'የተቋማዊ ባህል ለውጥ አመራር፣ የቡድን አፈፃፀም ማሻሻያ እና የለውጥ ተግዳሮቶችን የማለፍ ስልታዊ የአመራር ስልጠና።',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PENDING_APPROVAL,
    estimatedHours: 20,
    category: 'Leadership & Executive Development',
    department: 'Human Resource Development Directorate',
    modules: [
      {
        titleEn: 'Module 1: Vision Execution & Adaptive Leadership',
        titleAm: 'ሞዱል 1፡ ራዕይን መተግበር እና ተለዋዋጭ አመራር',
        descriptionEn: 'Translating policy directives into measurable departmental objectives and leading through uncertainty.',
        descriptionAm: 'የፖሊሲ መመሪያዎችን ወደ ተጨባጭ ግቦች መቀየር እና እርግጠኛ ባልሆነ ሁኔታ ውስጥ መምራት።',
        order: 1,
        lessons: [
          {
            titleEn: '1.1 The Adaptive Leadership Framework in Public Administration',
            titleAm: '1.1 በተለዋዋጭ ሁኔታዎች ውስጥ የመምራት ስልት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 1,
            contentEn: `## 1. Technical vs. Adaptive Challenges
- **Technical Challenges**: Problems where both the issue and solution are well-understood (e.g., updating tax bracket tables in database software).
- **Adaptive Challenges**: Problems where the solution requires changes in people's beliefs, attitudes, and habits (e.g., shifting employees from paper dossiers to cloud systems).`,
            contentAm: `### ቴክኒካል እና አዳፕቲቭ ተግዳሮቶች
ቴክኒካል ተግዳሮቶች ግልጽ መፍትሄ ያላቸው ሲሆኑ፣ አዳፕቲቭ ተግዳሮቶች ግን የሰዎችን አስተሳሰብና ባህል መቀየር የሚጠይቁ ናቸው።`,
          },
          {
            titleEn: '1.2 Aligning Objectives: From Ministerial KPI to Frontline Milestones',
            titleAm: '1.2 ግቦችን ማስተሳሰር፡ ከሚኒስቴር KPI እስከ ግንባር ቀደም ሰራተኛ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 2,
            contentEn: `## 1. The Cascading Alignment Model
Strategic targets set by the Ministry must be systematically decomposed:
1. **Strategic Pillar**: Enhance Domestic Revenue Mobilization.
2. **Directorate KPI**: Reduce tax arrears by 25% within Q3.
3. **Branch Target**: Contact top 100 delinquent corporate taxpayers by end of month.
4. **Individual Objective**: Complete 5 formal settlement agreements weekly.`,
            contentAm: `### የግቦች ትስስር
የሚኒስቴሩ ስትራቴጂካዊ ግብ ወደ ዳይሬክቶሬት፣ ከዚያም ወደ ቅርንጫፍ እና በመጨረሻም ወደ እያንዳንዱ ሰራተኛ ግልጽ የስራ ድርሻ መውረድ አለበት።`,
          },
        ],
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Leadership Frameworks',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ የአመራር ማዕቀፎች',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'lead-m1-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'Which of the following represents an Adaptive Challenge rather than a purely Technical Problem?',
              options: [
                'Overcoming deep-seated staff resistance against transitioning from paper files to digital workflows',
                'Replacing broken computer monitor cables in an office',
                'Rebooting a router after a scheduled power outage',
                'Printing additional tax declaration brochures on the office printer',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Adaptive Leadership',
            },
            {
              id: 'lead-m1-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: Strategic KPIs are most effective when kept top-secret and hidden from frontline operational staff.',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 25,
              category: 'Communication',
            },
            {
              id: 'lead-m1-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'In the cascading alignment model, what connects overarching ministerial strategy to individual daily tasks?',
              options: [
                'Clear Departmental and Branch KPIs with measurable deliverables',
                'Random unrecorded verbal instructions',
                'Annual holiday celebration speeches',
                'The office seating layout',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Strategy Cascade',
            },
            {
              id: 'lead-m1-q4',
              type: 'SHORT_ANSWER',
              question: 'What acronym stands for Key Performance Indicator?',
              options: [],
              correctAnswer: 'KPI',
              points: 25,
              category: 'Metrics',
            },
          ],
        },
      },
      {
        titleEn: 'Module 2: Navigating Reform Resistance & Sustaining Change',
        titleAm: 'ሞዱል 2፡ የለውጥ ተቃውሞን ማስተናገድ እና ውጤትን ማስቀጠል',
        descriptionEn: 'Kotter 8-step change model, coaching underperforming teams, and institutionalizing reform culture.',
        descriptionAm: 'የኮተር ባለ 8-ደረጃ የለውጥ ሞዴል፣ ደካማ አፈፃፀም ያላቸውን ቡድኖች ማብቃት እና የለውጥ ባህልን ማጽናት።',
        order: 2,
        lessons: [
          {
            titleEn: '2.1 Kotter 8-Step Change Process Applied to Public Sector',
            titleAm: '2.1 የኮተር ባለ 8-ደረጃ የለውጥ ሂደት በመንግስት ዘርፍ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 1,
            contentEn: `## 1. The 8 Stages of Reform
1. Create a sense of urgency.
2. Build a guiding coalition.
3. Form a strategic vision.
4. Enlist a volunteer army.
5. Enable action by removing barriers.
6. Generate short-term wins.
7. Sustain acceleration.
8. Institute and anchor change in culture.`,
            contentAm: `### የለውጥ 8 ደረጃዎች
አስፈላጊነቱን ማሳመን፣ ጠንካራ መሪ ቡድን መፍጠር፣ ግልጽ ራዕይ ማዘጋጀት፣ እንቅፋቶችን ማስወገድ፣ ፈጣን ድሎችን ማሳየት እና ለውጡን የተቋሙ ዘላቂ ባህል ማድረግ ናቸው።`,
          },
          {
            titleEn: '2.2 Constructive Coaching & Performance Accountability',
            titleAm: '2.2 አጋዥ የአመራር ስልት እና የአፈፃፀም ተጠያቂነት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 2,
            contentEn: `## 1. The GROW Coaching Model
- **Goal**: What outcome do we want to achieve?
- **Reality**: What is the current factual status?
- **Options**: What alternative actions exist?
- **Will / Way Forward**: What concrete steps will be taken by when?`,
            contentAm: `### የ GROW ሞዴል
ግብን (Goal) ማስቀመጥ፣ ነባራዊ ሁኔታውን (Reality) መገምገም፣ አማራጮችን (Options) ማፍለቅ እና ቁርጠኝነትን (Will) በማረጋገጥ አፈፃፀምን ማሳደግ።`,
          },
        ],
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Change Management',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ የለውጥ አመራር',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'lead-m2-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'Why is generating Short-Term Wins crucial in major organizational modernization programs?',
              options: [
                'It builds momentum, validates the vision, and silences early cynics',
                'It allows management to stop working on the project entirely',
                'It eliminates the need for any further reform budgets',
                'It guarantees that nobody will ever have to learn new software again',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Change Dynamics',
            },
            {
              id: 'lead-m2-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: In the GROW coaching model, the leader should immediately dictate all answers without asking the coachee any questions.',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 25,
              category: 'Coaching',
            },
            {
              id: 'lead-m2-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'What is the final step in Kotter change model aimed at ensuring reforms do not regress?',
              options: [
                'Anchoring the changes in corporate culture and institutional norms',
                'Dismissing the entire guiding coalition',
                'Reverting back to legacy manual files',
                'Halting all performance evaluations',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Kotter Model',
            },
            {
              id: 'lead-m2-q4',
              type: 'SHORT_ANSWER',
              question: 'What is the first letter G in the GROW coaching framework stand for?',
              options: [],
              correctAnswer: 'Goal',
              points: 25,
              category: 'Coaching Models',
            },
          ],
        },
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: Strategic Leadership Certification',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ ስትራቴጂካዊ አመራር ሰርተፊኬት ምዘና',
      passingScore: 75,
      timeLimitMinutes: 40,
      questions: [
        {
          id: 'lead-fn-q1',
          type: 'MULTIPLE_CHOICE',
          question: 'What is the primary role of a public sector leader during an enterprise digital transformation?',
          options: [
            'Communicating the compelling "Why", removing bureaucratic blockers, and modeling new behaviors',
            'Manually writing computer code for the database servers',
            'Denying that any organizational change is happening',
            'Ignoring employee feedback and concerns',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Executive Role',
        },
        {
          id: 'lead-fn-q2',
          type: 'MULTIPLE_CHOICE',
          question: 'When employee resistance against a new digital filing system stems from fear of technology incompetence, what is the best response?',
          options: [
            'Provide structured training, psychological safety, and peer coaching',
            'Immediately terminate all resistant employees',
            'Abandon the technology project entirely',
            'Double the daily workload without any explanation',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Resistance Management',
        },
        {
          id: 'lead-fn-q3',
          type: 'TRUE_FALSE',
          question: 'True or False: Effective leadership requires balancing accountability for deliverables with empathy for operational challenges.',
          options: ['True', 'False'],
          correctAnswer: 0,
          points: 20,
          category: 'Balance',
        },
        {
          id: 'lead-fn-q4',
          type: 'MULTIPLE_CHOICE',
          question: 'What is the purpose of establishing a "Guiding Coalition" in organizational reform?',
          options: [
            'To assemble a diverse group with sufficient authority, expertise, and credibility to lead the change effort',
            'To create an exclusive social club for senior management',
            'To avoid taking responsibility for project outcomes',
            'To replace the human resources department',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Coalitions',
        },
        {
          id: 'lead-fn-q5',
          type: 'SHORT_ANSWER',
          question: 'What management process involves continuous observation, feedback, and collaborative problem-solving to improve team performance?',
          options: [],
          correctAnswer: null, // Nullable answer: open-ended/manually graded or evaluated
          points: 20,
          category: 'Leadership Skills',
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 6. PENDING_APPROVAL: Data Analytics for Tax Administration
  // ─────────────────────────────────────────────────────────
  {
    code: 'DATA-ANA-203',
    titleEn: 'Data Analytics & Predictive Insights for Revenue Administration',
    titleAm: 'የመረጃ ትንተና እና ግምታዊ ግንዛቤዎች ለገቢዎች አስተዳደር',
    descriptionEn:
      'Leveraging relational datasets, anomaly detection models, Benford Law fraud screening, and revenue forecasting to supercharge compliance yields.',
    descriptionAm:
      'የዳታቤዝ መረጃዎችን መተንተን፣ ያልተለመዱ ክስተቶችን (Anomaly Detection) በሞዴሎች መለየት እና የገቢ ትንበያ መስራት።',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PENDING_APPROVAL,
    estimatedHours: 22,
    category: 'Data Science & Analytics',
    department: 'Revenue Intelligence & Analytics Directorate',
    modules: [
      {
        titleEn: 'Module 1: Tax Data Modeling & Business Intelligence Dashboards',
        titleAm: 'ሞዱል 1፡ የታክስ መረጃ ሞዴሊንግ እና የቢዝነስ ኢንተለጀንስ ዳሽቦርዶች',
        descriptionEn: 'Taxpayer profiling datasets, real-time KPI visualization, and time-series revenue trends.',
        descriptionAm: 'የግብር ከፋዮች ዳታ ሞዴል፣ የቀጥታ KPI ዳሽቦርድ አዘገጃጀት እና የገቢ አዝማሚያዎችን መተንተን።',
        order: 1,
        lessons: [
          {
            titleEn: '1.1 Designing Executive Dashboards for Revenue Monitoring',
            titleAm: '1.1 የገቢዎች ክትትል ዳሽቦርድ ንድፍ ለአመራር',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 1,
            contentEn: `## 1. Principles of High-Impact BI Dashboards
- **Actionability**: Dashboards should immediately answer: "Where are we lagging behind targets, and which branch requires intervention?"
- **Visual Hierarchy**: Strategic KPIs at top (Total Monthly Revenue, Target Variance %, On-Time Filing Rate).
- **Drill-Down Capability**: Ability to click into an underperforming customs post to examine sector-by-sector delays.`,
            contentAm: `### የዳሽቦርድ መርሆዎች
ዳሽቦርድ ፈጣን መረጃ መስጠት አለበት፡ የታቀደውና የተሰበሰበው ገቢ ልዩነት፣ የታክስ ማስታወቂያ በወቅቱ የማስገባት መጠን እና በቅርንጫፎች ደረጃ ያለውን አፈፃፀም በአንድ እይታ ማሳየት አለበት።`,
          },
          {
            titleEn: '1.2 Time-Series Revenue Forecasting & Seasonality Adjustments',
            titleAm: '1.2 የጊዜ-ተከታታይ የገቢ ትንበያ እና የወቅቶች ተፅዕኖ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 50,
            order: 2,
            contentEn: `## 1. Accounting for Fiscal Seasonality
Tax receipts exhibit pronounced seasonal cycles:
- Corporate income tax surges around statutory annual declaration months.
- Customs duties correlate with major agricultural harvest cycles and holiday import seasons.
- Time-series moving averages and regression models smooth out anomalies to reveal core structural growth.`,
            contentAm: `### የገቢ ትንበያ
የታክስ ገቢ በዓመቱ ውስጥ በተለያዩ ወቅቶች ይለያያል። የጊዜ-ተከታታይ (Time-Series) ስሌት የወቅቱን ተፅዕኖ በማስተካከል ትክክለኛውን የተቋም እድገት ለማስላት ያገለግላል።`,
          },
        ],
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Dashboards & Forecasts',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ ዳሽቦርዶች እና ትንበያዎች',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'data-m1-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'What is the primary benefit of enabling Drill-Down functionality in executive BI dashboards?',
              options: [
                'Allows executives to navigate from high-level summary KPIs into granular operational and transaction details',
                'Permanently locks the dashboard from being edited',
                'Deletes old historical records to save disk memory',
                'Restricts access only to printers',
              ],
              correctAnswer: 0,
              points: 25,
              category: 'Dashboards',
            },
            {
              id: 'data-m1-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: Tax revenue collections remain perfectly uniform every month throughout the fiscal year without any seasonal variations.',
              options: ['True', 'False'],
              correctAnswer: 1,
              points: 25,
              category: 'Seasonality',
            },
            {
              id: 'data-m1-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'Which visual representation is best suited for showing monthly revenue trends over a 5-year historical horizon?',
              options: ['Line Chart / Time Series Chart', 'Single Pie Chart', 'Static Text Box', 'Scatter plot with no axes'],
              correctAnswer: 0,
              points: 25,
              category: 'Visualization',
            },
            {
              id: 'data-m1-q4',
              type: 'SHORT_ANSWER',
              question: 'What acronym stands for Business Intelligence?',
              options: [],
              correctAnswer: 'BI',
              points: 25,
              category: 'Acronyms',
            },
          ],
        },
      },
      {
        titleEn: 'Module 2: Anomaly Detection & Statistical Fraud Screening',
        titleAm: 'ሞዱል 2፡ ያልተለመዱ ክስተቶችን መለየት እና አሀዛዊ የማጭበርበር ምርመራ',
        descriptionEn: 'Applying Benford Law to invoices, statistical z-scores, and automated compliance risk scoring.',
        descriptionAm: 'የቤንፎርድ ህግን በደረሰኞች ላይ መተግበር፣ ያልተለመዱ ልዩነቶችን በስታቲስቲክስ መለየት እና አውቶሜትድ የአደጋ ውጤት ማስላት።',
        order: 2,
        lessons: [
          {
            titleEn: '2.1 Benford Law & Digit Analysis in Forensic Accounting',
            titleAm: '2.1 የቤንፎርድ ህግ እና የቁጥሮች ትንተና በሂሳብ ምርመራ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 50,
            order: 1,
            contentEn: `## 1. What is Benford Law?
In naturally occurring numerical datasets, the number **1** will appear as the leading first digit approximately **30.1%** of the time, while the number **9** appears as the leading digit only **4.6%** of the time.

---

## 2. Detecting Invoice Tampering
When taxpayers fabricate or manipulate invoice totals manually, human psychology leads them to choose random digits evenly (uniform distribution). Plotting invoice first digits against Benford expected distribution immediately exposes fabrication spikes.`,
            contentAm: `### የቤንፎርድ ህግ
በተፈጥሯዊ የሂሳብ መረጃዎች ላይ ቁጥር 1 የመጀመሪያ አሃዝ ሆኖ የመከሰት እድሉ 30.1% ሲሆን ቁጥር 9 ግን 4.6% ብቻ ነው። የተፈበረኩ ደረሰኞች ይህንን ህግ ስለሚጥሱ በቀላሉ ይታወቃሉ።`,
          },
          {
            titleEn: '2.2 Automated Compliance Profiling & Machine Learning Scoring',
            titleAm: '2.2 አውቶሜትድ የተገዢነት መለያ እና የማሽን ለርኒንግ ውጤት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 2,
            contentEn: `## 1. Supervised Risk Scoring Models
Machine learning classifiers evaluate hundreds of variables simultaneously:
- Filing timeliness history.
- Historical audit adjustment yield.
- Ratio of cash vs. electronic payment receipts.
- Sector peer group deviation.
The resulting Risk Score (0–100) automatically routes declarations to Green (Clear), Yellow (Document Check), or Red (Physical Audit) clearance channels.`,
            contentAm: `### አውቶሜትድ የአደጋ ውጤት
የማሽን ለርኒንግ ሞዴሎች የታክስ ከፋዩን ያለፈ ታሪክ እና የዘርፉን አጠቃላይ መረጃ በማገናዘብ የአደጋ ውጤት (0-100) በመስጠት ወደ አረንጓዴ፣ ቢጫ ወይም ቀይ የመመርመሪያ መስመር ይመድባሉ።`,
          },
        ],
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Anomaly Detection',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ ያልተለመዱ ክስተቶችን መለየት',
          passingScore: 75,
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'data-m2-q1',
              type: 'MULTIPLE_CHOICE',
              question: 'According to Benford Law, approximately what percentage of the time should the digit "1" appear as the leading first digit in natural financial transactions?',
              options: ['Approximately 30%', 'Approximately 10%', 'Approximately 50%', 'Approximately 1%'],
              correctAnswer: 0,
              points: 25,
              category: 'Benford Law',
            },
            {
              id: 'data-m2-q2',
              type: 'TRUE_FALSE',
              question: 'True or False: Automated risk scoring allows customs agencies to fast-track compliant shipments while concentrating inspection resources on high-risk consignments.',
              options: ['True', 'False'],
              correctAnswer: 0,
              points: 25,
              category: 'Risk Channels',
            },
            {
              id: 'data-m2-q3',
              type: 'MULTIPLE_CHOICE',
              question: 'What statistical measure expresses how many standard deviations a specific financial value lies away from the peer group mean?',
              options: ['Z-Score / Standard Score', 'TIN Number', 'Invoice Counter', 'Zip Code'],
              correctAnswer: 0,
              points: 25,
              category: 'Statistics',
            },
            {
              id: 'data-m2-q4',
              type: 'SHORT_ANSWER',
              question: 'What mathematical law analyzes first-digit probability distributions in accounting forensic audits?',
              options: [],
              correctAnswer: 'Benford Law',
              points: 25,
              category: 'Forensic Laws',
            },
          ],
        },
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: Revenue Data Analytics',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የገቢዎች መረጃ ትንተና ምዘና',
      passingScore: 75,
      timeLimitMinutes: 40,
      questions: [
        {
          id: 'data-fn-q1',
          type: 'MULTIPLE_CHOICE',
          question: 'What is the primary advantage of deploying predictive analytics models in tax administration?',
          options: [
            'Proactive identification of non-compliance patterns before major revenue leakage accumulates',
            'Completely replacing the need for any human tax collectors',
            'Eliminating all tax obligations for corporate enterprises',
            'Automatically printing paper receipts in every home',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Predictive Models',
        },
        {
          id: 'data-fn-q2',
          type: 'MULTIPLE_CHOICE',
          question: 'When data cleaning an operational database prior to training a machine learning model, how should duplicate transaction entries be handled?',
          options: [
            'Identified, audited, and deduplicated to avoid bias in the predictive model',
            'Multiplied by five to increase data volume',
            'Ignored completely because computers do not care about duplicate entries',
            'Manually re-typed with random numbers',
          ],
          correctAnswer: 0,
          points: 20,
          category: 'Data Preparation',
        },
        {
          id: 'data-fn-q3',
          type: 'TRUE_FALSE',
          question: 'True or False: Statistical outliers in financial datasets always represent intentional fraud and never represent legitimate large commercial contracts.',
          options: ['True', 'False'],
          correctAnswer: 1,
          points: 20,
          category: 'Outliers',
        },
        {
          id: 'data-fn-q4',
          type: 'MULTIPLE_CHOICE',
          question: 'Which customs clearance channel indicates that a shipment is permitted to pass without physical cargo inspection?',
          options: ['Green Channel', 'Red Channel', 'Yellow Channel', 'Black Channel'],
          correctAnswer: 0,
          points: 20,
          category: 'Clearance Channels',
        },
        {
          id: 'data-fn-q5',
          type: 'SHORT_ANSWER',
          question: 'What term describes a data point that differs significantly from other observations in a statistical dataset?',
          options: [],
          correctAnswer: 'Outlier',
          points: 20,
          category: 'Data Science',
        },
      ],
    },
  },
];

// Global reusable questions to seed into question_bank_questions table
const globalReusableQuestions = [
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: 'What is the foundational statutory principle governing the handling of taxpayer personal and financial data by public revenue officials?',
    options: [
      'Absolute confidentiality and lawful authorized use only',
      'Public disclosure on departmental social media channels',
      'Unrestricted sharing with commercial advertising agencies',
      'Sale to private credit rating enterprises for profit',
    ],
    correctAnswer: '0',
    points: 10,
    category: 'Public Governance',
  },
  {
    type: QuestionType.TRUE_FALSE,
    question: 'True or False: In modern public administration, establishing proactive internal controls is more cost-effective than remediating fraud after it occurs.',
    options: ['True', 'False'],
    correctAnswer: '0',
    points: 10,
    category: 'Internal Controls',
  },
  {
    type: QuestionType.SHORT_ANSWER,
    question: 'In public sector risk management, what is the term for the risk that remains after internal controls and countermeasures have been implemented?',
    options: [],
    correctAnswer: 'Residual Risk',
    points: 10,
    category: 'Risk Management',
  },
  {
    type: QuestionType.SHORT_ANSWER,
    question: 'Explain the essential criteria for an effective institutional whistleblower policy in a ministry or government agency.',
    options: [],
    correctAnswer: null, // Nullable answer: open-ended / manually graded
    points: 10,
    category: 'Ethics & Governance',
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    question: 'Which of the following describes the statutory role of the Internal Audit Directorate in an enterprise agency?',
    options: [
      'Independent appraisal of internal controls, compliance integrity, and risk governance effectiveness',
      'Direct management and authorization of daily procurement disbursements',
      'Preparation of promotional advertising brochures for the public',
      'Negotiation of salary contracts with individual employees',
    ],
    correctAnswer: '0',
    points: 10,
    category: 'Audit & Governance',
  },
  {
    type: QuestionType.SHORT_ANSWER,
    question: 'What term describes the systematic alignment between executive strategic priorities, departmental key performance indicators, and individual operational milestones?',
    options: [],
    correctAnswer: null, // Nullable answer: open-ended
    points: 10,
    category: 'Strategic Leadership',
  },
];

async function main() {
  console.log('🚀 Starting MoR LMS Course & Question Bank Reseeder...\n');

  // 1. Ensure guaranteed demo accounts exist
  const demoAccounts = [
    { email: 'sadministrator@gmail.com', firstName: 'Sami', lastName: 'Admin', role: RoleName.SYSTEM_ADMIN },
    { email: 'tadministrator@gmail.com', firstName: 'Aisha', lastName: 'Mohammed', role: RoleName.TRAINING_ADMIN },
    { email: 'owner@gmail.com', firstName: 'Bereket', lastName: 'Tadesse', role: RoleName.COURSE_OWNER },
    { email: 'approver@gmail.com', firstName: 'Selam', lastName: 'Hailu', role: RoleName.CONTENT_APPROVER },
    { email: 'trainer@gmail.com', firstName: 'Kebede', lastName: 'Alem', role: RoleName.TRAINER },
    { email: 'learner@gmail.com', firstName: 'Meron', lastName: 'Kassa', role: RoleName.LEARNER },
  ];

  const passwordHash = await bcrypt.hash('password', 10);

  for (const acc of demoAccounts) {
    let user = await prisma.user.findUnique({ where: { email: acc.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: acc.email,
          password: passwordHash,
          firstName: acc.firstName,
          lastName: acc.lastName,
          isActive: true,
          roles: {
            create: { role: acc.role },
          },
        },
      });
      console.log(`  ➕ Created demo user: ${acc.email} (${acc.role})`);
    } else {
      // Ensure role is present
      const hasRole = await prisma.userRole.findFirst({
        where: { userId: user.id, role: acc.role },
      });
      if (!hasRole) {
        await prisma.userRole.create({
          data: { userId: user.id, role: acc.role },
        });
      }
    }
  }

  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@gmail.com' } });
  const trainerUser = await prisma.user.findUniqueOrThrow({ where: { email: 'trainer@gmail.com' } });
  const approverUser = await prisma.user.findUniqueOrThrow({ where: { email: 'approver@gmail.com' } });
  const learnerUser = await prisma.user.findUniqueOrThrow({ where: { email: 'learner@gmail.com' } });

  // 2. Clean up existing courses & question bank questions
  const delQB = await prisma.questionBankQuestion.deleteMany();
  console.log(`🧹 Cleared ${delQB.count} old question bank questions.`);
  const delCourses = await prisma.course.deleteMany();
  console.log(`🧹 Cleared ${delCourses.count} old courses (cascaded modules, assessments, enrollments).\n`);

  // 3. Seed Global / Reusable Across Courses questions into question_bank_questions
  console.log('📦 Seeding Global Reusable Questions into Question Bank...');
  for (const gq of globalReusableQuestions) {
    await prisma.questionBankQuestion.create({
      data: {
        courseId: null, // Global / Reusable across courses
        createdById: ownerUser.id,
        type: gq.type,
        question: gq.question,
        options: gq.options,
        correctAnswer: gq.correctAnswer,
        points: gq.points,
        category: gq.category,
      },
    });
  }
  console.log(`  ✓ Seeded ${globalReusableQuestions.length} Global Reusable Questions (courseId: null)\n`);

  // 4. Seed the 6 Courses with Modules, Lessons, Module Assessments, and Final Assessments
  console.log('📚 Seeding 6 Comprehensive Courses...');

  for (const cData of coursesToSeed) {
    const isApproved = cData.status === CourseStatus.APPROVED || cData.status === CourseStatus.PUBLISHED;
    const approvalStatus: ApprovalStatus = isApproved ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING;

    // Create the course record
    const course = await prisma.course.create({
      data: {
        code: cData.code,
        titleEn: cData.titleEn,
        titleAm: cData.titleAm,
        descriptionEn: cData.descriptionEn,
        descriptionAm: cData.descriptionAm,
        status: cData.status,
        level: cData.level,
        estimatedHours: cData.estimatedHours,
        category: cData.category,
        department: cData.department,
        thumbnailUrl: COVER,
        publishedAt: cData.status === CourseStatus.PUBLISHED ? new Date() : null,
        owners: {
          create: [{ userId: ownerUser.id }],
        },
        trainers: {
          create: [{ userId: trainerUser.id }],
        },
        approvals: {
          create: [
            {
              approverId: approverUser.id,
              status: approvalStatus,
              decidedAt: isApproved ? new Date() : null,
              comments: isApproved
                ? 'Curriculum rigorously validated and approved for civil service training deployment.'
                : 'Pending formal review by the Content Approval Directorate.',
            },
          ],
        },
      },
    });

    // Seed Modules & Lessons
    for (const mData of cData.modules) {
      const module = await prisma.curriculumModule.create({
        data: {
          courseId: course.id,
          titleEn: mData.titleEn,
          titleAm: mData.titleAm,
          descriptionEn: mData.descriptionEn,
          descriptionAm: mData.descriptionAm,
          order: mData.order,
          durationMinutes: mData.lessons.reduce((acc, l) => acc + l.durationMinutes, 0),
          passingScore: mData.assessment.passingScore,
          lessons: {
            create: mData.lessons.map((l) => ({
              titleEn: l.titleEn,
              titleAm: l.titleAm,
              contentType: l.contentType,
              durationMinutes: l.durationMinutes,
              order: l.order,
              contentEn: l.contentEn,
              contentAm: l.contentAm,
            })),
          },
        },
      });

      // Seed Module-Level Assessment
      await prisma.assessment.create({
        data: {
          courseId: course.id,
          moduleId: module.id,
          type: AssessmentType.MODULE_ASSESSMENT,
          titleEn: mData.assessment.titleEn,
          titleAm: mData.assessment.titleAm,
          descriptionEn: `Knowledge check assessment for ${mData.titleEn}. Answer all questions to unlock further lessons.`,
          descriptionAm: `የሞዱል እውቀት ማረጋገጫ ምዘና።`,
          passingScore: mData.assessment.passingScore,
          maxAttempts: 3,
          timeLimitMinutes: mData.assessment.timeLimitMinutes,
          shuffleQuestions: false,
          questions: mData.assessment.questions as unknown as Prisma.InputJsonValue,
        },
      });

      // Also seed these module questions into the Question Bank table (courseId = course.id)
      for (const mq of mData.assessment.questions) {
        await prisma.questionBankQuestion.create({
          data: {
            courseId: course.id,
            createdById: ownerUser.id,
            type: mq.type as QuestionType,
            question: mq.question,
            options: mq.options,
            correctAnswer: mq.correctAnswer !== null ? String(mq.correctAnswer) : null,
            points: mq.points,
            category: mq.category || mData.titleEn,
          },
        });
      }
    }

    // Seed Final Course Assessment
    await prisma.assessment.create({
      data: {
        courseId: course.id,
        moduleId: null,
        type: AssessmentType.FINAL_ASSESSMENT,
        titleEn: cData.finalAssessment.titleEn,
        titleAm: cData.finalAssessment.titleAm,
        descriptionEn: `Comprehensive final certification exam for ${cData.titleEn}. Passing score is ${cData.finalAssessment.passingScore}%.`,
        descriptionAm: `የኮርስ ማጠቃለያ ፈተና።`,
        passingScore: cData.finalAssessment.passingScore,
        maxAttempts: 3,
        timeLimitMinutes: cData.finalAssessment.timeLimitMinutes,
        shuffleQuestions: true,
        questions: cData.finalAssessment.questions as unknown as Prisma.InputJsonValue,
      },
    });

    // Also seed final assessment questions into Question Bank
    for (const fq of cData.finalAssessment.questions) {
      await prisma.questionBankQuestion.create({
        data: {
          courseId: course.id,
          createdById: ownerUser.id,
          type: fq.type as QuestionType,
          question: fq.question,
          options: fq.options,
          correctAnswer: fq.correctAnswer !== null ? String(fq.correctAnswer) : null,
          points: fq.points,
          category: fq.category || 'Final Assessment',
        },
      });
    }

    // If PUBLISHED, enroll learner@gmail.com
    if (cData.status === CourseStatus.PUBLISHED) {
      await prisma.enrollment.create({
        data: {
          courseId: course.id,
          userId: learnerUser.id,
          status: EnrollmentStatus.ACTIVE,
        },
      });
    }

    console.log(
      `  ✓ [${cData.status}] ${cData.code}: ${cData.titleEn}\n` +
      `    • Modules: ${cData.modules.length} | Lessons: ${cData.modules.reduce((a, m) => a + m.lessons.length, 0)}\n` +
      `    • Assessments: ${cData.modules.length} Module Assessments + 1 Final Assessment\n` +
      `    • Enrolled learner@gmail.com: ${cData.status === CourseStatus.PUBLISHED ? 'YES' : 'NO'}\n`
    );
  }

  const totalQB = await prisma.questionBankQuestion.count();
  const totalCourses = await prisma.course.count();
  const totalAssessments = await prisma.assessment.count();
  const totalModules = await prisma.curriculumModule.count();
  const totalLessons = await prisma.lesson.count();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log(`📊 Statistics:`);
  console.log(`   • Courses: ${totalCourses} (2 Published, 2 Approved, 2 Pending Approval)`);
  console.log(`   • Modules: ${totalModules}`);
  console.log(`   • Lessons (with detailed notes): ${totalLessons}`);
  console.log(`   • Total Assessments: ${totalAssessments} (Module Checks + Course Finals)`);
  console.log(`   • Question Bank Table Entries: ${totalQB} (Course-specific + Global Reusable)`);
  console.log(`   • Cover Image: "${COVER}" (sample.jpg)`);
  console.log(`\n🔑 Demo Account Roles:`);
  console.log(`   • owner@gmail.com      → Owns all 6 courses & created bank questions`);
  console.log(`   • trainer@gmail.com    → Assigned trainer across all 6 courses`);
  console.log(`   • approver@gmail.com   → Approved 4 courses, 2 in Pending Approval queue`);
  console.log(`   • learner@gmail.com    → Active enrollment in both 2 PUBLISHED courses`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
