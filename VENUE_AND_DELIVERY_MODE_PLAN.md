# Venue Management & Course Delivery Mode Implementation Plan (2-Stage Execution)

This plan details the complete end-to-end design and step-by-step implementation for **Course Delivery Modes** (`ONLINE_ONLY`, `IN_PERSON_ONLY`, `BOTH`) and **Physical Venue Management** (allocating rooms, branch facilities, seat capacity limits, multi-classroom batch scheduling, and in-person attendance check-in) directly fulfilling Ministry of Revenues **Requirement 4.14** (*Resource Management: Allocate instructors, training materials, and venues*).

---

## Architecture & System Overview

```
                                  Course Authoring (Step 1)
                      ┌───────────────────────────────────────────────┐
                      │ Delivery Mode: ONLINE_ONLY | IN_PERSON | BOTH │
                      └───────────────────────┬───────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
           [ 🌐 Pure Online ]                                  [ 📍 In-Person ]
           • 100% web-based                                    • Requires Physical Venue
           • Web classroom & video                             • Capped by Seat Capacity
           • Self-paced & quizzes                              • Physical Attendance Check-In
                    │                                                   │
                    └─────────────────────────┬─────────────────────────┘
                                              │
                             Training Admin Session Scheduler
                      ┌───────────────────────────────────────────────┐
                      │ Step 1: Session Details (Title, Date, Time)   │
                      │ Step 2: Multi-Venue Batch Allocation Table    │
                      │   - HQ Computer Lab 1 (Cap: 30) | Trainer A   │
                      │   - Hawassa Hall A    (Cap: 25) | Trainer B   │
                      │   - Bahir Dar Lab 2   (Cap: 20) | Trainer C   │
                      └───────────────────────┬───────────────────────┘
                                              │
                                 Learner Course Catalog
                      ┌───────────────────────────────────────────────┐
                      │ Enrolls Online OR Chooses Venue Classroom     │
                      │ Real-time Seat Counter increments (+1)        │
                      └───────────────────────┬───────────────────────┘
                                              │
                                      Learner Dashboard
                      ┌───────────────────────────────────────────────┐
                      │ • Online Card: [ ▶️ Resume Online Course ]     │
                      │ • In-Person Card: [ 🗺️ Venue & Room 304 Info ] │
                      │   + [ 📱 Scan Room QR Code to Check In ]      │
                      └───────────────────────────────────────────────┘
```

---

## Stage 1: Data Model, Admin Venue Directory, Course Authoring & Multi-Venue Batch Scheduler

Stage 1 establishes the foundational data structures, the Course Creation Wizard delivery settings, the Venue Management interface, and the 2-step multi-venue batch scheduling wizard.

### 1.1 Database Architecture & Schema Enhancements (`backend/prisma/schema.prisma`)
1. **New `Venue` Model**:
   ```prisma
   model Venue {
     id          String        @id @default(uuid())
     name        String        // e.g. "MoR HQ - Computer Lab 1"
     building    String?       // e.g. "Main Building, 3rd Floor"
     branch      String        // e.g. "Addis Ababa Head Office", "Hawassa", "Bahir Dar"
     capacity    Int           @default(30)
     facilities  String[]      // ["Projector", "30 Desktop PCs", "Ministry Intranet"]
     isActive    Boolean       @default(true) @map("is_active")
     createdAt   DateTime      @default(now()) @map("created_at")
     updatedAt   DateTime      @updatedAt @map("updated_at")

     trainers    User[]        @relation("TrainerPrimaryVenue")
     sessions    LiveSession[]
     enrollments Enrollment[]

     @@index([branch])
     @@map("venues")
   }
   ```
2. **`Course` Model Updates**:
   * Add `deliveryMode`:
     ```prisma
     enum CourseDeliveryMode {
       ONLINE_ONLY
       IN_PERSON_ONLY
       BOTH
     }
     ```
   * Set `deliveryMode CourseDeliveryMode @default(BOTH) @map("delivery_mode_type")`.
3. **`User` Model Updates (Trainer Affiliation)**:
   * Add `primaryVenueId String? @map("primary_venue_id")`.
   * Add `primaryVenue Venue? @relation("TrainerPrimaryVenue", fields: [primaryVenueId], references: [id], onDelete: SetNull)`.
4. **`LiveSession` Model Updates**:
   * Add `sessionType SessionType @default(VIRTUAL) @map("session_type")` where `enum SessionType { VIRTUAL, IN_PERSON }`.
   * Add `venueId String? @map("venue_id")`.
   * Add `venue Venue? @relation(fields: [venueId], references: [id], onDelete: SetNull)`.
