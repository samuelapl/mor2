import * as bcrypt from 'bcrypt';
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
import { seedPermissions } from './seed-permissions';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const COVER = '/sample.jpg';
const PDF_FILE_KEY = 'attachments/file-sample.pdf';
const PDF_FILE_URL = '/file-sample.pdf';
const PDF_SIZE_BYTES = 142786;

// ──────────────────────────────────────────────────────────
// Curriculum data model helpers
// Curriculum data interfaces
// ──────────────────────────────────────────────────────────

interface QuestionSeed {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  correctAnswer: number | string | null;
  points: number;
  category: string;
}

interface AssessmentSeed {
  titleEn: string;
  titleAm: string;
  descriptionEn?: string;
  descriptionAm?: string;
  passingScore: number;
  timeLimitMinutes: number;
  questions: QuestionSeed[];
}

interface AttachmentSeed {
  fileName: string;
  fileType: string;
}

interface SubLessonSeed {
  titleEn: string;
  titleAm: string;
  contentType: LessonContentType;
  durationMinutes: number;
  order: number;
  contentEn: string;
  contentAm: string;
  attachment: AttachmentSeed;
  assessment: AssessmentSeed;
}

interface LessonSeed {
  titleEn: string;
  titleAm: string;
  contentType: LessonContentType;
  durationMinutes: number;
  order: number;
  contentEn: string;
  contentAm: string;
  attachment: AttachmentSeed;
  assessment: AssessmentSeed;
  subLessons?: SubLessonSeed[];
  subLessons: SubLessonSeed[];
}

interface ModuleSeed {
  titleEn: string;
  titleAm: string;
  descriptionEn: string;
  descriptionAm: string;
  objectivesEn: string;
  objectivesAm: string;
  order: number;
  attachment: AttachmentSeed;
  assessment: AssessmentSeed;
  lessons: LessonSeed[];
}

interface CourseSeed {
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
  targetAudience: string;
  deliveryMethod: string;
  objectivesEn: string;
  objectivesAm: string;
  prerequisites: string;
  approvalComments: string;
  approvalComments?: string;
  modules: ModuleSeed[];
  finalAssessment: AssessmentSeed;
}

function mcq(id: string, question: string, options: string[], correctAnswer: number, category: string, points = 20): QuestionSeed {
  return { id, type: 'MULTIPLE_CHOICE', question, options, correctAnswer, points, category };
}
function tf(id: string, question: string, correctAnswer: 0 | 1, category: string, points = 20): QuestionSeed {
  return { id, type: 'TRUE_FALSE', question, options: ['True', 'False'], correctAnswer, points, category };
}
function sa(id: string, question: string, correctAnswer: string, category: string, points = 20): QuestionSeed {
  return { id, type: 'SHORT_ANSWER', question, options: [], correctAnswer, points, category };
}
function pdf(fileName: string): AttachmentSeed {
  return { fileName, fileType: 'application/pdf' };
}

// ──────────────────────────────────────────────────────────
// 5 courses spanning the full approval lifecycle:
// DRAFT → PENDING_APPROVAL → REJECTED → APPROVED → PUBLISHED
// 5 Complete Courses spanning the workflow statuses:
// 1. DRAFT             (EXCEL201)
// 2. PENDING_APPROVAL  (PROJ201)
// 3. REJECTED          (CSERV101)
// 4. APPROVED          (CYBER301)
// 5. PUBLISHED         (MOR101)
// ──────────────────────────────────────────────────────────

