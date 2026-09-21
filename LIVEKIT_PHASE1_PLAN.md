# Phase 1: LiveKit Core Video & Automated Server-Side Attendance Tracking

> **Target Codebase**: MoR Tele E-Learning Training Management System (`eltms`)
> **Backend**: NestJS (TypeScript, Prisma, Express, PostgreSQL)
> **Frontend**: Next.js 14 (App Router, React 18, Tailwind CSS)
> **Goal**: Replace the embedded Jitsi iframe and mock video stage with a native LiveKit WebRTC room, generate secure scoped access tokens, and track 100% tamper-proof learner attendance via LiveKit server webhooks into Prisma.

---

## 1. Prerequisites & Environment Variables

### 1.1 Backend Configuration (`backend/.env` & `backend/.env.example`)
Add the following LiveKit environment keys:
```env
# LiveKit WebRTC Configuration
LIVEKIT_URL="wss://your-livekit-domain.livekit.cloud" # or ws://localhost:7880 for local docker
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
LIVEKIT_WEBHOOK_SECRET="webhook-secret" # Optional if using same API secret
```

Update `backend/src/config/validation.schema.ts`:
- Add `LIVEKIT_URL` (String, Optional/Required depending on env)
- Add `LIVEKIT_API_KEY` (String, Optional/Required)
- Add `LIVEKIT_API_SECRET` (String, Optional/Required)

Update `backend/src/config/app.config.ts`:
```typescript
export const LiveKitConfig = {
  url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
  apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
  apiSecret: process.env.LIVEKIT_API_SECRET || 'secret',
} as const;
```

### 1.2 Frontend Configuration (`frontend/.env.local` & `frontend/.env.example`)
```env
NEXT_PUBLIC_LIVEKIT_URL="wss://your-livekit-domain.livekit.cloud"
```

---

## 2. Dependencies Installation

### 2.1 Backend (`d:\projects\lemat\mor2\backend`)
```bash
npm install livekit-server-sdk
```

### 2.2 Frontend (`d:\projects\lemat\mor2\frontend`)
```bash
npm install livekit-client @livekit/components-react @livekit/components-styles
```

---

## 3. Database Schema Update (`backend/prisma/schema.prisma`)

Update `enum SessionPlatform` to include `LIVEKIT`:
```prisma
enum SessionPlatform {
  LIVEKIT
  ZOOM
  GOOGLE_MEET
  MS_TEAMS
}
```

Run Prisma generation & migration:
```bash
npx prisma generate
# In development:
npx prisma migrate dev --name add_livekit_platform
```

---

## 4. Backend Implementation (NestJS)

### 4.1 LiveKit Provider Service (`backend/src/modules/live-sessions/providers/livekit.provider.ts`)
Create a dedicated provider to encapsulate LiveKit Token creation and room management:
- **Class**: `LiveKitProvider`
- **Methods**:
  - `generateToken(roomName: string, participant: { identity: string; name: string; isTrainer: boolean; metadata?: Record<string, any> }): Promise<string>`
    - Uses `AccessToken` from `livekit-server-sdk`.
    - If `isTrainer`: Grant permissions `roomJoin: true`, `canPublish: true`, `canSubscribe: true`, `canPublishData: true`.
    - If `learner`: Grant permissions `roomJoin: true`, `canPublish: true` (or audio-only/by request), `canSubscribe: true`, `canPublishData: true`.
    - Set TTL (e.g. session duration + 2 hours).
  - `verifyWebhook(body: string | Buffer, authHeader: string): WebhookEvent`
    - Uses `WebhookReceiver` from `livekit-server-sdk` with `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.

### 4.2 Module Registration (`backend/src/modules/live-sessions/live-sessions.module.ts`)
- Register `LiveKitProvider` in `providers` and `exports`.

### 4.3 Token Endpoint (`backend/src/modules/live-sessions/live-sessions.controller.ts`)
Add endpoint for authenticated clients to obtain their LiveKit room token:
- **Route**: `GET /api/v1/live-sessions/:id/livekit-token`
- **Guards**: `JwtAuthGuard`
- **Logic**:
  1. Fetch `LiveSession` by `id`. Ensure not deleted and status is `SCHEDULED` or `LIVE`.
  2. If user is a Learner, verify `Enrollment` in `courseId` is `ACTIVE`.
  3. Determine if user is host/moderator:
     ```typescript
     const isStaff = user.roles.some(r => ['TRAINER', 'COURSE_OWNER', 'TRAINING_ADMIN', 'SYSTEM_ADMIN'].includes(r)) || session.trainerId === user.id;
     ```
  4. Call `liveKitProvider.generateToken(...)`.
  5. Return `{ token: string, wsUrl: string, roomName: string }`.

### 4.4 Webhook Endpoint & Raw Body Handling
LiveKit signs webhooks using sha256 HMAC in the `Authorization` header, requiring access to the raw payload.

1. **Raw Body Support**: In `backend/src/main.ts` or a webhook-specific middleware, ensure `rawBody: true` is enabled or capture raw buffer on the webhook path:
   ```typescript
   const app = await NestFactory.create(AppModule, { rawBody: true });
   ```
2. **Webhook Controller**:
   - **Route**: `POST /api/v1/live-sessions/webhook`
   - Mark as public (`@Public()` decorator so JWT guard is bypassed).
   - Read `req.rawBody` and header `Authorization`.
   - Verify event using `liveKitProvider.verifyWebhook(...)`.

### 4.5 Webhook Event Handling in Attendance Service (`backend/src/modules/attendance/attendance.service.ts`)
Handle the 3 primary events emitted by LiveKit:

1. **`participant_joined`**:
   - Extract `room.name` (this is `sessionId`) and `participant.identity` (this is `userId`).
   - Upsert `Attendance`:
     - If record does not exist: create with `status: ABSENT`, `joinedAt: new Date()`, `rejoinCount: 0`.
     - If record exists: increment `rejoinCount`.
   - Create `AttendanceLog`:
     - `eventType: "JOIN"`, `timestamp: new Date()`.

2. **`participant_left`**:
   - Extract `participant.joinedAt` and connection duration.
   - Calculate stay:
     - Increment `activeSeconds` by the duration of this segment.
     - Calculate percentage:
       $$\text{percentage} = \min\left(100, \text{round}\left(\frac{\text{activeSeconds}}{\text{session.durationMinutes} \times 60} \times 100\right)\right)$$
     - If `percentage >= session.attendanceThreshold`: set `status = PRESENT`.
     - Update `leftAt: new Date()`.
   - Create `AttendanceLog`:
     - `eventType: "LEAVE"`, `durationSeconds: segmentDuration`.

3. **`room_finished`**:
   - LiveKit sends this when all participants have left or session is ended.
   - Update `LiveSession` status to `COMPLETED` and `actualEndedAt: new Date()`.

---

## 5. Frontend Implementation (Next.js 14)

### 5.1 API Client Update (`frontend/src/lib/api/monitoring.ts`)
Add API function to fetch LiveKit token:
```typescript
export interface LiveKitTokenResponse {
  token: string;
  wsUrl: string;
  roomName: string;
}