5. **`Enrollment` Model Updates**:
   * Add `deliveryMode CourseDeliveryMode @default(ONLINE_ONLY) @map("enrolled_delivery_mode")`.
   * Add `venueId String? @map("enrolled_venue_id")`.
   * Add `venue Venue? @relation(fields: [venueId], references: [id], onDelete: SetNull)`.
   * Add `sessionId String? @map("enrolled_session_id")`.

### 1.2 Backend Venues Module (`backend/src/modules/venues`)
* **Controller & Service**:
  * `GET /venues`: List all active venues (with optional filter by `branch`).
  * `POST /venues`: Create a new venue with capacity and facilities (`admin` permission).
  * `PATCH /venues/:id`: Update room capacity, status, or facilities.
  * `DELETE /venues/:id`: Soft-delete/deactivate venue.
  * `GET /venues/:id/availability`: Check room conflict for a specific date and time interval.
* **Batch Session Creation Endpoint**:
  * `POST /live-sessions/batch`: Creates multiple venue-linked sessions from the Step 2 allocation table in a single atomic transaction.

### 1.3 Course Creation Wizard: Delivery Mode Selector
* **Target File**: `frontend/src/components/features/courses/StepCourseDetails.tsx` & `CourseCreationWizard.tsx`
* **UI Controls**:
  * Add radio selector with visual cards:
    * `🌐 Pure Online Only` (Self-paced browser modules, videos, online quizzes).
    * `📍 In-Person Only` (Hands-on practical training requiring physical Ministry room).
    * `🔄 Both (Flexible)` (Learners can take online OR attend in-person classroom).
* **API Integration**: Store `deliveryMode` in the course payload during create/update.

### 1.4 Admin Venue Directory & Management UI
* **Target Route**: `frontend/src/app/(dashboard)/training-admin/venues/page.tsx`
* **Features**:
  * List all registered Ministry venues grouped by branch (Addis Ababa, Hawassa, Bahir Dar, Adama, etc.).
  * Capacity indicator badge (`Cap: 30 seats`), facility pills (`Projector`, `Desktop PCs`).
  * Modal to **"Register New Training Venue"** with validation.
  * Direct link from Training Admin sidebar under *Resource Management*.

### 1.5 Trainer Registration & Branch/Venue Affiliation
* **Target Files**:
  * `frontend/src/app/(dashboard)/system-admin/register-actor/page.tsx`
  * `frontend/src/components/features/users/UserDetailModal.tsx`
* When assigning or registering a `TRAINER`:
  * Add a **"Primary Training Branch / Venue"** dropdown.
  * This links the trainer to their base location (e.g. *Trainer Sara -> Hawassa Branch*).

### 1.6 2-Step Multi-Venue Batch Session Scheduler
* **Target File**: `frontend/src/components/features/sessions/ScheduleSessionModal.tsx`
* **Step 1: Session Details**:
  * Course dropdown, Session Title, Description, Default Date, Default Start Time, Duration.
  * Format selector: `Virtual (LiveKit)` vs `In-Person Classroom`.
  * If Virtual selected -> immediately create single LiveKit session.
  * If In-Person selected -> `[ Continue to Venue Allocation → ]`.
* **Step 2: Interactive Venue Allocation Table**:
  * Clean interactive table where each row contains:
    1. **Venue Dropdown**: Select room (pre-populates room capacity).
    2. **Assigned Trainer Dropdown**: Filtered by branch affiliation with quick switch.
    3. **Date Picker**: Defaults to Step 1 date, editable per row.
    4. **Start Time**: Defaults to Step 1 time, editable per row.
    5. **Capacity Pill**: Max seats.
    6. **Actions**: Remove row.
  * **`+ Add Another Venue` Button**: Adds a new row to schedule an additional regional branch simultaneously.
  * **Submit**: Submits the batch to `POST /live-sessions/batch`.

---

## Stage 2: Learner Catalog, Seat Capacity Enforcement, Dual-Mode Dashboard & In-Person Attendance

Stage 2 connects the learners and trainers: enrolling with seat reservations, rendering the dual-mode learner dashboard, and executing physical attendance check-in.

### 2.1 Course Catalog & Enrollment Modal with Venue Selection & Capacity
* **Target Files**:
  * `frontend/src/components/features/courses/CatalogCourseModal.tsx`
  * `frontend/src/components/features/enroll/EnrollmentForm.tsx`
