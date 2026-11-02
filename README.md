# PulseMeet — Real-Time Video Calling & Screen Sharing Application

A modern, full-stack browser-based real-time video conferencing and screen sharing web application built with **Next.js (App Router)**, **React**, **TypeScript**, **Vanilla CSS + CSS Modules**, **Node.js**, **Express.js**, **Socket.IO**, **WebRTC**, **Prisma ORM**, and **PostgreSQL (Neon)**.

---

## 1. Completed Features

### Authentication & Security
- **User Registration**: Full name, email, password, and confirm password validation, duplicate email protection (`409 Conflict`), and secure password hashing using `bcrypt` (10 salt rounds).
- **User Login**: Credential verification with `bcrypt.compare`, issuing signed JWT tokens stored in `httpOnly` cookies alongside bearer token support.
- **Session Persistence & Route Protection**: Automatic session verification via `GET /api/auth/me`, protected `/dashboard` and `/meeting/[meetingId]` routes, automatic redirect to `/login?redirect=...` for unauthenticated visitors, and graceful handling of expired/invalid tokens.
- **Secure Logout**: Clears server-side HTTP-only cookies and client-side authentication state.

### Meeting Management
- **Create Meeting**: Authenticated users can create instant meetings or generate shareable meeting links with custom titles.
- **Cryptographically Secure Meeting IDs**: Generates collision-resistant `xxxx-xxxx-xxxx` meeting codes using `crypto.randomBytes`.
- **Copyable Invitation Links**: One-click copy for full meeting URLs (`http://localhost:3000/meeting/xxxx-xxxx-xxxx`).
- **Join Meeting**: Supports joining via raw meeting ID (`xxxx-xxxx-xxxx`) or pasting the full invitation link, with server-side validation of meeting existence and `ACTIVE` status.
- **Recent Meetings History**: Displays user-created meetings on the dashboard with status badges (`ACTIVE` / `ENDED`), creation timestamps, quick rejoin, copy link, and host ability to end meetings.

### Real-Time Video Calling (WebRTC + Socket.IO)
- **Peer-to-Peer Mesh WebRTC**: Uses `RTCPeerConnection`, `navigator.mediaDevices.getUserMedia()`, `MediaStream`, `RTCSessionDescription`, and `RTCIceCandidate` to stream real-time audio and video directly between participants.
- **Socket.IO Signaling Server**: Coordinates room membership (`join-room`, `room-users`, `user-joined`, `user-left`), SDP `webrtc-offer` and `webrtc-answer` negotiation, ICE candidate exchange (`webrtc-ice-candidate`), and live media state synchronization (`media-state-change`).
- **ICE Candidate Queueing**: Queues early ICE candidates that arrive before `remoteDescription` is set and flushes them deterministically to prevent race conditions.
- **Graceful Permission & Hardware Fallbacks**: Handles camera/microphone permission errors (`NotAllowedError`) and missing/locked hardware (`NotFoundError` / `NotReadableError`) cleanly with user-friendly status alerts.

### Real-Time Screen Sharing (`getDisplayMedia`)
- **Browser Native Screen Capture**: Uses `navigator.mediaDevices.getDisplayMedia()` allowing participants to share an entire screen, application window, or browser tab.
- **Live WebRTC Track Replacement**: Dynamically replaces the video track on all active `RTCPeerConnection` senders (`RTCRtpSender.replaceTrack`) without dropping audio or reconnecting the call.
- **Presentation Stage Layout**: Automatically switches all participants into a spotlight stage layout when someone shares their screen, displaying `"<Name> is presenting"` and placing participant cameras in a side filmstrip.
- **Automatic Camera Restoration**: Listens to both the in-app **Stop Share** button and the browser's native **"Stop sharing"** bar (`screenTrack.onended`) to seamlessly restore the user's camera stream.

### Meeting Controls & UI/UX
- **Meeting Toolbar**:
  - Microphone Mute / Unmute with live status broadcast.
  - Camera On / Off with avatar fallback and live status broadcast.
  - Start / Stop Screen Share with active visual state.
  - Copy Meeting Invitation link with visual confirmation.
  - Live Participant Count & collapsible **Participants Drawer** showing host badges and real-time mic/camera/screen indicators.
  - Connection status indicator (`Connected`, `Connecting...`, `Reconnecting...`) and live meeting duration timer.
  - Safe **Leave Meeting** action that stops all local camera/mic/screen tracks, closes all `RTCPeerConnection` instances, leaves the Socket.IO room, and returns to the dashboard.

---

## 2. Project Architecture

```text
VIDEO CALL/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   │   ├── 20261102000000_init/
│   │   │   │   └── migration.sql
│   │   │   └── migration_lock.toml
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── meeting.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   └── meeting.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── meeting.service.ts
│   │   ├── socket/
│   │   │   └── signaling.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── meetingId.ts
│   │   │   ├── prisma.ts
│   │   │   └── validation.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.module.css
│   │   │   │   └── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── meeting/
│   │   │   │   └── [meetingId]/
│   │   │   │       ├── meeting.module.css
│   │   │   │       └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.module.css
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── meeting/
│   │   │   │   ├── MeetingToolbar.module.css
│   │   │   │   ├── MeetingToolbar.tsx
│   │   │   │   ├── ParticipantsPanel.module.css
│   │   │   │   ├── ParticipantsPanel.tsx
│   │   │   │   ├── VideoTile.module.css
│   │   │   │   └── VideoTile.tsx
│   │   │   └── ui/
│   │   │       ├── Navbar.module.css
│   │   │       └── Navbar.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx
│   │   │   └── useWebRTC.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── socket.ts
│   │   │   └── types.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   └── meetingService.ts
│   │   └── styles/
│   │       └── auth.module.css
│   ├── .env.example
│   ├── next.config.mjs
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
```

