import * as bcrypt from 'bcrypt';
import {
  ApprovalStatus,
  AssessmentType,
  AttendanceStatus,
  CourseDeliveryMode,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  LessonContentType,
  Prisma,
  PrismaClient,
  QuestionType,
  RoleName,
  SessionPlatform,
  SessionStatus,
  SessionType,
} from '@prisma/client';
import { seedPermissions } from './seed-permissions';
import { seedTemplates } from './seed-templates';
import { seedCategories } from './seed-categories';
import { seedLaws } from './seed-laws';

import { correctAnswerFirst } from './correct-answer-first';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const COVER = '/sample.jpg';
const PDF_FILE_KEY = 'attachments/file-sample.pdf';
const PDF_FILE_URL = '/file-sample.pdf';
const PDF_SIZE_BYTES = 142786;
const SAMPLE_VIDEO = '/sample.mp4';
const VIDEO_FILE_KEY = 'attachments/sample.mp4';
const VIDEO_FILE_URL = '/sample.mp4';
const VIDEO_SIZE_BYTES = 1570024;

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
  title: string;
  description?: string;
  descriptionEn?: string;
  descriptionAm?: string;
  passingScore: number;
  timeLimitMinutes: number;
  weight?: number;
  questions: QuestionSeed[];
}

interface AttachmentSeed {
  fileName: string;
  fileType: string;
  fileUrl?: string;
  fileKey?: string;
  sizeBytes?: number;
}

interface SubLessonSeed {
  title: string;
  contentType: LessonContentType;
  durationMinutes: number;
  order: number;
  content: string;
  attachment?: AttachmentSeed;
  attachments?: AttachmentSeed[];
  assessment?: AssessmentSeed;
}

interface LessonSeed {
  title: string;
  contentType: LessonContentType;
  durationMinutes: number;
  order: number;
  content: string;
  attachment?: AttachmentSeed;
  attachments?: AttachmentSeed[];
  assessment: AssessmentSeed;
  subLessons?: SubLessonSeed[];
}

interface ModuleSeed {
  title: string;
  description: string;
  objectives: string;
  order: number;
  attachment?: AttachmentSeed;
  attachments?: AttachmentSeed[];
  assessment: AssessmentSeed;
  lessons: LessonSeed[];
}

interface CourseSeed {
  code: string;
  title: string;
  description: string;
  level: CourseLevel;
  status: CourseStatus;
  deliveryMode?: CourseDeliveryMode;
  hasOnlineSessions?: boolean;
  estimatedHours: number;
  category: string;
  department: string;
  targetAudience: string;
  deliveryMethod: string;
  objectives: string;
  prerequisites: string;
  approvalComments?: string;
  modules: ModuleSeed[];
  finalAssessment: AssessmentSeed;
}