const courseSeeds: CourseSeed[] = [
  // ─────────────────────────────────────────────────────────
  // 1. DRAFT — Advanced Excel & Data Analytics for Revenue Reporting
  // 1. DRAFT: Advanced Excel & Data Analytics for Revenue Reporting
  // ─────────────────────────────────────────────────────────
  {
    code: 'EXCEL201',
    titleEn: 'Advanced Excel & Data Analytics for Revenue Reporting',
    titleAm: 'የላቀ Excel እና የመረጃ ትንተና ለገቢዎች ሪፖርት',
    descriptionEn:
      'Master lookup formulas, data validation, PivotTables, and automated dashboards to transform raw revenue transaction data into decision-ready reports.',
    descriptionAm: 'የፍለጋ ቀመሮችን፣ የመረጃ ማረጋገጫን፣ ፒቮት ሠንጠረዦችን እና ራስ-ሰር ዳሽቦርዶችን በመጠቀም ጥሬ የገቢ መረጃን ወደ ውሳኔ ዝግጁ ሪፖርት መቀየር።',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.DRAFT,
    estimatedHours: 22,
    category: 'Digital Skills & Productivity',
    department: 'ICT & Digital Transformation Directorate',
    targetAudience: 'Revenue officers, branch accountants, and reporting analysts who use Excel daily',
    deliveryMethod: 'Self-paced e-learning with downloadable practice workbooks',
    objectivesEn:
      'Build accurate lookup formulas, enforce clean data entry with validation rules, summarize large datasets with PivotTables, and publish automated dashboards.',
    objectivesAm: 'ትክክለኛ የፍለጋ ቀመሮችን መገንባት፣ በማረጋገጫ ደንቦች ንጹህ ውሂብ ማስገባትን ማረጋገጥ እና በፒቮት ሠንጠረዦች ትልቅ ውሂብን ማጠቃለል።',
    prerequisites: 'CS101 Computer Basics or equivalent familiarity with spreadsheet navigation',
    approvalComments: '',
    modules: [
      {
        titleEn: 'Module 1: Formulas, Lookup Functions & Data Validation',
        titleAm: 'ሞዱል 1፡ ቀመሮች፣ የፍለጋ ተግባራት እና የመረጃ ማረጋገጫ',
        descriptionEn:
          'Build precise, auditable formulas for cross-referencing taxpayer records and protect worksheets from invalid entries before they reach a report.',
        descriptionAm: 'ለግብር ከፋዮች መዝገቦች ትክክለኛ ቀመሮችን መገንባት እና ልክ ያልሆኑ ግቤቶች ወደ ሪፖርት ከመድረሳቸው በፊት መከላከል።',
        objectivesEn: 'Apply VLOOKUP, INDEX-MATCH, and nested IF logic; configure data validation and error-proofing rules.',
        objectivesAm: 'VLOOKUP፣ INDEX-MATCH እና የተጠላለፉ IF ቀመሮችን መጠቀም፤ የመረጃ ማረጋገጫ ደንቦችን ማዋቀር።',
        order: 0,
        attachment: pdf('Module 1 - Formulas & Validation Reference Guide.pdf'),
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Formulas & Validation',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ ቀመሮች እና ማረጋገጫ',
          descriptionEn: 'Checks understanding of lookup formulas and data validation before moving to PivotTables.',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('excel-m1-q1', 'Which function looks up a value in the leftmost column of a table and returns a value in the same row from a specified column?', ['VLOOKUP', 'CONCATENATE', 'SUMIF', 'TRIM'], 0, 'Lookup Functions'),
            mcq('excel-m1-q2', 'What is the main advantage of INDEX-MATCH over VLOOKUP?', ['It can look up values to the left of the lookup column', 'It only works with text values', 'It cannot be used with tables', 'It is slower on small datasets'], 0, 'Lookup Functions'),
            tf('excel-m1-q3', 'True or False: Data Validation can restrict a cell to only accept whole numbers within a defined range.', 0, 'Data Validation'),
            mcq('excel-m1-q4', 'Which Excel feature displays a warning message and blocks entry when a user types an invalid value into a restricted cell?', ['Conditional Formatting', 'Data Validation with Stop alert', 'Freeze Panes', 'AutoFill'], 1, 'Data Validation'),
            sa('excel-m1-q5', 'What is the term for the 4th argument in VLOOKUP that determines exact vs. approximate matching?', 'Range Lookup', 'Lookup Functions'),
          ],
        },
        lessons: [
          {
            titleEn: '1.1 Mastering VLOOKUP, INDEX-MATCH & Nested Formulas',
            titleAm: '1.1 VLOOKUP፣ INDEX-MATCH እና የተጠላለፉ ቀመሮችን ማወቅ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 0,
            contentEn: `## Why Lookup Formulas Matter in Revenue Reporting
Revenue offices maintain taxpayer registers, payment logs, and branch summaries in separate worksheets. Lookup formulas let you pull the right value from the right row automatically instead of manually cross-checking thousands of rows.

## Key Formulas
- **VLOOKUP(lookup_value, table_array, col_index_num, range_lookup)**: retrieves a value from a column to the right of the lookup column. Set range_lookup to FALSE for exact matches — critical when matching Taxpayer Identification Numbers (TIN).
- **INDEX-MATCH**: \`=INDEX(return_range, MATCH(lookup_value, lookup_range, 0))\` is more flexible than VLOOKUP because it can look left, and it does not break when columns are inserted.
- **Nested IF**: combine multiple conditions, e.g. classifying a taxpayer as Compliant, Under Review, or Delinquent based on payment status and days overdue.

## Practical Tip
Always lock the table array with absolute references (\`$A$2:$D$500\`) before copying a lookup formula down a column, otherwise the range shifts and produces wrong results.`,
            contentAm: `### ማጠቃለያ
የፍለጋ ቀመሮች (VLOOKUP, INDEX-MATCH) ከተለያዩ ሉሆች ትክክለኛ ውሂብን በራስ-ሰር ለማምጣት ያገለግላሉ። INDEX-MATCH ከVLOOKUP የላቀ ተለዋዋጭነት አለው። የፍርድ ክልልን በ$ ምልክት ማጠናከር ስህተቶችን ይከላከላል።`,
            attachment: pdf('Lesson 1.1 - VLOOKUP & INDEX-MATCH Worksheet.pdf'),
            assessment: {
              titleEn: 'Lesson 1.1 Check: Lookup Formulas',
              titleAm: 'ትምህርት 1.1 ማረጋገጫ፡ የፍለጋ ቀመሮች',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('excel-m1-l1-q1', 'In VLOOKUP, setting range_lookup to FALSE forces which behavior?', ['Approximate match only', 'Exact match only', 'Case-insensitive match', 'Ignores blank cells'], 1, 'VLOOKUP'),
                mcq('excel-m1-l1-q2', 'Which formula combination can look up a value to the LEFT of the lookup column?', ['VLOOKUP alone', 'SUMIF alone', 'INDEX combined with MATCH', 'COUNTA alone'], 2, 'INDEX-MATCH'),
                tf('excel-m1-l1-q3', 'True or False: Absolute references ($A$2:$D$500) prevent a lookup range from shifting when the formula is copied down.', 0, 'Cell References'),
                mcq('excel-m1-l1-q4', 'Nested IF formulas are most useful for which task?', ['Formatting cell borders', 'Classifying records under multiple conditions', 'Sorting a table alphabetically', 'Merging two cells'], 1, 'Nested IF'),
                sa('excel-m1-l1-q5', 'What symbol is used to lock a row or column reference so it does not change when copied?', '$', 'Cell References'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Cross-Referencing Taxpayer Ledgers with INDEX-MATCH',
                titleAm: 'ተግባራዊ ላብ፡ በINDEX-MATCH የግብር ከፋዮች መዝገቦችን ማገናዘብ',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                contentEn: `## Lab Scenario
You have two worksheets: "Payments" (TIN, Amount, Date) and "Registry" (TIN, Taxpayer Name, Branch). Your task is to build a consolidated report showing each payment alongside the taxpayer name and branch.

## Steps
1. In the Payments sheet, add a "Taxpayer Name" column and enter \`=INDEX(Registry!$B$2:$B$1000, MATCH(A2, Registry!$A$2:$A$1000, 0))\`.
2. Wrap the formula in \`IFERROR(..., "TIN Not Found")\` to flag mismatched records instead of showing #N/A.
3. Repeat for the "Branch" column, then filter the report for "TIN Not Found" rows to identify data entry errors that need correction before the report is finalized.

## Deliverable
A reconciled payments report with zero unresolved TIN mismatches, ready for the attached reference PDF's sign-off checklist.`,
                contentAm: `### የላብ ሁኔታ
ሁለት ሉሆችን (ክፍያዎች እና መዝገብ) በTIN በማገናኘት የተጠቃለለ ሪፖርት መገንባት። INDEX-MATCH ቀመርን በIFERROR በመጠቅለል ያልተገናኙ TIN ቁጥሮችን ምልክት ማድረግ እና ከሪፖርቱ በፊት ማረም ያስፈልጋል።`,
                attachment: pdf('Sub-Lesson 1.1.1 - Cross-Reference Lab Data Pack.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.1.1 Check: Cross-Referencing Lab',
                  titleAm: 'ንዑስ ትምህርት 1.1.1 ማረጋገጫ፡ የማገናዘብ ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('excel-m1-l1-s1-q1', 'What does wrapping a lookup formula in IFERROR accomplish?', ['It speeds up calculation', 'It replaces an error result with a custom message', 'It sorts the results', 'It deletes blank rows'], 1, 'Error Handling'),
                    mcq('excel-m1-l1-s1-q2', 'In the lab, what does a "TIN Not Found" result indicate?', ['The payment was refunded', 'The TIN in Payments has no matching row in Registry', 'The branch code is invalid', 'The amount is negative'], 1, 'Data Reconciliation'),
                    tf('excel-m1-l1-s1-q3', 'True or False: Filtering the report for "TIN Not Found" helps identify data entry errors before finalizing the report.', 0, 'Data Reconciliation'),
                    mcq('excel-m1-l1-s1-q4', 'Which two columns does the Registry worksheet need at minimum for this lab?', ['Amount and Date', 'TIN and Taxpayer Name', 'Branch and Password', 'Date and Signature'], 1, 'Lab Setup'),
                    sa('excel-m1-l1-s1-q5', 'What Excel function wraps around a formula to catch and replace errors like #N/A?', 'IFERROR', 'Error Handling'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '1.2 Data Validation Rules & Error-Proofing Revenue Worksheets',
            titleAm: '1.2 የመረጃ ማረጋገጫ ደንቦች እና ስህተት መከላከል',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 1,
            contentEn: `## Preventing Bad Data at the Source
Revenue worksheets are only as reliable as the data typed into them. Data Validation stops invalid entries before they contaminate downstream formulas and reports.

## Common Validation Rules
- **Whole Number / Decimal Range**: restrict tax amounts to realistic positive ranges.
- **List**: restrict a "Branch" column to a predefined dropdown of approved branch codes, eliminating typos like "Adiss Ababa".
- **Custom Formula**: e.g. \`=LEN(A2)=10\` to enforce a 10-digit TIN length.
- **Input Message & Error Alert**: guide the user with a hint before they type, and a Stop alert if they violate the rule.

## Auditing Existing Data
Use *Data > Data Validation > Circle Invalid Data* to visually flag rows that already violate a rule you just applied to a legacy worksheet, before you rely on it for reporting.`,
            contentAm: `### ስህተት መከላከል
የመረጃ ማረጋገጫ ልክ ያልሆኑ ግቤቶችን ከመነሻቸው ይከለክላል። የዝርዝር ማረጋገጫ የቅርንጫፍ ኮዶችን የፊደል ስህተት ይከላከላል፤ Custom Formula የTIN ርዝመትን ያረጋግጣል።`,
            attachment: pdf('Lesson 1.2 - Data Validation Rules Cheat Sheet.pdf'),
            assessment: {
              titleEn: 'Lesson 1.2 Check: Data Validation',
              titleAm: 'ትምህርት 1.2 ማረጋገጫ፡ የመረጃ ማረጋገጫ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('excel-m1-l2-q1', 'Which Data Validation type restricts entry to a predefined dropdown of values?', ['Whole Number', 'List', 'Text Length', 'Decimal'], 1, 'Data Validation'),
                mcq('excel-m1-l2-q2', 'A custom formula rule `=LEN(A2)=10` would be used to enforce what?', ['A 10-digit TIN length', 'A maximum of 10 rows', 'A 10% tax rate', 'A 10-character branch name'], 0, 'Custom Rules'),
                tf('excel-m1-l2-q3', 'True or False: "Circle Invalid Data" can highlight existing entries that violate a validation rule applied after the data was entered.', 0, 'Auditing'),
                mcq('excel-m1-l2-q4', 'What is the purpose of an Input Message in Data Validation?', ['To delete invalid rows automatically', 'To guide the user with a hint before they type', 'To sort the column', 'To hide the column'], 1, 'Data Validation'),
                sa('excel-m1-l2-q5', 'What type of alert stops a user from entering a value that fails validation?', 'Stop alert', 'Data Validation'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Building Branch Dropdown Menus & Tax ID Length Restraints',
                titleAm: 'ተግባራዊ ላብ፡ የቅርንጫፍ ተቆልቋይ ዝርዝር እና የTIN ርዝመት ገደቦችን መገንባት',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Objective
Configure a template spreadsheet that forces entry clerks to pick from 10 approved Ministry regional branches and type only exactly 10-digit TIN numbers.

## Procedure
1. Create a dedicated lookup range \`=Branches!$A$1:$A$10\` and apply List Validation to Column B of the data entry sheet.
2. Select Column A (TIN) and apply Custom Validation with the formula \`=AND(ISNUMBER(--A2), LEN(A2)=10)\`.
3. Configure the Error Alert style to "Stop", with title "Invalid TIN Format" and message "TIN must consist of exactly 10 numeric digits."
4. Test by entering 9 digits, letters, and 10 digits to verify that invalid entries are rejected.`,
                contentAm: `### የላብ ዓላማ
የቅርንጫፍ ተቆልቋይ ዝርዝር እና የ10 አሃዝ TIN ማረጋገጫ ማዋቀር። ስህተት ሲገባ ስርዓቱ Stop alert እንዲያሳይ ማድረግ።`,
                attachment: pdf('Sub-Lesson 1.2.1 - Data Validation Practice Workbook.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.2.1 Check: Validation Lab',
                  titleAm: 'ንዑስ ትምህርት 1.2.1 ማረጋገጫ፡ የማረጋገጫ ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('excel-m1-l2-s1-q1', 'What Error Alert style completely prevents invalid input from being entered into a cell?', ['Information', 'Warning', 'Stop', 'Ignore'], 2, 'Validation Lab'),
                    mcq('excel-m1-l2-s1-q2', 'Why is storing branch names in a dedicated lookup range better than typing them directly into the validation dialog?', ['It allows easy maintenance and updating of the list', 'It saves computer memory', 'It enables 3D graphics', 'It makes the workbook read-only'], 0, 'Validation Lab'),
                    tf('excel-m1-l2-s1-q3', 'True or False: The formula `=LEN(A2)=10` will accept an entry with 11 characters.', 1, 'Validation Lab'),
                    mcq('excel-m1-l2-s1-q4', 'Which tab in Excel ribbon houses the Data Validation command?', ['Formulas', 'Data', 'Review', 'Page Layout'], 1, 'Validation Lab'),
                    sa('excel-m1-l2-s1-q5', 'What function calculates the total number of characters in a text string?', 'LEN', 'Validation Lab'),
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        titleEn: 'Module 2: PivotTables, Dashboards & Automated Reporting',
        titleAm: 'ሞዱል 2፡ ፒቮት ሠንጠረዦች፣ ዳሽቦርዶች እና ራስ-ሰር ሪፖርት',
        descriptionEn: 'Turn thousands of transaction rows into a one-page monthly revenue summary that updates itself.',
        descriptionAm: 'ሺዎች የግብይት ረድፎችን ራሱ ወደሚያዘምን የወርሃዊ ገቢ ማጠቃለያ ገጽ መቀየር።',
        objectivesEn: 'Build PivotTables with slicers and timelines; design dashboards using conditional formatting and charts.',
        objectivesAm: 'ከመቁረጫዎች እና የጊዜ መስመሮች ጋር ፒቮት ሠንጠረዦችን መገንባት፤ በሁኔታዊ ቅርጸት እና ገበታዎች ዳሽቦርዶችን መንደፍ።',
        order: 1,
        attachment: pdf('Module 2 - PivotTable & Dashboard Reference Guide.pdf'),
        assessment: {
          titleEn: 'Module 2 Knowledge Check: PivotTables & Dashboards',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ ፒቮት ሠንጠረዦች እና ዳሽቦርዶች',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('excel-m2-q1', 'What is the primary purpose of a PivotTable?', ['Encrypting a workbook', 'Summarizing and aggregating large datasets interactively', 'Spell-checking text', 'Printing multiple sheets at once'], 1, 'PivotTables'),
            mcq('excel-m2-q2', 'Which PivotTable feature lets a user interactively filter results by clicking buttons for each category?', ['Slicer', 'Freeze Panes', 'Macro Recorder', 'Watch Window'], 0, 'PivotTables'),
            tf('excel-m2-q3', 'True or False: A Timeline slicer is specifically designed for filtering PivotTables by date fields.', 0, 'PivotTables'),
            mcq('excel-m2-q4', 'Conditional Formatting on a dashboard is typically used to what end?', ['Automatically highlight values that meet a defined condition, like overdue payments', 'Change the file extension', 'Password-protect a sheet', 'Merge worksheets'], 0, 'Dashboards'),
            sa('excel-m2-q5', 'What term describes drilling into a PivotTable total to see the underlying raw rows?', 'Drill-down', 'PivotTables'),
            mcq('excel-m2-q4', 'When new rows are added to the source data table, what must you do to update the PivotTable?', ['Recreate the entire PivotTable', 'Click Refresh (or press Alt+F5)', 'Restart Excel', 'Change the font size'], 1, 'PivotTables'),
            sa('excel-m2-q5', 'What is the visual filtering tool in PivotTables that provides clickable buttons for categories?', 'Slicer', 'PivotTables'),
          ],
        },
        lessons: [
          {
            titleEn: '2.1 Building Dynamic PivotTables for Monthly Revenue Summaries',
            titleAm: '2.1 ተለዋዋጭ ፒቮት ሠንጠረዦችን ለወርሃዊ የገቢ ማጠቃለያ መገንባት',
            titleEn: '2.1 Building Dynamic PivotTables with Slicers & Timelines',
            titleAm: '2.1 ተለዋዋጭ ፒቮት ሠንጠረዦችን ከመቁረጫዎች እና የጊዜ መስመር ጋር መገንባት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 0,
            contentEn: `## From Raw Rows to a Summary in Seconds
A PivotTable lets you drag fields into Rows, Columns, and Values to instantly summarize thousands of transaction records without writing a single formula.
            contentEn: `## The Power of PivotTables
A revenue report that requires manual formulas across 50,000 transactions takes hours to build and breaks easily. PivotTables generate total revenue by tax type, branch, and payment channel in seconds.

## Building the Table
1. Select the transaction data range (or better, a named Excel Table so the PivotTable auto-expands as new rows are added).
2. Insert > PivotTable, place it on a new sheet.
3. Drag "Branch" to Rows, "Month" to Columns, and "Amount" to Values (set to Sum).
4. Right-click any value cell and choose "Show Value As > % of Grand Total" to see each branch's share of total revenue.
## Best Practices for Clean Source Data
1. Every column must have a distinct, non-blank header.
2. No empty rows or merged cells in the data range.
3. Use an Excel Table (\`Ctrl+T\`) as the source so the PivotTable automatically includes new rows when refreshed.

## Refreshing Data
When source data changes, right-click the PivotTable and choose "Refresh" — the summary updates instantly without rebuilding the report from scratch.`,
## Interactive Controls
- **Slicers**: enable managers to filter the summary by Branch or Tax Type with a single click.
- **Timelines**: let analysts slide across fiscal quarters or months without typing date filters.`,
            contentAm: `### ማጠቃለያ
ፒቮት ሠንጠረዥ መስኮችን ወደ ረድፎች፣ ዓምዶች እና እሴቶች በመጎተት ሺዎች ግብይቶችን በሰከንዶች ውስጥ ያጠቃልላል። ምንጭ ውሂብ ሲቀየር "Refresh" በመጫን ሪፖርቱ ራሱ ይዘምናል።`,
            attachment: pdf('Lesson 2.1 - PivotTable Build Walkthrough.pdf'),
ፒቮት ሠንጠረዦች በሺዎች የሚቆጠሩ ግብይቶችን በደቂቃዎች ውስጥ ያጠቃልላሉ። ምንጭ ውሂቡን በሰንጠረዥ (Ctrl+T) ማዘጋጀት አዳዲስ ረድፎች በራስ-ሰር እንዲካተቱ ይረዳል። መቁረጫዎች (Slicers) ፈጣን ማጣሪያ ይሰጣሉ።`,
            attachment: pdf('Lesson 2.1 - PivotTable Architecture Guide.pdf'),
            assessment: {
              titleEn: 'Lesson 2.1 Check: Building PivotTables',
              titleAm: 'ትምህርት 2.1 ማረጋገጫ፡ ፒቮት ሠንጠረዦችን መገንባት',
              titleEn: 'Lesson 2.1 Check: PivotTable Architecture',
              titleAm: 'ትምህርት 2.1 ማረጋገጫ፡ የፒቮት ሠንጠረዥ ግንባታ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('excel-m2-l1-q1', 'Why is it recommended to convert source data into a named Excel Table before building a PivotTable?', ['It changes the font automatically', 'The PivotTable auto-expands as new rows are added', 'It removes the need for headers', 'It encrypts the data'], 1, 'PivotTables'),
                mcq('excel-m2-l1-q2', 'To see each branch share of total revenue, which "Show Value As" option is used?', ['% of Grand Total', 'Rank Largest to Smallest', 'Running Total', 'Index'], 0, 'PivotTables'),
                tf('excel-m2-l1-q3', 'True or False: Right-clicking a PivotTable and choosing Refresh updates it after the source data changes.', 0, 'PivotTables'),
                mcq('excel-m2-l1-q4', 'Which area of the PivotTable Field List determines the numeric summary (e.g. Sum, Average)?', ['Rows', 'Columns', 'Values', 'Filters'], 2, 'PivotTables'),
                sa('excel-m2-l1-q5', 'What menu path inserts a PivotTable from selected data?', 'Insert > PivotTable', 'PivotTables'),
                mcq('excel-m2-l1-q1', 'Why should an official Excel Table (Ctrl+T) be used as a PivotTable data source?', ['It compresses file size by 90%', 'The PivotTable range automatically expands as new rows are added', 'It prevents anyone from editing the cells', 'It forces uppercase text'], 1, 'PivotTable Setup'),
                mcq('excel-m2-l1-q2', 'What happens if a source data column has no header text?', ['Excel automatically numbers it', 'The PivotTable cannot be created until the header is added', 'The column is permanently deleted', 'It becomes a row label'], 1, 'Data Hygiene'),
                tf('excel-m2-l1-q3', 'True or False: Multiple PivotTables can be connected to the same Slicer for unified filtering.', 0, 'Slicers'),
                mcq('excel-m2-l1-q4', 'Which keyboard shortcut refreshes the active PivotTable?', ['Ctrl+P', 'Alt+F5', 'Ctrl+Z', 'Alt+F4'], 1, 'Shortcuts'),
                sa('excel-m2-l1-q5', 'What keyboard shortcut converts a plain range into an Excel Table?', 'Ctrl+T', 'Shortcuts'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Slicers, Timelines & Drill-Down Dashboards',
                titleAm: 'ተግባራዊ ላብ፡ መቁረጫዎች፣ የጊዜ መስመሮች እና ዳሽቦርድ ማጥለቅ',
                titleEn: 'Practical Lab: Monthly Tax Collection Pivot Summary',
                titleAm: 'ተግባራዊ ላብ፡ የወርሃዊ ግብር ስብስብ ፒቮት ማጠቃለያ',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
Starting from the PivotTable built in the previous lesson, add interactivity so a branch manager can explore the data without touching a formula.

## Steps
1. PivotTable Analyze > Insert Slicer, select "Branch" and "Payment Status".
2. PivotTable Analyze > Insert Timeline, select the "Payment Date" field to add a draggable date-range filter.
3. Double-click any Grand Total cell to drill down and generate a new sheet listing every underlying transaction for that total — useful for audit trails.
4. Connect the slicer to a second PivotTable (Slicer > Report Connections) so both update together.

## Deliverable
An interactive one-page dashboard where clicking "Addis Ababa Branch" and dragging the timeline instantly recalculates every linked PivotTable.`,
Given 10,000 transaction records for the current fiscal quarter:
1. Convert the data to an official Excel Table named "TaxTransactions".
2. Insert a PivotTable on a new sheet: Branch on Rows, Tax Category on Columns, and Sum of Amount in Values.
3. Group the Date field by Month and Quarter.
4. Insert Slicers for "Branch" and "Payment Method" (Telebirr, CBE, Cash).
5. Format the Values field as Currency with 2 decimal places.`,
                contentAm: `### የላብ ሁኔታ
መቁረጫዎችን (Slicers) እና የጊዜ መስመርን (Timeline) በመጨመር የቅርንጫፍ ሀላፊ ያለ ቀመር ውሂብን እንዲመረምር ማስቻል። Grand Total ላይ ድርብ-ጠቅ ማድረግ ለኦዲት የሚረዳ ዝርዝር ረድፎችን ያሳያል።`,
                attachment: pdf('Sub-Lesson 2.1.1 - Slicer & Timeline Lab Pack.pdf'),
10,000 የግብይት መረጃዎችን ወደ ፒቮት ሠንጠረዥ መቀየር፣ በወር መቧደን እና በቅርንጫፍና በክፍያ ዘዴ መቁረጫዎችን ማከል እና እንደ ገንዘብ ቅርጸት ማበጀት።`,
                attachment: pdf('Sub-Lesson 2.1.1 - Tax Collection Pivot Lab.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.1.1 Check: Slicers & Timelines',
                  titleAm: 'ንዑስ ትምህርት 2.1.1 ማረጋገጫ፡ መቁረጫዎች እና የጊዜ መስመሮች',
                  titleEn: 'Sub-Lesson 2.1.1 Check: Tax Collection Lab',
                  titleAm: 'ንዑስ ትምህርት 2.1.1 ማረጋገጫ፡ የግብር ስብስብ ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('excel-m2-l1-s1-q1', 'What does a Timeline control specifically filter by?', ['Text categories', 'Date fields', 'Numeric ranges', 'Cell colors'], 1, 'Timelines'),
                    mcq('excel-m2-l1-s1-q2', 'Double-clicking a PivotTable Grand Total cell does what?', ['Deletes the total', 'Drills down to a new sheet listing underlying transactions', 'Changes the currency format', 'Hides the row'], 1, 'Drill-Down'),
                    tf('excel-m2-l1-s1-q3', 'True or False: A single Slicer can be connected to control more than one PivotTable at once via Report Connections.', 0, 'Slicers'),
                    mcq('excel-m2-l1-s1-q4', 'Where is "Insert Slicer" found in the ribbon?', ['Home tab', 'PivotTable Analyze tab', 'Page Layout tab', 'Review tab'], 1, 'Slicers'),
                    sa('excel-m2-l1-s1-q5', 'What is the drill-down feature useful for in a revenue audit context?', 'Viewing the underlying transactions behind a total', 'Drill-Down'),
                    mcq('excel-m2-l1-s1-q1', 'When grouping dates in a PivotTable, which increments can be selected together?', ['Months and Quarters', 'Colors and Sizes', 'Currencies only', 'Font types'], 0, 'Date Grouping'),
                    mcq('excel-m2-l1-s1-q2', 'Where in the PivotTable field list do numeric metrics like "Tax Amount" belong?', ['Filters quadrant', 'Rows quadrant', 'Values quadrant', 'Columns quadrant'], 2, 'Field Placement'),
                    tf('excel-m2-l1-s1-q3', 'True or False: Number formatting should be set via Field Settings rather than plain cell formatting.', 0, 'Field Settings'),
                    mcq('excel-m2-l1-s1-q4', 'What tool lets you view revenue by both Branch and Tax Category simultaneously?', ['A two-dimensional PivotTable with Rows and Columns', 'A pie chart with no legend', 'Sort ascending', 'Find and Replace'], 0, 'Field Placement'),
                    sa('excel-m2-l1-s1-q5', 'In which quadrant of the PivotTable field list should the primary calculation metric be placed?', 'Values', 'Field Placement'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '2.2 Designing Automated Dashboards with Conditional Formatting & Charts',
            titleAm: '2.2 ራስ-ሰር ዳሽቦርዶችን በሁኔታዊ ቅርጸት እና ገበታዎች መንደፍ',
            titleEn: '2.2 Executive Dashboard Design & KPI Visualization',
            titleAm: '2.2 የአመራር ዳሽቦርድ ንድፍ እና የKPI ምስላዊ እይታ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 1,
            contentEn: `## Turning Numbers into a Visual Story
A well-designed dashboard lets a director understand collection performance in seconds, not minutes.
            contentEn: `## Designing for Decision Makers
Directors do not read 20-page spreadsheet tabs. An executive dashboard consolidates critical metrics onto a single screen that requires no horizontal or vertical scrolling.

## Conditional Formatting for Alerts
- **Color Scales**: shade a "Collection Rate %" column from red (low) to green (high) across all branches.
- **Icon Sets**: apply up/down arrows to a "Variance vs. Target" column.
- **Formula-Based Rule**: highlight any row where \`=[@DaysOverdue]>30\` in red to flag chronic delinquency.

## Choosing the Right Chart
- **Bar/Column**: comparing branches side by side.
- **Line**: showing a trend over months.
- **Combo Chart**: showing actual revenue as columns against a target line for immediate gap visibility.

Keep dashboards to a single printable page — link charts directly to the PivotTable so the entire dashboard refreshes with one click.`,
## Design Rules for Ministry Dashboards
- **Grid Alignment**: align cards and charts to a strict 4-column layout.
- **Color Palette**: use corporate navy for baseline data, green for target achieved, and amber/red for variance warnings. Avoid random bright colors.
- **KPI Metric Cards**: show Total Collected, % of Target Achieved, and Comparison with Prior Year.
- **Interactive Chart Connection**: connect Pivot Charts to the central Slicers so the entire screen reacts in real time.`,
            contentAm: `### ማጠቃለያ
ሁኔታዊ ቅርጸት (Conditional Formatting) ከፍተኛ እና ዝቅተኛ የመሰብሰብ መጠኖችን በቀለም ያሳያል። Combo Chart ትክክለኛ ገቢን ከግብ ጋር በማነጻጸር ክፍተትን ወዲያውኑ ያሳያል። ዳሽቦርድ በአንድ ገጽ ላይ ተጠቃሎ ሊታይ ይገባል።`,
            attachment: pdf('Lesson 2.2 - Dashboard Design Reference.pdf'),
የአመራር ዳሽቦርድ ቁልፍ መለኪያዎችን በአንድ ገጽ ላይ ያቀርባል። ወጥ የሆነ የቀለም አጠቃቀም፣ የተስተካከለ የአቀማመጥ መረብ እና ከSlicer ጋር የተገናኙ ገበታዎች አስፈላጊ ናቸው።`,
            attachment: pdf('Lesson 2.2 - Dashboard Design System.pdf'),
            assessment: {
              titleEn: 'Lesson 2.2 Check: Dashboard Design',
              titleAm: 'ትምህርት 2.2 ማረጋገጫ፡ የዳሽቦርድ ንድፍ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('excel-m2-l2-q1', 'Which Conditional Formatting type shades cells along a red-to-green gradient based on value?', ['Color Scale', 'Data Bar', 'Icon Set', 'Top/Bottom Rule'], 0, 'Conditional Formatting'),
                mcq('excel-m2-l2-q2', 'A Combo Chart showing actual revenue columns against a target line is best for what purpose?', ['Hiding underperformance', 'Showing the gap between actual results and a target at a glance', 'Encrypting the chart', 'Removing outliers automatically'], 1, 'Charts'),
                tf('excel-m2-l2-q3', 'True or False: Linking dashboard charts directly to a PivotTable means the whole dashboard can refresh with one click.', 0, 'Dashboards'),
                mcq('excel-m2-l2-q4', 'Which chart type is best suited for comparing performance across several branches side by side?', ['Bar/Column Chart', 'Pie Chart with 20 slices', 'Scatter Chart', 'Radar Chart'], 0, 'Charts'),
                sa('excel-m2-l2-q5', 'What formula-based Conditional Formatting rule would flag rows where DaysOverdue exceeds 30?', '=[@DaysOverdue]>30', 'Conditional Formatting'),
                mcq('excel-m2-l2-q1', 'What is the primary constraint of an executive dashboard?', ['It must contain at least 15 charts', 'It should fit on a single screen without scrolling', 'It must use every available color', 'It cannot contain numbers'], 1, 'Dashboard Rules'),
                mcq('excel-m2-l2-q2', 'What do KPI metric cards prominently display at the top of an executive view?', ['High-level totals, target attainment, and variance', 'Raw database connection strings', 'Full employee rosters', 'Software license keys'], 0, 'KPI Design'),
                tf('excel-m2-l2-q3', 'True or False: Using random vibrant colors for every chart element increases visual clarity for executives.', 1, 'Design Psychology'),
                mcq('excel-m2-l2-q4', 'How do you ensure all charts on a dashboard update when a single slicer button is clicked?', ['By configuring Slicer Report Connections', 'By writing complex VBA scripts', 'By printing the page to PDF', 'By pressing F9 repeated times'], 0, 'Interactivity'),
                sa('excel-m2-l2-q5', 'What Excel setting links a single slicer to multiple PivotTables and PivotCharts?', 'Report Connections', 'Interactivity'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Assembling the Directorate One-Page Dashboard',
                titleAm: 'ተግባራዊ ላብ፡ የዳይሬክቶሬት አንድ ገጽ ዳሽቦርድ ማገጣጠም',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                contentEn: `## Lab Scenario
Create the official MoR Revenue Directorate Monthly One-Pager:
1. Hide gridlines on the dashboard worksheet (*View > Show > Gridlines unchecked*).
2. Insert 3 summary KPI cards at the top: Total Revenue, MoM Growth %, and Average Daily Collection.
3. Embed a clustered column chart for monthly trends and a bar chart for branch rankings.
4. Add synchronized Slicers for Directorate, Branch, and Quarter at the left margin.
5. Protect the sheet to lock layout while allowing Slicer interactions.`,
                contentAm: `### የላብ ሁኔታ
የወርሃዊ ገቢ ዳሽቦርድ ማገጣጠም፡ የመመሪያ መስመሮችን ማጥፋት፣ 3 KPI ካርዶች ማስቀመጥ፣ ገበታዎችን ማገናኘት እና የSlicer አጠቃቀምን መፍቀድ።`,
                attachment: pdf('Sub-Lesson 2.2.1 - One-Page Dashboard Template.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.2.1 Check: Directorate Dashboard Lab',
                  titleAm: 'ንዑስ ትምህርት 2.2.1 ማረጋገጫ፡ የዳሽቦርድ ማገጣጠም ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('excel-m2-l2-s1-q1', 'Why are worksheet gridlines typically turned off on a presentation dashboard?', ['To speed up file loading', 'To create a clean, modern software-like appearance', 'Because Excel will crash otherwise', 'To make numbers invisible'], 1, 'Dashboard Layout'),
                    mcq('excel-m2-l2-s1-q2', 'When protecting a dashboard worksheet, which checkbox must remain checked so users can interact with Slicers?', ['Use PivotTable & PivotChart', 'Format Columns', 'Delete Rows', 'Edit Objects'], 0, 'Worksheet Protection'),
                    tf('excel-m2-l2-s1-q3', 'True or False: Clustered column charts are ideal for displaying trends over consecutive monthly periods.', 0, 'Data Visualization'),
                    mcq('excel-m2-l2-s1-q4', 'Where is the optimal placement for interactive filters and slicers on a dashboard?', ['Hidden in row 500', 'In a dedicated top bar or left sidebar', 'Scattered across each individual chart', 'On a printed piece of paper'], 1, 'Layout Design'),
                    sa('excel-m2-l2-s1-q5', 'Which menu tab allows you to toggle worksheet gridlines on or off?', 'View', 'Excel Interface'),
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: Advanced Excel Certification',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የላቀ Excel ሰርተፊኬት ምዘና',
      titleEn: 'Final Comprehensive Assessment: Excel & Analytics Certification',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የExcel እና የመረጃ ትንተና ብቃት ምዘና',
      passingScore: 75,
      timeLimitMinutes: 30,
      questions: [
        mcq('excel-fn-q1', 'Which combination is generally preferred for large, frequently restructured worksheets?', ['VLOOKUP with hardcoded column numbers', 'INDEX-MATCH', 'Manual copy-paste', 'Ctrl+F search'], 1, 'Formulas'),
        mcq('excel-fn-q2', 'PivotTables are best suited for which task?', ['Summarizing large datasets by category', 'Writing plain text notes', 'Sending email', 'Compressing files'], 0, 'PivotTables'),
        tf('excel-fn-q3', 'True or False: Data Validation can prevent invalid data from being typed into a cell before it happens.', 0, 'Data Validation'),
        mcq('excel-fn-q4', 'Slicers in a PivotTable dashboard are used to what end?', ['Interactively filter the report by a category', 'Change the workbook password', 'Encrypt the file', 'Print the file'], 0, 'Dashboards'),
        sa('excel-fn-q5', 'What is the name of the Excel tool that summarizes and aggregates large datasets interactively?', 'PivotTable', 'PivotTables'),
        mcq('excel-fn-q1', 'Which formula correctly looks up a taxpayer name in column B when the TIN is matched in column A?', ['=INDEX(B:B, MATCH(lookup_tin, A:A, 0))', '=MATCH(INDEX(A:A, lookup_tin), 0)', '=VLOOKUP(lookup_tin, B:A, 1, FALSE)', '=COUNTIF(A:A, lookup_tin)'], 0, 'Formulas'),
        mcq('excel-fn-q2', 'What is the effect of applying a Stop Alert in Data Validation?', ['It records a log file', 'It strictly blocks input that does not satisfy the validation criteria', 'It displays a warning but accepts the invalid entry', 'It turns the cell red'], 1, 'Data Validation'),
        tf('excel-fn-q3', 'True or False: Slicers connected via Report Connections will filter multiple PivotTables simultaneously.', 0, 'PivotTables'),
        mcq('excel-fn-q4', 'Why is converting raw transaction records into an Excel Table (Ctrl+T) strongly recommended?', ['Tables automatically expand their range when new rows are added', 'Tables prevent password guessing', 'Tables disable calculation lag', 'Tables allow unlimited rows'], 0, 'Data Structures'),
        sa('excel-fn-q5', 'What is the shortcut key to open the Create Table dialog in Microsoft Excel?', 'Ctrl+T', 'Shortcuts'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 2. PENDING_APPROVAL — Project Management Essentials for Government Programs
  // 2. PENDING_APPROVAL: Project Management Essentials for Government Programs
  // ─────────────────────────────────────────────────────────
  {
    code: 'PROJ201',
    titleEn: 'Project Management Essentials for Government Programs',
    titleAm: 'የመንግስት ፕሮግራሞች የፕሮጀክት አስተዳደር መሰረታዊ',
    descriptionEn:
      'Plan, schedule, budget, and monitor public-sector projects using charters, WBS, Gantt scheduling, and earned value tracking.',
    descriptionAm: 'የመንግስት ፕሮጀክቶችን በቻርተር፣ በWBS፣ በGantt መርሃግብር እና በEarned Value ክትትል ማቀድ፣ መርሃግብር ማውጣት እና መከታተል።',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PENDING_APPROVAL,
    estimatedHours: 28,
    category: 'Program & Project Management',
    department: 'Strategic Planning Directorate',
    targetAudience: 'Project coordinators, branch managers, and directorate focal persons who lead improvement initiatives',
    deliveryMethod: 'Blended: self-paced modules plus a live capstone review session',
    objectivesEn:
      'Draft a project charter, map stakeholders with a RACI matrix, build a work breakdown structure and schedule, and track budget variance using earned value.',
    objectivesAm: 'የፕሮጀክት ቻርተር ማርቀቅ፣ በRACI ባለድርሻ አካላትን መለየት፣ WBS እና መርሃግብር መገንባት እና በEarned Value በጀት ልዩነትን መከታተል።',
    prerequisites: 'None — designed for first-time project leads',
    approvalComments: '',
    approvalComments: 'Submitted for final review by the Strategic Planning Committee. All curriculum materials prepared.',
    modules: [
      {
        titleEn: 'Module 1: Project Initiation, Charters & Stakeholder Mapping',
        titleAm: 'ሞዱል 1፡ የፕሮጀክት ጅምር፣ ቻርተሮች እና ባለድርሻ አካላት መለየት',
        descriptionEn: 'Turn a vague mandate into a documented charter with clear scope, objectives, and accountable stakeholders.',
        descriptionAm: 'ግልጽ ያልሆነ ሀላፊነትን ወደ ግልጽ ወሰን፣ ግቦች እና ተጠያቂ ባለድርሻ አካላት ወዳለው ሰነድ መቀየር።',
        objectivesEn: 'Draft a project charter and apply the RACI matrix to clarify stakeholder responsibilities.',
        objectivesAm: 'የፕሮጀክት ቻርተር ማርቀቅ እና በRACI ማትሪክስ ሀላፊነቶችን ግልጽ ማድረግ።',
        order: 0,
        attachment: pdf('Module 1 - Charter & Stakeholder Toolkit.pdf'),
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Initiation & Stakeholders',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ ጅምር እና ባለድርሻ አካላት',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('proj-m1-q1', 'What is the primary purpose of a Project Charter?', ['To formally authorize the project and define its scope, objectives, and sponsor', 'To record daily attendance', 'To list office supplies needed', 'To replace the project budget'], 0, 'Initiation'),
            mcq('proj-m1-q2', 'In a RACI matrix, what does the "A" stand for?', ['Approved', 'Accountable', 'Active', 'Assigned'], 1, 'RACI'),
            tf('proj-m1-q3', 'True or False: More than one person can be "Responsible" for a task in a RACI matrix, but only one should be "Accountable".', 0, 'RACI'),
            mcq('proj-m1-q4', 'Which document typically names the project sponsor and grants the project manager authority to use resources?', ['Meeting minutes', 'Project Charter', 'Expense receipt', 'Employee handbook'], 1, 'Initiation'),
            sa('proj-m1-q5', 'What four-letter acronym describes the responsibility-assignment matrix used to clarify stakeholder roles?', 'RACI', 'RACI'),
          ],
        },
        lessons: [
          {
            titleEn: '1.1 Defining Scope, Objectives & the Project Charter',
            titleAm: '1.1 ወሰን፣ ግቦች እና የፕሮጀክት ቻርተርን መግለጽ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            contentEn: `## Why Projects Fail Before They Start
Most public-sector project failures trace back to an undocumented or ambiguous scope. A Project Charter fixes this by putting the mandate in writing before any work begins.

## Core Charter Elements
1. **Project Purpose**: the problem being solved and the strategic goal it serves.
2. **Objectives**: SMART statements (Specific, Measurable, Achievable, Relevant, Time-bound).
3. **Scope Boundaries**: explicitly stating what is *in* and *out* of scope to prevent scope creep.
4. **Sponsor & Authority**: who authorized the project and what budget/resource authority the project manager holds.
5. **High-Level Milestones**: major checkpoints without a full schedule yet.

## Government Context
A charter for a district tax-office renovation should explicitly state whether IT infrastructure upgrades are in scope — ambiguity here is the single most common cause of budget overruns in facility projects.`,
            contentAm: `### ማጠቃለያ
የፕሮጀክት ቻርተር ዓላማን፣ SMART ግቦችን፣ የወሰን ክልልን እና ስፖንሰሩን በጽሁፍ ያስቀምጣል። ግልጽ ያልሆነ ወሰን የበጀት ብልጫ ዋነኛ መንስኤ ነው።`,
            attachment: pdf('Lesson 1.1 - Charter Template & Example.pdf'),
            assessment: {
              titleEn: 'Lesson 1.1 Check: Charter Fundamentals',
              titleAm: 'ትምህርት 1.1 ማረጋገጫ፡ የቻርተር መሰረታዊ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('proj-m1-l1-q1', 'What does the "M" in SMART objectives stand for?', ['Motivated', 'Measurable', 'Managed', 'Mandatory'], 1, 'Objectives'),
                mcq('proj-m1-l1-q2', 'Explicitly stating what is out of scope in a charter primarily prevents what?', ['Scope creep', 'Employee turnover', 'Tax evasion', 'Server downtime'], 0, 'Scope'),
                tf('proj-m1-l1-q3', 'True or False: A Project Charter should be finalized before significant project work begins.', 0, 'Initiation'),
                mcq('proj-m1-l1-q4', 'Who typically grants the project manager authority to use resources in the charter?', ['The project sponsor', 'A random employee', 'The vendor', 'The auditor'], 0, 'Initiation'),
                sa('proj-m1-l1-q5', 'What term describes uncontrolled expansion of a project scope after it has started?', 'Scope Creep', 'Scope'),
                mcq('proj-m1-l1-q1', 'What does the "S" in SMART objectives stand for?', ['Specific', 'Standard', 'Simple', 'Strategic'], 0, 'SMART Objectives'),
                mcq('proj-m1-l1-q2', 'Why is explicitly documenting "out-of-scope" items valuable in a project charter?', ['To make the charter longer', 'To prevent scope creep and manage stakeholder expectations', 'To avoid hiring consultants', 'It is required only for software projects'], 1, 'Scope Management'),
                tf('proj-m1-l1-q3', 'True or False: A project manager has formal authority to spend budget before a charter is signed by the sponsor.', 1, 'Governance'),
                mcq('proj-m1-l1-q4', 'Which section of the charter describes the strategic business problem being resolved?', ['Risk Log', 'Project Purpose / Business Case', 'Team Bio', 'Vendor Invoice List'], 1, 'Charter Sections'),
                sa('proj-m1-l1-q5', 'What is the term for uncontrolled changes or continuous growth in a project scope?', 'Scope Creep', 'Scope Management'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Drafting a Charter for a District Tax-Office Renovation Project',
                titleAm: 'ተግባራዊ ላብ፡ ለወረዳ ግብር ጽ/ቤት እድሳት ፕሮጀክት ቻርተር ማርቀቅ',
                titleEn: 'Practical Lab: Drafting a Ministry Modernization Project Charter',
                titleAm: 'ተግባራዊ ላብ፡ የሚኒስቴሩ ማዘመኛ ፕሮጀክት ቻርተር ማርቀቅ',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                contentEn: `## Lab Scenario
Your district tax office needs renovation: a new public service counter, accessible ramps, and an upgraded network cabinet. Draft a one-page charter.
You are appointed lead for the "Branch Digital Queue Modernization" project across 5 Addis Ababa tax offices. Draft a 2-page project charter using the template in the attached PDF.

## Steps
1. Write a Purpose statement linking the renovation to the Ministry's citizen-service improvement strategy.
2. Write 3 SMART objectives (e.g., "Complete accessible ramp installation within 90 days at a cost not exceeding 850,000 ETB").
3. List explicit in-scope items (counter, ramps, cabinet) and explicit out-of-scope items (full roof replacement, parking lot repaving).
4. Name a sponsor (the Regional Director) and state the project manager's spending authority limit.

## Deliverable
A completed one-page charter using the attached template, ready for sponsor sign-off.`,
## Requirements
- Write 3 SMART objectives with quantitative targets (e.g. reduction in citizen wait time from 45 to 15 minutes).
- Define at least 3 explicitly "out-of-scope" items (e.g. building physical expansions, procurement of non-queue PCs).
- Identify the project sponsor, estimated budget ceiling, and top 3 project risks.`,
                contentAm: `### የላብ ሁኔታ
ለወረዳ ግብር ጽ/ቤት እድሳት የአንድ ገጽ ቻርተር ማርቀቅ፡ ዓላማ፣ SMART ግቦች፣ የወሰን ውስጥ እና ውጭ ዝርዝሮች እና ስፖንሰር በመግለጽ።`,
                attachment: pdf('Sub-Lesson 1.1.1 - Renovation Charter Lab Template.pdf'),
በአምስት የአዲስ አበባ ቅርንጫፎች የዲጂታል ሰልፍ ማዘመኛ ፕሮጀክት ቻርተር ማዘጋጀት፣ 3 SMART ግቦችን መፃፍ እና ከወሰን ውጪ የሆኑ ነጥቦችን በግልጽ ማስቀመጥ።`,
                attachment: pdf('Sub-Lesson 1.1.1 - Modernization Charter Lab Pack.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.1.1 Check: Charter Drafting Lab',
                  titleAm: 'ንዑስ ትምህርት 1.1.1 ማረጋገጫ፡ የቻርተር ማርቀቅ ላብ',
                  titleAm: 'ንዑስ ትምህርት 1.1.1 ማረጋገጫ፡ የቻርተር ዝግጅት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('proj-m1-l1-s1-q1', 'In the lab charter, which item belongs in the out-of-scope list?', ['New public service counter', 'Accessible ramp installation', 'Full roof replacement', 'Network cabinet upgrade'], 2, 'Scope'),
                    mcq('proj-m1-l1-s1-q2', 'A SMART objective for this project should include which element?', ['A vague hope with no deadline', 'A specific cost ceiling and a time-bound deadline', 'No measurable outcome', 'An unnamed sponsor'], 1, 'Objectives'),
                    tf('proj-m1-l1-s1-q3', 'True or False: The lab charter should name the Regional Director as sponsor.', 0, 'Initiation'),
                    mcq('proj-m1-l1-s1-q4', 'What does stating the project manager spending authority limit in the charter accomplish?', ['It removes all budget controls', 'It clarifies how much the PM can approve without escalation', 'It replaces the need for a budget', 'It cancels the project'], 1, 'Governance'),
                    sa('proj-m1-l1-s1-q5', 'What is the recommended length for the charter produced in this lab?', 'One page', 'Initiation'),
                    mcq('proj-m1-l1-s1-q1', 'Which of the following is a measurable project objective?', ['Make citizens happier', 'Reduce average counter wait time to under 15 minutes by Q3', 'Improve IT equipment soon', 'Provide better customer care'], 1, 'Lab Objectives'),
                    mcq('proj-m1-l1-s1-q2', 'Who signs off on the charter to authorize the project budget?', ['The database administrator', 'The Project Sponsor', 'Any external contractor', 'The junior intern'], 1, 'Lab Roles'),
                    tf('proj-m1-l1-s1-q3', 'True or False: Explicitly excluding physical building renovation prevents budget disputes with contractors.', 0, 'Lab Scope'),
                    mcq('proj-m1-l1-s1-q4', 'What is the recommended maximum page length for an executive project charter?', ['50 pages', '1 to 3 pages', '100 pages', 'A single tweet'], 1, 'Charter Format'),
                    sa('proj-m1-l1-s1-q5', 'What role holds executive accountability for funding and authorizing the project charter?', 'Project Sponsor', 'Governance'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '1.2 Stakeholder Analysis & the RACI Responsibility Matrix',
            titleAm: '1.2 ባለድርሻ አካላት ትንተና እና የRACI ተጠያቂነት ማትሪክስ',
            titleEn: '1.2 Stakeholder Analysis & the RACI Governance Matrix',
            titleAm: '1.2 የባለድርሻ አካላት ትንተና እና የRACI የአስተዳደር ማትሪክስ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            contentEn: `## Identifying Who Matters
A stakeholder is anyone who affects, or is affected by, the project — from the Regional Director to the citizens waiting in the renovated service hall.
            contentEn: `## Engaging the Right People at the Right Time
Projects rarely fail for purely technical reasons; they fail because key stakeholders were ignored or responsibilities were unclear.

## Power-Interest Grid
Map each stakeholder on two axes:
- **High Power / High Interest**: manage closely (e.g., the Regional Director).
- **High Power / Low Interest**: keep satisfied (e.g., the Finance Directorate).
- **Low Power / High Interest**: keep informed (e.g., front-desk staff).
- **Low Power / Low Interest**: monitor with minimal effort.
## The Power-Interest Grid
- **High Power, High Interest**: Manage Closely (Director General, Directorate Directors).
- **High Power, Low Interest**: Keep Satisfied (Finance Ministry auditors, Legal Directorate).
- **Low Power, High Interest**: Keep Informed (Branch front-desk staff, taxpayers).
- **Low Power, Low Interest**: Monitor with minimum effort.

## The RACI Matrix
For every major task, assign exactly one **Accountable** owner, one or more **Responsible** doers, and note who is **Consulted** (two-way input) versus merely **Informed** (one-way update). Ambiguity between Responsible and Accountable is the most common cause of dropped tasks in multi-directorate projects.`,
Every key project deliverable must have:
- **R (Responsible)**: the person who does the work.
- **A (Accountable)**: the SINGLE person who has final approval authority.
- **C (Consulted)**: subject matter experts whose input is sought before work is done.
- **I (Informed)**: individuals kept updated on progress after completion.`,
            contentAm: `### ማጠቃለያ
ባለድርሻ አካላትን በሀይል-ፍላጎት ፍርግርግ መለየት እና በRACI ማትሪክስ ለእያንዳንዱ ተግባር አንድ ተጠያቂ (Accountable) እና ተከናዋኞችን (Responsible) መመደብ ያስፈልጋል።`,
            attachment: pdf('Lesson 1.2 - Stakeholder & RACI Worksheet.pdf'),
የባለድርሻ አካላት በስልጣን እና ፍላጎት ይከፈላሉ። በRACI ማትሪክስ ለእያንዳንዱ ስራ አንድ ተጠያቂ (A) ብቻ ሊኖር ይገባል፤ ይህም ግራ መጋባትን ያስቀራል።`,
            attachment: pdf('Lesson 1.2 - RACI Matrix Governance Handbook.pdf'),
            assessment: {
              titleEn: 'Lesson 1.2 Check: Stakeholders & RACI',
              titleAm: 'ትምህርት 1.2 ማረጋገጫ፡ ባለድርሻ አካላት እና RACI',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('proj-m1-l2-q1', 'A stakeholder with High Power and Low Interest should be managed how?', ['Manage closely', 'Keep satisfied', 'Keep informed', 'Ignore entirely'], 1, 'Stakeholder Analysis'),
                mcq('proj-m1-l2-q2', 'In RACI, what distinguishes "Consulted" from "Informed"?', ['Consulted implies two-way input; Informed is a one-way update', 'They mean the same thing', 'Informed people can veto decisions', 'Consulted means no communication at all'], 0, 'RACI'),
                tf('proj-m1-l2-q3', 'True or False: Every major task should have exactly one Accountable owner.', 0, 'RACI'),
                mcq('proj-m1-l2-q4', 'Front-desk staff in the renovation project would typically fall into which Power-Interest quadrant?', ['High Power / High Interest', 'Low Power / High Interest', 'High Power / Low Interest', 'Low Power / Low Interest'], 1, 'Stakeholder Analysis'),
                sa('proj-m1-l2-q5', 'What grid tool plots stakeholders by their power and interest levels?', 'Power-Interest Grid', 'Stakeholder Analysis'),
                mcq('proj-m1-l2-q1', 'On a Power-Interest Grid, how should high-power, high-interest stakeholders be managed?', ['Monitor only', 'Manage Closely', 'Ignore until the end', 'Send monthly spam emails'], 1, 'Stakeholder Analysis'),
                mcq('proj-m1-l2-q2', 'What is the rule regarding the "A" (Accountable) in a RACI row?', ['Every team member must be Accountable', 'There must be exactly one Accountable person per deliverable', 'Accountability rotates weekly', 'No one needs to be Accountable'], 1, 'RACI Rules'),
                tf('proj-m1-l2-q3', 'True or False: "Consulted" stakeholders in RACI provide two-way communication before work is finalized.', 0, 'RACI Definitions'),
                mcq('proj-m1-l2-q4', 'Which stakeholder group typically falls into "Low Power, High Interest"?', ['Front-line officers affected by new software', 'The Ministry Cabinet', 'Supreme Court judges', 'Foreign ambassadors'], 0, 'Stakeholder Mapping'),
                sa('proj-m1-l2-q5', 'In RACI, which letter represents individuals kept updated through one-way notifications?', 'I', 'RACI Definitions'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Mapping Regional Tax Directorate Stakeholders',
                titleAm: 'ተግባራዊ ላብ፡ የክልል ግብር ዳይሬክቶሬት ባለድርሻ አካላትን ማትሪክስ ማዘጋጀት',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
Map 8 stakeholders for a new digital tax-filing rollout: Branch Manager, IT Support, Regional Director, Tax Audit Lead, Local Traders Association, Ministry PR Officer, Finance Clerk, and Call Center Supervisor.

## Steps
1. Place each of the 8 stakeholders into the 4 quadrants of the Power-Interest Grid.
2. Build a RACI table with 5 rows: System Configuration, User Training, Citizen Awareness Campaign, Acceptance Testing, and Post-Launch Support.
3. Verify that each row has exactly one "A".`,
                contentAm: `### የላብ ሁኔታ
ስምንት ባለድርሻ አካላትን በስልጣን እና ፍላጎት ማትሪክስ መመደብ እና ለአምስት ዋና ተግባራት የRACI ሠንጠረዥ ማዘጋጀት።`,
                attachment: pdf('Sub-Lesson 1.2.1 - Stakeholder Mapping Exercise.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.2.1 Check: Stakeholder Mapping Lab',
                  titleAm: 'ንዑስ ትምህርት 1.2.1 ማረጋገጫ፡ የባለድርሻ አካላት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('proj-m1-l2-s1-q1', 'If a RACI row has three "A"s assigned, what project governance issue arises?', ['Too much budget is spent', 'Diffused accountability where no single person owns the outcome', 'Work completes three times faster', 'None, this is best practice'], 1, 'Governance Risk'),
                    mcq('proj-m1-l2-s1-q2', 'Which stakeholder is best suited to be "Consulted" on the Citizen Awareness Campaign deliverable?', ['IT Database Administrator', 'Ministry PR Officer', 'Branch Janitorial Staff', 'Hardware Vendor'], 1, 'Role Assignment'),
                    tf('proj-m1-l2-s1-q3', 'True or False: External taxpayers and traders associations should be kept informed during a digital tax-filing rollout.', 0, 'Communications'),
                    mcq('proj-m1-l2-s1-q4', 'What tool plots stakeholders based on their influence and level of concern?', ['Power-Interest Grid', 'Fishbone diagram', 'Burn-down chart', 'Kanban board'], 0, 'Analysis Tools'),
                    sa('proj-m1-l2-s1-q5', 'What matrix prevents finger-pointing by assigning R, A, C, and I roles to tasks?', 'RACI', 'Analysis Tools'),
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        titleEn: 'Module 2: Scheduling, Budgeting & Risk Monitoring',
        titleAm: 'ሞዱል 2፡ መርሃግብር፣ በጀት እና የስጋት ክትትል',
        descriptionEn: 'Break the project into a schedule, track spend against baseline, and keep risks visible before they become issues.',
        descriptionAm: 'ፕሮጀክቱን ወደ መርሃግብር መከፋፈል፣ ወጪን ከመነሻ ጋር ማወዳደር እና ስጋቶችን ከመከሰታቸው በፊት መከታተል።',
        objectivesEn: 'Build a Work Breakdown Structure and Gantt schedule; establish a budget baseline and track earned value.',
        objectivesAm: 'WBS እና Gantt መርሃግብር መገንባት፤ የበጀት መነሻ ማቋቋም እና Earned Value መከታተል።',
        titleEn: 'Module 2: Work Breakdown Structures (WBS) & Schedule Management',
        titleAm: 'ሞዱል 2፡ የስራ ዝርዝር መዋቅር (WBS) እና የመርሃግብር አስተዳደር',
        descriptionEn: 'Decompose complex project deliverables into manageable work packages and establish critical path schedules.',
        descriptionAm: 'ውስብስብ የፕሮጀክት ስራዎችን ወደ ተመጣጣኝ ፓኬጆች መከፋፈል እና ወሳኝ የመርሃግብር መስመሮችን ማዘጋጀት።',
        objectivesEn: 'Construct a 100% rule WBS and apply the Critical Path Method (CPM) to project timelines.',
        objectivesAm: 'የ100% ህግ WBS መገንባት እና የCritical Path ዘዴን በፕሮጀክት መርሃግብር ላይ መተግበር።',
        order: 1,
        attachment: pdf('Module 2 - Scheduling & Budgeting Toolkit.pdf'),
        attachment: pdf('Module 2 - WBS & Scheduling Standard Guide.pdf'),
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Scheduling & Budgeting',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ መርሃግብር እና በጀት',
          titleEn: 'Module 2 Knowledge Check: WBS & Scheduling',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ WBS እና መርሃግብር',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('proj-m2-q1', 'What is a Work Breakdown Structure (WBS)?', ['A hierarchical decomposition of the total scope into work packages', 'A list of employee vacation days', 'A single-page budget summary', 'A vendor contract template'], 0, 'WBS'),
            mcq('proj-m2-q2', 'The Critical Path in a schedule is defined as what?', ['The sequence of dependent tasks that determines the shortest overall project duration', 'The most expensive task only', 'A list of optional tasks', 'The tasks assigned to the newest team member'], 0, 'Scheduling'),
            tf('proj-m2-q3', 'True or False: Delaying a task on the Critical Path delays the entire project.', 0, 'Scheduling'),
            mcq('proj-m2-q4', 'Earned Value Management compares which three values?', ['Planned Value, Earned Value, and Actual Cost', 'Employee count, office size, and vendor rating', 'Weather, holidays, and traffic', 'Logo color, font, and layout'], 0, 'Budgeting'),
            sa('proj-m2-q5', 'What chart visually displays task bars against a timeline to show a project schedule?', 'Gantt Chart', 'Scheduling'),
            mcq('proj-m2-q1', 'What does the "100% Rule" in WBS design state?', ['A project must be 100% funded', 'The WBS must include 100% of the scope defined by the project and nothing more', 'All tasks must take 100 days', 'Every worker must give 100% overtime'], 1, 'WBS Rules'),
            mcq('proj-m2-q2', 'What is the lowest level of a Work Breakdown Structure called?', ['Tasklet', 'Work Package', 'Activity fragment', 'Sub-clause'], 1, 'WBS Terminology'),
            tf('proj-m2-q3', 'True or False: The Critical Path is the sequence of dependent activities that represents the longest path through the project.', 0, 'Critical Path'),
            mcq('proj-m2-q4', 'If an activity on the critical path is delayed by 3 days, what happens to the project completion date?', ['Nothing, it absorbs the delay', 'The overall project completion date is delayed by 3 days', 'The project finishes early', 'The project budget doubles automatically'], 1, 'Critical Path'),
            sa('proj-m2-q5', 'What term represents the amount of time an activity can be delayed without delaying the project finish date?', 'Float', 'Schedule Concepts'),
          ],
        },
        lessons: [
          {
            titleEn: '2.1 Work Breakdown Structures & Critical Path Scheduling',
            titleAm: '2.1 WBS እና የክሪቲካል ፓዝ መርሃግብር',
            titleEn: '2.1 Constructing Deliverable-Oriented Work Breakdown Structures',
            titleAm: '2.1 ውጤት ተኮር የስራ ዝርዝር መዋቅር (WBS) መገንባት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            durationMinutes: 40,
            order: 0,
            contentEn: `## Decomposing the Work
A Work Breakdown Structure (WBS) breaks the total project scope into progressively smaller, assignable work packages — following the "100% Rule": the sum of child items must equal 100% of the parent's scope, no more, no less.
            contentEn: `## What is a Work Breakdown Structure?
A WBS is a hierarchical decomposition of the total scope of work to be carried out by the project team to accomplish project objectives and create required deliverables.

## From WBS to Schedule
1. Sequence work packages by dependency (which tasks must finish before others can start).
2. Estimate duration for each package.
3. Identify the **Critical Path**: the longest chain of dependent tasks — any delay here delays the whole project. Non-critical tasks have **float** (slack) and can shift without affecting the finish date.
## The 100% Rule
The WBS includes 100% of the work defined by the project scope and captures all deliverables — internal, external, and interim — in terms of work to be completed, including project management itself.

## Government Example
In a multi-phase office rollout, "Network cabling" must finish before "IT equipment installation" can start — this dependency likely sits on the critical path, so it deserves the closest monitoring.`,
## Work Package Characteristics
- Distinct, verifiable output.
- Assigned to a single organization unit or lead.
- Realistic duration (typically between 8 and 80 working hours).
- Can be independently budgeted and tracked.`,
            contentAm: `### ማጠቃለያ
WBS ፕሮጀክቱን ወደ ትናንሽ ስራዎች ይከፋፍላል። Critical Path በጣም ረጅሙ የተግባር ሰንሰለት ሲሆን መዘግየቱ መላውን ፕሮጀክት ያዘገየዋል። ሌሎች ተግባራት float (ትርፍ ጊዜ) ሊኖራቸው ይችላል።`,
            attachment: pdf('Lesson 2.1 - WBS & Critical Path Guide.pdf'),
WBS አጠቃላይ የፕሮጀክት ስራን በደረጃ የሚከፋፍል መዋቅር ነው። የ100% ህግ ስራዎችን በሙሉ ያጠቃልላል። የWork Package ቆይታ በአጠቃላይ ከ8 እስከ 80 ሰዓታት መሆን አለበት።`,
            attachment: pdf('Lesson 2.1 - WBS Construction Manual.pdf'),
            assessment: {
              titleEn: 'Lesson 2.1 Check: WBS & Critical Path',
              titleAm: 'ትምህርት 2.1 ማረጋገጫ፡ WBS እና ክሪቲካል ፓዝ',
              titleEn: 'Lesson 2.1 Check: WBS Construction',
              titleAm: 'ትምህርት 2.1 ማረጋገጫ፡ የWBS ግንባታ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('proj-m2-l1-q1', 'The "100% Rule" in a WBS means what?', ['The sum of child items equals 100% of the parent scope', 'The project must be 100% complete before starting', 'Only 100% of staff can be assigned', 'The budget must be spent 100% in month one'], 0, 'WBS'),
                mcq('proj-m2-l1-q2', 'What is "float" (or slack) in scheduling?', ['The amount a non-critical task can be delayed without affecting the project finish date', 'A type of budget overrun', 'A stakeholder role', 'A risk category'], 0, 'Scheduling'),
                tf('proj-m2-l1-q3', 'True or False: Tasks on the Critical Path have zero float.', 0, 'Scheduling'),
                mcq('proj-m2-l1-q4', 'In the office rollout example, why does "Network cabling before IT installation" matter for scheduling?', ['It is an irrelevant detail', 'It is a dependency that likely sits on the critical path', 'It has no effect on the finish date', 'It can be done in any order'], 1, 'Scheduling'),
                sa('proj-m2-l1-q5', 'What term describes breaking total project scope into a hierarchy of smaller work packages?', 'Work Breakdown Structure', 'WBS'),
                mcq('proj-m2-l1-q1', 'Which of the following is a deliverable-oriented WBS element rather than an action verb?', ['Install Cables', 'Cabling Infrastructure Completed', 'Running tests', 'Drafting emails'], 1, 'WBS Design'),
                mcq('proj-m2-l1-q2', 'What is the recommended duration range for a standard work package (the 8/80 rule)?', ['1 to 2 minutes', 'Between 8 and 80 working hours', 'Exactly 1 year', '500 hours minimum'], 1, 'WBS Guidelines'),
                tf('proj-m2-l1-q3', 'True or False: Project Management activities such as status reporting and reviews should be included in the WBS.', 0, '100% Rule'),
                mcq('proj-m2-l1-q4', 'What document accompanies the WBS to provide detailed descriptions of each work package?', ['WBS Dictionary', 'Phone Directory', 'Tax Code Book', 'Hardware Warranty'], 0, 'WBS Documentation'),
                sa('proj-m2-l1-q5', 'What companion document describes work packages, milestones, and acceptance criteria in detail?', 'WBS Dictionary', 'WBS Documentation'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Building a Gantt Chart for a Multi-Phase Rollout',
                titleAm: 'ተግባራዊ ላብ፡ ለባለብዙ ደረጃ ማስፋፊያ Gantt ገበታ መገንባት',
                titleEn: 'Practical Lab: Decomposing a Branch Opening into Work Packages',
                titleAm: 'ተግባራዊ ላብ፡ የቅርንጫፍ መክፈቻ ስራዎችን ወደ ፓኬጆች መከፋፈል',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                contentEn: `## Lab Scenario
Your project has three phases: (1) Procurement of equipment — 20 days, (2) Network cabling — 15 days (starts after Procurement), (3) IT installation — 10 days (starts after cabling).

## Steps
1. List each task with start date, duration, and predecessor.
2. Build a Gantt chart (spreadsheet or project tool) with one bar per task on a shared timeline.
3. Calculate total project duration by summing the dependent chain: 20 + 15 + 10 = 45 working days — this chain is your Critical Path since none of these tasks can run in parallel.
4. Mark any task with available float in a lighter color to distinguish it from critical tasks.

## Deliverable
A Gantt chart clearly showing the 45-day critical path and any parallel, non-critical activities.`,
Decompose the opening of the "Hawassa Sub-City Tax Center" into a 3-level WBS:
- Level 1: Hawassa Tax Center Opening
- Level 2: 1.0 Facilities & Fit-out, 2.0 IT & Network, 3.0 Staffing & Training, 4.0 Public Launch, 5.0 Project Management
- Level 3: Work packages under each Level 2 deliverable obeying the 100% rule and the 8/80 hour heuristic.`,
                contentAm: `### የላብ ሁኔታ
ሶስት ደረጃዎች ያሉት ፕሮጀክት፡ ግዥ (20 ቀናት)፣ የኔትወርክ ገመድ (15 ቀናት)፣ IT ጭነት (10 ቀናት)። Gantt ገበታ በመገንባት ጠቅላላ 45 የስራ ቀናት የክሪቲካል ፓዝ መሆኑን ማሳየት።`,
                attachment: pdf('Sub-Lesson 2.1.1 - Gantt Chart Lab Data.pdf'),
የሀዋሳ ታክስ ማዕከል መክፈቻን ወደ ሶስት ደረጃ WBS መከፋፈል እና የስራ ፓኬጆችን በ8/80 ሰዓት መመሪያ መሰረት ማዋቀር።`,
                attachment: pdf('Sub-Lesson 2.1.1 - Branch Opening WBS Lab.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.1.1 Check: Gantt Chart Lab',
                  titleAm: 'ንዑስ ትምህርት 2.1.1 ማረጋገጫ፡ የGantt ገበታ ላብ',
                  titleEn: 'Sub-Lesson 2.1.1 Check: WBS Lab',
                  titleAm: 'ንዑስ ትምህርት 2.1.1 ማረጋገጫ፡ የWBS ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('proj-m2-l1-s1-q1', 'In the lab, what is the total Critical Path duration?', ['15 days', '20 days', '45 days', '10 days'], 2, 'Gantt Charts'),
                    mcq('proj-m2-l1-s1-q2', 'Why is the chain in this lab entirely on the critical path?', ['None of the three tasks can run in parallel — each depends on the previous one finishing', 'The tasks are unrelated', 'The budget requires it', 'It was chosen at random'], 0, 'Critical Path'),
                    tf('proj-m2-l1-s1-q3', 'True or False: A Gantt chart displays one bar per task along a shared timeline.', 0, 'Gantt Charts'),
                    mcq('proj-m2-l1-s1-q4', 'Which task must finish before "IT installation" can start, per the lab scenario?', ['Procurement only', 'Network cabling', 'Nothing, it can start anytime', 'Budget approval'], 1, 'Dependencies'),
                    sa('proj-m2-l1-s1-q5', 'What visual marking distinguishes non-critical tasks with float on the Gantt chart in this lab?', 'A lighter color', 'Gantt Charts'),
                    mcq('proj-m2-l1-s1-q1', 'Which of the following belongs under "2.0 IT & Network" in the lab?', ['Counter furniture installation', 'Server Rack & LAN Deployment', 'Staff uniform distribution', 'TV press conference'], 1, 'WBS Decomposition'),
                    mcq('proj-m2-l1-s1-q2', 'Under the 100% rule, if Facilities comprises 4 sub-elements, their sum must equal:', ['Exactly the entire scope of the Facilities branch', 'Half the facilities scope', 'Double the budget', 'Whatever the contractor decides'], 0, '100% Rule'),
                    tf('proj-m2-l1-s1-q3', 'True or False: Work packages should have objective acceptance criteria so completion is verifiable.', 0, 'Quality Control'),
                    mcq('proj-m2-l1-s1-q4', 'Why is "Project Management" included as an explicit Level 2 item in the WBS?', ['To track management overhead and governance deliverables under the 100% rule', 'Because project managers do not do any work', 'To inflate project cost', 'It is an optional suggestion only'], 0, 'WBS Standards'),
                    sa('proj-m2-l1-s1-q5', 'What rule requires that the sum of child work packages equals 100% of their parent node?', '100% Rule', 'WBS Principles'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '2.2 Budget Baselines, Earned Value & Variance Tracking',
            titleAm: '2.2 የበጀት መነሻዎች፣ Earned Value እና የልዩነት ክትትል',
            titleEn: '2.2 Critical Path Method (CPM) & Milestone Tracking',
            titleAm: '2.2 ወሳኝ የመርሃግብር መስመር ዘዴ (CPM) እና የዋና ዋና ደረጃዎች ክትትል',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            contentEn: `## Setting the Baseline
Before spending begins, lock a **Budget Baseline** — the approved, time-phased spending plan. Every future comparison measures performance against this fixed reference.
            contentEn: `## Finding the Longest Sequence
Project schedules are networks of dependent activities. The Critical Path Method identifies which tasks directly dictate the overall finish date.

## Earned Value Management (EVM) Basics
- **Planned Value (PV)**: budgeted cost of work scheduled to date.
- **Earned Value (EV)**: budgeted cost of work actually completed.
- **Actual Cost (AC)**: real money spent to date.
- **Cost Variance (CV) = EV − AC**: negative means over budget.
- **Schedule Variance (SV) = EV − PV**: negative means behind schedule.
## Key Calculations
- **Early Start (ES) / Early Finish (EF)**: calculated by the Forward Pass.
- **Late Start (LS) / Late Finish (LF)**: calculated by the Backward Pass.
- **Total Float (Slack)**: \`LS - ES\` or \`LF - EF\`.
- Any activity with **Zero Float** is on the Critical Path.

## Reading the Signals
If EV is far below both PV and AC, the project is simultaneously late and over budget — the clearest signal for an escalation to the sponsor before the gap widens further.`,
## Schedule Compression Techniques
1. **Crashing**: adding resources to critical path activities to shorten duration (increases cost).
2. **Fast-Tracking**: performing activities in parallel that were originally planned in sequence (increases risk of rework).`,
            contentAm: `### ማጠቃለያ
የበጀት መነሻ ከወጪ በፊት ይቆለፋል። Earned Value (EV) ከAC ሲቀነስ አሉታዊ ውጤት ከበጀት በላይ መሆኑን ያሳያል፤ ከPV ሲቀነስ አሉታዊ ውጤት ከመርሃግብር መዘግየትን ያሳያል።`,
            attachment: pdf('Lesson 2.2 - EVM Formula Reference.pdf'),
CPM ረጅሙን የጥገኝነት መስመር ያሰላል። ዜሮ Float ያላቸው ስራዎች ወሳኝ መስመር (Critical Path) ላይ ይገኛሉ። Crashing ሀብት መጨመር ሲሆን Fast-Tracking ስራዎችን በትይዩ መስራትን ያመለክታል።`,
            attachment: pdf('Lesson 2.2 - Critical Path & Schedule Tracking Guide.pdf'),
            assessment: {
              titleEn: 'Lesson 2.2 Check: Earned Value & Variance',
              titleAm: 'ትምህርት 2.2 ማረጋገጫ፡ Earned Value እና ልዩነት',
              titleEn: 'Lesson 2.2 Check: Critical Path Method',
              titleAm: 'ትምህርት 2.2 ማረጋገጫ፡ የCPM ዘዴ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('proj-m2-l2-q1', 'A negative Cost Variance (CV) means what?', ['The project is under budget', 'The project is over budget', 'The project is ahead of schedule', 'The project has zero risk'], 1, 'Earned Value'),
                mcq('proj-m2-l2-q2', 'Schedule Variance (SV) is calculated as what?', ['EV − PV', 'AC − PV', 'PV − AC', 'EV × AC'], 0, 'Earned Value'),
                tf('proj-m2-l2-q3', 'True or False: The Budget Baseline should be locked before spending begins so future performance can be measured against it.', 0, 'Budgeting'),
                mcq('proj-m2-l2-q4', 'If Earned Value is far below both Planned Value and Actual Cost, what does this signal?', ['The project is ahead of schedule and under budget', 'The project is simultaneously late and over budget', 'Nothing significant', 'The project is complete'], 1, 'Earned Value'),
                sa('proj-m2-l2-q5', 'What three-letter acronym represents the budgeted cost of work actually completed?', 'EV', 'Earned Value'),
                mcq('proj-m2-l2-q1', 'What is the Total Float of an activity on the Critical Path?', ['Zero days', '10 days', 'Infinite days', 'Negative 5 days'], 0, 'Float Concept'),
                mcq('proj-m2-l2-q2', 'What compression technique involves doing sequential tasks in parallel?', ['Fast-Tracking', 'Crashing', 'De-scoping', 'Padding'], 0, 'Schedule Compression'),
                tf('proj-m2-l2-q3', 'True or False: "Crashing" an activity typically increases project cost by adding overtime or extra staff.', 0, 'Schedule Compression'),
                mcq('proj-m2-l2-q4', 'Which calculation pass determines Early Start and Early Finish dates?', ['Forward Pass', 'Backward Pass', 'Lateral Pass', 'Auditor Pass'], 0, 'Network Calculation'),
                sa('proj-m2-l2-q5', 'What schedule compression method adds resources to critical tasks to compress duration?', 'Crashing', 'Schedule Compression'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Calculating Float and Identifying Critical Milestones',
                titleAm: 'ተግባራዊ ላብ፡ Float ማስላት እና ወሳኝ ዋና ዋና ደረጃዎችን መለየት',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Exercise
Analyze a 7-activity network for an IT deployment:
- Activity A (Charter Signoff, 2 days)
- Activity B (Server Procurement, 10 days, depends on A)
- Activity C (LAN Cabling, 4 days, depends on A)
- Activity D (Software Config, 5 days, depends on B)
- Activity E (Staff Training, 3 days, depends on C and D)
- Activity F (UAT Signoff, 2 days, depends on E)

## Task
1. Calculate the project duration through path A-B-D-E-F vs. path A-C-E-F.
2. Determine the Critical Path and the Float of Activity C.`,
                contentAm: `### የላብ ሁኔታ
በሰባት ተግባራት መረብ ውስጥ የቆይታ ጊዜን ማስላት፣ ወሳኝ መስመርን መለየት እና የተግባር Cን Float ማስላት።`,
                attachment: pdf('Sub-Lesson 2.2.1 - Critical Path Network Lab.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.2.1 Check: Network Calculation Lab',
                  titleAm: 'ንዑስ ትምህርት 2.2.1 ማረጋገጫ፡ የመረብ ስሌት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('proj-m2-l2-s1-q1', 'What is the total duration of path A-B-D-E-F (2 + 10 + 5 + 3 + 2)?', ['22 days', '15 days', '18 days', '30 days'], 0, 'Network Math'),
                    mcq('proj-m2-l2-s1-q2', 'Which path is the Critical Path in this exercise?', ['Path A-B-D-E-F', 'Path A-C-E-F', 'Both paths', 'Neither path'], 0, 'Critical Path Identification'),
                    tf('proj-m2-l2-s1-q3', 'True or False: Activity C has positive float because path A-C-E-F is shorter than path A-B-D-E-F.', 0, 'Float Identification'),
                    mcq('proj-m2-l2-s1-q4', 'What happens if Activity B slips by 4 days?', ['The entire project completion slips by 4 days because B is on the critical path', 'Activity C speeds up', 'The budget is halved', 'Nothing happens'], 0, 'Delay Impact'),
                    sa('proj-m2-l2-s1-q5', 'How many days of delay on the critical path will cause a direct delay in project delivery?', 'Any delay', 'Schedule Control'),
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: Project Management Certification',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የፕሮጀክት አስተዳደር ሰርተፊኬት ምዘና',
      titleEn: 'Final Comprehensive Assessment: Public Sector Project Management',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የመንግስት ፕሮጀክት አስተዳደር ብቃት ምዘና',
      passingScore: 75,
      timeLimitMinutes: 35,
      timeLimitMinutes: 30,
      questions: [
        mcq('proj-fn-q1', 'What document formally authorizes a project and names its sponsor?', ['Project Charter', 'Meeting agenda', 'Expense report', 'Training manual'], 0, 'Initiation'),
        mcq('proj-fn-q2', 'A Work Breakdown Structure (WBS) primarily helps a project manager do what?', ['Decompose project scope into manageable, assignable work packages', 'Calculate employee salaries', 'Approve vendor invoices', 'Design a logo'], 0, 'Scheduling'),
        tf('proj-fn-q3', 'True or False: The Critical Path is the sequence of tasks that determines the shortest possible project duration.', 0, 'Scheduling'),
        mcq('proj-fn-q4', 'Earned Value Management primarily tracks what?', ['Employee satisfaction scores', 'Budget and schedule performance against a baseline', 'Building temperature', 'Vendor marketing materials'], 1, 'Budgeting'),
        sa('proj-fn-q5', 'What matrix tool clarifies who is Responsible, Accountable, Consulted, and Informed for each task?', 'RACI', 'Stakeholder Management'),
        mcq('proj-fn-q1', 'Which document formally authorizes a project and designates the project manager?', ['Project Charter', 'Invoice Voucher', 'Staff Evaluation Form', 'Attendance Log'], 0, 'Initiation'),
        mcq('proj-fn-q2', 'In a RACI matrix, what is the key principle regarding the Accountable (A) role?', ['There must be exactly one Accountable individual per task', 'All team members share accountability', 'The external vendor is always Accountable', 'Accountability is never assigned'], 0, 'Governance'),
        tf('proj-fn-q3', 'True or False: Tasks located on the Critical Path have zero float.', 0, 'Critical Path'),
        mcq('proj-fn-q4', 'What heuristic guideline limits a work package duration to manageable bounds?', ['The 8/80 rule', 'The 100/500 rule', 'The 5-minute rule', 'The 1-year rule'], 0, 'WBS Standards'),
        sa('proj-fn-q5', 'What schedule technique runs sequential activities simultaneously to accelerate completion?', 'Fast-Tracking', 'Schedule Management'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 3. REJECTED — Citizen Service Excellence & Front-Office Standards
  // 3. REJECTED: Citizen Service Excellence & Taxpayer Engagement
  // ─────────────────────────────────────────────────────────
  {
    code: 'CSERV101',
    titleEn: 'Citizen Service Excellence & Front-Office Standards',
    titleAm: 'የዜጎች አገልግሎት ብቃት እና የፊት ለፊት ጽ/ቤት ደረጃዎች',
    titleEn: 'Citizen Service Excellence & Taxpayer Engagement',
    titleAm: 'የዜጎች አገልግሎት የላቀ ብቃት እና የግብር ከፋዮች ተሳትፎ',
    descriptionEn:
      'Front-office conduct, complaint de-escalation, multi-channel service etiquette, and service-level measurement for taxpayer-facing staff.',
    descriptionAm: 'የፊት ለፊት ጽ/ቤት ስነ-ስርዓት፣ ቅሬታ አፈታት፣ ባለብዙ ቻናል አገልግሎት እና የአገልግሎት ደረጃ መለኪያ ለግብር ከፋዮች አገልግሎት ሰጪ ሰራተኞች።',
      'Front-line service standards, customer-first communication, de-escalation of difficult taxpayers, and service-level commitment monitoring.',
    descriptionAm: 'የፊት ለፊት አገልግሎት ደረጃዎች፣ ደንበኛ-ተኮር ተግባቦት፣ የተበሳጩ ግብር ከፋዮችን ማረጋጋት እና የአገልግሎት ደረጃ ግዴታዎች ክትትል።',
    level: CourseLevel.BASIC,
    status: CourseStatus.REJECTED,
    estimatedHours: 14,
    category: 'Customer Service & Public Engagement',
    estimatedHours: 16,
    category: 'Public Administration & Ethics',
    department: 'Taxpayer Services Directorate',
    targetAudience: 'Front-desk officers, call center agents, and taxpayer service window staff',
    deliveryMethod: 'Self-paced e-learning with role-play scenario labs',
    targetAudience: 'Counter staff, receptionist officers, customer care agents, and call center teams',
    deliveryMethod: 'Interactive e-learning with simulated taxpayer dialogue exercises',
    objectivesEn:
      'Apply consistent greeting and queue-management standards, de-escalate frustrated taxpayers, maintain service etiquette across channels, and track SLA performance.',
    objectivesAm: 'ወጥ የሆነ የመቀበያ እና የተራ አስተዳደር ደረጃዎችን መተግበር፣ የተበሳጩ ግብር ከፋዮችን ማረጋጋት እና በSLA አፈጻጸምን መከታተል።',
    prerequisites: 'None',
      'Execute professional greeting protocols, apply active listening and de-escalation techniques, and resolve taxpayer complaints within service commitments.',
    objectivesAm: 'ሙያዊ የአቀባበል ስነ-ስርዓትን መፈጸም፣ የማዳመጥ እና የማረጋጋት ዘዴዎችን መተግበር እና በቅሬታዎች ላይ ፈጣን መፍትሄ መስጠት።',
    prerequisites: 'None — mandatory orientation for all front-desk personnel',
    approvalComments:
      'Returned for revision: Module 2 lacks accessibility considerations for persons with disabilities, and the SLA benchmarks are not aligned with the 2026 Taxpayer Charter revision. Please update the response-time targets and resubmit for approval.',
      'Module 2 practical exercises require additional localized scenarios specifically covering regional customs clearing branches before approval can be granted. Please update and resubmit.',
    modules: [
      {
        titleEn: 'Module 1: Front-Office Conduct & Service Standards',
        titleAm: 'ሞዱል 1፡ የፊት ለፊት ጽ/ቤት ስነ-ስርዓት እና የአገልግሎት ደረጃዎች',
        descriptionEn: 'Set the tone for every taxpayer interaction from the first greeting through resolving a complaint.',
        descriptionAm: 'ከመጀመሪያው ሰላምታ እስከ ቅሬታ አፈታት ድረስ ያለውን የግብር ከፋይ ግንኙነት ድምጽ ማስቀመጥ።',
        objectivesEn: 'Apply standardized greeting and queue-management protocols; de-escalate frustrated taxpayers professionally.',
        objectivesAm: 'ወጥ የሆነ የመቀበያ እና የተራ አስተዳደር ደንቦችን መተግበር፤ የተበሳጩ ግብር ከፋዮችን በሙያዊ መንገድ ማረጋጋት።',
        titleEn: 'Module 1: Front-Office Etiquette, Greeting Protocols & Queue Management',
        titleAm: 'ሞዱል 1፡ የፊት ለፊት አገልግሎት ስነ-ስርዓት፣ የአቀባበል መመሪያ እና የተራ አስተዳደር',
        descriptionEn: 'Establish immediate trust and reduce citizen frustration from the moment a taxpayer enters the branch.',
        descriptionAm: 'ግብር ከፋዩ ወደ ቢሮ ከገባበት ቅጽበት ጀምሮ መተማመንን መገንባት እና ብስጭትን መቀነስ።',
        objectivesEn: 'Apply the 30-second greeting rule and manage waiting area expectations effectively.',
        objectivesAm: 'የ30 ሰከንድ አቀባበል ደንብን መተግበር እና የመጠባበቂያ አካባቢን በብቃት ማስተዳደር።',
        order: 0,
        attachment: pdf('Module 1 - Front-Office Standards Handbook.pdf'),
        attachment: pdf('Module 1 - Front-Office Etiquette Standard.pdf'),
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Front-Office Conduct',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ የፊት ለፊት ስነ-ስርዓት',
          titleEn: 'Module 1 Knowledge Check: Etiquette & Queue Management',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ ስነ-ስርዓት እና የተራ አስተዳደር',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('cserv-m1-q1', 'What is the recommended first step when a taxpayer approaches the service window?', ['Ask for their TIN before anything else', 'Greet them warmly and make eye contact', 'Continue the previous task first', 'Direct them to another window immediately'], 1, 'Greeting Protocols'),
            mcq('cserv-m1-q2', 'When de-escalating a frustrated taxpayer, which technique is most appropriate first?', ['Raise your voice to match theirs', 'Actively listen and acknowledge their frustration before responding', 'Immediately transfer the call', 'Argue the point of policy'], 1, 'De-escalation'),
            tf('cserv-m1-q3', 'True or False: A visible, numbered queue system reduces perceived wait time and taxpayer frustration.', 0, 'Queue Management'),
            mcq('cserv-m1-q4', 'What should a front-office officer do if they cannot resolve a complaint themselves?', ['Ignore the complaint', 'Escalate it to a supervisor following the documented procedure', 'Tell the taxpayer to come back another day with no explanation', 'End the conversation abruptly'], 1, 'Escalation'),
            sa('cserv-m1-q5', 'What is the term for calming an upset taxpayer before addressing the substance of their issue?', 'De-escalation', 'De-escalation'),
            mcq('cserv-m1-q1', 'What is the "30-second rule" in front-office service?', ['Citizens must leave within 30 seconds', 'Acknowledge an approaching taxpayer within 30 seconds even if finishing a task', 'Count to 30 before speaking', 'Take a 30-second break every hour'], 1, 'Etiquette'),
            mcq('cserv-m1-q2', 'Which tone is most appropriate when addressing a taxpayer who seems confused by tax forms?', ['Impatient and loud', 'Empathetic, clear, and welcoming', 'Sarcastic', 'Completely silent'], 1, 'Communication'),
            tf('cserv-m1-q3', 'True or False: Wearing the official Ministry identification badge visibly is mandatory for all front-office staff.', 0, 'Standards'),
            mcq('cserv-m1-q4', 'What is the primary psychological cause of taxpayer frustration in queues?', ['The color of the walls', 'Uncertainty about wait times and perceived lack of fairness', 'Air conditioning temperature', 'Music selection'], 1, 'Queue Psychology'),
            sa('cserv-m1-q5', 'Within how many seconds should an officer acknowledge a taxpayer approaching the service counter?', '30 seconds', 'Standards'),
          ],
        },
        lessons: [
          {
            titleEn: '1.1 Greeting Protocols, Queue Management & First Impressions',
            titleAm: '1.1 የመቀበያ ደንቦች፣ የተራ አስተዳደር እና የመጀመሪያ ስሜት',
            titleEn: '1.1 Professional Greeting Standards & In-Person Reception',
            titleAm: '1.1 ሙያዊ የአቀባበል ደረጃዎች እና በአካል መቀበያ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            durationMinutes: 30,
            order: 0,
            contentEn: `## The First Seven Seconds
Taxpayers form an impression of the entire institution within the first seconds of an interaction. A consistent greeting protocol makes that impression positive regardless of who is on duty.
            contentEn: `## First Impressions in Public Service
Every interaction between a citizen and a revenue officer shapes public trust in government institutions. A standardized greeting protocol ensures every taxpayer receives respectful, consistent service.

## Standard Greeting Sequence
1. Make eye contact and smile before the taxpayer finishes approaching.
2. Greet in the taxpayer's preferred language (Amharic or English) using a standard phrase.
3. Ask an open question: "How can I help you today?" rather than assuming their need.

## Queue Management
- Use a visible, numbered ticketing system so taxpayers can see their position without asking.
- Display estimated wait times where possible — uncertainty, not the wait itself, is what drives frustration.
- Rotate staff breaks so the number of open windows never drops during peak hours (typically 9:00–11:00 AM).`,
## The Standard Greeting Sequence
1. **Eye Contact & Smile**: acknowledge the person immediately.
2. **Institutional Greeting**: "Good morning/afternoon, welcome to the Ministry of Revenues."
3. **Identification**: "My name is [Name], how may I assist you today?"
4. **Active Listening**: allow the taxpayer to explain their inquiry without interruption.`,
            contentAm: `### ማጠቃለያ
ወጥ የሆነ የመቀበያ ደንብ በማን ላይ ቢሆን አዎንታዊ ስሜት ይፈጥራል። የሚታይ የተራ ቁጥር ስርዓት እና የሚጠበቅ የጥበቃ ጊዜ ማሳየት ብስጭትን ይቀንሳል።`,
            attachment: pdf('Lesson 1.1 - Greeting & Queue Protocol Guide.pdf'),
የመጀመሪያ እይታ የመንግስት እምነትን ይገነባል። የዓይን ግንኙነት ማድረግ፣ ተቋማዊ ሰላምታ መስጠት፣ ራስን ማስተዋወቅ እና ያለምንም ማቋረጥ ማዳመጥ መሰረታዊ ናቸው።`,
            attachment: pdf('Lesson 1.1 - Reception Protocols Handbook.pdf'),
            assessment: {
              titleEn: 'Lesson 1.1 Check: Greeting & Queue Management',
              titleAm: 'ትምህርት 1.1 ማረጋገጫ፡ መቀበያ እና የተራ አስተዳደር',
              titleEn: 'Lesson 1.1 Check: Greeting Standards',
              titleAm: 'ትምህርት 1.1 ማረጋገጫ፡ የአቀባበል ደረጃዎች',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('cserv-m1-l1-q1', 'What primarily drives taxpayer frustration while waiting in a queue?', ['The wait itself only', 'Uncertainty about wait time and position', 'The color of the waiting room', 'The time of day only'], 1, 'Queue Management'),
                mcq('cserv-m1-l1-q2', 'What is recommended instead of assuming a taxpayer need?', ['Asking an open question like "How can I help you today?"', 'Guessing based on appearance', 'Skipping the greeting', 'Directing them without asking'], 0, 'Greeting Protocols'),
                tf('cserv-m1-l1-q3', 'True or False: A visible, numbered ticketing system lets taxpayers see their position without having to ask.', 0, 'Queue Management'),
                mcq('cserv-m1-l1-q4', 'During which typical time window should staff avoid reducing the number of open windows?', ['9:00–11:00 AM peak hours', 'After closing time', 'During a public holiday', 'Weekends only'], 0, 'Queue Management'),
                sa('cserv-m1-l1-q5', 'What is the recommended action within the first seconds of a taxpayer approaching the counter?', 'Make eye contact and smile', 'Greeting Protocols'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Role-Playing Difficult Front-Desk Scenarios',
                titleAm: 'ተግባራዊ ላብ፡ ከባድ የፊት ለፊት ትዕይንቶችን መተወን',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
Practice three role-play scenarios with a colleague: (1) a taxpayer who has been waiting 40 minutes and is visibly angry, (2) a taxpayer who does not speak the local language fluently, (3) a taxpayer disputing a penalty they believe is incorrect.

## Steps
1. For each scenario, one person plays the taxpayer and one the officer; swap roles after each round.
2. Apply the LEAP technique: **Listen**, **Empathize**, **Apologize** (for the inconvenience, not necessarily fault), **Problem-solve**.
3. Debrief after each round: what phrase worked, what escalated tension unintentionally?

## Deliverable
A short written reflection noting one phrase to keep using and one to avoid, based on the debrief.`,
                contentAm: `### የላብ ሁኔታ
ሶስት ከባድ ትዕይንቶችን ከባልደረባ ጋር መተወን፡ የተበሳጨ ግብር ከፋይ፣ ቋንቋ የማይችል ግብር ከፋይ እና ቅጣት የሚከራከር ግብር ከፋይ። የLEAP ዘዴን (ማዳመጥ፣ መረዳት፣ ይቅርታ መጠየቅ፣ መፍትሄ መስጠት) መተግበር።`,
                attachment: pdf('Sub-Lesson 1.1.1 - Role-Play Scenario Cards.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.1.1 Check: Role-Play Lab',
                  titleAm: 'ንዑስ ትምህርት 1.1.1 ማረጋገጫ፡ የመተወን ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('cserv-m1-l1-s1-q1', 'What does the "E" in the LEAP technique stand for?', ['Escalate', 'Empathize', 'Evaluate', 'Exit'], 1, 'De-escalation'),
                    mcq('cserv-m1-l1-s1-q2', 'An apology in the LEAP technique is meant to address what?', ['Admitting legal fault', 'The inconvenience caused, regardless of who is at fault', 'Nothing in particular', 'Only clerical errors'], 1, 'De-escalation'),
                    tf('cserv-m1-l1-s1-q3', 'True or False: Debriefing after a role-play round helps identify phrases that unintentionally escalated tension.', 0, 'Role-Play'),
                    mcq('cserv-m1-l1-s1-q4', 'How many role-play scenarios are practiced in this lab?', ['One', 'Two', 'Three', 'Five'], 2, 'Role-Play'),
                    sa('cserv-m1-l1-s1-q5', 'What four-step technique is used to de-escalate difficult front-desk interactions in this lab?', 'LEAP', 'De-escalation'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '1.2 Handling Complaints & De-escalating Frustrated Taxpayers',
            titleAm: '1.2 ቅሬታዎችን ማስተናገድ እና የተበሳጩ ግብር ከፋዮችን ማረጋጋት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 1,
            contentEn: `## Complaints Are Information, Not Interruptions
A complaint is an opportunity to correct a process failure before it affects more taxpayers. Treating it as an interruption guarantees a worse outcome.

## The Complaint-Handling Sequence
1. **Acknowledge** the taxpayer's frustration explicitly: "I understand this delay is frustrating."
2. **Clarify** the specific issue by asking targeted questions rather than assuming.
3. **Act** within your authority immediately if possible; if not, explain exactly what happens next and by when.
4. **Record** the complaint in the service log regardless of resolution, so patterns can be identified by management.

## When to Escalate
Escalate immediately if the taxpayer requests a supervisor, if the issue involves a policy exception, or if de-escalation attempts have failed twice — do not let an interaction continue indefinitely without bringing in a supervisor.`,
Escalate immediately if the taxpayer requests a supervisor, if the issue involves a policy exception, or if de-escalation attempts have failed twice.`,
            contentAm: `### ማጠቃለያ
ቅሬታ የሂደት ችግርን ለማረም እድል ነው። ማወቅ፣ ማብራራት፣ እርምጃ መውሰድ እና መመዝገብ የቅሬታ አያያዝ ደረጃዎች ናቸው። ሁለት ጊዜ ማረጋጋት ካልተሳካ ወደ ሀላፊ ማስተላለፍ ያስፈልጋል።`,
            attachment: pdf('Lesson 1.2 - Complaint Handling Procedure.pdf'),
            assessment: {
              titleEn: 'Lesson 1.2 Check: Complaint Handling',
              titleAm: 'ትምህርት 1.2 ማረጋገጫ፡ ቅሬታ አያያዝ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('cserv-m1-l2-q1', 'What is the first step in the complaint-handling sequence?', ['Record the complaint', 'Acknowledge the taxpayer frustration explicitly', 'Escalate immediately', 'Ignore and move to the next taxpayer'], 1, 'Complaint Handling'),
                mcq('cserv-m1-l2-q2', 'Why should complaints be recorded even after resolution?', ['To punish the officer', 'So patterns can be identified by management', 'It is legally irrelevant', 'To delay the taxpayer further'], 1, 'Complaint Handling'),
                tf('cserv-m1-l2-q3', 'True or False: A complaint should be escalated immediately if the taxpayer explicitly requests a supervisor.', 0, 'Escalation'),
                mcq('cserv-m1-l2-q4', 'After how many failed de-escalation attempts should an officer bring in a supervisor?', ['Never', 'After two failed attempts', 'Only after ten attempts', 'Only if the taxpayer leaves'], 1, 'Escalation'),
                sa('cserv-m1-l2-q5', 'What four-step sequence (Acknowledge, Clarify, Act, Record) describes complaint handling in this lesson?', 'Complaint-Handling Sequence', 'Complaint Handling'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Conflict Resolution Under the LEAP Framework',
                titleAm: 'ተግባራዊ ላብ፡ በLEAP ማዕቀፍ ውስጥ ግጭቶችን መፍታት',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
A business taxpayer demands to see the branch manager immediately after being assessed a late penalty due to a server outage on filing day.
1. Draft the exact response using the LEAP framework.
2. Check penalty records in the simulated portal.
3. Submit a formal penalty waiver review request under system outage protocol.`,
                contentAm: `### የላብ ሁኔታ
የስርዓት መቆራረጥ በነበረበት ቀን የዘገየ ቅጣት የተጣለበትን የንግድ ግብር ከፋይ በLEAP ዘዴ ማስተናገድ እና የይቅርታ ጥያቄ ማቅረብ።`,
                attachment: pdf('Sub-Lesson 1.2.1 - LEAP De-escalation Lab.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.2.1 Check: Conflict Resolution Lab',
                  titleAm: 'ንዑስ ትምህርት 1.2.1 ማረጋገጫ፡ የግጭት አፈታት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('cserv-m1-l2-s1-q1', 'When a taxpayer is yelling, what voice tone should the customer service officer adopt?', ['Louder than the taxpayer to show authority', 'Calm, steady, and lower in volume', 'High-pitched and defensive', 'Completely whispering'], 1, 'Voice Modulation'),
                    mcq('cserv-m1-l2-s1-q2', 'What should you do if an outage prevented on-time tax submission?', ['Blame the taxpayer for waiting until the last day', 'Check official outage logs and explain the waiver review process', 'Tell them nothing can be done', 'Cancel their business license'], 1, 'Outage Procedure'),
                    tf('cserv-m1-l2-s1-q3', 'True or False: Using the phrase "Calm down" often inflames an angry taxpayer rather than calming them.', 0, 'Psychological Triggers'),
                    mcq('cserv-m1-l2-s1-q4', 'What is the primary purpose of writing down notes while the taxpayer explains their issue?', ['It shows attentive listening and captures factual details for the file', 'To look busy so they stop talking', 'To doodle', 'It is required by police only'], 0, 'Active Listening'),
                    sa('cserv-m1-l2-s1-q5', 'What phrase should be avoided because it almost always escalates an upset citizen?', 'Calm down', 'De-escalation'),
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        titleEn: 'Module 2: Multi-Channel Service & Service-Level Commitments',
        titleAm: 'ሞዱል 2፡ ባለብዙ ቻናል አገልግሎት እና የአገልግሎት ደረጃ ግዴታዎች',
        descriptionEn: 'Keep service quality consistent whether a taxpayer walks in, calls, emails, or uses a self-service kiosk.',
        descriptionAm: 'ግብር ከፋይ በአካል፣ በስልክ፣ በኢሜይል ወይም በኪዮስክ ቢጠቀም የአገልግሎት ጥራት ወጥ ሆኖ እንዲቆይ ማድረግ።',
        objectivesEn: 'Apply channel-appropriate service etiquette; measure and report against defined service-level targets.',
        objectivesAm: 'ለቻናሉ ተስማሚ የአገልግሎት ስነ-ስርዓት መተግበር፤ በተቀመጡ የአገልግሎት ደረጃ ግቦች መለካት እና ሪፖርት ማድረግ።',
        order: 1,
        attachment: pdf('Module 2 - Multi-Channel Service Playbook.pdf'),
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Multi-Channel Service & SLAs',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ ባለብዙ ቻናል እና SLA',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('cserv-m2-q1', 'What does SLA stand for in a customer service context?', ['Service-Level Agreement', 'Staff Leave Application', 'System Login Access', 'Service Legal Advisory'], 0, 'SLA'),
            mcq('cserv-m2-q2', 'When answering the phone, what should an officer state within the first few seconds?', ['Nothing, wait for the caller to speak', 'Their name, directorate, and a greeting', 'The office closing time only', 'A joke to lighten the mood'], 1, 'Phone Etiquette'),
            tf('cserv-m2-q3', 'True or False: Email responses to taxpayers should use the same standardized, professional tone as in-person service.', 0, 'Email Etiquette'),
            mcq('cserv-m2-q4', 'CSAT is a metric used to measure what?', ['Customer/citizen satisfaction', 'Server uptime', 'Tax revenue collected', 'Staff attendance'], 0, 'Service Metrics'),
            sa('cserv-m2-q5', 'What metric measures the time taken to resolve a service request against a target?', 'Turnaround Time', 'Service Metrics'),
          ],
        },
        lessons: [
          {
            titleEn: '2.1 Phone, Email & Digital Kiosk Service Etiquette',
            titleAm: '2.1 ስልክ፣ ኢሜይል እና ዲጂታል ኪዮስክ አገልግሎት ስነ-ስርዓት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 30,
            order: 0,
            contentEn: `## One Standard, Many Channels
Taxpayers expect the same professionalism whether they walk in, call, email, or use a self-service kiosk. Each channel has specific etiquette rules that support that consistency.
Taxpayers expect the same professionalism whether they walk in, call, email, or use a self-service kiosk.

## Phone
- Answer within 3 rings; state your name, directorate, and a greeting.
- Confirm the caller's identity before discussing account-specific details.
- Summarize agreed next steps before ending the call.

## Email
- Respond using the standardized template and professional tone — no slang or all-caps.
- Acknowledge receipt within 24 hours even if full resolution takes longer.

## Digital Kiosk
- Post clear, step-by-step signage near kiosks.
- Assign a roaming officer during peak hours to assist taxpayers unfamiliar with the touchscreen interface.`,
            contentAm: `### ማጠቃለያ
ግብር ከፋዮች በማንኛውም ቻናል ተመሳሳይ ሙያዊነት ይጠብቃሉ። ስልክ በ3 ጊዜ ጥሪ ውስጥ መመለስ፣ ኢሜይል በ24 ሰዓት ውስጥ ማረጋገጥ እና በኪዮስክ አካባቢ ግልጽ መመሪያ ማስቀመጥ ያስፈልጋል።`,
            attachment: pdf('Lesson 2.1 - Multi-Channel Etiquette Guide.pdf'),
            assessment: {
              titleEn: 'Lesson 2.1 Check: Multi-Channel Etiquette',
              titleAm: 'ትምህርት 2.1 ማረጋገጫ፡ ባለብዙ ቻናል ስነ-ስርዓት',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('cserv-m2-l1-q1', 'Within how many rings should a service phone call be answered?', ['10 rings', '3 rings', '1 ring only', 'It does not matter'], 1, 'Phone Etiquette'),
                mcq('cserv-m2-l1-q2', 'Before discussing account-specific details on a call, what must be confirmed?', ['The caller identity', 'The weather', 'The office address', 'Nothing'], 0, 'Phone Etiquette'),
                tf('cserv-m2-l1-q3', 'True or False: Email receipt should be acknowledged within 24 hours even if full resolution takes longer.', 0, 'Email Etiquette'),
                mcq('cserv-m2-l1-q4', 'What should be assigned near kiosks during peak hours?', ['A locked door', 'A roaming officer to assist taxpayers', 'Nothing additional', 'A ticket machine only'], 1, 'Kiosk Service'),
                sa('cserv-m2-l1-q5', 'What should an officer state at the start of a phone call along with their name?', 'Their directorate', 'Phone Etiquette'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Drafting Standardized Email Response Templates',
                titleAm: 'ተግባራዊ ላብ፡ ወጥ የኢሜይል ምላሽ አብነቶችን ማርቀቅ',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
Draft three standardized email templates: (1) acknowledging receipt of a general inquiry, (2) requesting missing documents, (3) confirming resolution of an issue.

## Steps
1. Each template must include: a professional greeting, a clear statement of purpose, next steps with a specific deadline, and a closing with the officer's name and contact channel.
2. Avoid jargon — write at a reading level accessible to a first-time taxpayer.
3. Have a colleague review each draft for tone before adding it to the shared template library.

## Deliverable
Three finalized templates saved to the shared response-template folder for team-wide reuse.`,
                contentAm: `### የላብ ሁኔታ
ሶስት ወጥ የኢሜይል አብነቶችን ማዘጋጀት፡ ደረሰኝ ማረጋገጫ፣ የጎደሉ ሰነዶች ጥያቄ እና የጉዳይ መፍትሄ ማረጋገጫ። እያንዳንዱ አብነት ግልጽ ቀጣይ እርምጃ እና ቀነ-ገደብ ሊኖረው ይገባል።`,
                attachment: pdf('Sub-Lesson 2.1.1 - Email Template Lab Pack.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.1.1 Check: Email Template Lab',
                  titleAm: 'ንዑስ ትምህርት 2.1.1 ማረጋገጫ፡ የኢሜይል አብነት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('cserv-m2-l1-s1-q1', 'How many email templates are drafted in this lab?', ['One', 'Two', 'Three', 'Five'], 2, 'Email Templates'),
                    mcq('cserv-m2-l1-s1-q2', 'What reading level should the templates target?', ['Legal-expert level with heavy jargon', 'A reading level accessible to a first-time taxpayer', 'Technical IT-specialist level', 'No specific level'], 1, 'Email Templates'),
                    tf('cserv-m2-l1-s1-q3', 'True or False: Each template should include a closing with the officer name and contact channel.', 0, 'Email Templates'),
                    mcq('cserv-m2-l1-s1-q4', 'Before adding a draft to the shared library, what should happen?', ['Nothing further', 'A colleague reviews it for tone', 'It is deleted', 'It is translated to five languages'], 1, 'Quality Review'),
                    sa('cserv-m2-l1-s1-q5', 'What element should every template include alongside next steps?', 'A specific deadline', 'Email Templates'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '2.2 Measuring Service Quality: SLAs, CSAT & Turnaround Targets',
            titleAm: '2.2 የአገልግሎት ጥራት መለኪያ፡ SLA፣ CSAT እና የመመለሻ ጊዜ ግቦች',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 30,
            order: 1,
            contentEn: `## Why Measurement Matters
Service quality that is not measured cannot be improved. Three metrics keep front-office performance accountable and visible.

## Core Metrics
- **Service-Level Agreement (SLA)**: a defined commitment, e.g. "90% of counter transactions completed within 10 minutes."
- **Customer Satisfaction (CSAT)**: a short post-interaction survey score, typically 1–5, capturing the taxpayer's own experience.
- **Turnaround Time**: the elapsed time from request submission to resolution, tracked per request type.

## Using the Data
Review SLA and CSAT trends monthly with the team — a single missed target is noise, but a declining trend over three consecutive months signals a process problem that needs a root-cause review, not just individual coaching.`,
Review SLA and CSAT trends monthly with the team — a declining trend over three consecutive months signals a process problem that needs a root-cause review, not just individual coaching.`,
            contentAm: `### ማጠቃለያ
SLA የተቀመጠ ግዴታ ነው (ለምሳሌ 90% ግብይቶች በ10 ደቂቃ ውስጥ)። CSAT የግብር ከፋይ እርካታን ይለካል። ወርሃዊ አዝማሚያ መገምገም የሂደት ችግርን አስቀድሞ ለመለየት ይረዳል።`,
            attachment: pdf('Lesson 2.2 - Service Metrics Handbook.pdf'),
            assessment: {
              titleEn: 'Lesson 2.2 Check: Service Metrics',
              titleAm: 'ትምህርት 2.2 ማረጋገጫ፡ የአገልግሎት መለኪያዎች',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('cserv-m2-l2-q1', 'What does an SLA define?', ['A defined service commitment, e.g. a completion time target', 'A staff vacation schedule', 'A tax rate', 'An office floor plan'], 0, 'SLA'),
                mcq('cserv-m2-l2-q2', 'CSAT is typically measured using what?', ['A short post-interaction survey score', 'Server response time logs', 'Tax audit results', 'Employee headcount'], 0, 'CSAT'),
                tf('cserv-m2-l2-q3', 'True or False: A declining CSAT trend over three consecutive months signals a process problem worth a root-cause review.', 0, 'Service Metrics'),
                mcq('cserv-m2-l2-q4', 'Turnaround Time measures the elapsed time from what to what?', ['Request submission to resolution', 'Office opening to closing', 'Hiring to termination', 'Budget approval to audit'], 0, 'Turnaround Time'),
                sa('cserv-m2-l2-q5', 'What acronym describes the metric capturing the taxpayer own experience score after an interaction?', 'CSAT', 'CSAT'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Calculating Turnaround Rates and Action Triggers',
                titleAm: 'ተግባራዊ ላብ፡ የመመለሻ ጊዜዎችን ማስላት እና የአሰራር እርምጃዎችን መለየት',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
You are provided with 500 service logs from the Bole sub-city tax branch across three service types: TIN Registration, Tax Clearance Certificate, and Assessment Inquiries.
1. Calculate the percentage of requests meeting their respective 24-hour, 48-hour, and 72-hour SLAs.
2. Identify which service type fell below the 85% compliance threshold.
3. Formulate an operational action plan to remedy bottlenecks.`,
                contentAm: `### የላብ ሁኔታ
የ500 አገልግሎት መዝገቦችን SLA ተገዢነት ማስላት፣ ከ85% በታች የወረደውን አገልግሎት መለየት እና የመፍትሄ እቅድ ማዘጋጀት።`,
                attachment: pdf('Sub-Lesson 2.2.1 - Service Metrics Calculation Sheet.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.2.1 Check: Metrics Calculation Lab',
                  titleAm: 'ንዑስ ትምህርት 2.2.1 ማረጋገጫ፡ የመለኪያ ስሌት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('cserv-m2-l2-s1-q1', 'If 450 out of 500 requests are resolved within the SLA target, what is the compliance rate?', ['90%', '75%', '85%', '95%'], 0, 'Metrics Math'),
                    mcq('cserv-m2-l2-s1-q2', 'What is the standard target threshold for counter service satisfaction in MoR branches?', ['At least 85%', '50%', '10%', '100% with zero exceptions'], 0, 'Thresholds'),
                    tf('cserv-m2-l2-s1-q3', 'True or False: Bottlenecks in Tax Clearance issuance often relate to pending cross-department audit verifications.', 0, 'Root Cause'),
                    mcq('cserv-m2-l2-s1-q4', 'Which managerial intervention is most appropriate when staff consistently miss email SLA targets?', ['Automating acknowledgement replies and rebalancing workload', 'Cancelling all emails', 'Blaming citizens', 'Ignoring the reports'], 0, 'Process Improvement'),
                    sa('cserv-m2-l2-s1-q5', 'What percentage equals 450 on-time resolutions out of 500 total cases?', '90%', 'Metrics Math'),
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: Citizen Service Excellence Certification',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የዜጎች አገልግሎት ብቃት ሰርተፊኬት ምዘና',
      passingScore: 75,
      timeLimitMinutes: 25,
      questions: [
        mcq('cserv-fn-q1', 'What is the primary purpose of a standardized greeting protocol?', ['To slow down service', 'To create a consistent, positive first impression regardless of who is on duty', 'To reduce staff headcount', 'To replace the queue system'], 1, 'Front-Office Conduct'),
        mcq('cserv-fn-q2', 'The LEAP technique is used for what purpose?', ['De-escalating frustrated taxpayers', 'Calculating tax penalties', 'Scheduling staff shifts', 'Formatting reports'], 0, 'De-escalation'),
        tf('cserv-fn-q3', 'True or False: Complaints should always be recorded in the service log, even if resolved on the spot.', 0, 'Complaint Handling'),
        mcq('cserv-fn-q4', 'What primarily drives taxpayer frustration while waiting?', ['Uncertainty about wait time', 'The weather', 'Staff uniforms', 'Office decor'], 0, 'Queue Management'),
        sa('cserv-fn-q5', 'What is the standard term for calming an upset taxpayer before resolving the substance of their issue?', 'De-escalation', 'De-escalation'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 4. APPROVED: Cybersecurity Awareness & Information Protection
  // ─────────────────────────────────────────────────────────
  {
    code: 'CYBER301',
    titleEn: 'Cybersecurity Awareness & Information Protection in Ministry Systems',
    titleAm: 'በሚኒስቴሩ ስርዓቶች የሳይበር ደህንነት ግንዛቤ እና የመረጃ ጥበቃ',
    descriptionEn:
      'Safeguard taxpayer records, prevent phishing and ransomware intrusions, configure multi-factor authentication, and execute incident reporting.',
    descriptionAm: 'የግብር ከፋዮች ሚስጥራዊ መረጃዎችን መጠበቅ፣ የማጭበርበሪያ (Phishing) ጥቃቶችን መከላከል እና የደህንነት ክስተቶችን ሪፖርት ማድረግ።',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.APPROVED,
    estimatedHours: 20,
    category: 'ICT & Information Security',
    department: 'ICT & Cyber Defense Directorate',
    targetAudience: 'All Ministry personnel accessing email, SigTas, and enterprise revenue databases',
    deliveryMethod: 'Self-paced interactive security awareness training with hands-on phishing simulations',
    objectivesEn:
      'Identify phishing indicators, enforce strong credential practices, classify sensitive taxpayer data, and trigger rapid incident containment.',
    objectivesAm: 'የማጭበርበሪያ ኢሜይሎችን መለየት፣ ጠንካራ የይለፍ ቃል ማዘጋጀት፣ ሚስጥራዊ መረጃዎችን መመደብ እና የደህንነት አደጋ ሲከሰት ፈጣን ሪፖርት ማድረግ።',
    prerequisites: 'Basic computer literacy and active Ministry Active Directory user account',
    approvalComments:
      'Course approved following validation against Information Network Security Administration (INSA) federal standards.',
    modules: [
      {
        titleEn: 'Module 1: Threat Landscape, Social Engineering & Phishing Defense',
        titleAm: 'ሞዱል 1፡ የሳይበር አደጋዎች፣ ማህበራዊ ምህንድስና እና የማጭበርበር ጥቃት መከላከያ',
        descriptionEn: 'Understand how attackers target Ministry staff through spear-phishing, spoofed domains, and social engineering.',
        descriptionAm: 'አጥቂዎች የሚኒስቴሩን ሰራተኞች በማጭበርበሪያ ኢሜይሎች እና በተመሳሰሉ ድረ-ገጾች እንዴት እንደሚያጠቁ መረዳት።',
        objectivesEn: 'Analyze malicious email indicators, verify sender domains, and inspect embedded hyperlinks safely.',
        objectivesAm: 'አደገኛ የኢሜይል ምልክቶችን መመርመር፣ የላኪዎችን አድራሻ ማረጋገጥ እና አጠራጣሪ አገናኞችን መመርመር።',
        order: 0,
        attachment: pdf('Module 1 - Cyber Threat Intelligence & Phishing Manual.pdf'),
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Phishing & Threat Landscape',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ ፊሺንግ እና የሳይበር አደጋዎች',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('cyber-m1-q1', 'What is spear-phishing?', ['A random bulk email sent to millions', 'A highly tailored, deceptive email targeting specific individuals within an organization', 'A firewall configuration rule', 'An antivirus update mechanism'], 1, 'Social Engineering'),
            mcq('cyber-m1-q2', 'What should you do before clicking on a link in an unexpected email from an external sender?', ['Click it immediately to see where it leads', 'Hover over the link to verify the actual destination URL', 'Forward it to all colleagues', 'Reply asking if it is a virus'], 1, 'Email Safety'),
            tf('cyber-m1-q3', 'True or False: Attackers can spoof display names to appear as if an email came from the Ministry Director General.', 0, 'Spoofing'),
            mcq('cyber-m1-q4', 'Which file attachment extension is historically the most dangerous when sent unexpectedly via email?', ['exe / vbs / scr', 'pdf', 'txt', 'png'], 0, 'Malware Vectors'),
            sa('cyber-m1-q5', 'What is the term for targeting executive leadership or high-ranking government officials with phishing?', 'Whaling', 'Phishing Types'),
          ],
        },
        lessons: [
          {
            titleEn: '1.1 Recognizing Phishing Vectors & Malicious Attachments',
            titleAm: '1.1 የማጭበርበሪያ ዘዴዎችን እና አደገኛ አባሪዎችን መለየት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 0,
            contentEn: `## The Primary Attack Vector: Human Psychology
Over 85% of public-sector data breaches begin with a phishing email. Attackers exploit curiosity, fear, urgency, or authority to manipulate recipients into clicking malicious links or downloading malware.

## Red Flag Checklist
1. **Urgent or Threatening Language**: "Your account will be suspended in 2 hours unless you confirm credentials."
2. **Mismatched Sender Domains**: Display name says "Ministry IT", but actual address is \`support@mor-gov-portal.com\` instead of \`@mor.gov.et\`.
3. **Suspicious Attachments**: Macro-enabled Excel files (\`.xlsm\`), compressed archives (\`.zip\`, \`.iso\`), or direct executables.
4. **Generic Greetings**: "Dear Customer" or "Dear Employee" when claiming to be an internal communication.`,
            contentAm: `### ማጠቃለያ
ከ85% በላይ የሚሆኑ የደህንነት ጥሰቶች የሚጀምሩት በማጭበርበሪያ ኢሜይል ነው። አጣዳፊ ማስፈራሪያዎች፣ ያልተዛመዱ የላኪ አድራሻዎች እና ያልተለመዱ አባሪዎች ዋነኛ የማስጠንቀቂያ ምልክቶች ናቸው።`,
            attachment: pdf('Lesson 1.1 - Phishing Detection Guidelines.pdf'),
            assessment: {
              titleEn: 'Lesson 1.1 Check: Phishing Detection',
              titleAm: 'ትምህርት 1.1 ማረጋገጫ፡ የማጭበርበር መለያ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('cyber-m1-l1-q1', 'Which domain is the genuine official email domain for the Ministry?', ['@mor.gov.et', '@mor-support.com', '@ethiopia-tax-gov.org', '@mor.et.portal.net'], 0, 'Domain Verification'),
                mcq('cyber-m1-l1-q2', 'Why do attackers create artificial urgency in phishing messages?', ['To help users resolve problems faster', 'To bypass rational critical thinking and pressure the victim into immediate compliance', 'Because their servers have short battery life', 'It is required by cybersecurity law'], 1, 'Social Engineering'),
                tf('cyber-m1-l1-q3', 'True or False: Legitimate Ministry IT will never send an email asking you to reply with your password.', 0, 'Password Policy'),
                mcq('cyber-m1-l1-q4', 'What is the immediate action if you suspect an email in your inbox is a phishing attempt?', ['Delete it silently', 'Report it using the Outlook "Report Phishing" button and notify ICT Security', 'Forward it to your personal Yahoo mail', 'Click all links to verify them'], 1, 'Incident Response'),
                sa('cyber-m1-l1-q5', 'What technique displays a fake name while hiding a different underlying sender address?', 'Display Name Spoofing', 'Spoofing'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Dissecting Spear-Phishing Email Headers & Links',
                titleAm: 'ተግባራዊ ላብ፡ የማጭበርበሪያ ኢሜይል ራስጌዎችን እና አገናኞችን መመርመር',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
Examine 3 simulated email headers captured in our mail security gateway:
1. Identify the genuine originating IP address and return-path header.
2. Compare the display text of the hyperlinks against their actual destination targets using URL inspection.
3. Classify each message as either Authentic, Phishing, or Spam.`,
                contentAm: `### የላብ ሁኔታ
ሶስት የኢሜይል ራስጌዎችን በመመርመር ትክክለኛውን የላኪ IP፣ የመልስ አድራሻ እና የአገናኝ መዳረሻን መለየት።`,
                attachment: pdf('Sub-Lesson 1.1.1 - Header Analysis Lab Pack.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.1.1 Check: Email Header Analysis Lab',
                  titleAm: 'ንዑስ ትምህርት 1.1.1 ማረጋገጫ፡ የኢሜይል ራስጌ ትንተና ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('cyber-m1-l1-s1-q1', 'Which email header field reveals the actual server that routed the message?', ['Subject', 'Received: from', 'Content-Type', 'MIME-Version'], 1, 'Header Anatomy'),
                    mcq('cyber-m1-l1-s1-q2', 'If a link text says "https://mor.gov.et" but hovering reveals "http://194.26.29.10/login", this indicates:', ['A routine server redirect', 'A deceptive phishing credential harvesting link', 'A fast fiber connection', 'Normal browser behavior'], 1, 'URL Inspection'),
                    tf('cyber-m1-l1-s1-q3', 'True or False: SPF (Sender Policy Framework) and DKIM help verify whether an email genuinely originated from the claimed domain.', 0, 'Email Authentication'),
                    mcq('cyber-m1-l1-s1-q4', 'What does SPF stand for in email security?', ['Sender Policy Framework', 'Security Protection File', 'Server Password Filter', 'Standard Phishing Firewall'], 0, 'Email Security'),
                    sa('cyber-m1-l1-s1-q5', 'What email security standard uses cryptographic signatures to verify email authenticity?', 'DKIM', 'Email Standards'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '1.2 Password Hygiene, Multi-Factor Authentication & Credential Security',
            titleAm: '1.2 የይለፍ ቃል ንጽህና፣ ባለብዙ ደረጃ ማረጋገጫ (MFA) እና የደህንነት ቁልፎች',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 1,
            contentEn: `## Passwords Alone Are Not Enough
Compromised passwords are the root cause of credential stuffing and unauthorized system entry. Modern security requires both strong passphrases and Multi-Factor Authentication (MFA).

## Guidelines for Ministry Accounts
- **Passphrase Length**: minimum 14 characters combining uppercase, lowercase, numbers, and symbols.
- **No Password Reuse**: never use your ministry Active Directory password on external sites (e.g. personal email, social media).
- **MFA Enforcement**: always approve MFA prompts only when initiated by yourself; beware of "MFA Fatigue" spam attacks.`,
            contentAm: `### ማጠቃለያ
የይለፍ ቃላት ብቻቸውን በቂ አይደሉም። ቢያንስ 14 ቁምፊዎችን የያዘ ጠንካራ የይለፍ ቃል መጠቀም እና የባለብዙ ደረጃ ማረጋገጫ (MFA) ጥያቄዎችን እራስዎ ካልጀመሩት በስተቀር አለመፍቀድ ያስፈልጋል።`,
            attachment: pdf('Lesson 1.2 - Password & MFA Security Policy.pdf'),
            assessment: {
              titleEn: 'Lesson 1.2 Check: Passwords & MFA',
              titleAm: 'ትምህርት 1.2 ማረጋገጫ፡ የይለፍ ቃላት እና MFA',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('cyber-m1-l2-q1', 'What is the recommended minimum character length for ministry passphrases under INSA guidelines?', ['6 characters', '8 characters', '14 characters', '30 characters'], 2, 'Password Policy'),
                mcq('cyber-m1-l2-q2', 'What is "MFA Fatigue"?', ['Tiredness from typing long passwords', 'An attacker repeatedly triggering push notifications until the victim accidentally approves one', 'A phone battery dying', 'A server timeout'], 1, 'MFA Attacks'),
                tf('cyber-m1-l2-q3', 'True or False: Writing your password on a sticky note placed under your keyboard is a severe security violation.', 0, 'Physical Security'),
                mcq('cyber-m1-l2-q4', 'Which of the following represents something you HAVE in MFA?', ['Your password', 'Your fingerprint', 'A hardware security key or authenticator smartphone', 'Your mother maiden name'], 2, 'MFA Factors'),
                sa('cyber-m1-l2-q5', 'What is the acronym for Multi-Factor Authentication?', 'MFA', 'Authentication'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Configuring Hardware Tokens and Authenticator Apps',
                titleAm: 'ተግባራዊ ላብ፡ የሃርድዌር ቶከን እና የማረጋገጫ መተግበሪያዎችን ማዋቀር',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Objective
Enroll your Ministry Active Directory account into Microsoft Authenticator and register a backup hardware FIDO2 key.
1. Download Microsoft Authenticator on a secure device.
2. Scan the one-time registration QR code from the Ministry Self-Service portal.
3. Test number matching verification to block automated push fatigue attacks.`,
                contentAm: `### የላብ ዓላማ
የማረጋገጫ መተግበሪያን በQR ኮድ ማገናኘት እና የቁጥር ማዛመጃ (Number Matching) ሙከራ ማድረግ።`,
                attachment: pdf('Sub-Lesson 1.2.1 - MFA Configuration Guide.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.2.1 Check: MFA Configuration Lab',
                  titleAm: 'ንዑስ ትምህርት 1.2.1 ማረጋገጫ፡ የMFA ማዋቀር ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('cyber-m1-l2-s1-q1', 'How does "Number Matching" prevent accidental MFA push approvals?', ['It requires the user to type the number shown on the login screen into the phone app', 'It calls your home landline', 'It takes a selfie', 'It shuts down the computer'], 0, 'Number Matching'),
                    mcq('cyber-m1-l2-s1-q2', 'What should you do immediately if your phone with the Authenticator app is lost or stolen?', ['Wait until next month to report it', 'Report it immediately to the ICT Helpdesk to revoke the session token', 'Assume nobody knows your PIN', 'Buy a new phone and do nothing else'], 1, 'Device Security'),
                    tf('cyber-m1-l2-s1-q3', 'True or False: SMS verification codes are considered less secure than time-based authenticator apps due to SIM-swapping risks.', 0, 'Factor Security'),
                    mcq('cyber-m1-l2-s1-q4', 'What standard protocol enables passwordless hardware keys like YubiKeys?', ['FIDO2 / WebAuthn', 'FTP', 'HTTP 1.0', 'Telnet'], 0, 'Hardware Authentication'),
                    sa('cyber-m1-l2-s1-q5', 'What security feature forces a user to enter the 2-digit number displayed on screen into their authenticator app?', 'Number Matching', 'MFA Protocols'),
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        titleEn: 'Module 2: Data Classification, Clean Desk Policy & Incident Reporting',
        titleAm: 'ሞዱል 2፡ የመረጃ ምደባ፣ የንጹህ ጠረጴዛ ፖሊሲ እና የክስተት ሪፖርት አቀራረብ',
        descriptionEn: 'Classify taxpayer records, secure physical workstations, and trigger coordinated incident reporting.',
        descriptionAm: 'የግብር መረጃዎችን ሚስጥራዊነት መመደብ፣ አካላዊ የስራ ጠረጴዛዎችን መጠበቅ እና አደጋ ሲከሰት ሪፖርት ማድረግ።',
        objectivesEn: 'Differentiate data tiers, enforce screen locking and clean desk protocols, and escalate breaches.',
        objectivesAm: 'የመረጃ ደረጃዎችን መለየት፣ ስክሪን መቆለፍን ማክበር እና የደህንነት ጥሰቶችን በወቅቱ ማሳወቅ።',
        order: 1,
        attachment: pdf('Module 2 - Information Security Governance Guide.pdf'),
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Data Classification & Incident Response',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ የመረጃ ምደባ እና ምላሽ',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('cyber-m2-q1', 'Which data tier includes individual taxpayer income statements, bank records, and TIN documents?', ['Public', 'Confidential / Restricted', 'Unclassified', 'Marketing'], 1, 'Data Classification'),
            mcq('cyber-m2-q2', 'What keyboard shortcut instantly locks a Windows PC when stepping away from your desk?', ['Windows Key + L', 'Ctrl + Alt + Delete + Enter', 'Alt + F4', 'Ctrl + Shift + W'], 0, 'Workstation Hygiene'),
            tf('cyber-m2-q3', 'True or False: Under the Clean Desk Policy, physical taxpayer files must be locked in a cabinet when an officer leaves for lunch.', 0, 'Clean Desk Policy'),
            mcq('cyber-m2-q4', 'What is the recommended timeframe for reporting a suspected ransomware infection to the Security Operations Center?', ['Within 15 minutes', 'Within 7 business days', 'At the end of the fiscal year', 'Never'], 0, 'Incident Escalation'),
            sa('cyber-m2-q5', 'What keyboard shortcut locks a Windows workstation immediately?', 'Windows Key + L', 'Workstation Security'),
          ],
        },
        lessons: [
          {
            titleEn: '2.1 Handling Taxpayer Confidential Data & Privacy Controls',
            titleAm: '2.1 የግብር ከፋይ ሚስጥራዊ መረጃ አያያዝ እና የግላዊነት ጥበቃ',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 0,
            contentEn: `## The Legal Mandate for Taxpayer Privacy
Under Ethiopian tax law, unauthorized disclosure of taxpayer financial records carries severe disciplinary and criminal penalties.

## MoR Data Classification Tiers
1. **Public**: Published tax guides, public notices, press releases.
2. **Internal Use**: Departmental phone directories, general administrative memos.
3. **Confidential / PII**: Taxpayer Identification Numbers, financial audits, bank balances, payment records.
4. **Secret / Restricted**: High-profile criminal fraud investigations, intelligence leads, cryptographic keys.

## Data Sharing Safeguards
Never email spreadsheets containing unencrypted Confidential PII to external email addresses (e.g. Gmail, Yahoo). Always use encrypted ministry channels.`,
            contentAm: `### ማጠቃለያ
የግብር ከፋይ መረጃን ያለፈቃድ ማውጣት በህግ ያስቀጣል። መረጃዎች በህዝባዊ፣ ውስጣዊ፣ ሚስጥራዊ እና ከፍተኛ ሚስጥራዊ ተብለው ይመደባሉ። ሚስጥራዊ መረጃዎችን ወደ ግል ኢሜይል መላክ በጥብቅ የተከለከለ ነው።`,
            attachment: pdf('Lesson 2.1 - Confidential Data Classification Matrix.pdf'),
            assessment: {
              titleEn: 'Lesson 2.1 Check: Confidential Data Handling',
              titleAm: 'ትምህርት 2.1 ማረጋገጫ፡ ሚስጥራዊ መረጃ አያያዝ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('cyber-m2-l1-q1', 'What does PII stand for in information security?', ['Personally Identifiable Information', 'Public Internet Interface', 'Private International Protocol', 'Protected Industrial Index'], 0, 'Terminology'),
                mcq('cyber-m2-l1-q2', 'Is it permissible to transfer taxpayer audit files to a personal USB flash drive to work from home?', ['Yes, anytime', 'No, USB mass storage without ICT encryption clearance is strictly prohibited', 'Only on Fridays', 'Only if the file is small'], 1, 'Removable Media Policy'),
                tf('cyber-m2-l1-q3', 'True or False: Disclosing a taxpayer audit report to an unauthorized relative is grounds for immediate termination and legal action.', 0, 'Compliance'),
                mcq('cyber-m2-l1-q4', 'Which classification tier applies to ongoing criminal tax fraud investigation dossiers?', ['Public', 'Internal Use', 'Secret / Restricted', 'Draft'], 2, 'Classification'),
                sa('cyber-m2-l1-s5', 'What is the full expansion of PII in information protection?', 'Personally Identifiable Information', 'Terminology'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Classifying and Redacting Sensitive PII Records',
                titleAm: 'ተግባራዊ ላብ፡ ሚስጥራዊ የግል መረጃዎችን መመደብ እና መደበቅ (Redaction)',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
You are asked to prepare a public statistical case summary based on an actual tax audit case.
1. Identify all PII fields (Taxpayer Name, TIN, Bank Account Number, Physical Address, Specific Asset Values).
2. Apply true redaction using Adobe Acrobat Redaction tools (not just black highlighter).
3. Sanitize metadata before publishing.`,
                contentAm: `### የላብ ሁኔታ
ከእውነተኛ የኦዲት መዝገብ ላይ የግል መረጃዎችን (ስም፣ TIN፣ የባንክ ቁጥር) በAdobe Acrobat Redaction መሳሪያ በመጠቀም ሙሉ በሙሉ ማጥፋት እና ማረጋገጥ።`,
                attachment: pdf('Sub-Lesson 2.1.1 - Data Redaction Practice Files.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.1.1 Check: Data Redaction Lab',
                  titleAm: 'ንዑስ ትምህርት 2.1.1 ማረጋገጫ፡ የመረጃ ማጥፋት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('cyber-m2-l1-s1-q1', 'Why is drawing a black rectangle over text in Word or PDF NOT secure redaction?', ['The underlying text can still be copied or extracted from the file', 'It turns the page blue', 'Printers run out of black ink', 'It deletes the font'], 0, 'Redaction Security'),
                    mcq('cyber-m2-l1-s1-q2', 'What tool permanently removes underlying pixels and text from a PDF document?', ['True Redaction tool', 'Black highlighter', 'Bold text', 'Font resize'], 0, 'PDF Tools'),
                    tf('cyber-m2-l1-s1-q3', 'True or False: Document metadata (author name, file creation path) should be inspected and sanitized before public release.', 0, 'Metadata Sanitization'),
                    mcq('cyber-m2-l1-s1-q4', 'Which field must ALWAYS be redacted from a public tax report?', ['The full 10-digit TIN and taxpayer bank account', 'The Ministry logo', 'The current year', 'The page number'], 0, 'Privacy Standards'),
                    sa('cyber-m2-l1-s1-q5', 'What process permanently deletes sensitive text and metadata from a published document?', 'Redaction', 'Data Sanitization'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '2.2 Security Incident Escalation & Response Protocols',
            titleAm: '2.2 የደህንነት አደጋ ሲከሰት የማሳወቅ እና ምላሽ አሰጣጥ ስነ-ስርዓት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 30,
            order: 1,
            contentEn: `## When an Attack Happens: Speed Matters
The first 60 minutes of a ransomware or credential breach dictate whether an infection is contained to one workstation or spreads across the entire Ministry network.

## Immediate First-Response Actions
1. **Disconnect from the Network**: physically unplug the ethernet cable and toggle Wi-Fi off immediately. Do NOT power off the computer (powering off destroys volatile RAM evidence needed by forensic investigators).
2. **Alert ICT Cyber Defense**: dial the emergency incident hotline \`+251-11-xxx-xxxx\` or use a clean secondary machine to notify \`soc@mor.gov.et\`.
3. **Preserve the Scene**: take a photo of any ransomware ransom note on screen. Do not attempt to pay ransom or download unofficial decryption tools.`,
            contentAm: `### ማጠቃለያ
አደጋ ሲከሰት የመጀመሪያው 60 ደቂቃ ወሳኝ ነው። የኔትወርክ ኬብል መንቀል እና ዋይፋይ ማጥፋት የመጀመሪያ እርምጃ ነው። ኮምፒውተሩን ሙሉ በሙሉ አለማጥፋት (RAM መረጃ እንዳይጠፋ) እና ወዲያውኑ ለICT Cyber Defense ማሳወቅ ያስፈልጋል።`,
            attachment: pdf('Lesson 2.2 - Incident Escalation SOP.pdf'),
            assessment: {
              titleEn: 'Lesson 2.2 Check: Incident Response',
              titleAm: 'ትምህርት 2.2 ማረጋገጫ፡ የአደጋ ምላሽ',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('cyber-m2-l2-q1', 'What is the very first physical action when noticing a ransomware screen locking your workstation?', ['Unplug the network cable and turn off Wi-Fi immediately', 'Restart the PC 10 times', 'Format your hard drive', 'Send a WhatsApp message to everyone'], 0, 'Containment'),
                mcq('cyber-m2-l2-q2', 'Why should an infected computer NOT be turned off or unplugged from power during an active investigation?', ['Because the screen is pretty', 'Powering off erases volatile memory (RAM) where active malware decryption keys and forensic clues exist', 'It ruins the power strip', 'It cancels the antivirus license'], 1, 'Digital Forensics'),
                tf('cyber-m2-l2-q3', 'True or False: Paying ransom demands using government funds is strictly prohibited under federal regulations.', 0, 'Incident Policy'),
                mcq('cyber-m2-l2-q4', 'Who should lead containment and remediation once an incident is reported?', ['The dedicated Cyber Security Incident Response Team (CSIRT / SOC)', 'The janitorial department', 'External social media influencers', 'The taxpayer waiting in the lobby'], 0, 'Incident Roles'),
                sa('cyber-m2-l2-q5', 'What is the physical first step to isolate an infected workstation from the local network?', 'Unplug network cable', 'Containment'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Executing First-Response Actions in a Breach Incident',
                titleAm: 'ተግባራዊ ላብ፡ በአደጋ ጊዜ የመጀመሪያ ምላሽ እርምጃዎችን መተግበር',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
A simulated workstation begins displaying unexpected encrypted file extensions (.locked) and an unknown command prompt window pops up.
1. Perform immediate network isolation using the virtual interface disconnect switch.
2. Complete the standardized MoR Incident Notification Form (Date, Time, IP, Symptoms observed, Affected files).
3. Submit the ticket to the simulated SOC incident portal.`,
                contentAm: `### የላብ ሁኔታ
በኮምፒውተር ላይ ፋይሎች ሲቆለፉ የኔትወርክ ግንኙነትን ወዲያውኑ ማቋረጥ፣ የአደጋ ሪፖርት ቅጽ መሙላት እና ለደህንነት ቡድን ማሳወቅ።`,
                attachment: pdf('Sub-Lesson 2.2.1 - Incident Simulation Playbook.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.2.1 Check: Incident Simulation Lab',
                  titleAm: 'ንዑስ ትምህርት 2.2.1 ማረጋገጫ፡ የአደጋ ምላሽ ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('cyber-m2-l2-s1-q1', 'What critical details must be documented on the Incident Notification Form?', ['Exact timestamp, machine IP/hostname, and observed symptoms', 'The weather outside', 'The officer favorite movie', 'Staff shoe sizes'], 0, 'Incident Reporting'),
                    mcq('cyber-m2-l2-s1-q2', 'What team coordinates the national response to severe cyber incidents across federal agencies in Ethiopia?', ['INSA (Information Network Security Administration)', 'Ministry of Agriculture', 'National Postal Service', 'Local Water Authority'], 0, 'Federal Coordination'),
                    tf('cyber-m2-l2-s1-q3', 'True or False: Speed of isolation is the single most important factor preventing lateral malware spread inside the Ministry datacenter.', 0, 'Lateral Movement'),
                    mcq('cyber-m2-l2-s1-q4', 'What should you do with a suspicious USB drive found in the Ministry parking lot or hallway?', ['Plug it into your workstation to see who owns it', 'Deliver it directly to ICT Security without plugging it in', 'Take it home for personal use', 'Throw it in the river'], 1, 'Physical Vectors'),
                    sa('cyber-m2-l2-s1-q5', 'What Ethiopian federal agency oversees national cybersecurity and incident defense?', 'INSA', 'Federal Agency'),
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: Cybersecurity Certification',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የሳይበር ደህንነት ብቃት ሰርተፊኬት ምዘና',
      passingScore: 75,
      timeLimitMinutes: 30,
      questions: [
        mcq('cyber-fn-q1', 'What is the primary indicator of a phishing email?', ['Urgent pressure to click links or download attachments, often with mismatched sender domains', 'Professional signature block with correct phone numbers', 'Email sent during regular office hours', 'Plain text format'], 0, 'Threat Identification'),
        mcq('cyber-fn-q2', 'Under INSA guidelines, what is the best practice for workstation security when leaving your desk?', ['Lock the workstation immediately using Windows Key + L', 'Leave programs open so they stay fast', 'Turn off the monitor only', 'Ask a stranger to watch your screen'], 0, 'Physical Hygiene'),
        tf('cyber-fn-q3', 'True or False: MFA Number Matching requires entering a 2-digit number into the authenticator app to defeat push fatigue attacks.', 0, 'Authentication'),
        mcq('cyber-fn-q4', 'What is the first step when a workstation shows signs of malware infection?', ['Disconnect from ethernet and Wi-Fi immediately without powering off', 'Format the hard drive', 'Restart the computer', 'Ignore it until tomorrow'], 0, 'Incident Containment'),
        sa('cyber-fn-q5', 'What acronym represents the Information Network Security Administration?', 'INSA', 'Federal Standards'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 5. PUBLISHED: Management of Risk (M_o_R®) Foundation
  // ─────────────────────────────────────────────────────────
  {
    code: 'MOR101',
    titleEn: 'Management of Risk (M_o_R®) Foundation in Revenue Operations',
    titleAm: 'በገቢዎች ስራዎች የአደጋ እና ስጋት አስተዳደር (M_o_R®) መሰረታዊ መርሆዎች',
    descriptionEn:
      'A comprehensive foundation in public sector risk governance, probabilistic risk modeling, mitigation registers, and systematic risk response planning for revenue administrators.',
    descriptionAm: 'የመንግስት ገቢዎች ስራዎችን ስጋት በመለየት፣ በመተንተን፣ በማስተዳደር እና አደጋዎችን አስቀድሞ በመከላከል ረገድ የተሟላ እውቀት እና ክህሎት የሚሰጥ ስልጠና።',
    level: CourseLevel.ADVANCED,
    status: CourseStatus.PUBLISHED,
    estimatedHours: 35,
    category: 'Governance, Risk & Compliance',
    department: 'Risk Management & Strategic Compliance Directorate',
    targetAudience: 'Risk officers, senior revenue analysts, branch controllers, and operations leaders',
    deliveryMethod: 'Interactive blended learning: rich self-paced modules, scenario laboratories, and final certification exam',
    objectivesEn:
      'Master the M_o_R framework, conduct rigorous qualitative and quantitative risk assessments, build and maintain institutional risk registers, and design resilient treatment plans.',
    objectivesAm: 'የM_o_R ማዕቀፍን ጠንቅቆ ማወቅ፣ የአደጋ ግምገማዎችን ማከናወን፣ ተቋማዊ የስጋት መዝገብ መገንባት እና ውጤታማ የመከላከያ እቅዶችን ማዘጋጀት።',
    prerequisites: 'Basic knowledge of tax administration procedures and organizational governance',
    approvalComments: 'Approved by Curriculum Accreditation Committee. Fully compliant with international M_o_R® standards.',
    modules: [
      {
        titleEn: 'Module 1: Principles, Approaches & Governance Architecture of Risk',
        titleAm: 'ሞዱል 1፡ የስጋት አስተዳደር መሰረታዊ መርሆዎች፣ አቀራረቦች እና የአስተዳደር መዋቅር',
        descriptionEn: 'Establish the core governance foundations, statutory risk mandates, and three-lines-of-defense model for revenue administration.',
        descriptionAm: 'የስጋት አስተዳደር መርሆዎችን፣ ህጋዊ ማዕቀፎችን እና የሶስቱን የመከላከያ መስመሮች ሞዴል በሚኒስቴሩ ስራዎች ውስጥ መተግበር።',
        objectivesEn: 'Define M_o_R core principles, establish organizational risk appetite, and articulate governance responsibilities.',
        objectivesAm: 'የM_o_R መርሆዎችን መረዳት፣ የተቋሙን የስጋት ተቀባይነት ወሰን መወሰን እና የአስተዳደር ሀላፊነቶችን መለየት።',
        order: 0,
        attachment: pdf('Module 1 - M_o_R Governance Architecture.pdf'),
        assessment: {
          titleEn: 'Module 1 Knowledge Check: Governance & Architecture',
          titleAm: 'ሞዱል 1 የእውቀት ማረጋገጫ፡ አስተዳደር እና መዋቅር',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('mor-m1-q1', 'According to M_o_R principles, what is the fundamental definition of risk?', ['Only negative catastrophic occurrences', 'An uncertain event or set of events that, should it occur, will have an effect on the achievement of objectives', 'A planned investment loss', 'Any financial audit error'], 1, 'Risk Definition'),
            mcq('mor-m1-q2', 'Which line of defense in the Three Lines model owns day-to-day risk management in operational branches?', ['First Line of Defense (Operational Management)', 'Second Line of Defense (Risk & Compliance Directorate)', 'Third Line of Defense (Internal Audit)', 'External Parliamentary Audit'], 0, 'Three Lines of Defense'),
            tf('mor-m1-q3', 'True or False: Risks in modern risk management can represent both threats (downside) and opportunities (upside).', 0, 'Risk Principles'),
            mcq('mor-m1-q4', 'What is "Risk Appetite"?', ['The amount of money spent on risk consultants', 'The amount and type of risk an organization is willing to pursue or retain in pursuit of its objectives', 'The number of insurance policies purchased', 'A zero-tolerance rule for all activities'], 1, 'Risk Appetite'),
            sa('mor-m1-q5', 'What model divides risk responsibilities into Operational, Compliance, and Internal Audit functions?', 'Three Lines of Defense', 'Governance Models'),
          ],
        },
        lessons: [
          {
            titleEn: '1.1 Core Principles of Organizational Risk Management',
            titleAm: '1.1 የተቋማዊ ስጋት አስተዳደር ቁልፍ መርሆዎች',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            contentEn: `## Why Systematic Risk Governance is Non-Negotiable
Revenue authorities operate in high-uncertainty environments: changing economic dynamics, legislative shifts, digital transformation challenges, and tax evasion threats.

## The Four Core Perspectives
1. **Strategic Risk**: Long-term directional goals, policy mandates, and macroeconomic shifts.
2. **Program Risk**: Coordinated multi-project initiatives, such as the digital tax-filing rollout.
3. **Project Risk**: Time, cost, and scope deliverables for specific single endeavors.
4. **Operational Risk**: Day-to-day revenue collection, audit workflows, IT systems availability, and counter fraud.

## Risk Principles
- **Aligns with Objectives**: Risk management is not an academic exercise; it exists solely to protect and enable the achievement of Ministry goals.
- **Informs Decision Making**: No major policy or technology expenditure is approved without documented risk evaluation.
- **Continual Improvement**: Lessons learned from past non-compliance and audit failures directly shape future controls.`,
            contentAm: `### ማጠቃለያ
ስጋት አስተዳደር ተቋማዊ ግቦችን ለማሳካት ወሳኝ ነው። ስልታዊ፣ የፕሮግራም፣ የፕሮጀክት እና የስራ ሂደት ስጋቶች ተብሎ በ4 አቅጣጫ ይመደባል። ቀጣይነት ያለው መሻሻል እና ውሳኔ ሰጪነትን መደገፍ ዋና መርሆዎቹ ናቸው።`,
            attachment: pdf('Lesson 1.1 - Risk Principles & Frameworks.pdf'),
            assessment: {
              titleEn: 'Lesson 1.1 Check: Risk Principles',
              titleAm: 'ትምህርት 1.1 ማረጋገጫ፡ የስጋት መርሆዎች',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('mor-m1-l1-q1', 'Which of the four M_o_R perspectives focuses on day-to-day tax collection operations?', ['Strategic Perspective', 'Operational Perspective', 'Program Perspective', 'Parliamentary Perspective'], 1, 'Perspectives'),
                mcq('mor-m1-l1-q2', 'What is the relationship between risk management and organizational decision-making?', ['Risk management exists in isolation from decisions', 'Risk assessment should directly inform and precede major decisions', 'Decisions are made first, then risks are fabricated', 'Risk management replaces all management decisions'], 1, 'Governance'),
                tf('mor-m1-l1-q3', 'True or False: Strategic risks typically have longer horizons than operational risks.', 0, 'Risk Perspectives'),
                mcq('mor-m1-l1-q4', 'Which principle dictates that risk processes should be tailored to the specific context of the organization?', ['One size fits all', 'Fits the Context', 'Zero Tolerance', 'Maximum Bureaucracy'], 1, 'Principles'),
                sa('mor-m1-l1-q5', 'Which risk perspective deals with long-term macroeconomic and strategic policy objectives?', 'Strategic Perspective', 'Perspectives'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Constructing a Ministry Risk Appetite Statement',
                titleAm: 'ተግባራዊ ላብ፡ የተቋማዊ ስጋት ተቀባይነት ወሰን (Risk Appetite) መግለጫ ማዘጋጀት',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                contentEn: `## Lab Scenario
You are assisting the Risk Directorate in defining the Risk Appetite Statement across three categories:
1. **Tax Law Compliance**: Zero tolerance for deliberate corruption or statutory non-compliance.
2. **Digital Innovation**: Moderate tolerance for piloting new automated filing apps and taxpayer-facing kiosks.
3. **Operational Expenditure**: Conservative tolerance with tight deviation thresholds (< 3% variance).

## Deliverable
Formulate a 1-page Risk Appetite Framework establishing specific threshold triggers and escalation criteria for each category.`,
                contentAm: `### የላብ ሁኔታ
በሶስት ዋና ዋና ዘርፎች (የግብር ህግ ተገዢነት፣ የዲጂታል ፈጠራ እና የበጀት ወጪ) የተቋሙን የስጋት ተቀባይነት ወሰን ማዘጋጀት እና የማሳወቂያ ደረጃዎችን መወሰን።`,
                attachment: pdf('Sub-Lesson 1.1.1 - Risk Appetite Workshop Template.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.1.1 Check: Risk Appetite Lab',
                  titleAm: 'ንዑስ ትምህርት 1.1.1 ማረጋገጫ፡ የስጋት ተቀባይነት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('mor-m1-l1-s1-q1', 'What is the appropriate risk appetite for statutory non-compliance in a revenue authority?', ['Very High', 'Zero Tolerance (Averse)', 'Moderate', 'Unlimited'], 1, 'Risk Appetite Levels'),
                    mcq('mor-m1-l1-s1-q2', 'What is a "Risk Tolerance Threshold"?', ['The absolute maximum variance an organization will accept before automatic escalation', 'A staff holiday policy', 'A suggestion with no enforcement', 'The bank interest rate'], 0, 'Thresholds'),
                    tf('mor-m1-l1-s1-q3', 'True or False: An organization can have high risk appetite for digital experimentation while maintaining zero tolerance for corruption.', 0, 'Appetite Variation'),
                    mcq('mor-m1-l1-s1-q4', 'Who holds ultimate accountability for approving the organizational Risk Appetite Statement?', ['Executive Leadership / Governing Board', 'Junior entry clerks', 'External vendors', 'The public library'], 0, 'Governance Approval'),
                    sa('mor-m1-l1-s1-q5', 'What is the term for the quantified boundaries beyond which risks must be escalated to the Director General?', 'Risk Tolerance Threshold', 'Thresholds'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '1.2 Roles, Responsibilities & the Three Lines of Defense',
            titleAm: '1.2 ሚናዎች፣ ሀላፊነቶች እና የሶስቱ የመከላከያ መስመሮች ሞዴል',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            contentEn: `## Structure Prevents Conflict of Interest
Risk management cannot succeed if the same team executing transactions is also the sole team inspecting them.

## The Three Lines Model in Action
- **Line 1 - Frontline Operational Managers**: Branch controllers, tax auditors, counter supervisors. They own and manage risks directly in daily operations.
- **Line 2 - Enterprise Risk & Compliance**: The central Risk Directorate. They provide the framework, challenge assessments, monitor registers, and train Line 1.
- **Line 3 - Internal Audit**: Fully independent assurance reporting directly to the Audit Committee. They verify whether Line 1 and Line 2 controls are operating effectively.`,
            contentAm: `### ማጠቃለያ
የሶስቱ የመከላከያ መስመሮች ሞዴል የስራ ግጭትን ያስወግዳል። የመጀመሪያው መስመር ስጋትን ይቆጣጠራል፤ ሁለተኛው መስመር ማዕቀፍ እና ክትትል ያደርጋል፤ ሶስተኛው መስመር (ውስጣዊ ኦዲት) ገለልተኛ ማረጋገጫ ይሰጣል።`,
            attachment: pdf('Lesson 1.2 - Three Lines of Defense in Tax Administration.pdf'),
            assessment: {
              titleEn: 'Lesson 1.2 Check: Three Lines of Defense',
              titleAm: 'ትምህርት 1.2 ማረጋገጫ፡ የሶስቱ መስመሮች ሞዴል',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('mor-m1-l2-q1', 'Who makes up the Third Line of Defense?', ['Frontline cashiers', 'Independent Internal Audit', 'External marketing consultants', 'Social media moderators'], 1, 'Three Lines'),
                mcq('mor-m1-l2-q2', 'What is the primary role of the Second Line of Defense (Risk Directorate)?', ['To execute daily tax assessments', 'To provide oversight, governance frameworks, and independent challenge to operations', 'To repair computer keyboards', 'To approve employee annual leave'], 1, 'Second Line Duties'),
                tf('mor-m1-l2-q3', 'True or False: Line 1 operational managers own the day-to-day responsibility for managing risks in their branch.', 0, 'Risk Ownership'),
                mcq('mor-m1-l2-q4', 'To whom does Internal Audit (Line 3) report to maintain organizational independence?', ['Branch counter supervisors', 'The Audit Committee / Board of Directors', 'Vendors', 'Nobody'], 1, 'Audit Independence'),
                sa('mor-m1-l2-q5', 'Which line of defense provides independent and objective assurance on internal control effectiveness?', 'Third Line', 'Three Lines'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Assigning Risk Ownership in a Branch Office',
                titleAm: 'ተግባራዊ ላብ፡ በቅርንጫፍ ቢሮ የስጋት ባለቤትነትን እና ሀላፊነትን መመደብ',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
Given 6 identified operational risks in a regional customs and tax branch:
1. Document fraud in import declarations.
2. IT cash register network outages.
3. Bribery solicitation during field audit.
4. Loss of archived paper tax dossiers.
5. Inaccurate tax clearance certificates.
6. Cashier shortages.

## Task
Assign a designated **Risk Owner** and **Action Owner** for each risk in accordance with the Three Lines model, and define mandatory reporting frequencies.`,
                contentAm: `### የላብ ሁኔታ
በስድስት ተለይተው በታወቁ የቅርንጫፍ ስጋቶች ላይ የስጋት ባለቤት እና የተግባር ፈጻሚ በመመደብ የሪፖርት ማቅረቢያ ጊዜያትን ማዘጋጀት።`,
                attachment: pdf('Sub-Lesson 1.2.1 - Branch Risk Delegation Matrix.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 1.2.1 Check: Risk Ownership Lab',
                  titleAm: 'ንዑስ ትምህርት 1.2.1 ማረጋገጫ፡ የስጋት ባለቤትነት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('mor-m1-l2-s1-q1', 'What is the distinction between a Risk Owner and an Action Owner?', ['A Risk Owner has overall accountability for the risk; an Action Owner executes specific control actions', 'They are strictly the same person', 'Action Owners only work in IT', 'Risk Owners do not have any responsibilities'], 0, 'Ownership Concepts'),
                    mcq('mor-m1-l2-s1-q2', 'Who is the most appropriate Risk Owner for "Bribery solicitation during field audit"?', ['Head of Audit Directorate / Regional Audit Supervisor', 'The office cleaner', 'The external taxpayer being audited', 'Junior intern'], 0, 'Role Allocation'),
                    tf('mor-m1-l2-s1-q3', 'True or False: Every identified risk must have an assigned named individual as Risk Owner to ensure accountability.', 0, 'Risk Accountability'),
                    mcq('mor-m1-l2-s1-q4', 'How often should operational branch risk registers be reviewed and updated at minimum?', ['Once every ten years', 'Monthly or quarterly depending on risk volatility', 'Only after a major scandal occurs', 'Never'], 1, 'Review Cadence'),
                    sa('mor-m1-l2-s1-q5', 'What role holds overall accountability for managing a specific risk and its treatments?', 'Risk Owner', 'Risk Roles'),
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        titleEn: 'Module 2: Risk Identification, Assessment & Register Maintenance',
        titleAm: 'ሞዱል 2፡ ስጋትን መለየት፣ መገምገም እና የስጋት መዝገብ (Risk Register) አስተዳደር',
        descriptionEn: 'Techniques for uncovering emerging risks, qualitative vs quantitative scoring, probability-impact matrices, and treatment formulation.',
        descriptionAm: 'አዳዲስ ስጋቶችን መለየት፣ የመከሰት እድል እና ተጽዕኖ ማትሪክስ ስሌት እና የመፍትሄ እቅድ ማዘጋጀት።',
        objectivesEn: 'Conduct risk discovery workshops, calculate inherent and residual risk scores, and populate complete institutional risk registers.',
        objectivesAm: 'የስጋት ወርክሾፖችን ማካሄድ፣ የቀሪ ስጋት ስሌት ማከናወን እና የተቋሙን የስጋት መዝገብ ማደራጀት።',
        order: 1,
        attachment: pdf('Module 2 - Risk Register & Assessment Standards.pdf'),
        assessment: {
          titleEn: 'Module 2 Knowledge Check: Assessment & Registers',
          titleAm: 'ሞዱል 2 የእውቀት ማረጋገጫ፡ ምዘና እና መዝገቦች',
          passingScore: 70,
          timeLimitMinutes: 15,
          questions: [
            mcq('mor-m2-q1', 'What is "Inherent Risk"?', ['The risk remaining after controls are applied', 'The exposure arising from risk before taking into account any mitigating controls', 'A risk that is completely impossible', 'A mathematical constant'], 1, 'Risk Terminology'),
            mcq('mor-m2-q2', 'What is "Residual Risk"?', ['The risk that remains after risk responses and controls have been implemented', 'The starting risk level', 'Risk that only affects customers', 'A risk that has already occurred'], 0, 'Residual Risk'),
            tf('mor-m2-q3', 'True or False: In a 5x5 Probability-Impact matrix, an event with Probability 5 and Impact 5 represents the highest risk tier.', 0, 'Heat Maps'),
            mcq('mor-m2-q4', 'Which of the following represents a primary risk response strategy?', ['Avoid, Reduce, Fallback, Transfer, Share, Accept', 'Ignore, Delete, Hide, Deny', 'Print, File, Forget', 'Wait and Hope'], 0, 'Risk Responses'),
            sa('mor-m2-q5', 'What term describes the remaining risk level after mitigation controls have been implemented?', 'Residual Risk', 'Risk Concepts'),
          ],
        },
        lessons: [
          {
            titleEn: '2.1 Qualitative & Quantitative Risk Scoring',
            titleAm: '2.1 የጥራት እና የመጠን የስጋት ምዘና ስሌት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            contentEn: `## Moving from Intuition to Structured Scoring
Vague statements like "this might be a big problem" cannot be prioritized. Structured risk assessment rates both **Probability (Likelihood)** and **Impact (Severity)**.

## The 5x5 Scoring Scale
- **Probability**: 1 (Rare < 10%), 2 (Unlikely 10-30%), 3 (Possible 30-60%), 4 (Likely 60-85%), 5 (Almost Certain > 85%).
- **Impact**: 1 (Negligible), 2 (Minor), 3 (Moderate), 4 (Major), 5 (Catastrophic: statutory disruption or revenue loss > 50M ETB).
- **Risk Score**: \`Probability x Impact\` (Ranges from 1 to 25).
- **Risk Tiers**: Low (1-6, Green), Medium (8-12, Amber), High (15-25, Red).`,
            contentAm: `### ማጠቃለያ
ስጋት በይሆናልነት (1-5) እና በተጽዕኖ (1-5) ተባዝቶ ይሰላል። ከ1 እስከ 6 አነስተኛ (አረንጓዴ)፣ ከ8 እስከ 12 መካከለኛ (ቢጫ) እና ከ15 እስከ 25 ከፍተኛ (ቀይ) ደረጃዎች ናቸው።`,
            attachment: pdf('Lesson 2.1 - Qualitative Scoring & Impact Criteria.pdf'),
            assessment: {
              titleEn: 'Lesson 2.1 Check: Risk Scoring',
              titleAm: 'ትምህርት 2.1 ማረጋገጫ፡ የስጋት ስሌት',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('mor-m2-l1-q1', 'If an event has a Probability rating of 4 and an Impact rating of 4, what is the combined Risk Score?', ['8', '16 (High Risk Tier)', '0', '44'], 1, 'Scoring Math'),
                mcq('mor-m2-l1-q2', 'What criteria should define "Catastrophic Impact" in a regional revenue authority?', ['Minor delay in a weekly staff meeting', 'Major revenue loss, complete IT system failure, or severe legal breach', 'Running out of paper clips', 'A rainy morning'], 1, 'Impact Criteria'),
                tf('mor-m2-l1-q3', 'True or False: Quantitative risk analysis expresses risk exposure in numerical or financial values (e.g. Estimated Monetary Value).', 0, 'Analysis Types'),
                mcq('mor-m2-l1-q4', 'What is Expected Monetary Value (EMV)?', ['Probability multiplied by the financial impact of the event', 'The annual salary of the risk officer', 'The cost of insurance premiums', 'The exchange rate'], 0, 'Quantitative Modeling'),
                sa('mor-m2-l1-q5', 'What is the product of Probability rating 4 multiplied by Impact rating 5?', '20', 'Scoring Math'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Building a 5x5 Probability-Impact Heat Map',
                titleAm: 'ተግባራዊ ላብ፡ 5x5 የመከሰት እድል እና ተጽዕኖ የሙቀት ካርታ (Heat Map) መገንባት',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                contentEn: `## Lab Scenario
Plot 5 identified tax compliance risks onto a 5x5 matrix:
1. Risk A (P:4, I:5, Major corporate VAT evasion).
2. Risk B (P:2, I:2, Delays in office supply delivery).
3. Risk C (P:5, I:3, High turnover of senior tax audit accountants).
4. Risk D (P:3, I:4, Core SigTas system unplanned outage during tax deadline week).
5. Risk E (P:1, I:5, Severe earthquake damaging regional revenue archive).

## Deliverable
Construct the colored heat map and identify which 2 risks require immediate Board-level escalation.`,
                contentAm: `### የላብ ሁኔታ
አምስት የስጋት ሁኔታዎችን በ5x5 ማትሪክስ ላይ መመደብ፣ የሙቀት ካርታ መገንባት እና አፋጣኝ የአመራር ውሳኔ የሚያስፈልጋቸውን ሁለት ስጋቶች መለየት።`,
                attachment: pdf('Sub-Lesson 2.1.1 - Heat Map Template & Exercise.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.1.1 Check: Heat Map Lab',
                  titleAm: 'ንዑስ ትምህርት 2.1.1 ማረጋገጫ፡ የሙቀት ካርታ ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('mor-m2-l1-s1-q1', 'Which risk in the lab has the highest score (20)?', ['Risk A (P:4, I:5)', 'Risk B (P:2, I:2)', 'Risk C (P:5, I:3)', 'Risk E (P:1, I:5)'], 0, 'Risk Ranking'),
                    mcq('mor-m2-l1-s1-q2', 'Where do risks requiring immediate executive intervention fall on the heat map?', ['The red upper-right quadrant (High Probability, High Impact)', 'The bottom-left green quadrant', 'Outside the borders', 'In the footnotes'], 0, 'Heat Map Tiers'),
                    tf('mor-m2-l1-s1-q3', 'True or False: Low-probability, high-impact events like natural disasters often warrant contingency/fallback planning rather than everyday prevention.', 0, 'Treatment Strategies'),
                    mcq('mor-m2-l1-s1-q4', 'What visual tool plots probability against impact using colored zones?', ['5x5 Probability-Impact Heat Map', 'Pie chart', 'Scatter plot without axes', 'Word cloud'], 0, 'Visualization'),
                    sa('mor-m2-l1-s1-q5', 'In which quadrant (color) do the highest-priority operational risks reside?', 'Red', 'Heat Map Tiers'),
                  ],
                },
              },
            ],
          },
          {
            titleEn: '2.2 Designing Treatment Plans & Contingency Responses',
            titleAm: '2.2 የመፍትሄ እቅዶች እና የአደጋ ጊዜ ምላሾችን ማዘጋጀት',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            contentEn: `## Selecting the Right Response Strategy
Identifying a risk without an actionable treatment plan is useless. M_o_R defines clear response categories.

## Response Options
- **Avoid**: Change the plan to eliminate the threat entirely (e.g. cancel a high-risk manual payment channel).
- **Reduce (Mitigate)**: Take proactive measures to lower probability or impact (e.g. implement automated dual-authorization).
- **Fallback (Contingency)**: Prepare an action plan triggered only if the risk occurs (e.g. backup power generator).
- **Transfer**: Shift financial impact to a third party (e.g. insurance policy, outsourced security warranty).
- **Share**: Partner with other agencies or private vendors to share risk and rewards.
- **Accept**: Consciously retain the risk if the cost of mitigation exceeds potential loss.`,
            contentAm: `### ማጠቃለያ
ስጋትን ለማስተናገድ ማስወገድ (Avoid)፣ መቀነስ (Reduce)፣ የአደጋ ጊዜ እቅድ (Fallback)፣ ማስተላለፍ (Transfer)፣ መጋራት (Share) እና መቀበል (Accept) የተባሉ ስልቶች ጥቅም ላይ ይውላሉ።`,
            attachment: pdf('Lesson 2.2 - Risk Treatment & Contingency Manual.pdf'),
            assessment: {
              titleEn: 'Lesson 2.2 Check: Risk Treatments',
              titleAm: 'ትምህርት 2.2 ማረጋገጫ፡ የስጋት መፍትሄዎች',
              passingScore: 70,
              timeLimitMinutes: 10,
              questions: [
                mcq('mor-m2-l2-q1', 'Which risk response involves purchasing an insurance policy?', ['Transfer', 'Avoid', 'Accept', 'Share'], 0, 'Response Types'),
                mcq('mor-m2-l2-q2', 'Installing automated secondary data replication across two separate datacenters is an example of what response?', ['Reduce (Mitigate)', 'Ignore', 'Accept', 'Cancel project'], 0, 'Risk Reduction'),
                tf('mor-m2-l2-q3', 'True or False: "Accepting" a risk should only be done formally with explicit signoff from the designated authority.', 0, 'Risk Acceptance'),
                mcq('mor-m2-l2-q4', 'What is a "Contingency / Fallback Plan"?', ['A plan executed only when a predefined risk trigger event occurs', 'The daily routine schedule', 'A resignation letter', 'An office picnic checklist'], 0, 'Contingency'),
                sa('mor-m2-l2-q5', 'What strategy transfers the financial burden of a risk to an insurer or third party?', 'Transfer', 'Response Types'),
              ],
            },
            subLessons: [
              {
                titleEn: 'Practical Lab: Formulating Mitigation Controls for Tax Evasion Risks',
                titleAm: 'ተግባራዊ ላብ፡ የታክስ ማጭበርበር ስጋቶችን የመከላከያ ቁጥጥር እቅድ ማዘጋጀት',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                contentEn: `## Lab Scenario
You are assigned to draft a comprehensive Risk Treatment Action Plan for the risk: "Under-declaration of commercial import duties through fraudulent invoice documentation."
1. Identify 3 preventive controls (e.g. mandatory digital pre-clearance, cross-border price database matching).
2. Identify 2 detective controls (e.g. post-clearance random audits, automated customs anomaly algorithms).
3. Identify 1 corrective control (e.g. immediate asset freezing and penalty assessment).
4. Calculate the anticipated reduction from Inherent Risk Score (20) to Residual Risk Score (6).`,
                contentAm: `### የላብ ሁኔታ
በአስመጪዎች የክፍያ ሰነድ ማጭበርበር ስጋት ላይ መከላከያ፣ መርማሪ እና አራሚ ቁጥጥሮችን ማዘጋጀት እና የቀሪ ስጋት ውጤት ከ20 ወደ 6 ዝቅ እንዲል ማድረግ።`,
                attachment: pdf('Sub-Lesson 2.2.1 - Tax Compliance Mitigation Plan.pdf'),
                assessment: {
                  titleEn: 'Sub-Lesson 2.2.1 Check: Treatment Formulation Lab',
                  titleAm: 'ንዑስ ትምህርት 2.2.1 ማረጋገጫ፡ የመፍትሄ ዝግጅት ላብ',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('mor-m2-l2-s1-q1', 'Which of the following is a PREVENTIVE control against invoice fraud?', ['Mandatory digital pre-clearance validation before goods depart', 'Post-clearance audit 6 months later', 'Prosecution in court', 'Writing a newspaper article'], 0, 'Control Classification'),
                    mcq('mor-m2-l2-s1-q2', 'What is the anticipated effect of effective controls on the risk score?', ['It reduces inherent risk down to an acceptable residual risk level', 'It increases risk to maximum', 'It makes risk impossible to calculate', 'It has zero effect'], 0, 'Residual Reduction'),
                    tf('mor-m2-l2-s1-q3', 'True or False: Detective controls identify non-compliance that has already bypassed preventive controls.', 0, 'Control Types'),
                    mcq('mor-m2-l2-s1-q4', 'What is the formula for calculating Residual Risk?', ['Inherent Risk minus the effect of Control Measures', 'Impact multiplied by 100', 'Total revenue divided by employees', 'Zero'], 0, 'Risk Math'),
                    sa('mor-m2-l2-s1-q5', 'What type of control prevents a violation from occurring before it happens?', 'Preventive', 'Control Types'),
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
    finalAssessment: {
      titleEn: 'Final Comprehensive Assessment: M_o_R Foundation Certification',
      titleAm: 'የኮርስ ማጠቃለያ ፈተና፡ የM_o_R የአደጋ እና ስጋት አስተዳደር ማረጋገጫ ምዘና',
      passingScore: 75,
      timeLimitMinutes: 35,
      questions: [
        mcq('mor-fn-q1', 'What is the primary objective of Management of Risk (M_o_R)?', ['To eliminate all business activities that carry any uncertainty', 'To support informed decision making and enhance organizational resilience through systematic risk management', 'To create bureaucratic paperwork', 'To guarantee 100% tax collection without fail'], 1, 'M_o_R Core'),
        mcq('mor-fn-q2', 'In the Three Lines model, who has direct operational ownership of risk controls?', ['The frontline operational management (Line 1)', 'External consultants', 'The news media', 'The Board Audit Committee only'], 0, 'Governance Model'),
        tf('mor-fn-q3', 'True or False: Inherent risk refers to risk exposure before considering the effect of mitigating internal controls.', 0, 'Risk Concepts'),
        mcq('mor-fn-q4', 'Which treatment strategy shifts financial exposure to a third party such as an insurance underwriter?', ['Transfer', 'Avoid', 'Reduce', 'Accept'], 0, 'Treatment Strategies'),
        sa('mor-fn-q5', 'What is the term for the risk level that remains after all mitigation responses and internal controls have been applied?', 'Residual Risk', 'Risk Terminology'),
      ],
    },
  },
];

// ──────────────────────────────────────────────────────────
// Main execution runner
// ──────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  // 1. Seed system permissions and roles
  console.log('🔐 Seeding system permissions and role matrix...');
  await seedPermissions(prisma);

  // 2. Upsert Demo Accounts
  console.log('👥 Ensuring demo accounts exist and have updated credentials...');
  const demoPasswordHash = await bcrypt.hash('password', BCRYPT_ROUNDS);
  const institutionalPasswordHash = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);

  const demoAccounts = [
    { email: 'sadministrator@gmail.com', firstName: 'Sami', lastName: 'Admin', role: RoleName.SYSTEM_ADMIN },
    { email: 'tadministrator@gmail.com', firstName: 'Aisha', lastName: 'Mohammed', role: RoleName.TRAINING_ADMIN },
    { email: 'owner@gmail.com', firstName: 'Bereket', lastName: 'Tadesse', role: RoleName.COURSE_OWNER },
    { email: 'approver@gmail.com', firstName: 'Selam', lastName: 'Hailu', role: RoleName.CONTENT_APPROVER },
    { email: 'trainer@gmail.com', firstName: 'Kebede', lastName: 'Alem', role: RoleName.TRAINER },
    { email: 'learner@gmail.com', firstName: 'Meron', lastName: 'Kassa', role: RoleName.LEARNER },
  ];

  const institutionalAccounts = [
    { email: 'system.admin@mor.gov.et', firstName: 'Sami', lastName: 'Admin', role: RoleName.SYSTEM_ADMIN },
    { email: 'training.admin@mor.gov.et', firstName: 'Aisha', lastName: 'Mohammed', role: RoleName.TRAINING_ADMIN },
    { email: 'owner@mor.gov.et', firstName: 'Bereket', lastName: 'Tadesse', role: RoleName.COURSE_OWNER },
    { email: 'approver@mor.gov.et', firstName: 'Selam', lastName: 'Hailu', role: RoleName.CONTENT_APPROVER },
    { email: 'trainer@mor.gov.et', firstName: 'Kebede', lastName: 'Alem', role: RoleName.TRAINER },
    { email: 'learner1@mor.gov.et', firstName: 'Meron', lastName: 'Kassa', role: RoleName.LEARNER },
  ];

  const userMap: Record<string, string> = {};

  for (const d of demoAccounts) {
    let user = await prisma.user.findUnique({ where: { email: d.email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: demoPasswordHash,
          isActive: true,
          registrationStatus: ApprovalStatus.APPROVED,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: d.email,
          password: demoPasswordHash,
          firstName: d.firstName,
          lastName: d.lastName,
          isActive: true,
          registrationStatus: ApprovalStatus.APPROVED,
          roles: {
            create: { role: d.role },
          },
        },
      });
    }
    userMap[d.email] = user.id;
    console.log(`  ✓ Demo User: ${d.email} (${d.role})`);
  }

  for (const u of institutionalAccounts) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          password: institutionalPasswordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          isActive: true,
          registrationStatus: ApprovalStatus.APPROVED,
          roles: {
            create: { role: u.role },
          },
        },
      });
    }
    userMap[u.email] = user.id;
  }

  const ownerId = userMap['owner@gmail.com'];
  const approverId = userMap['approver@gmail.com'];
  const trainerId = userMap['trainer@gmail.com'];
  const learnerId = userMap['learner@gmail.com'];

  // 3. Remove existing course seed data cleanly
  console.log('🗑️  Removing existing courses and cascading curriculum data...');
  await prisma.course.deleteMany({});
  await prisma.questionBankQuestion.deleteMany({});

  // 4. Seed the 5 comprehensive courses
  console.log('📚 Seeding 5 comprehensive courses across all lifecycle statuses...');

  for (const c of courseSeeds) {
    console.log(`\n📌 Creating Course: [${c.code}] ${c.titleEn} (${c.status})...`);

    const course = await prisma.course.create({
      data: {
        code: c.code,
        titleEn: c.titleEn,
        titleAm: c.titleAm,
        descriptionEn: c.descriptionEn,
        descriptionAm: c.descriptionAm,
        level: c.level,
        status: c.status,
        thumbnailUrl: COVER,
        estimatedHours: c.estimatedHours,
        category: c.category,
        department: c.department,
        targetAudience: c.targetAudience,
        deliveryMethod: c.deliveryMethod,
        objectivesEn: c.objectivesEn,
        objectivesAm: c.objectivesAm,
        prerequisites: c.prerequisites,
        publishedAt: c.status === CourseStatus.PUBLISHED ? new Date() : null,
        owners: {
          create: {
            userId: ownerId,
          },
        },
        trainers: {
          create: {
            userId: trainerId,
          },
        },
      },
    });

    // Content Approval workflow status
    if (c.status === CourseStatus.PENDING_APPROVAL) {
      await prisma.contentApproval.create({
        data: {
          courseId: course.id,
          approverId: approverId,
          status: ApprovalStatus.PENDING,
          comments: c.approvalComments || 'Submitted for approval',
        },
      });
    } else if (c.status === CourseStatus.APPROVED || c.status === CourseStatus.PUBLISHED) {
      await prisma.contentApproval.create({
        data: {
          courseId: course.id,
          approverId: approverId,
          status: ApprovalStatus.APPROVED,
          comments: c.approvalComments || 'Approved. Meets all standards.',
          decidedAt: new Date(),
        },
      });
    } else if (c.status === CourseStatus.REJECTED) {
      await prisma.contentApproval.create({
        data: {
          courseId: course.id,
          approverId: approverId,
          status: ApprovalStatus.REJECTED,
          comments: c.approvalComments || 'Revision required. Please address reviewer comments.',
          decidedAt: new Date(),
        },
      });
    }

    // Course-level Attachment
    await prisma.attachment.create({
      data: {
        courseId: course.id,
        fileName: `${c.code} - Course Syllabus & Curriculum Guide.pdf`,
        fileKey: PDF_FILE_KEY,
        fileUrl: PDF_FILE_URL,
        fileType: 'application/pdf',
        sizeBytes: PDF_SIZE_BYTES,
        uploadedById: ownerId,
      },
    });

    // Modules & Curriculum
    for (const mod of c.modules) {
      console.log(`   📦 Module ${mod.order + 1}: ${mod.titleEn}`);
      const createdMod = await prisma.curriculumModule.create({
        data: {
          courseId: course.id,
          titleEn: mod.titleEn,
          titleAm: mod.titleAm,
          descriptionEn: mod.descriptionEn,
          descriptionAm: mod.descriptionAm,
          objectivesEn: mod.objectivesEn,
          objectivesAm: mod.objectivesAm,
          order: mod.order,
          passingScore: mod.assessment.passingScore,
        },
      });

      // Module Attachment
      await prisma.attachment.create({
        data: {
          courseId: course.id,
          moduleId: createdMod.id,
          fileName: mod.attachment.fileName,
          fileKey: PDF_FILE_KEY,
          fileUrl: PDF_FILE_URL,
          fileType: mod.attachment.fileType,
          sizeBytes: PDF_SIZE_BYTES,
          uploadedById: ownerId,
        },
      });

      // Module Assessment
      await prisma.assessment.create({
        data: {
          courseId: course.id,
          moduleId: createdMod.id,
          type: AssessmentType.MODULE_ASSESSMENT,
          titleEn: mod.assessment.titleEn,
          titleAm: mod.assessment.titleAm,
          descriptionEn: mod.assessment.descriptionEn || '',
          descriptionAm: mod.assessment.descriptionAm || '',
          passingScore: mod.assessment.passingScore,
          timeLimitMinutes: mod.assessment.timeLimitMinutes,
          questions: mod.assessment.questions as unknown as Prisma.InputJsonValue,
        },
      });

      // Record questions into Question Bank
      for (const q of mod.assessment.questions) {
        await prisma.questionBankQuestion.create({
          data: {
            courseId: course.id,
            createdById: ownerId,
            type: q.type === 'MULTIPLE_CHOICE' ? QuestionType.MULTIPLE_CHOICE : q.type === 'TRUE_FALSE' ? QuestionType.TRUE_FALSE : QuestionType.SHORT_ANSWER,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer !== null ? String(q.correctAnswer) : null,
            points: q.points,
            category: q.category || 'Module Check',
          },
        });
      }

      // Lessons in Module
      for (const les of mod.lessons) {
        console.log(`      📖 Lesson ${les.order + 1}: ${les.titleEn}`);
        const createdLesson = await prisma.lesson.create({
          data: {
            moduleId: createdMod.id,
            parentId: null,
            titleEn: les.titleEn,
            titleAm: les.titleAm,
            contentEn: les.contentEn,
            contentAm: les.contentAm,
            contentType: les.contentType,
            durationMinutes: les.durationMinutes,
            order: les.order,
          },
        });

        // Lesson Attachment
        await prisma.attachment.create({
          data: {
            courseId: course.id,
            moduleId: createdMod.id,
            lessonId: createdLesson.id,
            fileName: les.attachment.fileName,
            fileKey: PDF_FILE_KEY,
            fileUrl: PDF_FILE_URL,
            fileType: les.attachment.fileType,
            sizeBytes: PDF_SIZE_BYTES,
            uploadedById: ownerId,
          },
        });

        // Lesson Assessment
        await prisma.assessment.create({
          data: {
            courseId: course.id,
            moduleId: createdMod.id,
            lessonId: createdLesson.id,
            type: AssessmentType.LESSON_ASSESSMENT,
            titleEn: les.assessment.titleEn,
            titleAm: les.assessment.titleAm,
            passingScore: les.assessment.passingScore,
            timeLimitMinutes: les.assessment.timeLimitMinutes,
            questions: les.assessment.questions as unknown as Prisma.InputJsonValue,
          },
        });

        for (const q of les.assessment.questions) {
          await prisma.questionBankQuestion.create({
            data: {
              courseId: course.id,
              createdById: ownerId,
              type: q.type === 'MULTIPLE_CHOICE' ? QuestionType.MULTIPLE_CHOICE : q.type === 'TRUE_FALSE' ? QuestionType.TRUE_FALSE : QuestionType.SHORT_ANSWER,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer !== null ? String(q.correctAnswer) : null,
              points: q.points,
              category: q.category || 'Lesson Check',
            },
          });
        }

        // Sub-lessons
        if (les.subLessons && les.subLessons.length > 0) {
          for (const sub of les.subLessons) {
            console.log(`         🔬 Sub-lesson: ${sub.titleEn}`);
            const createdSub = await prisma.lesson.create({
              data: {
                moduleId: createdMod.id,
                parentId: createdLesson.id,
                titleEn: sub.titleEn,
                titleAm: sub.titleAm,
                contentEn: sub.contentEn,
                contentAm: sub.contentAm,
                contentType: sub.contentType,
                durationMinutes: sub.durationMinutes,
                order: sub.order,
              },
            });

            // Sub-lesson Attachment
            await prisma.attachment.create({
              data: {
                courseId: course.id,
                moduleId: createdMod.id,
                lessonId: createdSub.id,
                fileName: sub.attachment.fileName,
                fileKey: PDF_FILE_KEY,
                fileUrl: PDF_FILE_URL,
                fileType: sub.attachment.fileType,
                sizeBytes: PDF_SIZE_BYTES,
                uploadedById: ownerId,
              },
            });

            // Sub-lesson Assessment
            await prisma.assessment.create({
              data: {
                courseId: course.id,
                moduleId: createdMod.id,
                lessonId: createdSub.id,
                type: AssessmentType.SUB_LESSON_ASSESSMENT,
                titleEn: sub.assessment.titleEn,
                titleAm: sub.assessment.titleAm,
                passingScore: sub.assessment.passingScore,
                timeLimitMinutes: sub.assessment.timeLimitMinutes,
                questions: sub.assessment.questions as unknown as Prisma.InputJsonValue,
              },
            });

            for (const q of sub.assessment.questions) {
              await prisma.questionBankQuestion.create({
                data: {
                  courseId: course.id,
                  createdById: ownerId,
                  type: q.type === 'MULTIPLE_CHOICE' ? QuestionType.MULTIPLE_CHOICE : q.type === 'TRUE_FALSE' ? QuestionType.TRUE_FALSE : QuestionType.SHORT_ANSWER,
                  question: q.question,
                  options: q.options,
                  correctAnswer: q.correctAnswer !== null ? String(q.correctAnswer) : null,
                  points: q.points,
                  category: q.category || 'Lab Check',
                },
              });
            }
          }
        }
      }
    }

    // Final Assessment for Course
    await prisma.assessment.create({
      data: {
        courseId: course.id,
        type: AssessmentType.FINAL_ASSESSMENT,
        titleEn: c.finalAssessment.titleEn,
        titleAm: c.finalAssessment.titleAm,
        passingScore: c.finalAssessment.passingScore,
        timeLimitMinutes: c.finalAssessment.timeLimitMinutes,
        questions: c.finalAssessment.questions as unknown as Prisma.InputJsonValue,
      },
    });

    for (const q of c.finalAssessment.questions) {
      await prisma.questionBankQuestion.create({
        data: {
          courseId: course.id,
          createdById: ownerId,
          type: q.type === 'MULTIPLE_CHOICE' ? QuestionType.MULTIPLE_CHOICE : q.type === 'TRUE_FALSE' ? QuestionType.TRUE_FALSE : QuestionType.SHORT_ANSWER,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer !== null ? String(q.correctAnswer) : null,
          points: q.points,
          category: q.category || 'Final Certification',
        },
      });
    }

    // Enrollment for Published Course
    if (c.status === CourseStatus.PUBLISHED) {
      console.log(`   🎓 Enrolling demo learner (${learnerId}) in ${c.code}...`);
      await prisma.enrollment.create({
        data: {
          userId: learnerId,
          courseId: course.id,
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date(),
        },
      });
    }
  }

  console.log('\n🎉 Comprehensive database seed finished successfully!');
  console.log('──────────────────────────────────────────────────────────');
  console.log('Demo Accounts summary: (Password: password)');
  for (const d of demoAccounts) {
    console.log(`  • ${d.email.padEnd(28)} → ${d.role}`);
  }
  console.log('──────────────────────────────────────────────────────────');
  console.log('Courses seeded:');
  for (const c of courseSeeds) {
    console.log(`  • [${c.status.padEnd(16)}] ${c.code.padEnd(10)} - ${c.titleEn}`);
  }
  console.log('──────────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