---

## 3. Neon PostgreSQL Database Configuration Instructions

1. **Create a Neon Account & Project**:
   - Visit [https://neon.tech](https://neon.tech) and sign in.
   - Click **New Project**, choose a project name (e.g. `pulsemeet`), select your closest region, and create the database.
2. **Copy the Connection String**:
   - From the Neon Dashboard **Connection Details** panel, copy the PostgreSQL connection string:
     ```text
     postgresql://<user>:<password>@<endpoint>.<region>.aws.neon.tech/neondb?sslmode=require
     ```
3. **Configure `backend/.env`**:
   - Copy `backend/.env.example` to `backend/.env`:
     ```env
     PORT=5000
     DATABASE_URL="postgresql://<user>:<password>@<endpoint>.<region>.aws.neon.tech/neondb?sslmode=require"
     JWT_SECRET="your-strong-random-jwt-secret-key-at-least-32-chars"
     CLIENT_URL="http://localhost:3000"
     ```
4. **Apply Prisma Migrations**:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   # Or during schema development:
   npx prisma migrate dev
   ```

---

## 4. Installation & Startup Instructions

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v24)
- **npm**: v9+
- **PostgreSQL Database**: Neon PostgreSQL connection string (or local Prisma Postgres dev server)

### Step 1 — Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2 — Configure Environment Variables
1. Create `backend/.env` based on `backend/.env.example`.
2. Create `frontend/.env.local` based on `frontend/.env.example`:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:5000"
   ```

### Step 3 — Generate Prisma Client & Run Migrations
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

### Step 4 — Start Backend and Frontend Servers
Open two terminals:

**Terminal 1 (Backend API & Socket.IO Signaling Server on port 5000):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Next.js Frontend on port 3000):**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Testing Instructions

1. **Registration & Login**:
   - Navigate to `http://localhost:3000/signup` and create User 1 (e.g., `alice@example.com`).
   - Verify automatic redirect to `/dashboard`.
   - Test logging out and logging back in at `http://localhost:3000/login`.
2. **Create & Join Meeting**:
   - On `/dashboard`, click **Generate Link First** or **Start Instant Meeting**.
   - Click **Copy Link** to copy the invitation URL (`http://localhost:3000/meeting/xxxx-xxxx-xxxx`) and enter the room.
3. **Two-Session Real-Time Video Calling**:
   - Open an Incognito/Private browser window (or a second browser profile) at `http://localhost:3000/signup` and register User 2 (e.g., `bob@example.com`).
   - Paste the meeting ID or full invitation link into the **Join a Meeting** box on the dashboard and click **Join Meeting**.
   - Verify both browser windows establish a peer-to-peer WebRTC connection, display both local and remote video tiles, and show `Participants (2)`.
4. **Microphone, Camera & Screen Sharing**:
   - Click **Mute / Unmute** and **Stop Video / Start Video** in the bottom toolbar and verify the remote participant's view updates in real time.
   - Click **Share Screen**, select a window or tab, and verify the remote participant automatically switches to the **Presentation Stage Layout** showing your shared screen.
   - Click **Stop Share** (or the browser's native "Stop sharing" bar) and verify the camera stream is restored.
5. **Leave Meeting Cleanup**:
   - Click **Leave** in one browser window and verify the participant tile is immediately removed from the remaining participant's screen and local media tracks are stopped.

---

## 6. Production WebRTC Connectivity (STUN vs. TURN)

- **Development Configuration**: The application configures Google's public STUN servers (`stun:stun.l.google.com:19302`) in `frontend/src/hooks/useWebRTC.ts` to discover public IP/port mappings across standard home and office NATs.
- **Production Requirement (TURN)**: Across restrictive corporate firewalls or Symmetric NATs where direct UDP peer-to-peer hole punching is blocked, a **TURN (Traversal Using Relays around NAT)** server (such as `coturn`, Twilio Network Traversal, or Cloudflare Calls TURN) is required to relay encrypted WebRTC media traffic. Add your TURN credentials to `RTC_CONFIGURATION.iceServers` in `frontend/src/hooks/useWebRTC.ts` for production deployments.

---

## 7. Known Limitations

- **Mesh Topology Scaling**: The WebRTC architecture uses a full-mesh peer-to-peer topology where each participant encodes and sends streams to every other participant. This is ideal for small-to-medium group calls (2–6 participants). Larger meetings (10+ participants) in production would benefit from an SFU (Selective Forwarding Unit) such as Mediasoup or LiveKit.
- **In-Memory Room Signaling State**: Active socket room state is stored in memory on the Node.js signaling server (`backend/src/socket/signaling.ts`), while persistent user accounts and meeting records are stored in PostgreSQL. Horizontal multi-instance scaling of the signaling server would require the `@socket.io/redis-adapter`.