* **Enrollment UX**:
  * If course is `ONLINE_ONLY`: Standard 1-click **"Enroll in Online Course"**.
  * If course is `IN_PERSON_ONLY` or `BOTH`:
    * Show interactive enrollment choices:
      * `(●) Pure Online (Self-Paced)` (if `BOTH` allowed).
      * `( ) In-Person Classroom Training`:
        * List of upcoming scheduled sessions by location:
          * `[•] Addis Ababa — MoR HQ Lab 1 (Oct 15) · 14/30 seats booked`
          * `[ ] Hawassa — Hall A (Oct 15) · 8/25 seats booked`
          * `[ ] Bahir Dar — Lab 2 (Oct 16) · 20/20 seats (FULL 🔒)`
    * Live capacity validation: Venues at max capacity are disabled (`Full`).
    * On enrollment submit: Increments occupied seats count and binds `venueId` and `sessionId` to the `Enrollment`.

### 2.2 Learner Dashboard Dual-Mode Experience
* **Target File**: `frontend/src/app/(dashboard)/learner/page.tsx`
* **Filter Tabs**:
  * `[ All Courses ]  [ 🌐 Pure Online ]  [ 📍 In-Person ]`
* **Card Differentiation**:
  * **Pure Online Cards**:
    * Badge: `🌐 Pure Online`.
    * Progress bar: `65% completed`.
    * Button: `[ ▶️ Resume Online Course ]` -> routes to `/learn` classroom.
  * **In-Person Cards**:
    * Badge: `📍 In-Person Classroom · MoR HQ Lab 1`.
    * Schedule pill: `📅 Oct 15, 2026 · 09:00 AM | Trainer: Girma T.`.
    * Primary button: `[ 🗺️ Venue & Room 304 Details ]`.
    * Secondary button: `[ 📄 Download Course Slides/PDF ]`.
* **Adaptive Hero Banner**:
  * Automatically highlights an in-person workshop if scheduled within the next 48 hours with room directions and check-in prompt.
* **Upcoming Schedule Area**:
  * Groups both virtual video links (`[ 📹 Join Video Room ]`) and physical rooms (`[ 📍 View Room Details ]`).

### 2.3 Trainer & Admin In-Person Attendance & Room QR Check-In
* **Target Files**:
  * `frontend/src/app/(dashboard)/trainer/attendance/page.tsx`
  * `frontend/src/components/features/sessions/LiveSessionWorkspace.tsx`
  * `backend/src/modules/attendance/attendance.service.ts`
* **In-Person Attendance Roster**:
  * Trainer selects their in-person session: displays only learners registered for that venue.
  * 1-Click **"Mark Present / Late / Absent"** with instantaneous optimistic UI update.
* **Room QR Check-In Code**:
  * Trainer clicks **"Show Attendance QR"** -> renders full-screen scannable QR on the classroom projector.
  * Learner clicks **"Scan Room QR Code"** on their mobile browser -> hits `/attendance/check-in/qr` with session verification token.
  * System records attendance with `checkInMethod: "QR"` and timestamps.

### 2.4 Seed Data & End-to-End Verification
* **Database Seeding (`backend/prisma/seed.ts`)**:
  * Seed 5 official Ministry venues:
    1. *MoR Head Office — Main Computer Lab 1 (30 seats, PCs, Projector)*
    2. *MoR Head Office — Executive Conference Hall B (50 seats, Smart Screen)*
    3. *Hawassa Branch — Training Hall A (35 seats, Audio System)*
    4. *Bahir Dar Branch — IT Training Lab 2 (25 seats, PCs)*
    5. *Adama Branch — Customs Training Room (30 seats, Inspection Demo)*
  * Affiliate demo trainers to respective branches (`girma.trainer@mor.gov.et -> HQ`, `sara.trainer@mor.gov.et -> Hawassa`).
  * Seed courses spanning `ONLINE_ONLY`, `IN_PERSON_ONLY`, and `BOTH`.
* **Testing & Verification**:
  * Verify room capacity increment and lockout when full.
  * Verify multi-venue session batch creation.
  * Verify learner dashboard rendering and filter tabs.
  * Run `npx tsc --noEmit` and `npm run build` on frontend and backend to guarantee zero regressions.

---

## Execution Schedule & Deliverables

| Stage | Focus Areas | Key Deliverables | Status |
| :--- | :--- | :--- | :---: |
| **Stage 1** | Foundation & Admin Tools | • `Venue` Prisma model & migration<br>• Delivery mode selector in Course Details<br>• Admin Venues directory (`/training-admin/venues`)<br>• Trainer venue affiliation<br>• 2-Step Multi-Venue Batch Scheduler | ⏳ Ready |
| **Stage 2** | Learner Experience & Attendance | • Catalog enrollment with venue choice & capacity cap<br>• Learner dashboard dual-mode cards & filter tabs<br>• Trainer in-person roster & Room QR check-in<br>• MoR seed data & automated tests | ⏳ Queued |

