# idolsemifinal

Gameshow Marks Transfer System with Live Operator Console and LED Stage Output.

## Features
- **LED Stage Display (`/ledout`)**:
  - Fullscreen stage broadcast display with looping background video (`bg.mp4`).
  - Straight rectangle photo frames for contestants.
  - Live marks transfer animation: flying energy orb with particle beam and impact explosion.
  - Persistent `+` and `-` score badges reflecting mark transfers.
- **Operator Console (`/operator`)**:
  - Live score controller for Jodi 1 and Jodi 2.
  - Real-time photo upload, name editing, and score management.
  - 1-click **FIRE** button to trigger score transfer animation on the LED screen.
  - Instant live WebSocket sync.

## Quick Start
```bash
npm install
npm start
```
- Open Operator: `http://localhost:3000/operator`
- Open LED Output: `http://localhost:3000/ledout`
