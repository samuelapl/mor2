# Certificate Management & Learner Certification Plan

This plan outlines the architecture, design, and modular implementation for:
1. **Learner Course Certification**: Accessing and viewing the official certificate directly inside the classroom below the Final Assessment upon course completion.
2. **Admin Template Management & Visual Customizer**: Managing, designing, uploading assets (Logo, Stamp, Signatures, QR), positioning elements, activating, duplicating, and deleting certificate templates.
3. **3 Pre-Configured Templates (1 Active by Default)**: Including the reference design from the uploaded sample.

---

## 1. Visual Reference & Certificate Anatomy

Based on the provided reference certificate:

![Certificate Reference](file:///home/samuelapl/.gemini/antigravity/brain/1669c55b-1f75-4598-a8cb-12f21c676e45/certificate_reference.png)

### Key Certificate Components:
| Component | Default Placement | Configurable Attributes |
| :--- | :--- | :--- |
| **Company Logo** | Top-Left | Image upload (PNG/JPG), X/Y position, Width/Height, Alignment |
| **Verification QR Code** | Top-Left (below logo or corner) | Auto-generated QR pointing to `/verify-code?code=...`, X/Y position, Size, Toggle on/off |
| **Verified Badge** | Top-Right | Text ("VERIFIED"), Badge icon, X/Y position, Toggle on/off |
| **Certificate Title** | Top-Center | "Certificate of Training" / "Certificate of Completion", Font size, Color, Weight |
| **Preamble Text** | Center | "THIS IS TO CERTIFY THAT", Tracking, Font size, Color |
| **Recipient / Learner Name** | Center Prominent | Dynamic Learner Full Name, Serif/Script font, Font size, Color, Weight |
| **Completion Statement** | Center | "has successfully completed the training course" |
| **Course Title** | Center Bold | Dynamic Course Title, Bold font, Color |
| **Course Details Note** | Center | "by participating & completing all modules and passing all evaluation tests." |
| **Metadata Row** | Left & Right mid-body | Left: `Course Hours: {N} Hours` · Right: `Date: {DD/MM/YYYY}` |
| **Signatures** | Bottom-Left & Bottom-Right | Primary & Secondary signature images, Signer names, Signer titles (e.g. "CEO", "Founder") |
| **Official Stamp / Seal** | Bottom-Center | Circular organization seal image (PNG), Size, "Issued by: {Organization}" |
| **Footer Note / Legal** | Bottom-Center edge | Small platform verification text and URL |
| **Border / Frame Theme** | Perimeter | Geometric corner accents, border colors (Navy, Gold, Slate), background texture |

---

## 2. Architecture & Data Flow

```
                                Admin Workspace
                       (/system-admin/certificate-templates)
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
   [Template List & Status]    [Visual Asset & Layout Editor]  [Set Single Active Template]
   - 3 Pre-built templates     - Upload Logo, Stamp, Sigs      - POST /certificate-templates/:id/activate
   - Active template badge     - Drag / coordinate controls
   - Delete / Duplicate        - Real-time Live Preview
                                      │
                                      ▼ (Saves template config JSON)
                          Postgres: `certificate_templates`
                                      │
                                      ▼
                        Course Completion Engine
                    (Learner passes Final Assessment)
                                      │
                                      ▼
                      Auto-Issue Certificate Record
                       (Generates PDF via pdf-lib)
                                      │
                                      ▼
                             Interactive Classroom
                    (/learner/courses/[courseId]/learn)
                                      │
                                      ▼
                     Curriculum Navigation Sidebar
                     ├─ Module 1...
                     ├─ Module 2...
                     ├─ 📝 Final Certification Assessment
                     └─ 🎓 Course Certificate of Completion [NEW]
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
            [LOCKED STATE]                            [UNLOCKED STATE]
     (If course not yet completed)             (Course completed & passed)
     - Explains completion criteria            - Renders high-fidelity certificate
     - Final assessment requirement checklist  - Download PDF button
                                               - Print Certificate button
                                               - Live QR code verification
```

---

## 3. The 3 Pre-Configured Templates (1 Active by Default)

We will seed and support **3 distinct, professional templates**:

### Template 1: "Modern Executive / Analyst Skill Style" (**ACTIVE BY DEFAULT**)
* **Visual Style**: Clean navy blue geometric corner accents, crisp white background, dark blue and slate typography.
* **Layout**:
  * Top-Left: Organization Logo + Dynamic Verification QR code.
  * Top-Right: Circular "VERIFIED" trust seal.
  * Center: Elegant italicized recipient name and bold course title.
  * Bottom: Dual signatures (Left: CEO, Right: Founder/Director) flanking a center circular official verification stamp.
* **Target Audience**: Corporate trainings, professional certifications, and executive seminars.

### Template 2: "MoR Official Gold & Navy"
* **Visual Style**: Formal ministerial design featuring an intricate dual-line gold border, navy blue ribbon banner, and the official Ministry of Revenues emblem.
* **Layout**:
  * Top-Center: Official MoR Crest / Logo.
  * Center: Formal governmental certificate declaration and recipient credentials.
  * Bottom: Official Green/Gold ministerial seal, authorized registrar signature, and ministerial director signature.
* **Target Audience**: Tax authority certifications, compliance courses, and official government accreditations.

### Template 3: "Tech Sleek Minimalist"
* **Visual Style**: Modern tech academy aesthetics with dark slate / cyan gradient borders, clean sans-serif typography, and subtle micro-grid watermark.
* **Layout**:
  * Top: Minimalist logo and credential metadata.
  * Center: Bold contemporary typography with course duration and skills mastered.
  * Bottom: Single digital signature, cryptographic verification hash, and high-contrast QR code.
* **Target Audience**: Digital skills, IT systems, software training, and technical workshops.

---

## 4. Frontend Implementation

### Component 1: `CertificateRenderer.tsx` (Shared Visual Canvas)
* **Location**: `frontend/src/components/features/certificates/CertificateRenderer.tsx`
* **Responsibilities**:
  * Pure presentational component that renders the full certificate in high resolution (16:11 aspect ratio, A4 landscape equivalent).
  * Accepts dynamic certificate data (holder name, course title, course code, duration, completion date, certificate number, verification code) and template configuration (colors, logo URL, stamp URL, signatures, QR position).
  * Supports interactive web view, modal view, and **CSS Print Media** (`@media print { ... }` so pressing Print outputs a crisp, perfectly scaled landscape certificate).

### Component 2: `CertificateTemplatesAdmin.tsx` (Admin Management & Visual Editor)
* **Location**: `frontend/src/components/features/certificates/CertificateTemplatesAdmin.tsx`
* **Enhanced Capabilities**:
  * **Template Gallery**: View all templates with cards showing active indicator, version, number of fields, and quick actions:
    * `Activate` (instantly makes it the active template for newly earned certificates)
    * `Edit` (opens the visual editor)
    * `Duplicate` (creates a copy for customization)
    * `Delete` (removes unused templates)
  * **Visual Layout & Asset Manager**:
    * **Brand Assets Section**:
      * Company Logo upload & placement (PNG/JPG, position X/Y %, width/height)
      * Official Stamp / Seal upload & placement (PNG/JPG, position X/Y %, diameter)
      * Primary Signature upload & metadata (Signature PNG, Signer Name, Signer Title, X/Y %)
      * Secondary Signature upload & metadata (Signature PNG, Signer Name, Signer Title, X/Y %)
      * QR Code toggle and position (X/Y %, size)
    * **Theme & Border Customizer**:
      * Border style picker (Modern Executive, Classic Gold, Tech Minimalist)
      * Primary brand color, accent color, text color
    * **Live Interactive Split Preview**:
      * Real-time preview canvas updating live as inputs or sliders are adjusted.

### Component 3: `CertificateStage.tsx` (Learner Classroom Stage)
* **Location**: `frontend/src/components/features/classroom/stage/CertificateStage.tsx`
* **Responsibilities**:
  * Mounted in `ClassroomStage.tsx` when the learner selects the `CERTIFICATE` item.
  * **When Course is Completed**:
    * Fetches the learner's issued certificate for this course (or triggers auto-issue).
    * Displays the full certificate rendered via `CertificateRenderer`.
    * Action toolbar:
      * **Download PDF**: Direct download of the generated PDF file.
      * **Print Certificate**: Triggers browser print dialog optimized for landscape A4.
      * **Copy Verification Link**: Copies public verification URL (`/verify-code?code=...`).
  * **When Course is Incomplete**:
    * Renders an elegant locked screen with an interactive checklist:
      * [x] Modules & Lessons completed
      * [ ] Final Certification Assessment passed (Score requirement: {passingScore}%)
    * Explains how to unlock the certificate.

### Component 4: Curriculum Navigation & Sidebar Integration
* **Files**:
  * `frontend/src/components/features/classroom/types.ts`: Add `"CERTIFICATE"` to `ClassroomItemType`.
  * `frontend/src/components/features/classroom/hooks/useClassroomNavigation.ts`:
    * Append `CERTIFICATE` flat item right below `FINAL_ASSESSMENT`.
    * Unlocked status matches course completion (`completedLessons === totalLessons && finalAssessmentPassed`).
  * `frontend/src/components/features/classroom/ClassroomSidebar.tsx`:
    * Render `Certificate of Completion` with an `Award` icon directly below the Final Assessment.
    * Displays a green checkmark when earned, or a lock icon when pending.

---

## 5. Backend Implementation

### 1. Template Schema & Storage
The existing `CertificateTemplate` model in `schema.prisma` already provides:
* `id`, `name`, `description`, `isActive`, `backgroundUrl`, `fields` (Json), `version`, `createdById`.
We will structure the `fields` JSON to hold:
```json
{
  "theme": "modern_executive",
  "logo": {
    "url": "/logo.jpg",
    "x": 6,
    "y": 8,
    "width": 140
  },
  "qr": {
    "x": 6,
    "y": 20,
    "size": 80,
    "visible": true
  },
  "stamp": {
    "url": "/stamp.png",
    "x": 50,
    "y": 76,
    "size": 90,
    "text": "Issued by: Analyst Skill eLearning"
  },
  "signatures": [
    {
      "id": "sig_1",
      "name": "MD. Morshedul Alam ACMA",
      "title": "CEO, Analyst Skill",
      "url": "/signature-1.png",
      "x": 18,
      "y": 78,
      "width": 120
    },
    {
      "id": "sig_2",
      "name": "MD. Morshedul Alam ACMA",
      "title": "Founder & CEO, Analyst Skill e-Learning",
      "url": "/signature-2.png",
      "x": 82,
      "y": 78,
      "width": 120
    }
  ],
  "textFields": [
    { "key": "holderName", "x": 50, "y": 38, "size": 32, "bold": true, "align": "center" },
    { "key": "courseTitle", "x": 50, "y": 50, "size": 24, "bold": true, "align": "center" },
    { "key": "courseHours", "x": 15, "y": 62, "size": 14, "bold": false, "align": "left" },
    { "key": "issuedAt", "x": 85, "y": 62, "size": 14, "bold": false, "align": "right" }
  ]
}
```

### 2. Enhanced PDF Generation in `certificates.service.ts`
* Update `generatePdf` and `renderTemplatedPdf` in `backend/src/modules/certificates/certificates.service.ts`:
  * Embed and draw the Company Logo image.
  * Embed and draw Signatures at configured X/Y coordinates.
  * Embed and draw the Official Stamp/Seal.
  * Generate and embed the QR Code image pointing to the public verification endpoint.
  * Render borders and text fields with precise typography.

### 3. Database Seed / Migration
* Add a dedicated migration or seed function (`seedCertificateTemplates()`) that populates the 3 templates in `certificate_templates`:
  * Template 1: "Modern Executive (Analyst Skill)" (`is_active = true`)
  * Template 2: "MoR Official Gold & Navy" (`is_active = false`)
  * Template 3: "Tech Sleek Minimalist" (`is_active = false`)

---

## 6. Modular File Modifications & Additions

### Frontend
1. **[NEW]** `frontend/src/components/features/certificates/CertificateRenderer.tsx`: Reusable high-resolution certificate canvas with CSS print styling.
2. **[NEW]** `frontend/src/components/features/classroom/stage/CertificateStage.tsx`: Classroom certification stage (interactive certificate + download/print actions + locked checklist).
3. **[MODIFY]** `frontend/src/components/features/classroom/types.ts`: Add `CERTIFICATE` to `ClassroomItemType`.
4. **[MODIFY]** `frontend/src/components/features/classroom/hooks/useClassroomNavigation.ts`: Add certificate item to sequence below final assessment.
5. **[MODIFY]** `frontend/src/components/features/classroom/ClassroomSidebar.tsx`: Render certificate entry below final assessment.
6. **[MODIFY]** `frontend/src/components/features/classroom/stage/ClassroomStage.tsx`: Add `CERTIFICATE` case rendering `CertificateStage`.
7. **[MODIFY]** `frontend/src/components/features/certificates/CertificateTemplatesAdmin.tsx`: Enhance with Asset Uploaders (Logo, Stamp, Signatures), live visual preview, and template operations.

### Backend
1. **[MODIFY]** `backend/src/modules/certificates/certificates.service.ts`: Enhanced `renderTemplatedPdf` supporting images (logos, stamps, signatures, QR) in PDF generation.
2. **[NEW / SEED]** `backend/prisma/seed-templates.ts`: Seed script to insert the 3 templates into Postgres with Template 1 active.

---

## 7. Verification & Testing Plan

1. **Database & API Verification**:
   - Seed the 3 templates into Postgres.
   - Run `GET /certificate-templates` to confirm 3 templates are returned.
   - Run `GET /certificate-templates/active` to verify Template 1 is active.
   - Test `POST /certificate-templates/:id/activate` to switch active template.
2. **Admin Template Customizer**:
   - Navigate to `/system-admin/certificate-templates`.
   - Verify all 3 templates display with preview cards and active badges.
   - Test uploading logo, signature, and stamp images.
   - Test live preview updating in real-time.
   - Test duplicate and delete actions.
3. **Learner Classroom Experience**:
   - Navigate to `/learner/courses/[courseId]/learn`.
   - Verify `Certificate of Completion` is visible in the sidebar below the Final Assessment.
   - Before completing course: verify it shows the locked requirements screen.
   - After passing final assessment: verify the certificate unlocks and renders the interactive Certificate with learner name, course title, signatures, stamp, and QR code.
   - Test "Download PDF" and "Print Certificate" buttons.
4. **Build & Type Safety**:
   - Run `npx tsc --noEmit` in both `frontend` and `backend`.
   - Run `npm run build` in `frontend` to guarantee 0 build errors.