export function fetchLiveKitToken(sessionId: string): Promise<LiveKitTokenResponse> {
  return api<LiveKitTokenResponse>(`live-sessions/${sessionId}/livekit-token`);
}
```

### 5.2 Refactor Live Session Workspace (`frontend/src/components/features/sessions/LiveSessionWorkspace.tsx`)
Replace the fallback iframe and simulated webcam mockup with native LiveKit components:

1. **Import LiveKit Components & CSS**:
   ```typescript
   import "@livekit/components-styles";
   import {
     LiveKitRoom,
     VideoConference,
     RoomAudioRenderer,
     ControlBar,
     useTracks,
     ParticipantTile,
   } from "@livekit/components-react";
   import { Track } from "livekit-client";
   ```

2. **Room State & Connection**:
   - Fetch token on component mount when modal opens (`fetchLiveKitToken(session.id)`).
   - Wrap the main video stage with `<LiveKitRoom>`:
     ```tsx
     <LiveKitRoom
       token={liveKitToken}
       serverUrl={serverUrl}
       connect={true}
       video={false} // start with camera off or ask user
       audio={false}
       onDisconnected={handleLeaveSession}
       data-lk-theme="default"
       className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950"
     >
       {/* LiveKit Audio Renderer */}
       <RoomAudioRenderer />

       {/* Custom In-LMS Video Layout or <VideoConference /> */}
       <LiveKitCustomConference
         session={session}
         trainerDisplayName={trainerDisplayName}
         userRole={userRole}
       />
     </LiveKitRoom>
     ```

3. **Retain Existing LMS Value-Adds**:
   - Keep the top **Stay & Calculation Status Pill** (`Stay: Xm / Ym (Z%)`).
   - Keep the **Attendees** modal button (backed by `fetchSessionAttendance`).
   - Keep the **Full-screen** toggle button (`toggleFullScreen`).
   - Keep the **Leave Room** confirmation button.

4. **Participant Video Grid**:
   - Use `useTracks([Track.Source.Camera, Track.Source.ScreenShare])` to dynamically render speaker/screen sharing tiles alongside participant video tiles.
   - Render speaker/trainer spotlight view when trainer is talking.

---

## 6. Verification & Testing Checklist

- [ ] **Dependencies**: `backend/package.json` has `livekit-server-sdk`; `frontend/package.json` has `livekit-client` and `@livekit/components-react`.
- [ ] **Database**: `SessionPlatform` has `LIVEKIT` in Prisma schema, migrations applied.
- [ ] **Token Endpoint**:
  - `GET /api/v1/live-sessions/:id/livekit-token` returns valid JWT token for enrolled learners and trainers.
  - Returns 403 Forbidden for non-enrolled users.
- [ ] **Video & Audio Connectivity**:
  - Trainer opens session -> Camera/Mic tracks publish successfully.
  - Learner opens session in second browser -> Video/Audio streams render in real-time with sub-second latency.
  - Screen sharing works without crashing the layout.
- [ ] **Attendance Webhook Accuracy**:
  - Learner connects -> LiveKit sends `participant_joined` -> DB creates `Attendance` with status `ABSENT` and logs `JOIN`.
  - Learner stays for required percentage (e.g. >= 60%) -> LiveKit sends `participant_left` on exit -> Status automatically transitions to `PRESENT` in `attendance` table.
- [ ] **Build Validation**:
  - `npm run build` passes in `backend`.
  - `npm run build` passes in `frontend`.

