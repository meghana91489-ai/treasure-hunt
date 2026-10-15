# 🏆 INFOTSAV 2K26 - HACKSPRINT: Digital Treasure Hunt

A high-octane, full-stack, single-repository web application built for the **INFOTSAV 2K26 - HACKSPRINT** 90-minute hackathon. It features real-time QR code scanning, anti-cheat progression control, encrypted cyber riddles, live team telemetry, and an organizer command center.

---

## ⚡ Tech Stack

- **Backend:** Node.js, Express, JWT (`jsonwebtoken`), QR Code Generator (`qrcode`), CORS.
- **Data Persistence:** Local JSON State Database with atomic writes (`data/treasure_hunt.json`) — **Zero external DB setup, 100% portable, runs instantly**.
- **Frontend:** HTML5, Modern Vanilla JavaScript, Tailwind CSS (Neon Cyber Dark Theme), `html5-qrcode` CDN (Mobile Camera QR Scanner), `canvas-confetti` CDN (Victory Celebrations).
- **Audio Synthesizer:** Real-time Web Audio API sound generator (Zero external MP3/audio files needed).

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Game Server
```bash
npm start
```
The server will boot up at: **`http://localhost:3000`**

---

## 🎮 System Architecture & User Roles

### Role 1: Organizer / Admin (`/admin`)
- **Default Credentials:**
  - **Username:** `admin`
  - **Password:** `admin123`
- **Features:**
  - **Stage CRUD:** Add, edit, or delete stages (Stage #, Title, Location Clue, Cryptic Puzzle Question, Accepted Answer, Secret Token, Point Value).
  - **Physical QR Marker Cards:** 1-Click high-resolution printable cards with dashed borders, stage labels, and QR codes ready to print or tape around campus (`window.print()`).
  - **Live Participant Telemetry:** Real-time dashboard of all competing teams, their current stage, whether they have physically scanned the QR tag, their elapsed time, and 1-click progress resets.
  - **Reset Controls:** Reset individual teams or wipe the entire contest.

### Role 2: Participant / Team (`/play`)
- **Authentication:** Register or login with Team Name & PIN (allows teams to resume their progress from any phone).
- **Game Loop:**
  1. **Acquire Clue:** Active stage reveals only the physical location clue on campus.
  2. **Scan QR Marker:** Once at the location, participants use the built-in mobile camera scanner (`html5-qrcode`).
  3. **Anti-Cheat Validation:** 
     - Scanning Stage 3 without completing Stage 1 & 2 returns: `"Invalid Stage! Complete previous challenges first."`
     - Scanning past stages returns: `"Stage already completed!"`
     - Scanning wrong or fake tokens returns: `"Unknown QR token! Make sure you are at the correct physical location."`
  4. **Sector Decryption:** Scanning the verified QR tag unlocks the encrypted puzzle terminal.
  5. **Unlock Next Sector:** Submitting the correct answer grants points, saves stage duration, and unlocks the next physical location clue!
  6. **Final Victory Celebration:** Completing the final stage triggers a multi-burst confetti cannon, victory fanfare, and locks the team's official finish time on the leaderboard.

---

## 🧪 Pre-Configured Sample Stages (Ready to Test)

The system automatically initializes with 3 default stages so you can test right away:

| Stage # | Title | Campus Clue | Secret QR Token | Puzzle Riddle | Solution |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | The Digital Beacon | Main Entrance Lobby near the Welcome Digital Kiosk. | `INFOTSAV_STAGE1_NEXUS` | "I am a cryptographic protocol that secures communication over the internet, succeeding SSL. What is my 3-letter acronym?" | **`TLS`** |
| **2** | The Core Datacenter | Level 2, Computer Lab 3. Inspect rack "SWITCH-ALPHA". | `INFOTSAV_STAGE2_CYBER` | "In computer science, I am an abstract data type that serves as a collection of elements with First-In, First-Out (FIFO) retrieval. What am I?" | **`Queue`** |
| **3** | The Quantum Vault | Innovation Hub Seminar Hall, behind podium right wing. | `INFOTSAV_STAGE3_OMEGA` | "I am the cryptographic hash function designed by the NSA that produces a 256-bit digest, used universally in Bitcoin & Git. What is my name?" | **`SHA-256`** |

> 💡 **Desktop / Simulation Testing:** On laptops or devices without a camera, participants can click **"Manual / Test Token"** to simulate scanning any physical QR token.

---

## 📁 File Structure

```text
digital-treasure-hunt/
├── server.js               # Express server, JSON/SQLite persistence, REST APIs & Anti-cheat logic
├── package.json            # Node dependencies
├── README.md               # Documentation & Walkthrough
├── data/
│   └── treasure_hunt.json  # Auto-generated atomic database file
└── public/
    ├── index.html          # Landing / Role Selection Page
    ├── login.html          # Team & Admin Login/Register
    ├── admin.html          # Admin Command Center & QR Card Printing
    ├── play.html           # Main Participant Interface (Hint -> Scanner -> Puzzle -> Unlock)
    ├── app.js              # Client state, Web Audio FX, Toast UI, & API client
    └── styles.css          # Futuristic Cyber styling & Print stylesheets
```

---

## 🛡️ Anti-Cheat & Fair Play Mechanisms

1. **Server-Side Enforcement:** The server never sends puzzle riddles or answers to the client until the team's current stage matches and the secret physical QR token has been validated on the backend.
2. **Strict Sequential Traversal:** Skipping ahead or attempting out-of-order stages throws explicit HTTP 400 rejection errors.
3. **Session Integrity:** JWT signed sessions ensure teams cannot forge another team's progress or tamper with timestamps.
4. **Normalized Answers:** Whitespace, casing, and hyphens/underscores are normalized, and alternative variations are supported (e.g. `SHA-256`, `sha256`).