function normalizeAssessmentQuestions(assessment: AssessmentSeed): QuestionSeed[] {
  const weight = assessment.weight ?? 0;
  const questions = assessment.questions;
  if (!questions || questions.length === 0) return [];
  if (weight <= 0) return questions;

  const basePoints = Math.floor(weight / questions.length);
  const remainder = weight % questions.length;

  return questions.map((q, idx) => ({
    ...q,
    points: basePoints + (idx < remainder ? 1 : 0),
  }));
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
  return { fileName, fileType: 'application/pdf', fileUrl: PDF_FILE_URL, fileKey: PDF_FILE_KEY, sizeBytes: PDF_SIZE_BYTES };
}
function video(fileName = 'sample.mp4'): AttachmentSeed {
  return { fileName, fileType: 'video/mp4', fileUrl: VIDEO_FILE_URL, fileKey: VIDEO_FILE_KEY, sizeBytes: VIDEO_SIZE_BYTES };
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
    title: 'Advanced Excel & Data Analytics for Revenue Reporting',
    description:
      'Master lookup formulas, data validation, PivotTables, and automated dashboards to transform raw revenue transaction data into decision-ready reports.',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.DRAFT,
    deliveryMode: CourseDeliveryMode.ONLINE_ONLY,
    estimatedHours: 22,
    category: 'Digital Skills & Productivity',
    department: 'ICT & Digital Transformation Directorate',
    targetAudience: 'Revenue officers, branch accountants, and reporting analysts who use Excel daily',
    deliveryMethod: 'Self-paced e-learning with downloadable practice workbooks',
    objectives:
      'Build accurate lookup formulas, enforce clean data entry with validation rules, summarize large datasets with PivotTables, and publish automated dashboards.',
    prerequisites: 'CS101 Computer Basics or equivalent familiarity with spreadsheet navigation',
    approvalComments: '',
    modules: [
      {
        title: 'Module 1: Formulas, Lookup Functions & Data Validation',
        description:
          'Build precise, auditable formulas for cross-referencing taxpayer records and protect worksheets from invalid entries before they reach a report.',
        objectives: 'Apply VLOOKUP, INDEX-MATCH, and nested IF logic; configure data validation and error-proofing rules.',
        order: 0,
        attachment: pdf('Module 1 - Formulas & Validation Reference Guide.pdf'),
        assessment: {
          title: 'Module 1 Assessment',
          description: 'Checks understanding of lookup formulas and data validation before moving to PivotTables.',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
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
            title: '1.1 Mastering VLOOKUP, INDEX-MATCH & Nested Formulas',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 0,
            content: `## Why Lookup Formulas Matter in Revenue Reporting
Revenue offices maintain taxpayer registers, payment logs, and branch summaries in separate worksheets. Lookup formulas let you pull the right value from the right row automatically instead of manually cross-checking thousands of rows.

## Key Formulas
- **VLOOKUP(lookup_value, table_array, col_index_num, range_lookup)**: retrieves a value from a column to the right of the lookup column. Set range_lookup to FALSE for exact matches — critical when matching Taxpayer Identification Numbers (TIN).
- **INDEX-MATCH**: \`=INDEX(return_range, MATCH(lookup_value, lookup_range, 0))\` is more flexible than VLOOKUP because it can look left, and it does not break when columns are inserted.
- **Nested IF**: combine multiple conditions, e.g. classifying a taxpayer as Compliant, Under Review, or Delinquent based on payment status and days overdue.

## Practical Tip
Always lock the table array with absolute references (\`$A$2:$D$500\`) before copying a lookup formula down a column, otherwise the range shifts and produces wrong results.`,
            attachment: pdf('Lesson 1.1 - VLOOKUP & INDEX-MATCH Worksheet.pdf'),
            assessment: {
              title: 'Lesson 1.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Cross-Referencing Taxpayer Ledgers with INDEX-MATCH',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                content: `## Lab Scenario
You have two worksheets: "Payments" (TIN, Amount, Date) and "Registry" (TIN, Taxpayer Name, Branch). Your task is to build a consolidated report showing each payment alongside the taxpayer name and branch.

## Steps
1. In the Payments sheet, add a "Taxpayer Name" column and enter \`=INDEX(Registry!$B$2:$B$1000, MATCH(A2, Registry!$A$2:$A$1000, 0))\`.
2. Wrap the formula in \`IFERROR(..., "TIN Not Found")\` to flag mismatched records instead of showing #N/A.
3. Repeat for the "Branch" column, then filter the report for "TIN Not Found" rows to identify data entry errors that need correction before the report is finalized.

## Deliverable
A reconciled payments report with zero unresolved TIN mismatches, ready for the attached reference PDF's sign-off checklist.`,
                attachment: pdf('Sub-Lesson 1.1.1 - Cross-Reference Lab Data Pack.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.1.1 Assessment',
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
            title: '1.2 Data Validation Rules & Error-Proofing Revenue Worksheets',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 1,
            content: `## Preventing Bad Data at the Source
Revenue worksheets are only as reliable as the data typed into them. Data Validation stops invalid entries before they contaminate downstream formulas and reports.

## Common Validation Rules
- **Whole Number / Decimal Range**: restrict tax amounts to realistic positive ranges.
- **List**: restrict a "Branch" column to a predefined dropdown of approved branch codes, eliminating typos like "Adiss Ababa".
- **Custom Formula**: e.g. \`=LEN(A2)=10\` to enforce a 10-digit TIN length.
- **Input Message & Error Alert**: guide the user with a hint before they type, and a Stop alert if they violate the rule.

## Auditing Existing Data
Use *Data > Data Validation > Circle Invalid Data* to visually flag rows that already violate a rule you just applied to a legacy worksheet, before you rely on it for reporting.`,
            attachment: pdf('Lesson 1.2 - Data Validation Rules Cheat Sheet.pdf'),
            assessment: {
              title: 'Lesson 1.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Building Branch Dropdown Menus & Tax ID Length Restraints',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Objective
Configure a template spreadsheet that forces entry clerks to pick from 10 approved Ministry regional branches and type only exactly 10-digit TIN numbers.

## Procedure
1. Create a dedicated lookup range \`=Branches!$A$1:$A$10\` and apply List Validation to Column B of the data entry sheet.
2. Select Column A (TIN) and apply Custom Validation with the formula \`=AND(ISNUMBER(--A2), LEN(A2)=10)\`.
3. Configure the Error Alert style to "Stop", with title "Invalid TIN Format" and message "TIN must consist of exactly 10 numeric digits."
4. Test by entering 9 digits, letters, and 10 digits to verify that invalid entries are rejected.`,
                attachment: pdf('Sub-Lesson 1.2.1 - Data Validation Practice Workbook.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.2.1 Assessment',
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
        title: 'Module 2: PivotTables, Dashboards & Automated Reporting',
        description: 'Turn thousands of transaction rows into a one-page monthly revenue summary that updates itself.',
        objectives: 'Build PivotTables with slicers and timelines; design dashboards using conditional formatting and charts.',
        order: 1,
        attachment: pdf('Module 2 - PivotTable & Dashboard Reference Guide.pdf'),
        assessment: {
          title: 'Module 2 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
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
            title: '2.1 Building Dynamic PivotTables with Slicers & Timelines',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 0,
            content: `## The Power of PivotTables
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
When source data changes, right-click the PivotTable and choose "Refresh" — the summary updates instantly without rebuilding the report from scratch.

## Interactive Controls
- **Slicers**: enable managers to filter the summary by Branch or Tax Type with a single click.
- **Timelines**: let analysts slide across fiscal quarters or months without typing date filters.`,
            attachment: pdf('Lesson 2.1 - PivotTable Architecture Guide.pdf'),
            assessment: {
              title: 'Lesson 2.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq('excel-m2-l1-q1', 'Why should an official Excel Table (Ctrl+T) be used as a PivotTable data source?', ['It compresses file size by 90%', 'The PivotTable range automatically expands as new rows are added', 'It prevents anyone from editing the cells', 'It forces uppercase text'], 1, 'PivotTable Setup'),
                mcq('excel-m2-l1-q2', 'What happens if a source data column has no header text?', ['Excel automatically numbers it', 'The PivotTable cannot be created until the header is added', 'The column is permanently deleted', 'It becomes a row label'], 1, 'Data Hygiene'),
                tf('excel-m2-l1-q3', 'True or False: Multiple PivotTables can be connected to the same Slicer for unified filtering.', 0, 'Slicers'),
                mcq('excel-m2-l1-q4', 'Which keyboard shortcut refreshes the active PivotTable?', ['Ctrl+P', 'Alt+F5', 'Ctrl+Z', 'Alt+F4'], 1, 'Shortcuts'),
                sa('excel-m2-l1-q5', 'What keyboard shortcut converts a plain range into an Excel Table?', 'Ctrl+T', 'Shortcuts'),
              ],
            },
            subLessons: [
              {
                title: 'Practical Lab: Slicers, Timelines & Drill-Down Dashboards',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                content: `## Lab Scenario
Starting from the PivotTable built in the previous lesson, add interactivity so a branch manager can explore the data without touching a formula.

## Steps
1. PivotTable Analyze > Insert Slicer, select "Branch" and "Payment Status".
2. PivotTable Analyze > Insert Timeline, select the "Payment Date" field to add a draggable date-range filter.
3. Double-click any Grand Total cell to drill down and generate a new sheet listing every underlying transaction for that total — useful for audit trails.
4. Connect the slicer to a second PivotTable (Slicer > Report Connections) so both update together.

## Deliverable
An interactive one-page dashboard where clicking "Addis Ababa Branch" and dragging the timeline instantly recalculates every linked PivotTable.`,
                attachment: pdf('Sub-Lesson 2.1.1 - Slicer & Timeline Lab Pack.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.1.1 Assessment',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('excel-m2-l1-s1-q1', 'What does a Timeline control specifically filter by?', ['Text categories', 'Date fields', 'Numeric ranges', 'Cell colors'], 1, 'Timelines'),
                    mcq('excel-m2-l1-s1-q2', 'Double-clicking a PivotTable Grand Total cell does what?', ['Deletes the total', 'Drills down to a new sheet listing underlying transactions', 'Changes the currency format', 'Hides the row'], 1, 'Drill-Down'),
                    tf('excel-m2-l1-s1-q3', 'True or False: A single Slicer can be connected to control more than one PivotTable at once via Report Connections.', 0, 'Slicers'),
                    mcq('excel-m2-l1-s1-q4', 'Where is "Insert Slicer" found in the ribbon?', ['Home tab', 'PivotTable Analyze tab', 'Page Layout tab', 'Review tab'], 1, 'Slicers'),
                    sa('excel-m2-l1-s1-q5', 'What is the drill-down feature useful for in a revenue audit context?', 'Viewing the underlying transactions behind a total', 'Drill-Down'),
                  ],
                },
              },
            ],
          },
          {
            title: '2.2 Designing Automated Dashboards with Conditional Formatting & Charts',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 1,
            content: `## Turning Numbers into a Visual Story
A well-designed dashboard lets a director understand collection performance in seconds, not minutes. An executive dashboard consolidates critical metrics onto a single screen that requires no horizontal or vertical scrolling.

## Conditional Formatting for Alerts
- **Color Scales**: shade a "Collection Rate %" column from red (low) to green (high) across all branches.
- **Icon Sets**: apply up/down arrows to a "Variance vs. Target" column.
- **Formula-Based Rule**: highlight any row where \`=[@DaysOverdue]>30\` in red to flag chronic delinquency.

## Choosing the Right Chart
- **Bar/Column**: comparing branches side by side.
- **Line**: showing a trend over months.
- **Combo Chart**: showing actual revenue as columns against a target line for immediate gap visibility.

Keep dashboards to a single printable page — link charts directly to the PivotTable so the entire dashboard refreshes with one click.`,
            attachment: pdf('Lesson 2.2 - Dashboard Design Reference.pdf'),
            assessment: {
              title: 'Lesson 2.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq('excel-m2-l2-q1', 'Which Conditional Formatting type shades cells along a red-to-green gradient based on value?', ['Color Scale', 'Data Bar', 'Icon Set', 'Top/Bottom Rule'], 0, 'Conditional Formatting'),
                mcq('excel-m2-l2-q2', 'A Combo Chart showing actual revenue columns against a target line is best for what purpose?', ['Hiding underperformance', 'Showing the gap between actual results and a target at a glance', 'Encrypting the chart', 'Removing outliers automatically'], 1, 'Charts'),
                tf('excel-m2-l2-q3', 'True or False: Linking dashboard charts directly to a PivotTable means the whole dashboard can refresh with one click.', 0, 'Dashboards'),
                mcq('excel-m2-l2-q4', 'Which chart type is best suited for comparing performance across several branches side by side?', ['Bar/Column Chart', 'Pie Chart with 20 slices', 'Scatter Chart', 'Radar Chart'], 0, 'Charts'),
                sa('excel-m2-l2-q5', 'What formula-based Conditional Formatting rule would flag rows where DaysOverdue exceeds 30?', '=[@DaysOverdue]>30', 'Conditional Formatting'),
              ],
            },
            subLessons: [
              {
                title: 'Practical Lab: Assembling the Directorate One-Page Dashboard',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                content: `## Lab Scenario
Create the official MoR Revenue Directorate Monthly One-Pager:
1. Hide gridlines on the dashboard worksheet (*View > Show > Gridlines unchecked*).
2. Insert 3 summary KPI cards at the top: Total Revenue, MoM Growth %, and Average Daily Collection.
3. Embed a clustered column chart for monthly trends and a bar chart for branch rankings.
4. Add synchronized Slicers for Directorate, Branch, and Quarter at the left margin.
5. Protect the sheet to lock layout while allowing Slicer interactions.`,
                attachment: pdf('Sub-Lesson 2.2.1 - One-Page Dashboard Template.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.2.1 Assessment',
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
      title: 'Final Assessment',
      passingScore: 75,
      timeLimitMinutes: 30,
      weight: 30,
      questions: [
        mcq('excel-fn-q1', 'Which combination is generally preferred for large, frequently restructured worksheets?', ['VLOOKUP with hardcoded column numbers', 'INDEX-MATCH', 'Manual copy-paste', 'Ctrl+F search'], 1, 'Formulas'),
        mcq('excel-fn-q2', 'PivotTables are best suited for which task?', ['Summarizing large datasets by category', 'Writing plain text notes', 'Sending email', 'Compressing files'], 0, 'PivotTables'),
        tf('excel-fn-q3', 'True or False: Data Validation can prevent invalid data from being typed into a cell before it happens.', 0, 'Data Validation'),
        mcq('excel-fn-q4', 'Slicers in a PivotTable dashboard are used to what end?', ['Interactively filter the report by a category', 'Change the workbook password', 'Encrypt the file', 'Print the file'], 0, 'Dashboards'),
        sa('excel-fn-q5', 'What is the name of the Excel tool that summarizes and aggregates large datasets interactively?', 'PivotTable', 'PivotTables'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 2. PENDING_APPROVAL — Tax Audit Procedures & Investigation Standards
  // ─────────────────────────────────────────────────────────
  {
    code: 'AUDIT201',
    title: 'Tax Audit Procedures & Investigation Standards',
    description:
      'Comprehensive field practicum on audit case selection, examination techniques, forensic reconciliation, and formal assessment reporting in accordance with Ethiopian tax law.',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PENDING_APPROVAL,
    deliveryMode: CourseDeliveryMode.BOTH,
    estimatedHours: 24,
    category: 'Tax Audit & Compliance',
    department: 'Tax Audit & Investigation Directorate',
    targetAudience: 'Tax audit officers, investigators, and compliance assessment teams',
    deliveryMethod: 'Blended learning with practical case analysis and live review clinics',
    objectives:
      'Execute risk-based audit selection, conduct comprehensive books and records examination, identify indirect tax evasion indicators, and prepare legally defensible assessment notices.',
    prerequisites: 'TAX101 Ethiopian Tax System Fundamentals & Digital Filing Standards',
    approvalComments: 'Submitted for curriculum approval and awaiting committee review.',
    modules: [
      {
        title: 'Module 1: Audit Planning, Risk Profiling & Case Selection',
        description:
          'Master the legal framework and analytical techniques to identify high-risk taxpayers, formulate audit scopes, and issue formal pre-audit notices.',
        objectives:
          'Apply risk-scoring criteria, analyze financial ratio anomalies, and prepare standard preliminary notification packages.',
        order: 0,
        attachment: pdf('Module 1 - Audit Planning & Risk Profiling Guide.pdf'),
        assessment: {
          title: 'Module 1 Assessment',
          description: 'Evaluates knowledge of audit case selection criteria and statutory notification rules.',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
          questions: [
            mcq(
              'audit-m1-q1',
              'Which analytical metric is the primary indicator of potential undeclared sales when profiling a taxpayer?',
              ['Significant divergence between gross profit margin and industry benchmarks', 'Increase in staff head count', 'Timely submission of annual declaration', 'Change of business registered address'],
              0,
              'Risk Profiling',
            ),
            mcq(
              'audit-m1-q2',
              'Under Ethiopian tax administration law, what is the mandatory notification period before a field audit may commence?',
              ['At least 10 working days', '24 hours notice', '30 calendar days', 'No advance notice is required'],
              0,
              'Audit Notification',
            ),
            tf(
              'audit-m1-q3',
              'True or False: Tax auditors may request third-party information from commercial banks and customs authorities during pre-audit profiling.',
              0,
              'Information Gathering',
            ),
            mcq(
              'audit-m1-q4',
              'What is the primary purpose of the initial interview during an on-site audit?',
              ['To understand internal controls and verify accounting systems used', 'To negotiate the final tax assessment amount', 'To seize electronic cash register memory cards immediately', 'To issue penalty receipts on day one'],
              0,
              'Audit Process',
            ),
            sa(
              'audit-m1-q5',
              'What is the formal document issued to a taxpayer to formally request missing books and records during an audit?',
              'Information Notice',
              'Legal Protocols',
            ),
          ],
        },
        lessons: [
          {
            title: '1.1 Risk-Based Audit Case Selection Frameworks',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            content: `## Risk-Based Audit Selection Overview
Tax administrations operate with finite resources and cannot audit every registered business. Modern tax authorities apply automated risk-scoring engines that combine internal tax declarations with external data sources to detect anomalies.

## Key Risk Criteria
- **Margin Discrepancies**: Marked deviations between reported gross margins and industry standard ratios.
- **Third-Party Discrepancies**: Inconsistencies between customs import values (ASYCUDA) and domestic sales turnover declarations.
- **Persistent Loss Reporting**: Entities reporting multi-year operating losses while continuing to expand operations or pay dividends.
- **ESR Inactivity**: Category A and B taxpayers reporting zero or negligible transactions through Electronic Sales Registers despite high inventory turns.`,
            attachment: pdf('Lesson 1.1 - Risk-Based Selection Models.pdf'),
            assessment: {
              title: 'Lesson 1.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq(
                  'audit-l11-q1',
                  'When customs import data exceeds declared sales turnover, what is the primary audit risk indicator?',
                  ['Under-reporting of domestic sales or suppressed inventory', 'Over-declaration of export rebates', 'Incorrect payroll calculation', 'Depreciation errors'],
                  0,
                  'Audit Risk',
                ),
                tf(
                  'audit-l11-q2',
                  'True or False: Risk-based audit selection has largely replaced random audit selection in modern tax administrations.',
                  0,
                  'Audit Modernization',
                ),
              ],
            },
          },
          {
            title: '1.2 Statutory Notification & Taxpayer Rights Under Proclamation',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            content: `## The Statutory Notice Requirement
Federal Tax Administration Proclamation No. 983/2016 establishes clear procedural guardrails:
1. **Advance Notice**: Field audits require written notification at least 10 working days prior to on-site entry, specifying the tax periods, audit scope, and assigned officers.
2. **Taxpayer Representation**: The taxpayer has the legal right to designate a licensed tax agent, accountant, or legal counsel.
3. **Record Keeping Mandate**: Category A taxpayers must retain commercial books of accounts and source vouchers for a statutory period of 10 years.`,
            attachment: pdf('Lesson 1.2 - Taxpayer Rights & Statutory Notices.pdf'),
            assessment: {
              title: 'Lesson 1.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq(
                  'audit-l12-q1',
                  'For how long are Category A taxpayers legally required to retain their books and supporting records under Ethiopian tax law?',
                  ['10 Years', '3 Years', '5 Years', '1 Year'],
                  0,
                  'Record Retention',
                ),
                tf(
                  'audit-l12-q2',
                  'True or False: A taxpayer has the right to be accompanied by a certified tax advisor or legal counsel during audit interviews.',
                  0,
                  'Taxpayer Rights',
                ),
              ],
            },
          },
        ],
      },
      {
        title: 'Module 2: Books of Account Examination, Reconciliation & Assessment Reports',
        description:
          'Execute detailed examination of sales ledgers, bank transactions, and inventory reconciliations, concluding with legally defensible assessment notices.',
        objectives:
          'Reconcile bank accounts against declared VAT, detect unrecorded purchases, determine taxable adjustments, and structure formal assessment findings.',
        order: 1,
        attachment: pdf('Module 2 - Books Examination & Audit Reporting Manual.pdf'),
        assessment: {
          title: 'Module 2 Assessment',
          description: 'Tests ability to identify accounting discrepancies and structure tax assessment findings.',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
          questions: [
            mcq(
              'audit-m2-q1',
              'Which audit technique involves comparing total deposits across all business bank accounts with reported taxable revenue?',
              ['Bank Deposit Reconciliation Analysis', 'Depreciation Test', 'Net Worth Comparison only', 'Payroll Ratio Test'],
              0,
              'Reconciliation',
            ),
            mcq(
              'audit-m2-q2',
              'When an auditor disallows an expense deduction due to lack of a valid legal VAT receipt or withholding voucher, under which principle is this done?',
              ['Substantiation and documentation requirements', 'Auditor discretion', 'Voluntary disclosure', 'Market valuation estimate'],
              0,
              'Expense Deductions',
            ),
            tf(
              'audit-m2-q3',
              'True or False: If books of account are rejected for complete lack of integrity, the tax authority may compute tax using estimated assessment methods.',
              0,
              'Estimated Assessment',
            ),
            mcq(
              'audit-m2-q4',
              'What must be included in a formal Preliminary Audit Assessment Notice issued to the taxpayer?',
              ['Detailed legal and factual grounds, calculation of additional tax, penalties, and interest', 'Only the final aggregate amount owed without breakdown', 'A court summons for immediate asset seizure', 'A request for bank account closure'],
              0,
              'Audit Reporting',
            ),
            sa(
              'audit-m2-q5',
              'How many days does a taxpayer typically have to submit written objections to a preliminary audit assessment notice?',
              '30 Days',
              'Statutory Objections',
            ),
          ],
        },
        lessons: [
          {
            title: '2.1 Forensic Reconciliation of Bank Accounts & Electronic Sales Registers',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            content: `## Bank Deposit vs Declared Revenue Reconciliation
A cornerstone of indirect verification is the Bank Deposit Reconciliation:
- Total bank deposits across all commercial accounts are aggregated.
- Non-revenue items (capital injections, inter-account transfers, loan disbursements) are deducted.
- The resulting net business deposits figure is compared against total sales declared on monthly VAT returns.
- Unexplained positive variances represent prima facie evidence of suppressed taxable revenue.`,
            attachment: pdf('Lesson 2.1 - Bank Reconciliation Techniques.pdf'),
            assessment: {
              title: 'Lesson 2.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq(
                  'audit-l21-q1',
                  'What does an un-reconciled credit deposit in a business owner personal bank account often indicate during an audit?',
                  ['Potential diversion of business receipts to personal accounts', 'Standard tax-exempt personal gift', 'Routine inter-bank clearing error', 'Authorized expense refund'],
                  0,
                  'Forensic Audit',
                ),
                tf(
                  'audit-l21-q2',
                  'True or False: Cash sales discrepancies can be substantiated using electronic fiscal register daily Z-reports.',
                  0,
                  'Sales Registers',
                ),
              ],
            },
          },
          {
            title: '2.2 Structuring Defensible Assessment Findings & Notice Issuance',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            content: `## Constructing Assessment Notices
Every audit adjustment must be legally anchored:
- **Statutory Citing**: Explicitly state the article of Income Tax Proclamation 979/2016 or VAT Proclamation violated.
- **Evidentiary Basis**: Document the exact sample, invoice numbers, or bank entries that prove the discrepancy.
- **Penalty Computation**: Calculate administrative penalties for under-statement and late-payment interest in separate transparent schedules.
- **Right of Objection**: Inform the taxpayer of their statutory right to file a written objection within 30 days to the Tax Appeal & Review Directorate.`,
            attachment: pdf('Lesson 2.2 - Assessment Notice Templates.pdf'),
            assessment: {
              title: 'Lesson 2.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq(
                  'audit-l22-q1',
                  'Under Ethiopian law, what is the penalty for tax under-statement where the tax shortfall exceeds statutory thresholds?',
                  ['Administrative penalty scaled to percentage of tax shortfall plus interest', 'Instant business license revocation only', 'Fixed administrative fee of 500 ETB', 'No penalty if paid within one year'],
                  0,
                  'Penalties',
                ),
                tf(
                  'audit-l22-q2',
                  'True or False: Clear calculation sheets and legal statutory references must accompany every formal tax assessment notice.',
                  0,
                  'Assessment Standards',
                ),
              ],
            },
          },
        ],
      },
    ],
    finalAssessment: {
      title: 'Final Assessment',
      description:
        'Comprehensive evaluation covering audit planning, forensic reconciliation, legal evidence standards, and assessment notice drafting.',
      passingScore: 75,
      timeLimitMinutes: 30,
      weight: 30,
      questions: [
        mcq(
          'audit-fn-q1',
          'Which legal document provides the primary procedural authority for conducting tax audits and issuing assessment notices in Ethiopia?',
          ['Federal Tax Administration Proclamation No. 983/2016', 'Commercial Code of 1960 only', 'Banking Regulation Directive No. 12', 'Civil Service Guidelines'],
          0,
          'Legal Framework',
        ),
        mcq(
          'audit-fn-q2',
          'During an audit, if a taxpayer claims significant cost of sales from unregistered suppliers without legal receipts, what is the required tax treatment?',
          ['Disallow the unsubstantiated cost deduction and adjust taxable income accordingly', 'Accept the cost if oral explanation is provided', 'Reduce the tax rate by half', 'Refer directly to criminal court without tax adjustment'],
          0,
          'Allowable Deductions',
        ),
        tf(
          'audit-fn-q3',
          'True or False: An audit file must maintain a complete audit trail showing all workpapers, sampling methods, and evidence collected.',
          0,
          'Audit Standards',
        ),
        mcq(
          'audit-fn-q4',
          'What is the role of the Tax Appeal Commission in the audit lifecycle?',
          ['An independent quasi-judicial body to hear taxpayer appeals against final tax objection decisions', 'The department that conducts initial field audits', 'The division responsible for printing tax invoices', 'The bank agency processing tax refunds'],
          0,
          'Appeals',
        ),
        sa(
          'audit-fn-q5',
          'What is the term for an audit conducted simultaneously across multiple related entities or cross-border transactions?',
          'Comprehensive Audit',
          'Audit Terminology',
        ),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 2. PENDING_APPROVAL — Project Management Essentials for Government Programs
  // 2. PENDING_APPROVAL: Project Management Essentials for Government Programs
  // ─────────────────────────────────────────────────────────
  {
    code: 'PROJ201',
    title: 'Project Management Essentials for Government Programs',
    description:
      'Plan, schedule, budget, and monitor public-sector projects using charters, WBS, Gantt scheduling, and earned value tracking.',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PUBLISHED,
    deliveryMode: CourseDeliveryMode.BOTH,
    estimatedHours: 28,
    category: 'Program & Project Management',
    department: 'Strategic Planning Directorate',
    targetAudience: 'Project coordinators, branch managers, and directorate focal persons who lead improvement initiatives',
    deliveryMethod: 'Blended: self-paced modules plus a live capstone review session',
    objectives:
      'Draft a project charter, map stakeholders with a RACI matrix, build a work breakdown structure and schedule, and track budget variance using earned value.',
    prerequisites: 'None — designed for first-time project leads',
    approvalComments: 'Submitted for final review by the Strategic Planning Committee. All curriculum materials prepared.',
    modules: [
      {
        title: 'Module 1: Project Initiation, Charters & Stakeholder Mapping',
        description: 'Turn a vague mandate into a documented charter with clear scope, objectives, and accountable stakeholders.',
        objectives: 'Draft a project charter and apply the RACI matrix to clarify stakeholder responsibilities.',
        order: 0,
        attachment: pdf('Module 1 - Charter & Stakeholder Toolkit.pdf'),
        assessment: {
          title: 'Module 1 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
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
            title: '1.1 Defining Scope, Objectives & the Project Charter',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            content: `## Why Projects Fail Before They Start
Most public-sector project failures trace back to an undocumented or ambiguous scope. A Project Charter fixes this by putting the mandate in writing before any work begins.

## Core Charter Elements
1. **Project Purpose**: the problem being solved and the strategic goal it serves.
2. **Objectives**: SMART statements (Specific, Measurable, Achievable, Relevant, Time-bound).
3. **Scope Boundaries**: explicitly stating what is *in* and *out* of scope to prevent scope creep.
4. **Sponsor & Authority**: who authorized the project and what budget/resource authority the project manager holds.
5. **High-Level Milestones**: major checkpoints without a full schedule yet.

## Government Context
A charter for a district tax-office renovation should explicitly state whether IT infrastructure upgrades are in scope — ambiguity here is the single most common cause of budget overruns in facility projects.`,
            attachment: pdf('Lesson 1.1 - Charter Template & Example.pdf'),
            assessment: {
              title: 'Lesson 1.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq('proj-m1-l1-q1', 'What does the "M" in SMART objectives stand for?', ['Motivated', 'Measurable', 'Managed', 'Mandatory'], 1, 'Objectives'),
                mcq('proj-m1-l1-q2', 'Explicitly stating what is out of scope in a charter primarily prevents what?', ['Scope creep', 'Employee turnover', 'Tax evasion', 'Server downtime'], 0, 'Scope'),
                tf('proj-m1-l1-q3', 'True or False: A Project Charter should be finalized before significant project work begins.', 0, 'Initiation'),
                mcq('proj-m1-l1-q4', 'Who typically grants the project manager authority to use resources in the charter?', ['The project sponsor', 'A random employee', 'The vendor', 'The auditor'], 0, 'Initiation'),
                sa('proj-m1-l1-q5', 'What term describes uncontrolled expansion of a project scope after it has started?', 'Scope Creep', 'Scope'),
              ],
            },
            subLessons: [
              {
                title: 'Practical Lab: Drafting a Charter for a District Tax-Office Renovation Project',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                content: `## Lab Scenario
Your district tax office needs renovation: a new public service counter, accessible ramps, and an upgraded network cabinet. Draft a one-page charter.

## Steps
1. Write a Purpose statement linking the renovation to the Ministry's citizen-service improvement strategy.
2. Write 3 SMART objectives (e.g., "Complete accessible ramp installation within 90 days at a cost not exceeding 850,000 ETB").
3. List explicit in-scope items (counter, ramps, cabinet) and explicit out-of-scope items (full roof replacement, parking lot repaving).
4. Name a sponsor (the Regional Director) and state the project manager's spending authority limit.

## Deliverable
A completed one-page charter using the attached template, ready for sponsor sign-off.`,
                attachment: pdf('Sub-Lesson 1.1.1 - Renovation Charter Lab Template.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.1.1 Assessment',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('proj-m1-l1-s1-q1', 'In the lab charter, which item belongs in the out-of-scope list?', ['New public service counter', 'Accessible ramp installation', 'Full roof replacement', 'Network cabinet upgrade'], 2, 'Scope'),
                    mcq('proj-m1-l1-s1-q2', 'A SMART objective for this project should include which element?', ['A vague hope with no deadline', 'A specific cost ceiling and a time-bound deadline', 'No measurable outcome', 'An unnamed sponsor'], 1, 'Objectives'),
                    tf('proj-m1-l1-s1-q3', 'True or False: The lab charter should name the Regional Director as sponsor.', 0, 'Initiation'),
                    mcq('proj-m1-l1-s1-q4', 'What does stating the project manager spending authority limit in the charter accomplish?', ['It removes all budget controls', 'It clarifies how much the PM can approve without escalation', 'It replaces the need for a budget', 'It cancels the project'], 1, 'Governance'),
                    sa('proj-m1-l1-s1-q5', 'What is the recommended length for the charter produced in this lab?', 'One page', 'Initiation'),
                  ],
                },
              },
            ],
          },
          {
            title: '1.2 Stakeholder Analysis & the RACI Responsibility Matrix',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            content: `## Identifying Who Matters
A stakeholder is anyone who affects, or is affected by, the project — from the Regional Director to the citizens waiting in the renovated service hall.

## Power-Interest Grid
Map each stakeholder on two axes:
- **High Power / High Interest**: manage closely (e.g., the Regional Director).
- **High Power / Low Interest**: keep satisfied (e.g., the Finance Directorate).
- **Low Power / High Interest**: keep informed (e.g., front-desk staff).
- **Low Power / Low Interest**: monitor with minimal effort.

## The RACI Matrix
For every major task, assign exactly one **Accountable** owner, one or more **Responsible** doers, and note who is **Consulted** (two-way input) versus merely **Informed** (one-way update). Ambiguity between Responsible and Accountable is the most common cause of dropped tasks in multi-directorate projects.`,
            attachment: pdf('Lesson 1.2 - Stakeholder & RACI Worksheet.pdf'),
            assessment: {
              title: 'Lesson 1.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq('proj-m1-l2-q1', 'A stakeholder with High Power and Low Interest should be managed how?', ['Manage closely', 'Keep satisfied', 'Keep informed', 'Ignore entirely'], 1, 'Stakeholder Analysis'),
                mcq('proj-m1-l2-q2', 'In RACI, what distinguishes "Consulted" from "Informed"?', ['Consulted implies two-way input; Informed is a one-way update', 'They mean the same thing', 'Informed people can veto decisions', 'Consulted means no communication at all'], 0, 'RACI'),
                tf('proj-m1-l2-q3', 'True or False: Every major task should have exactly one Accountable owner.', 0, 'RACI'),
                mcq('proj-m1-l2-q4', 'Front-desk staff in the renovation project would typically fall into which Power-Interest quadrant?', ['High Power / High Interest', 'Low Power / High Interest', 'High Power / Low Interest', 'Low Power / Low Interest'], 1, 'Stakeholder Analysis'),
                sa('proj-m1-l2-q5', 'What grid tool plots stakeholders by their power and interest levels?', 'Power-Interest Grid', 'Stakeholder Analysis'),
              ],
            },
            subLessons: [
              {
                title: 'Practical Lab: Mapping Regional Tax Directorate Stakeholders',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
Map 8 stakeholders for a new digital tax-filing rollout: Branch Manager, IT Support, Regional Director, Tax Audit Lead, Local Traders Association, Ministry PR Officer, Finance Clerk, and Call Center Supervisor.

## Steps
1. Place each of the 8 stakeholders into the 4 quadrants of the Power-Interest Grid.
2. Build a RACI table with 5 rows: System Configuration, User Training, Citizen Awareness Campaign, Acceptance Testing, and Post-Launch Support.
3. Verify that each row has exactly one "A".`,
                attachment: pdf('Sub-Lesson 1.2.1 - Stakeholder Mapping Exercise.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.2.1 Assessment',
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
        title: 'Module 2: Scheduling, Budgeting & Risk Monitoring',
        description: 'Break the project into a schedule, track spend against baseline, and keep risks visible before they become issues.',
        objectives: 'Build a Work Breakdown Structure and Gantt schedule; establish a budget baseline and track earned value.',
        order: 1,
        attachment: pdf('Module 2 - Scheduling & Budgeting Toolkit.pdf'),
        assessment: {
          title: 'Module 2 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
          questions: [
            mcq('proj-m2-q1', 'What is a Work Breakdown Structure (WBS)?', ['A hierarchical decomposition of the total scope into work packages', 'A list of employee vacation days', 'A single-page budget summary', 'A vendor contract template'], 0, 'WBS'),
            mcq('proj-m2-q2', 'The Critical Path in a schedule is defined as what?', ['The sequence of dependent tasks that determines the shortest overall project duration', 'The most expensive task only', 'A list of optional tasks', 'The tasks assigned to the newest team member'], 0, 'Scheduling'),
            tf('proj-m2-q3', 'True or False: Delaying a task on the Critical Path delays the entire project.', 0, 'Scheduling'),
            mcq('proj-m2-q4', 'Earned Value Management compares which three values?', ['Planned Value, Earned Value, and Actual Cost', 'Employee count, office size, and vendor rating', 'Weather, holidays, and traffic', 'Logo color, font, and layout'], 0, 'Budgeting'),
            sa('proj-m2-q5', 'What chart visually displays task bars against a timeline to show a project schedule?', 'Gantt Chart', 'Scheduling'),
          ],
        },
        lessons: [
          {
            title: '2.1 Work Breakdown Structures & Critical Path Scheduling',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            content: `## Decomposing the Work
A Work Breakdown Structure (WBS) breaks the total project scope into progressively smaller, assignable work packages — following the "100% Rule": the sum of child items must equal 100% of the parent's scope, no more, no less.

## From WBS to Schedule
1. Sequence work packages by dependency (which tasks must finish before others can start).
2. Estimate duration for each package.
3. Identify the **Critical Path**: the longest chain of dependent tasks — any delay here delays the whole project. Non-critical tasks have **float** (slack) and can shift without affecting the finish date.

## Government Example
In a multi-phase office rollout, "Network cabling" must finish before "IT equipment installation" can start — this dependency likely sits on the critical path, so it deserves the closest monitoring.`,
            attachment: pdf('Lesson 2.1 - WBS & Critical Path Guide.pdf'),
            assessment: {
              title: 'Lesson 2.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq('proj-m2-l1-q1', 'The "100% Rule" in a WBS means what?', ['The sum of child items equals 100% of the parent scope', 'The project must be 100% complete before starting', 'Only 100% of staff can be assigned', 'The budget must be spent 100% in month one'], 0, 'WBS'),
                mcq('proj-m2-l1-q2', 'What is "float" (or slack) in scheduling?', ['The amount a non-critical task can be delayed without affecting the project finish date', 'A type of budget overrun', 'A stakeholder role', 'A risk category'], 0, 'Scheduling'),
                tf('proj-m2-l1-q3', 'True or False: Tasks on the Critical Path have zero float.', 0, 'Scheduling'),
                mcq('proj-m2-l1-q4', 'In the office rollout example, why does "Network cabling before IT installation" matter for scheduling?', ['It is an irrelevant detail', 'It is a dependency that likely sits on the critical path', 'It has no effect on the finish date', 'It can be done in any order'], 1, 'Scheduling'),
                sa('proj-m2-l1-q5', 'What term describes breaking total project scope into a hierarchy of smaller work packages?', 'Work Breakdown Structure', 'WBS'),
              ],
            },
            subLessons: [
              {
                title: 'Practical Lab: Building a Gantt Chart for a Multi-Phase Rollout',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                content: `## Lab Scenario
Your project has three phases: (1) Procurement of equipment — 20 days, (2) Network cabling — 15 days (starts after Procurement), (3) IT installation — 10 days (starts after cabling).

## Steps
1. List each task with start date, duration, and predecessor.
2. Build a Gantt chart (spreadsheet or project tool) with one bar per task on a shared timeline.
3. Calculate total project duration by summing the dependent chain: 20 + 15 + 10 = 45 working days — this chain is your Critical Path since none of these tasks can run in parallel.
4. Mark any task with available float in a lighter color to distinguish it from critical tasks.

## Deliverable
A Gantt chart clearly showing the 45-day critical path and any parallel, non-critical activities.`,
                attachment: pdf('Sub-Lesson 2.1.1 - Gantt Chart Lab Data.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.1.1 Assessment',
                  passingScore: 70,
                  timeLimitMinutes: 8,
                  questions: [
                    mcq('proj-m2-l1-s1-q1', 'In the lab, what is the total Critical Path duration?', ['15 days', '20 days', '45 days', '10 days'], 2, 'Gantt Charts'),
                    mcq('proj-m2-l1-s1-q2', 'Why is the chain in this lab entirely on the critical path?', ['None of the three tasks can run in parallel — each depends on the previous one finishing', 'The tasks are unrelated', 'The budget requires it', 'It was chosen at random'], 0, 'Critical Path'),
                    tf('proj-m2-l1-s1-q3', 'True or False: A Gantt chart displays one bar per task along a shared timeline.', 0, 'Gantt Charts'),
                    mcq('proj-m2-l1-s1-q4', 'Which task must finish before "IT installation" can start, per the lab scenario?', ['Procurement only', 'Network cabling', 'Nothing, it can start anytime', 'Budget approval'], 1, 'Dependencies'),
                    sa('proj-m2-l1-s1-q5', 'What visual marking distinguishes non-critical tasks with float on the Gantt chart in this lab?', 'A lighter color', 'Gantt Charts'),
                  ],
                },
              },
            ],
          },
          {
            title: '2.2 Budget Baselines, Earned Value & Variance Tracking',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            content: `## Setting the Baseline
Before spending begins, lock a **Budget Baseline** — the approved, time-phased spending plan. Every future comparison measures performance against this fixed reference.

## Earned Value Management (EVM) Basics
- **Planned Value (PV)**: budgeted cost of work scheduled to date.
- **Earned Value (EV)**: budgeted cost of work actually completed.
- **Actual Cost (AC)**: real money spent to date.
- **Cost Variance (CV) = EV − AC**: negative means over budget.
- **Schedule Variance (SV) = EV − PV**: negative means behind schedule.

## Reading the Signals
If EV is far below both PV and AC, the project is simultaneously late and over budget — the clearest signal for an escalation to the sponsor before the gap widens further.`,
            attachment: pdf('Lesson 2.2 - EVM Formula Reference.pdf'),
            assessment: {
              title: 'Lesson 2.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                mcq('proj-m2-l2-q1', 'A negative Cost Variance (CV) means what?', ['The project is under budget', 'The project is over budget', 'The project is ahead of schedule', 'The project has zero risk'], 1, 'Earned Value'),
                mcq('proj-m2-l2-q2', 'Schedule Variance (SV) is calculated as what?', ['EV − PV', 'AC − PV', 'PV − AC', 'EV × AC'], 0, 'Earned Value'),
                tf('proj-m2-l2-q3', 'True or False: The Budget Baseline should be locked before spending begins so future performance can be measured against it.', 0, 'Budgeting'),
                mcq('proj-m2-l2-q4', 'If Earned Value is far below both Planned Value and Actual Cost, what does this signal?', ['The project is ahead of schedule and under budget', 'The project is simultaneously late and over budget', 'Nothing significant', 'The project is complete'], 1, 'Earned Value'),
                sa('proj-m2-l2-q5', 'What three-letter acronym represents the budgeted cost of work actually completed?', 'EV', 'Earned Value'),
              ],
            },
            subLessons: [
              {
                title: 'Practical Lab: Calculating Float and Identifying Critical Milestones',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Exercise
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
                attachment: pdf('Sub-Lesson 2.2.1 - Critical Path Network Lab.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.2.1 Assessment',
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
      title: 'Final Assessment',
      passingScore: 75,
      timeLimitMinutes: 35,
      weight: 30,
      questions: [
        mcq('proj-fn-q1', 'What document formally authorizes a project and names its sponsor?', ['Project Charter', 'Meeting agenda', 'Expense report', 'Training manual'], 0, 'Initiation'),
        mcq('proj-fn-q2', 'A Work Breakdown Structure (WBS) primarily helps a project manager do what?', ['Decompose project scope into manageable, assignable work packages', 'Calculate employee salaries', 'Approve vendor invoices', 'Design a logo'], 0, 'Scheduling'),
        tf('proj-fn-q3', 'True or False: The Critical Path is the sequence of tasks that determines the shortest possible project duration.', 0, 'Scheduling'),
        mcq('proj-fn-q4', 'Earned Value Management primarily tracks what?', ['Employee satisfaction scores', 'Budget and schedule performance against a baseline', 'Building temperature', 'Vendor marketing materials'], 1, 'Budgeting'),
        sa('proj-fn-q5', 'What matrix tool clarifies who is Responsible, Accountable, Consulted, and Informed for each task?', 'RACI', 'Stakeholder Management'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 3. REJECTED — Citizen Service Excellence & Front-Office Standards
  // ─────────────────────────────────────────────────────────
  {
    code: 'CSERV101',
    title: 'Citizen Service Excellence & Front-Office Standards',
    description:
      'Front-office conduct, complaint de-escalation, multi-channel service etiquette, and service-level measurement for taxpayer-facing staff.',
    level: CourseLevel.BASIC,
    status: CourseStatus.PUBLISHED,
    deliveryMode: CourseDeliveryMode.IN_PERSON_ONLY,
    estimatedHours: 14,
    category: 'Customer Service & Public Engagement',
    department: 'Taxpayer Services Directorate',
    targetAudience: 'Front-desk officers, call center agents, and taxpayer service window staff',
    deliveryMethod: 'Self-paced e-learning with role-play scenario labs',
    objectives:
      'Apply consistent greeting and queue-management standards, de-escalate frustrated taxpayers, maintain service etiquette across channels, and track SLA performance.',
    prerequisites: 'None',
    approvalComments:
      'Returned for revision: Module 2 lacks accessibility considerations for persons with disabilities, and the SLA benchmarks are not aligned with the 2026 Taxpayer Charter revision. Please update the response-time targets and resubmit for approval.',
    modules: [
      {
        title: 'Module 1: Front-Office Conduct & Service Standards',
        description: 'Set the tone for every taxpayer interaction from the first greeting through resolving a complaint.',
        objectives: 'Apply standardized greeting and queue-management protocols; de-escalate frustrated taxpayers professionally.',
        order: 0,
        attachment: pdf('Module 1 - Front-Office Standards Handbook.pdf'),
        assessment: {
          title: 'Module 1 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
          questions: [
            mcq('cserv-m1-q1', 'What is the recommended first step when a taxpayer approaches the service window?', ['Ask for their TIN before anything else', 'Greet them warmly and make eye contact', 'Continue the previous task first', 'Direct them to another window immediately'], 1, 'Greeting Protocols'),
            mcq('cserv-m1-q2', 'When de-escalating a frustrated taxpayer, which technique is most appropriate first?', ['Raise your voice to match theirs', 'Actively listen and acknowledge their frustration before responding', 'Immediately transfer the call', 'Argue the point of policy'], 1, 'De-escalation'),
            tf('cserv-m1-q3', 'True or False: A visible, numbered queue system reduces perceived wait time and taxpayer frustration.', 0, 'Queue Management'),
            mcq('cserv-m1-q4', 'What should a front-office officer do if they cannot resolve a complaint themselves?', ['Ignore the complaint', 'Escalate it to a supervisor following the documented procedure', 'Tell the taxpayer to come back another day with no explanation', 'End the conversation abruptly'], 1, 'Escalation'),
            sa('cserv-m1-q5', 'What is the term for calming an upset taxpayer before addressing the substance of their issue?', 'De-escalation', 'De-escalation'),
          ],
        },
        lessons: [
          {
            title: '1.1 Greeting Protocols, Queue Management & First Impressions',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 0,
            content: `## The First Seven Seconds
Taxpayers form an impression of the entire institution within the first seconds of an interaction. A consistent greeting protocol makes that impression positive regardless of who is on duty.

## Standard Greeting Sequence
1. Make eye contact and smile before the taxpayer finishes approaching.
2. Greet in the taxpayer's preferred language (Amharic or English) using a standard phrase.
3. Ask an open question: "How can I help you today?" rather than assuming their need.

## Queue Management
- Use a visible, numbered ticketing system so taxpayers can see their position without asking.
- Display estimated wait times where possible — uncertainty, not the wait itself, is what drives frustration.
- Rotate staff breaks so the number of open windows never drops during peak hours (typically 9:00–11:00 AM).`,
            attachment: pdf('Lesson 1.1 - Greeting & Queue Protocol Guide.pdf'),
            assessment: {
              title: 'Lesson 1.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Role-Playing Difficult Front-Desk Scenarios',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
Practice three role-play scenarios with a colleague: (1) a taxpayer who has been waiting 40 minutes and is visibly angry, (2) a taxpayer who does not speak the local language fluently, (3) a taxpayer disputing a penalty they believe is incorrect.

## Steps
1. For each scenario, one person plays the taxpayer and one the officer; swap roles after each round.
2. Apply the LEAP technique: **Listen**, **Empathize**, **Apologize** (for the inconvenience, not necessarily fault), **Problem-solve**.
3. Debrief after each round: what phrase worked, what escalated tension unintentionally?

## Deliverable
A short written reflection noting one phrase to keep using and one to avoid, based on the debrief.`,
                attachment: pdf('Sub-Lesson 1.1.1 - Role-Play Scenario Cards.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.1.1 Assessment',
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
            title: '1.2 Handling Complaints & De-escalating Frustrated Taxpayers',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 1,
            content: `## Complaints Are Information, Not Interruptions
A complaint is an opportunity to correct a process failure before it affects more taxpayers. Treating it as an interruption guarantees a worse outcome.

## The Complaint-Handling Sequence
1. **Acknowledge** the taxpayer's frustration explicitly: "I understand this delay is frustrating."
2. **Clarify** the specific issue by asking targeted questions rather than assuming.
3. **Act** within your authority immediately if possible; if not, explain exactly what happens next and by when.
4. **Record** the complaint in the service log regardless of resolution, so patterns can be identified by management.

## When to Escalate
Escalate immediately if the taxpayer requests a supervisor, if the issue involves a policy exception, or if de-escalation attempts have failed twice — do not let an interaction continue indefinitely without bringing in a supervisor.`,
            attachment: pdf('Lesson 1.2 - Complaint Handling Procedure.pdf'),
            assessment: {
              title: 'Lesson 1.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Conflict Resolution Under the LEAP Framework',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
A business taxpayer demands to see the branch manager immediately after being assessed a late penalty due to a server outage on filing day.
1. Draft the exact response using the LEAP framework.
2. Check penalty records in the simulated portal.
3. Submit a formal penalty waiver review request under system outage protocol.`,
                attachment: pdf('Sub-Lesson 1.2.1 - LEAP De-escalation Lab.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.2.1 Assessment',
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
        title: 'Module 2: Multi-Channel Service & Service-Level Commitments',
        description: 'Keep service quality consistent whether a taxpayer walks in, calls, emails, or uses a self-service kiosk.',
        objectives: 'Apply channel-appropriate service etiquette; measure and report against defined service-level targets.',
        order: 1,
        attachment: pdf('Module 2 - Multi-Channel Service Playbook.pdf'),
        assessment: {
          title: 'Module 2 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
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
            title: '2.1 Phone, Email & Digital Kiosk Service Etiquette',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 30,
            order: 0,
            content: `## One Standard, Many Channels
Taxpayers expect the same professionalism whether they walk in, call, email, or use a self-service kiosk. Each channel has specific etiquette rules that support that consistency.

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
            attachment: pdf('Lesson 2.1 - Multi-Channel Etiquette Guide.pdf'),
            assessment: {
              title: 'Lesson 2.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Drafting Standardized Email Response Templates',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
Draft three standardized email templates: (1) acknowledging receipt of a general inquiry, (2) requesting missing documents, (3) confirming resolution of an issue.

## Steps
1. Each template must include: a professional greeting, a clear statement of purpose, next steps with a specific deadline, and a closing with the officer's name and contact channel.
2. Avoid jargon — write at a reading level accessible to a first-time taxpayer.
3. Have a colleague review each draft for tone before adding it to the shared template library.

## Deliverable
Three finalized templates saved to the shared response-template folder for team-wide reuse.`,
                attachment: pdf('Sub-Lesson 2.1.1 - Email Template Lab Pack.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.1.1 Assessment',
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
            title: '2.2 Measuring Service Quality: SLAs, CSAT & Turnaround Targets',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 30,
            order: 1,
            content: `## Why Measurement Matters
Service quality that is not measured cannot be improved. Three metrics keep front-office performance accountable and visible.

## Core Metrics
- **Service-Level Agreement (SLA)**: a defined commitment, e.g. "90% of counter transactions completed within 10 minutes."
- **Customer Satisfaction (CSAT)**: a short post-interaction survey score, typically 1–5, capturing the taxpayer's own experience.
- **Turnaround Time**: the elapsed time from request submission to resolution, tracked per request type.

## Using the Data
Review SLA and CSAT trends monthly with the team — a single missed target is noise, but a declining trend over three consecutive months signals a process problem that needs a root-cause review, not just individual coaching.`,
            attachment: pdf('Lesson 2.2 - Service Metrics Handbook.pdf'),
            assessment: {
              title: 'Lesson 2.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Calculating Turnaround Rates and Action Triggers',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
You are provided with 500 service logs from the Bole sub-city tax branch across three service types: TIN Registration, Tax Clearance Certificate, and Assessment Inquiries.
1. Calculate the percentage of requests meeting their respective 24-hour, 48-hour, and 72-hour SLAs.
2. Identify which service type fell below the 85% compliance threshold.
3. Formulate an operational action plan to remedy bottlenecks.`,
                attachment: pdf('Sub-Lesson 2.2.1 - Service Metrics Calculation Sheet.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.2.1 Assessment',
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
      title: 'Final Assessment',
      passingScore: 75,
      timeLimitMinutes: 25,
      weight: 30,
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
    title: 'Cybersecurity Awareness & Information Protection in Ministry Systems',
    description:
      'Safeguard taxpayer records, prevent phishing and ransomware intrusions, configure multi-factor authentication, and execute incident reporting.',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PUBLISHED,
    deliveryMode: CourseDeliveryMode.ONLINE_ONLY,
    estimatedHours: 20,
    category: 'ICT & Information Security',
    department: 'ICT & Cyber Defense Directorate',
    targetAudience: 'All Ministry personnel accessing email, SigTas, and enterprise revenue databases',
    deliveryMethod: 'Self-paced interactive security awareness training with hands-on phishing simulations',
    objectives:
      'Identify phishing indicators, enforce strong credential practices, classify sensitive taxpayer data, and trigger rapid incident containment.',
    prerequisites: 'Basic computer literacy and active Ministry Active Directory user account',
    approvalComments:
      'Course approved following validation against Information Network Security Administration (INSA) federal standards.',
    modules: [
      {
        title: 'Module 1: Threat Landscape, Social Engineering & Phishing Defense',
        description: 'Understand how attackers target Ministry staff through spear-phishing, spoofed domains, and social engineering.',
        objectives: 'Analyze malicious email indicators, verify sender domains, and inspect embedded hyperlinks safely.',
        order: 0,
        attachment: pdf('Module 1 - Cyber Threat Intelligence & Phishing Manual.pdf'),
        assessment: {
          title: 'Module 1 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
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
            title: '1.1 Recognizing Phishing Vectors & Malicious Attachments',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 0,
            content: `## The Primary Attack Vector: Human Psychology
Over 85% of public-sector data breaches begin with a phishing email. Attackers exploit curiosity, fear, urgency, or authority to manipulate recipients into clicking malicious links or downloading malware.

## Red Flag Checklist
1. **Urgent or Threatening Language**: "Your account will be suspended in 2 hours unless you confirm credentials."
2. **Mismatched Sender Domains**: Display name says "Ministry IT", but actual address is \`support@mor-gov-portal.com\` instead of \`@mor.gov.et\`.
3. **Suspicious Attachments**: Macro-enabled Excel files (\`.xlsm\`), compressed archives (\`.zip\`, \`.iso\`), or direct executables.
4. **Generic Greetings**: "Dear Customer" or "Dear Employee" when claiming to be an internal communication.`,
            attachment: pdf('Lesson 1.1 - Phishing Detection Guidelines.pdf'),
            assessment: {
              title: 'Lesson 1.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Dissecting Spear-Phishing Email Headers & Links',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
Examine 3 simulated email headers captured in our mail security gateway:
1. Identify the genuine originating IP address and return-path header.
2. Compare the display text of the hyperlinks against their actual destination targets using URL inspection.
3. Classify each message as either Authentic, Phishing, or Spam.`,
                attachment: pdf('Sub-Lesson 1.1.1 - Header Analysis Lab Pack.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.1.1 Assessment',
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
            title: '1.2 Password Hygiene, Multi-Factor Authentication & Credential Security',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 1,
            content: `## Passwords Alone Are Not Enough
Compromised passwords are the root cause of credential stuffing and unauthorized system entry. Modern security requires both strong passphrases and Multi-Factor Authentication (MFA).

## Guidelines for Ministry Accounts
- **Passphrase Length**: minimum 14 characters combining uppercase, lowercase, numbers, and symbols.
- **No Password Reuse**: never use your ministry Active Directory password on external sites (e.g. personal email, social media).
- **MFA Enforcement**: always approve MFA prompts only when initiated by yourself; beware of "MFA Fatigue" spam attacks.`,
            attachment: pdf('Lesson 1.2 - Password & MFA Security Policy.pdf'),
            assessment: {
              title: 'Lesson 1.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Configuring Hardware Tokens and Authenticator Apps',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Objective
Enroll your Ministry Active Directory account into Microsoft Authenticator and register a backup hardware FIDO2 key.
1. Download Microsoft Authenticator on a secure device.
2. Scan the one-time registration QR code from the Ministry Self-Service portal.
3. Test number matching verification to block automated push fatigue attacks.`,
                attachment: pdf('Sub-Lesson 1.2.1 - MFA Configuration Guide.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.2.1 Assessment',
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
        title: 'Module 2: Data Classification, Clean Desk Policy & Incident Reporting',
        description: 'Classify taxpayer records, secure physical workstations, and trigger coordinated incident reporting.',
        objectives: 'Differentiate data tiers, enforce screen locking and clean desk protocols, and escalate breaches.',
        order: 1,
        attachment: pdf('Module 2 - Information Security Governance Guide.pdf'),
        assessment: {
          title: 'Module 2 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
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
            title: '2.1 Handling Taxpayer Confidential Data & Privacy Controls',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 35,
            order: 0,
            content: `## The Legal Mandate for Taxpayer Privacy
Under Ethiopian tax law, unauthorized disclosure of taxpayer financial records carries severe disciplinary and criminal penalties.

## MoR Data Classification Tiers
1. **Public**: Published tax guides, public notices, press releases.
2. **Internal Use**: Departmental phone directories, general administrative memos.
3. **Confidential / PII**: Taxpayer Identification Numbers, financial audits, bank balances, payment records.
4. **Secret / Restricted**: High-profile criminal fraud investigations, intelligence leads, cryptographic keys.

## Data Sharing Safeguards
Never email spreadsheets containing unencrypted Confidential PII to external email addresses (e.g. Gmail, Yahoo). Always use encrypted ministry channels.`,
            attachment: pdf('Lesson 2.1 - Confidential Data Classification Matrix.pdf'),
            assessment: {
              title: 'Lesson 2.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Classifying and Redacting Sensitive PII Records',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
You are asked to prepare a public statistical case summary based on an actual tax audit case.
1. Identify all PII fields (Taxpayer Name, TIN, Bank Account Number, Physical Address, Specific Asset Values).
2. Apply true redaction using Adobe Acrobat Redaction tools (not just black highlighter).
3. Sanitize metadata before publishing.`,
                attachment: pdf('Sub-Lesson 2.1.1 - Data Redaction Practice Files.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.1.1 Assessment',
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
            title: '2.2 Security Incident Escalation & Response Protocols',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 30,
            order: 1,
            content: `## When an Attack Happens: Speed Matters
The first 60 minutes of a ransomware or credential breach dictate whether an infection is contained to one workstation or spreads across the entire Ministry network.

## Immediate First-Response Actions
1. **Disconnect from the Network**: physically unplug the ethernet cable and toggle Wi-Fi off immediately. Do NOT power off the computer (powering off destroys volatile RAM evidence needed by forensic investigators).
2. **Alert ICT Cyber Defense**: dial the emergency incident hotline \`+251-11-xxx-xxxx\` or use a clean secondary machine to notify \`soc@mor.gov.et\`.
3. **Preserve the Scene**: take a photo of any ransomware ransom note on screen. Do not attempt to pay ransom or download unofficial decryption tools.`,
            attachment: pdf('Lesson 2.2 - Incident Escalation SOP.pdf'),
            assessment: {
              title: 'Lesson 2.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Executing First-Response Actions in a Breach Incident',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
A simulated workstation begins displaying unexpected encrypted file extensions (.locked) and an unknown command prompt window pops up.
1. Perform immediate network isolation using the virtual interface disconnect switch.
2. Complete the standardized MoR Incident Notification Form (Date, Time, IP, Symptoms observed, Affected files).
3. Submit the ticket to the simulated SOC incident portal.`,
                attachment: pdf('Sub-Lesson 2.2.1 - Incident Simulation Playbook.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.2.1 Assessment',
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
      title: 'Final Assessment',
      passingScore: 75,
      timeLimitMinutes: 30,
      weight: 30,
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
    title: 'Management of Risk (M_o_R®) Foundation in Revenue Operations',
    description:
      'A comprehensive foundation in public sector risk governance, probabilistic risk modeling, mitigation registers, and systematic risk response planning for revenue administrators.',
    level: CourseLevel.ADVANCED,
    status: CourseStatus.PUBLISHED,
    deliveryMode: CourseDeliveryMode.BOTH,
    estimatedHours: 35,
    category: 'Governance, Risk & Compliance',
    department: 'Risk Management & Strategic Compliance Directorate',
    targetAudience: 'Risk officers, senior revenue analysts, branch controllers, and operations leaders',
    deliveryMethod: 'Interactive blended learning: rich self-paced modules, scenario laboratories, and final certification exam',
    objectives:
      'Master the M_o_R framework, conduct rigorous qualitative and quantitative risk assessments, build and maintain institutional risk registers, and design resilient treatment plans.',
    prerequisites: 'Basic knowledge of tax administration procedures and organizational governance',
    approvalComments: 'Approved by Curriculum Accreditation Committee. Fully compliant with international M_o_R® standards.',
    modules: [
      {
        title: 'Module 1: Principles, Approaches & Governance Architecture of Risk',
        description: 'Establish the core governance foundations, statutory risk mandates, and three-lines-of-defense model for revenue administration.',
        objectives: 'Define M_o_R core principles, establish organizational risk appetite, and articulate governance responsibilities.',
        order: 0,
        attachment: pdf('Module 1 - M_o_R Governance Architecture.pdf'),
        assessment: {
          title: 'Module 1 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
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
            title: '1.1 Core Principles of Organizational Risk Management',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            content: `## Why Systematic Risk Governance is Non-Negotiable
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
            attachment: pdf('Lesson 1.1 - Risk Principles & Frameworks.pdf'),
            assessment: {
              title: 'Lesson 1.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Constructing a Ministry Risk Appetite Statement',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                content: `## Lab Scenario
You are assisting the Risk Directorate in defining the Risk Appetite Statement across three categories:
1. **Tax Law Compliance**: Zero tolerance for deliberate corruption or statutory non-compliance.
2. **Digital Innovation**: Moderate tolerance for piloting new automated filing apps and taxpayer-facing kiosks.
3. **Operational Expenditure**: Conservative tolerance with tight deviation thresholds (< 3% variance).

## Deliverable
Formulate a 1-page Risk Appetite Framework establishing specific threshold triggers and escalation criteria for each category.`,
                attachment: pdf('Sub-Lesson 1.1.1 - Risk Appetite Workshop Template.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.1.1 Assessment',
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
            title: '1.2 Roles, Responsibilities & the Three Lines of Defense',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            content: `## Structure Prevents Conflict of Interest
Risk management cannot succeed if the same team executing transactions is also the sole team inspecting them.

## The Three Lines Model in Action
- **Line 1 - Frontline Operational Managers**: Branch controllers, tax auditors, counter supervisors. They own and manage risks directly in daily operations.
- **Line 2 - Enterprise Risk & Compliance**: The central Risk Directorate. They provide the framework, challenge assessments, monitor registers, and train Line 1.
- **Line 3 - Internal Audit**: Fully independent assurance reporting directly to the Audit Committee. They verify whether Line 1 and Line 2 controls are operating effectively.`,
            attachment: pdf('Lesson 1.2 - Three Lines of Defense in Tax Administration.pdf'),
            assessment: {
              title: 'Lesson 1.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Assigning Risk Ownership in a Branch Office',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
Given 6 identified operational risks in a regional customs and tax branch:
1. Document fraud in import declarations.
2. IT cash register network outages.
3. Bribery solicitation during field audit.
4. Loss of archived paper tax dossiers.
5. Inaccurate tax clearance certificates.
6. Cashier shortages.

## Task
Assign a designated **Risk Owner** and **Action Owner** for each risk in accordance with the Three Lines model, and define mandatory reporting frequencies.`,
                attachment: pdf('Sub-Lesson 1.2.1 - Branch Risk Delegation Matrix.pdf'),
                assessment: {
                  title: 'Sub-Lesson 1.2.1 Assessment',
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
        title: 'Module 2: Risk Identification, Assessment & Register Maintenance',
        description: 'Techniques for uncovering emerging risks, qualitative vs quantitative scoring, probability-impact matrices, and treatment formulation.',
        objectives: 'Conduct risk discovery workshops, calculate inherent and residual risk scores, and populate complete institutional risk registers.',
        order: 1,
        attachment: pdf('Module 2 - Risk Register & Assessment Standards.pdf'),
        assessment: {
          title: 'Module 2 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 15,
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
            title: '2.1 Qualitative & Quantitative Risk Scoring',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            content: `## Moving from Intuition to Structured Scoring
Vague statements like "this might be a big problem" cannot be prioritized. Structured risk assessment rates both **Probability (Likelihood)** and **Impact (Severity)**.

## The 5x5 Scoring Scale
- **Probability**: 1 (Rare < 10%), 2 (Unlikely 10-30%), 3 (Possible 30-60%), 4 (Likely 60-85%), 5 (Almost Certain > 85%).
- **Impact**: 1 (Negligible), 2 (Minor), 3 (Moderate), 4 (Major), 5 (Catastrophic: statutory disruption or revenue loss > 50M ETB).
- **Risk Score**: \`Probability x Impact\` (Ranges from 1 to 25).
- **Risk Tiers**: Low (1-6, Green), Medium (8-12, Amber), High (15-25, Red).`,
            attachment: pdf('Lesson 2.1 - Qualitative Scoring & Impact Criteria.pdf'),
            assessment: {
              title: 'Lesson 2.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Building a 5x5 Probability-Impact Heat Map',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 30,
                order: 0,
                content: `## Lab Scenario
Plot 5 identified tax compliance risks onto a 5x5 matrix:
1. Risk A (P:4, I:5, Major corporate VAT evasion).
2. Risk B (P:2, I:2, Delays in office supply delivery).
3. Risk C (P:5, I:3, High turnover of senior tax audit accountants).
4. Risk D (P:3, I:4, Core SigTas system unplanned outage during tax deadline week).
5. Risk E (P:1, I:5, Severe earthquake damaging regional revenue archive).

## Deliverable
Construct the colored heat map and identify which 2 risks require immediate Board-level escalation.`,
                attachment: pdf('Sub-Lesson 2.1.1 - Heat Map Template & Exercise.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.1.1 Assessment',
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
            title: '2.2 Designing Treatment Plans & Contingency Responses',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 40,
            order: 1,
            content: `## Selecting the Right Response Strategy
Identifying a risk without an actionable treatment plan is useless. M_o_R defines clear response categories.

## Response Options
- **Avoid**: Change the plan to eliminate the threat entirely (e.g. cancel a high-risk manual payment channel).
- **Reduce (Mitigate)**: Take proactive measures to lower probability or impact (e.g. implement automated dual-authorization).
- **Fallback (Contingency)**: Prepare an action plan triggered only if the risk occurs (e.g. backup power generator).
- **Transfer**: Shift financial impact to a third party (e.g. insurance policy, outsourced security warranty).
- **Share**: Partner with other agencies or private vendors to share risk and rewards.
- **Accept**: Consciously retain the risk if the cost of mitigation exceeds potential loss.`,
            attachment: pdf('Lesson 2.2 - Risk Treatment & Contingency Manual.pdf'),
            assessment: {
              title: 'Lesson 2.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
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
                title: 'Practical Lab: Formulating Mitigation Controls for Tax Evasion Risks',
                contentType: LessonContentType.DOCUMENT,
                durationMinutes: 25,
                order: 0,
                content: `## Lab Scenario
You are assigned to draft a comprehensive Risk Treatment Action Plan for the risk: "Under-declaration of commercial import duties through fraudulent invoice documentation."
1. Identify 3 preventive controls (e.g. mandatory digital pre-clearance, cross-border price database matching).
2. Identify 2 detective controls (e.g. post-clearance random audits, automated customs anomaly algorithms).
3. Identify 1 corrective control (e.g. immediate asset freezing and penalty assessment).
4. Calculate the anticipated reduction from Inherent Risk Score (20) to Residual Risk Score (6).`,
                attachment: pdf('Sub-Lesson 2.2.1 - Tax Compliance Mitigation Plan.pdf'),
                assessment: {
                  title: 'Sub-Lesson 2.2.1 Assessment',
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
      title: 'Final Assessment',
      passingScore: 75,
      timeLimitMinutes: 35,
      weight: 30,
      questions: [
        mcq('mor-fn-q1', 'What is the primary objective of Management of Risk (M_o_R)?', ['To eliminate all business activities that carry any uncertainty', 'To support informed decision making and enhance organizational resilience through systematic risk management', 'To create bureaucratic paperwork', 'To guarantee 100% tax collection without fail'], 1, 'M_o_R Core'),
        mcq('mor-fn-q2', 'In the Three Lines model, who has direct operational ownership of risk controls?', ['The frontline operational management (Line 1)', 'External consultants', 'The news media', 'The Board Audit Committee only'], 0, 'Governance Model'),
        tf('mor-fn-q3', 'True or False: Inherent risk refers to risk exposure before considering the effect of mitigating internal controls.', 0, 'Risk Concepts'),
        mcq('mor-fn-q4', 'Which treatment strategy shifts financial exposure to a third party such as an insurance underwriter?', ['Transfer', 'Avoid', 'Reduce', 'Accept'], 0, 'Treatment Strategies'),
        sa('mor-fn-q5', 'What is the term for the risk level that remains after all mitigation responses and internal controls have been applied?', 'Residual Risk', 'Risk Terminology'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 6. PUBLISHED: Customs Physical Inspection & Valuation Practicum (IN_PERSON_ONLY)
  // ─────────────────────────────────────────────────────────
  {
    code: 'INSP101',
    title: 'Physical Customs Inspection & Valuation Field Practicum',
    description:
      'Hands-on physical classroom and laboratory inspection course covering cargo scanning, physical contraband detection, HS code valuation disputes, and joint border enforcement.',
    level: CourseLevel.INTERMEDIATE,
    status: CourseStatus.PUBLISHED,
    deliveryMode: CourseDeliveryMode.IN_PERSON_ONLY,
    estimatedHours: 24,
    category: 'Customs & Border Control',
    department: 'Customs Valuation & Physical Inspection Directorate',
    targetAudience: 'Border inspection agents, customs officers, and freight examination specialists',
    deliveryMethod: 'Physical in-person workshop with equipment lab and scenario exercises',
    objectives: 'Master physical cargo verification, identify contraband concealment, and resolve valuation conflicts.',
    prerequisites: 'Basic customs legislation orientation',
    approvalComments: 'Approved for regional branch delivery at accredited Ministry training centers.',
    modules: [
      {
        title: 'Module 1: Physical Examination Protocols & Detection Techniques',
        description: 'Standard operating procedures for cargo physical verification and risk-based screening.',
        objectives: 'Demonstrate safe container unsealing, sampling, and non-intrusive scan interpretation.',
        order: 0,
        attachment: pdf('INSP101-Module1-Guide.pdf'),
        assessment: {
          title: 'Module 1 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 30,
          questions: [
            mcq('insp-m1-q1', 'What is the primary action before opening a sealed transit container?', ['Verify seal serial numbers against the customs manifest', 'Break seal immediately without documentation', 'Leave seal intact without inspection', 'Ask driver to cut seal'], 0, 'Inspection SOP'),
            tf('insp-m1-q2', 'Physical examination reports must be signed by both customs inspector and taxpayer representative.', 0, 'SOP Compliance'),
          ],
        },
        lessons: [
          {
            title: 'Lesson 1.1: Cargo Seal Verification & Chain of Custody',
            contentType: LessonContentType.DOCUMENT,
            durationMinutes: 45,
            order: 0,
            content: 'Comprehensive guide to container seal integrity and physical verification.',
            attachment: pdf('INSP101-L1-Seals.pdf'),
            assessment: {
              title: 'Lesson 1.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 20,
              questions: [
                tf('insp-l1-q1', 'High-security mechanical bolt seals comply with ISO 17712 standards.', 0, 'Seal Standards'),
              ],
            },
          },
        ],
      },
    ],
    finalAssessment: {
      title: 'Final Assessment',
      passingScore: 75,
      timeLimitMinutes: 30,
      weight: 50,
      questions: [
        mcq('insp-fn-q1', 'Which document establishes the legal basis for customs cargo re-examination?', ['Customs Proclamation & Physical Inspection Directive', 'Commercial Sales Invoice only', 'Transport Waybill', 'Warehouse Gate Pass'], 0, 'Legal Standards'),
        tf('insp-fn-q2', 'Discrepancies found during physical examination must be referred immediately to valuation dispute units.', 0, 'Valuation Protocols'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // 7. PUBLISHED: Ethiopian Tax Fundamentals (ONLINE_ONLY)
  // ─────────────────────────────────────────────────────────
  {
    code: 'TAX101',
    title: 'Ethiopian Tax System Fundamentals & Digital Filing Standards',
    description:
      'Pure online self-paced e-learning curriculum covering Ethiopian tax proclamations, VAT withholding, income tax brackets, electronic declarations, and taxpayer rights.',
    level: CourseLevel.BASIC,
    status: CourseStatus.PUBLISHED,
    deliveryMode: CourseDeliveryMode.ONLINE_ONLY,
    estimatedHours: 15,
    category: 'Tax Administration & Law',
    department: 'Tax Advisory & Compliance Education Directorate',
    targetAudience: 'Revenue staff, new recruits, tax accountants, and enterprise tax declarants',
    deliveryMethod: '100% online self-paced interactive modules and automated knowledge assessments',
    objectives: 'Understand tax structures, calculate obligations correctly, and operate Ministry e-tax services.',
    prerequisites: 'None',
    approvalComments: 'Accredited for nationwide digital onboarding across all 13 federal regional offices.',
    modules: [
      {
        title: 'Module 1: Principles of Ethiopian Taxation Architecture',
        description: 'Comprehensive analysis of direct vs indirect tax regimes, the Ethiopian Federal Income Tax Proclamation No. 979/2016, withholding compliance, and Value Added Tax standards.',
        objectives: 'Classify income schedules across Schedules A through E, correctly execute commercial and employment tax withholdings, understand 15% VAT mechanisms, and master digital e-filing submissions.',
        order: 0,
        attachment: pdf('TAX101-Module1-Guide.pdf'),
        assessment: {
          title: 'Module 1 Assessment',
          passingScore: 70,
          timeLimitMinutes: 15,
          weight: 20,
          questions: [
            mcq('tax-m1-q1', 'What is the standard Value Added Tax (VAT) rate in Ethiopia?', ['15%', '10%', '5%', '20%'], 0, 'Tax Rates'),
            tf('tax-m1-q2', 'Employment income is categorized under Schedule A of the Federal Income Tax Proclamation.', 0, 'Schedules'),
          ],
        },
        lessons: [
          {
            title: 'Lesson 1.1: Legal Framework & Withholding Responsibilities',
            contentType: LessonContentType.VIDEO,
            durationMinutes: 30,
            order: 0,
            content: `## 1. Statutory Architecture of the Ethiopian Tax System
The federal tax regime of the Federal Democratic Republic of Ethiopia is anchored by two fundamental proclamations enacted in 2016:
- **Federal Tax Administration Proclamation No. 983/2016**: Defines systemic procedural rules, taxpayers' rights and obligations, administrative audit mechanisms, tax dispute tribunals, and civil/criminal penalties for non-compliance.
- **Federal Income Tax Proclamation No. 979/2016**: Establishes taxable events, standard income classifications across Schedules A through E, corporate tax treatments, and withholding mechanics at source.

## 2. Income Classification Schedules (A through E)
Under Proclamation No. 979/2016, income is segregated into five distinct schedules:
1. **Schedule A (Employment Income)**: Progressive monthly taxation ranging from 0% (up to 600 ETB) to a 35% marginal rate on monthly taxable income exceeding 10,900 ETB. Employers act as statutory withholding agents.
2. **Schedule B (Rental Income)**: Net rental income derived from leasing immovable real estate (residential, commercial, and industrial property).
3. **Schedule C (Business Income)**: Profits generated through commercial, industrial, or professional services operated by sole proprietorships or registered corporate bodies (standard corporate rate: 30%).
4. **Schedule D (Other Income)**: Specialized receipts including dividends (10%), royalties (5%), interest on bank deposits (5%), and capital gains.
5. **Schedule E (Exempt Income)**: Statutory exemptions, including accredited diplomatic compensation, contributions to recognized retirement pensions within statutory limits, and employment injury compensation.

## 3. Domestic Withholding Requirements
Withholding at source accelerates revenue flows and minimizes uncollected tax liabilities:
- **2% Withholding on Local Transactions**: Government agencies, public enterprises, share companies, and Category A business entities are legally required to withhold 2% from the gross payment on any single transaction exceeding **10,000 ETB** for goods or **3,000 ETB** for services.
- **Mandatory Remittance Timeline**: All withholding agents must remit withheld funds to the Ministry of Revenues within **30 days** following the end of the calendar month in which the withholding occurred.
- **Issuance of Receipts**: Agents must issue official Ministry of Revenues withholding certificates (MoR-WR-01) to suppliers within 10 days of transaction completion.

## 4. Compliance Penalties & Enforcement
Strict statutory sanctions apply under Chapter 14 of Proclamation No. 983/2016:
- **Late Remittance**: 20% penalty applied on unpaid withholdings plus daily interest compounded at the commercial bank lending rate + 2%.
- **Failure to Withhold**: The withholding agent becomes personally and jointly liable for the unwithheld tax amount.`,
            attachments: [
              video('sample.mp4'),
              pdf('TAX101-L1-LegalFramework-Manual.pdf'),
            ],
            assessment: {
              title: 'Lesson 1.1 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 10,
              questions: [
                tf('tax-l1-q1', 'Tax withholding agents must remit collected withholdings within 30 days of the subsequent month.', 0, 'Remittance Deadlines'),
                mcq('tax-l1-q2', 'What is the standard withholding rate on local supplies of goods exceeding 10,000 ETB?', ['2%', '5%', '10%', '15%'], 0, 'Withholding Rates'),
              ],
            },
          },
          {
            title: 'Lesson 1.2: Value Added Tax (VAT) Architecture & Digital E-Filing',
            contentType: LessonContentType.VIDEO,
            durationMinutes: 35,
            order: 1,
            content: `## 1. Fundamental Principles of Value Added Tax
Value Added Tax in Ethiopia is governed by **VAT Proclamation No. 285/2002** (as amended):
- **Tax Mechanics**: A multi-stage consumption tax levied on the value added at each stage of production and commercial distribution. The tax burden is ultimately borne by the final consumer.
- **Standard Tax Rate**: **15%** charged on all taxable supplies of domestic goods and services, as well as taxable imports into the customs territory.
- **Registration Threshold**: Mandatory registration is required for any commercial entity whose annual taxable turnover exceeds **1,000,000 ETB** over a 12-month period. Eligible businesses must submit their VAT registration application within 30 days of crossing this threshold.

## 2. Supply Classifications: Taxable, Zero-Rated & Exempt
Correct classification is imperative for valid tax invoicing and input VAT reclaims:
1. **Taxable Supplies (15%)**: Standard commercial sales of products, professional consulting, construction works, hospitality, and imported manufactured goods.
2. **Zero-Rated Supplies (0%)**:
   - Export of goods and services produced in Ethiopia to external foreign markets.
   - International air transport of passengers and cargo originating in Ethiopia.
   - Supplies to accredited diplomatic missions and inter-governmental agencies.
   - *Key Advantage*: Zero-rated suppliers can fully reclaim and obtain refunds for input VAT incurred on their operational business purchases.
3. **Exempt Supplies (No VAT Charged, No Input Credit Allowed)**:
   - Primary agricultural commodities and unprocessed staples (e.g., teff, wheat, barley, raw milk).
   - Public passenger road transportation and mass transit services.
   - Essential medical diagnostic services and prescription pharmaceuticals.
   - Financial, banking, and insurance services.
   - Educational services delivered by accredited institutions.

## 3. Ministry SIGTAS Portal & Digital E-Filing Operations
Under the Ministry's digital transformation mandate, Category A and B taxpayers must file through the Ministry of Revenues e-Services portal:
- **Monthly Filing Schedule**: VAT declarations and accompanying input/output schedules must be submitted between the 1st and the final day of the month following the accounting period.
- **Fiscal Cash Registers (FCR) & EIS**: All registered sellers must generate electronic fiscal receipts from registered machines or certified electronic invoicing systems connected to Ministry audit servers.
- **Input Tax Deduction Rules**: Input VAT may only be credited against output liabilities if supported by a valid fiscal invoice displaying both buyer and seller Tax Identification Numbers (TIN), sequential receipt numbers, and distinct tax itemization.
- **Statutory Audit Trail**: Digital journals, VAT return copies, and electronic payment confirmation receipts must be safely archived in electronic format for a statutory minimum of **10 years**.`,
            attachments: [
              video('sample.mp4'),
              pdf('TAX101-L2-VAT-and-EFiling-Guide.pdf'),
            ],
            assessment: {
              title: 'Lesson 1.2 Assessment',
              passingScore: 70,
              timeLimitMinutes: 10,
              weight: 20,
              questions: [
                mcq('tax-l2-q1', 'What is the mandatory annual turnover threshold for VAT registration in Ethiopia?', ['1,000,000 ETB', '500,000 ETB', '2,000,000 ETB', '100,000 ETB'], 0, 'VAT Thresholds'),
                tf('tax-l2-q2', 'Zero-rated suppliers are legally entitled to reclaim input VAT paid on their business purchases.', 0, 'Input VAT Reclaim'),
                mcq('tax-l2-q3', 'What is the standard Value Added Tax (VAT) rate in Ethiopia?', ['15%', '10%', '12%', '18%'], 0, 'Tax Rates'),
              ],
            },
          },
        ],
      },
    ],
    finalAssessment: {
      title: 'Final Assessment',
      passingScore: 75,
      timeLimitMinutes: 30,
      weight: 50,
      questions: [
        mcq('tax-fn-q1', 'Which proclamation governs the Federal Tax Administration in Ethiopia?', ['Proclamation No. 983/2016', 'Proclamation No. 286/2002', 'Commercial Code 1960', 'Customs Regulation 2010'], 0, 'Federal Legislation'),
        tf('tax-fn-q2', 'E-filing via the Ministry portal is mandatory for Category A taxpayers.', 0, 'Digital Compliance'),
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

  // 3. Remove existing seed and learner progress data cleanly
  console.log('🗑️  Wiping all existing progress, attempts, certificates, templates, sessions, attendance, enrollments, venues, courses...');
  await prisma.certificate.deleteMany({});
  await prisma.certificateTemplate.deleteMany({});
  await prisma.assessmentAttempt.deleteMany({});
  await prisma.lessonCompletion.deleteMany({});
  await prisma.moduleCompletion.deleteMany({});
  await prisma.attendanceLog.deleteMany({});
  await prisma.attendance.deleteMany({});
  await (prisma as any).sessionPreparedQuestion?.deleteMany?.({});
  await (prisma as any).sessionPreparedQuiz?.deleteMany?.({});
  await prisma.liveSession.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.contentApproval.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.questionBankQuestion.deleteMany({});

  // 3a. Seed Certificate Templates
  await seedTemplates(prisma);

  // 3a1. Seed Dynamic Lookup Categories
  await seedCategories(prisma);

  // 3a2. Seed Tax & Customs Laws Categories and Documents
  await seedLaws();

  // 3b. Seed Ministry Branch Venues
  console.log('🏢 Seeding Ministry Branch Venues...');
  const venueSeeds = [
    {
      name: 'Addis Ababa HQ - Training Hall A',
      branch: 'Addis Ababa Head Office',
      building: 'Block B, 3rd Floor, Room 302',
      capacity: 35,
      facilities: ['Projector', 'Smart Board', 'Air Conditioning', 'WiFi', 'Sound System'],
    },
    {
      name: 'Addis Ababa HQ - Executive Lab 2',
      branch: 'Addis Ababa Head Office',
      building: 'Block A, 1st Floor, Room 108',
      capacity: 25,
      facilities: ['Individual Laptops', 'Dual Screens', 'Interactive Display', 'Video Conferencing', 'Gigabit LAN'],
    },
    {
      name: 'Hawassa Regional Training Hub',
      branch: 'Hawassa Branch Office',
      building: 'Southern Branch Complex, 2nd Floor',
      capacity: 30,
      facilities: ['Projector', 'Audio System', 'Backup Generator', 'High-speed Internet', 'Whiteboard'],
    },
    {
      name: 'Bahir Dar Branch Room 101',
      branch: 'Bahir Dar Branch Office',
      building: 'Lake Tana Revenue Center, Ground Floor',
      capacity: 28,
      facilities: ['Projector', 'Whiteboard', 'WiFi', 'UPS Power Backup'],
    },
    {
      name: 'Adama Branch Multi-Purpose Center',
      branch: 'Adama Branch Office',
      building: 'Main Administrative Hall, 1st Floor',
      capacity: 40,
      facilities: ['Ceiling Projector', 'PA Audio System', 'Fiber Internet', 'Air Conditioning'],
    },
    {
      name: 'Dire Dawa Revenue Training Lab',
      branch: 'Dire Dawa Branch Office',
      building: 'Eastern Division Building, 3rd Floor',
      capacity: 20,
      facilities: ['Computer Workstations', 'Smart Projector', 'Dedicated LAN', 'Air Conditioning'],
    },
  ];

  const venueMap: Record<string, any> = {};
  for (const v of venueSeeds) {
    const venue = await prisma.venue.create({
      data: {
        name: v.name,
        branch: v.branch,
        building: v.building,
        capacity: v.capacity,
        facilities: v.facilities,
        isActive: true,
      },
    });
    venueMap[v.name] = venue;
    console.log(`  ✓ Venue: ${v.name} (${v.branch}) - Capacity: ${v.capacity}`);
  }

  // Affiliate Trainer to Primary Venue
  if (trainerId && venueMap['Addis Ababa HQ - Training Hall A']) {
    await prisma.user.update({
      where: { id: trainerId },
      data: {
        primaryVenueId: venueMap['Addis Ababa HQ - Training Hall A'].id,
      },
    });
    console.log(`  ✓ Affiliated Trainer to: Addis Ababa HQ - Training Hall A`);
  }

  // 4. Seed the comprehensive courses
  console.log('📚 Seeding comprehensive courses across all lifecycle statuses...');

  for (const c of courseSeeds) {
    console.log(`\n📌 Creating Course: [${c.code}] ${c.title} (${c.status})...`);

    const course = await prisma.course.create({
      data: {
        code: c.code,
        title: c.title,
        description: c.description,
        level: c.level,
        status: c.status,
        thumbnailUrl: COVER,
        estimatedHours: c.estimatedHours,
        category: c.category,
        department: c.department,
        targetAudience: c.targetAudience,
        deliveryMethod: c.deliveryMethod,
        deliveryMode: c.deliveryMode || CourseDeliveryMode.BOTH,
        objectives: c.objectives,
        prerequisites: c.prerequisites,
        publishedAt: c.status === CourseStatus.PUBLISHED ? new Date() : null,
        owners: {
          create: {
            userId: ownerId,
          },
        },
        trainers: c.deliveryMode === CourseDeliveryMode.ONLINE_ONLY && !c.hasOnlineSessions ? undefined : { create: { userId: trainerId } },
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
      console.log(`   📦 Module ${mod.order + 1}: ${mod.title}`);
      const createdMod = await prisma.curriculumModule.create({
        data: {
          courseId: course.id,
          title: mod.title,
          description: mod.description,
          objectives: mod.objectives,
          order: mod.order,
          passingScore: mod.assessment.passingScore,
        },
      });

      // Module Attachments
      const modAttachments = mod.attachments ?? (mod.attachment ? [mod.attachment] : []);
      for (const att of modAttachments) {
        await prisma.attachment.create({
          data: {
            courseId: course.id,
            moduleId: createdMod.id,
            fileName: att.fileName,
            fileKey: att.fileKey ?? (att.fileType.startsWith('video') ? VIDEO_FILE_KEY : PDF_FILE_KEY),
            fileUrl: att.fileUrl ?? (att.fileType.startsWith('video') ? VIDEO_FILE_URL : PDF_FILE_URL),
            fileType: att.fileType,
            sizeBytes: att.sizeBytes ?? (att.fileType.startsWith('video') ? VIDEO_SIZE_BYTES : PDF_SIZE_BYTES),
            uploadedById: ownerId,
          },
        });
      }

      // Module Assessment
      const modQuestions = normalizeAssessmentQuestions(mod.assessment);
      await prisma.assessment.create({
        data: {
          courseId: course.id,
          moduleId: createdMod.id,
          type: AssessmentType.MODULE_ASSESSMENT,
          titleEn: mod.assessment.title,
          titleAm: mod.assessment.title,
          descriptionEn: mod.assessment.description || "",
          descriptionAm: mod.assessment.description || "",
          passingScore: mod.assessment.passingScore,
          weight: mod.assessment.weight ?? 0,
          timeLimitMinutes: mod.assessment.timeLimitMinutes,
          questions: modQuestions.map(correctAnswerFirst) as unknown as Prisma.InputJsonValue,
        },
      });

      // Record questions into Question Bank
      for (const q of modQuestions.map(correctAnswerFirst)) {
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
        console.log(`      📖 Lesson ${les.order + 1}: ${les.title}`);
        const createdLesson = await prisma.lesson.create({
          data: {
            moduleId: createdMod.id,
            parentId: null,
            title: les.title,
            content: les.content,
            contentType: les.contentType,
            resourceUrl: les.contentType === LessonContentType.VIDEO ? SAMPLE_VIDEO : null,
            durationMinutes: 1,
            order: les.order,
          },
        });

        // Lesson Attachments
        const lesAttachments = les.attachments ?? (les.attachment ? [les.attachment] : []);
        for (const att of lesAttachments) {
          await prisma.attachment.create({
            data: {
              courseId: course.id,
              moduleId: createdMod.id,
              lessonId: createdLesson.id,
              fileName: att.fileName,
              fileKey: att.fileKey ?? (att.fileType.startsWith('video') ? VIDEO_FILE_KEY : PDF_FILE_KEY),
              fileUrl: att.fileUrl ?? (att.fileType.startsWith('video') ? VIDEO_FILE_URL : PDF_FILE_URL),
              fileType: att.fileType,
              sizeBytes: att.sizeBytes ?? (att.fileType.startsWith('video') ? VIDEO_SIZE_BYTES : PDF_SIZE_BYTES),
              uploadedById: ownerId,
            },
          });
        }

        // Lesson Assessment
        const lesQuestions = normalizeAssessmentQuestions(les.assessment);
        await prisma.assessment.create({
          data: {
            courseId: course.id,
            moduleId: createdMod.id,
            lessonId: createdLesson.id,
            type: AssessmentType.LESSON_ASSESSMENT,
            titleEn: les.assessment.title,
            titleAm: les.assessment.title,
            passingScore: les.assessment.passingScore,
            weight: les.assessment.weight ?? 0,
            timeLimitMinutes: les.assessment.timeLimitMinutes,
            questions: lesQuestions.map(correctAnswerFirst) as unknown as Prisma.InputJsonValue,
          },
        });

        for (const q of lesQuestions.map(correctAnswerFirst)) {
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
            console.log(`         🔬 Sub-lesson: ${sub.title}`);
            const createdSub = await prisma.lesson.create({
              data: {
                moduleId: createdMod.id,
                parentId: createdLesson.id,
                title: sub.title,
                content: sub.content,
                contentType: sub.contentType,
                resourceUrl: sub.contentType === LessonContentType.VIDEO ? SAMPLE_VIDEO : null,
                durationMinutes: 1,
                order: sub.order,
              },
            });

            // Sub-lesson Attachments
            const subAttachments = sub.attachments ?? (sub.attachment ? [sub.attachment] : []);
            for (const att of subAttachments) {
              await prisma.attachment.create({
                data: {
                  courseId: course.id,
                  moduleId: createdMod.id,
                  lessonId: createdSub.id,
                  fileName: att.fileName,
                  fileKey: att.fileKey ?? (att.fileType.startsWith('video') ? VIDEO_FILE_KEY : PDF_FILE_KEY),
                  fileUrl: att.fileUrl ?? (att.fileType.startsWith('video') ? VIDEO_FILE_URL : PDF_FILE_URL),
                  fileType: att.fileType,
                  sizeBytes: att.sizeBytes ?? (att.fileType.startsWith('video') ? VIDEO_SIZE_BYTES : PDF_SIZE_BYTES),
                  uploadedById: ownerId,
                },
              });
            }
          }
        }
      }
    }

    // Final Assessment for Course
    const finalQuestions = normalizeAssessmentQuestions(c.finalAssessment);
    await prisma.assessment.create({
      data: {
        courseId: course.id,
        type: AssessmentType.FINAL_ASSESSMENT,
        titleEn: c.finalAssessment.title,
        titleAm: c.finalAssessment.title,
        passingScore: c.finalAssessment.passingScore,
        weight: c.finalAssessment.weight ?? 0,
        timeLimitMinutes: c.finalAssessment.timeLimitMinutes,
        questions: finalQuestions.map(correctAnswerFirst) as unknown as Prisma.InputJsonValue,
      },
    });

    for (const q of finalQuestions.map(correctAnswerFirst)) {
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
  }

  // 5. Schedule Sessions & Dual-Mode Enrollments for testing
  // 5. Schedule Sessions for Hybrid and In-Person testing
  console.log('\n📅 Scheduling In-Person Classrooms & Virtual Sessions...');
  const morCourse = await prisma.course.findFirst({ where: { code: 'MOR101' } });
  const projCourse = await prisma.course.findFirst({ where: { code: 'PROJ201' } });
  const inspCourse = await prisma.course.findFirst({ where: { code: 'INSP101' } });
  const cservCourse = await prisma.course.findFirst({ where: { code: 'CSERV101' } });

  const now = new Date();

  // MOR101 (Hybrid) Sessions
  await prisma.liveSession.create({
    data: {
      courseId: morCourse!.id,
      trainerId: trainerId,
      titleEn: 'Live In-Person Case Study & Mitigation Lab',
      titleAm: 'Live In-Person Case Study & Mitigation Lab',
      descriptionEn: 'Interactive in-person workshop on institutional risk assessment and mitigation design.',
      descriptionAm: 'Interactive in-person workshop on institutional risk assessment and mitigation design.',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      venueId: venueMap['Addis Ababa HQ - Training Hall A'].id,
      scheduledAt: new Date(now.getTime() - 15 * 60 * 1000), // Started 15 minutes ago
      durationMinutes: 120,
      status: SessionStatus.LIVE,
      allowViewAttendance: true,
    },
  });

  await prisma.liveSession.create({
    data: {
      courseId: morCourse!.id,
      trainerId: trainerId,
      titleEn: 'Risk Management Classroom Practicum - Group A',
      titleAm: 'Risk Management Classroom Practicum - Group A',
      descriptionEn: 'In-person classroom risk register modeling and scenario evaluation.',
      descriptionAm: 'In-person classroom risk register modeling and scenario evaluation.',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      venueId: venueMap['Addis Ababa HQ - Training Hall A'].id,
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days in future
      durationMinutes: 180,
      status: SessionStatus.SCHEDULED,
      allowViewAttendance: true,
    },
  });

  await prisma.liveSession.create({
    data: {
      courseId: morCourse!.id,
      trainerId: trainerId,
      titleEn: 'Regional Risk Governance Workshop - Hawassa Hub',
      titleAm: 'Regional Risk Governance Workshop - Hawassa Hub',
      descriptionEn: 'Regional branch training for South-East regional tax directors.',
      descriptionAm: 'Regional branch training for South-East regional tax directors.',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      venueId: venueMap['Hawassa Regional Training Hub'].id,
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days in future
      durationMinutes: 120,
      status: SessionStatus.SCHEDULED,
      allowViewAttendance: true,
    },
  });

  await prisma.liveSession.create({
    data: {
      courseId: morCourse!.id,
      trainerId: trainerId,
      titleEn: 'National Virtual Risk Review & Q&A Webinar',
      titleAm: 'National Virtual Risk Review & Q&A Webinar',
      descriptionEn: 'Online interactive consultation session with national risk leadership.',
      descriptionAm: 'Online interactive consultation session with national risk leadership.',
      platform: SessionPlatform.LIVEKIT,
      sessionType: SessionType.VIRTUAL,
      venueId: null,
      scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days in future
      durationMinutes: 60,
      status: SessionStatus.SCHEDULED,
      allowViewAttendance: true,
    },
  });

  // PROJ201 (Hybrid) Sessions
  await prisma.liveSession.create({
    data: {
      courseId: projCourse!.id,
      trainerId: trainerId,
      titleEn: 'Government Project Planning & Gantt Scheduling Lab',
      titleAm: 'Government Project Planning & Gantt Scheduling Lab',
      descriptionEn: 'Hands-on scheduling and earned value calculation in computer lab.',
      descriptionAm: 'Hands-on scheduling and earned value calculation in computer lab.',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      venueId: venueMap['Addis Ababa HQ - Executive Lab 2'].id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      durationMinutes: 180,
      status: SessionStatus.SCHEDULED,
      allowViewAttendance: true,
    },
  });

  await prisma.liveSession.create({
    data: {
      courseId: projCourse!.id,
      trainerId: trainerId,
      titleEn: 'Strategic Infrastructure Delivery Workshop - Adama',
      titleAm: 'Strategic Infrastructure Delivery Workshop - Adama',
      descriptionEn: 'Regional project managers workshop on public milestone delivery.',
      descriptionAm: 'Regional project managers workshop on public milestone delivery.',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      venueId: venueMap['Adama Branch Multi-Purpose Center'].id,
      scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      durationMinutes: 150,
      status: SessionStatus.SCHEDULED,
      allowViewAttendance: true,
    },
  });

  // INSP101 (In-Person) Sessions
  await prisma.liveSession.create({
    data: {
      courseId: inspCourse!.id,
      trainerId: trainerId,
      titleEn: 'Customs Cargo Seal Verification & Security Simulation',
      titleAm: 'Customs Cargo Seal Verification & Security Simulation',
      descriptionEn: 'Physical container inspection and high-security seal verification.',
      descriptionAm: 'Physical container inspection and high-security seal verification.',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      venueId: venueMap['Addis Ababa HQ - Executive Lab 2'].id,
      scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      durationMinutes: 150,
      status: SessionStatus.SCHEDULED,
      allowViewAttendance: true,
    },
  });

  await prisma.liveSession.create({
    data: {
      courseId: inspCourse!.id,
      trainerId: trainerId,
      titleEn: 'Border Freight Physical Examination Clinic - Dire Dawa',
      titleAm: 'Border Freight Physical Examination Clinic - Dire Dawa',
      descriptionEn: 'Regional customs valuation and physical inspection practicum.',
      descriptionAm: 'Regional customs valuation and physical inspection practicum.',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      venueId: venueMap['Dire Dawa Revenue Training Lab'].id,
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      durationMinutes: 120,
      status: SessionStatus.SCHEDULED,
      allowViewAttendance: true,
    },
  });

  // CSERV101 (In-Person) Sessions
  await prisma.liveSession.create({
    data: {
      courseId: cservCourse!.id,
      trainerId: trainerId,
      titleEn: 'Front-Office Taxpayer Conflict De-escalation Workshop',
      titleAm: 'Front-Office Taxpayer Conflict De-escalation Workshop',
      descriptionEn: 'Interactive role-play on queue management and complaint resolution.',
      descriptionAm: 'Interactive role-play on queue management and complaint resolution.',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      venueId: venueMap['Addis Ababa HQ - Training Hall A'].id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      durationMinutes: 180,
      status: SessionStatus.SCHEDULED,
      allowViewAttendance: true,
    },
  });

  await prisma.liveSession.create({
    data: {
      courseId: cservCourse!.id,
      trainerId: trainerId,
      titleEn: 'Customer Service Excellence Field Seminar - Bahir Dar',
      titleAm: 'Customer Service Excellence Field Seminar - Bahir Dar',
      descriptionEn: 'Regional front-desk taxpayer care standards workshop.',
      descriptionAm: 'Regional front-desk taxpayer care standards workshop.',
      platform: SessionPlatform.IN_PERSON,
      sessionType: SessionType.IN_PERSON,
      venueId: venueMap['Bahir Dar Branch Room 101'].id,
      scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      durationMinutes: 120,
      status: SessionStatus.SCHEDULED,
      allowViewAttendance: true,
    },
  });

  console.log('\n🎓 All 6 courses left unenrolled with 0 progress for clean learner testing!');
  console.log('  • 2 Pure Online courses ready in catalog: TAX101, CYBER301');
  console.log('  • 2 Hybrid courses ready in catalog: MOR101, PROJ201');
  console.log('  • 2 In-Person courses ready in catalog: INSP101, CSERV101');

  console.log('\n🎉 Comprehensive database seed finished successfully!');
  console.log('──────────────────────────────────────────────────────────');
  console.log('Demo Accounts summary: (Password: password)');
  for (const d of demoAccounts) {
    console.log(`  • ${d.email.padEnd(28)} → ${d.role}`);
  }
  console.log('──────────────────────────────────────────────────────────');
  console.log('Ministry Venues:');
  for (const v of venueSeeds) {
    console.log(`  • ${v.name.padEnd(38)} (${v.branch}) - Capacity: ${v.capacity}`);
  }
  console.log('──────────────────────────────────────────────────────────');
  console.log('Courses seeded:');
  for (const c of courseSeeds) {
    console.log(`  • [${c.status.padEnd(16)}] [${(c.deliveryMode || 'BOTH').padEnd(14)}] ${c.code.padEnd(10)} - ${c.title}`);
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
