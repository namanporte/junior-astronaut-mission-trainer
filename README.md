# Junior Astronaut: Lunar Outpost

**Built by Team Code Crushers**

An interactive, Mission Control–style educational space simulation game designed for ages **7–12**. Players command a lunar or Martian outpost, allocate a strict power grid budget across life support and radiation shielding, respond to live solar flare emergencies, and learn real space science from NASA and Canadian Space Agency (CSA) datasets.

---

## Features

### 1. Gameplay & Tradeoff Engine
- **Two Difficulty Modes:**
  - **Cadet Mode (Moon Base Alpha):** 5 Sols, `100 kW` power grid, `12s` solar storm reaction window.
  - **Commander Mode (Mars Outposts):** 7 Sols, `8s` crisis reaction window, and selectable **NASA Mars Trek** landing sites (`Jezero Crater`, `Olympus Mons Slope`, `Hellas Planitia`) with site-specific elevation heating penalties and dust-reduced solar budgets.
- **3 Core Survival Gauges:**
  - **Power Grid (`kW`):** Strict total budget enforced across segmented LED meters—raising one system requires balancing the other.
  - **Life Support (`%`):** Combined cabin oxygen, thermal control, and hydroponic food. Under-powering triggers a **-15% compounding crop yield penalty** the next Sol until restored.
  - **Radiation Shielding (`%` & `mSv/day`):** Magnetic dome strength tied directly to absorbed radiation dose rates.

### 2. AI Flight Director ("Houston CAPCOM") & Realism Features
- **Houston CAPCOM AI (`gemini-4-hydrogen`):** Server-side Express endpoints (`/api/capcom/hint`, `/api/capcom/debrief`, `/api/capcom/victory`) deliver kid-friendly tactical hints—complete with **3s Moon** or **45s scaled Mars** signal-delay simulation—and end-of-Sol science debriefs, backed by automatic rule-based offline fallbacks.
- **Realistic Outpost Visualizer:** Photorealistic Lunar and Martian horizon backdrops overlaid with `LRO-CAM` / `MRO-TREK` coordinate HUD reticles, animated solar day/night arc, glowing power conduit buses, and Habitat/Hydroponics cutaway details (`O2` scrubber gauge, crew silhouettes, misting water droplets).
- **Aerospace Instrument Console:** Recessed `#0A0F1E` instrument housings, 16-segment clickable/keyboard-accessible LED power meters, live `MET T+ HH:MM:SS` Mission Elapsed Time clock, live **OSDR Radiation Flux Sparkline**, and DSN (`8.4 GHz`) signal lock equalizer bars.
- **Zero-Dependency Web Audio Synthesizer:** Synthesizes slider ticks, UHF/DSN radio squelch bursts, 10-second crisis countdown alarms, shield impact thuds, and victory fanfares with a header mute toggle.
- **Kid-Friendly Glossary:** Inline dotted-cyan tooltips explaining `Sol`, `Radiation Dose`, `Solar Flare`, `Comms Delay`, and `Hydroponics`.

---

## Dataset Attribution

All space weather crises, dosimetry readings, crop mechanics, and landing-site profiles are grounded in public scientific datasets and educational resources from **NASA** and the **Canadian Space Agency (CSA)**:

| Dataset / Resource | Agency | How It Is Used in the Simulation | Attribution & Source |
| :--- | :--- | :--- | :--- |
| **DONKI (Space Weather Database Of Notifications, Knowledge, Information)** | NASA CCMC | Live `/DONKI/FLR` solar flare fetches (`C`, `M`, and `X`-class flare IDs, Sun region coordinates, peak timestamps) driving Sol crises, with a 4-second timeout fallback to a 7-Sol curated historical archive. | [NASA DONKI API](https://api.nasa.gov/) · Community Coordinated Modeling Center |
| **OSDR / RadLab (Open Science Data Repository)** | NASA | Grounds the Radiation Shielding gauge and live OSDR Flux Sparkline in realistic ISS and deep-space absorbed radiation dose rates (`0.5 mSv/day` safe baseline vs. `2.8–38.6 mSv/day` unshielded storm spikes). | [NASA Open Science Data Repository](https://osdr.nasa.gov/) |
| **Food Production on the Moon** | Canadian Space Agency (CSA) | Grounds the closed-loop hydroponic crop mechanics, `-15%` next-Sol crop yield penalty rules, and end-of-Sol *Lunar Greenhouse Facts*. | [CSA — Food Production on the Moon](https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/food-production-on-the-moon.asp) |
| **Mars Trek Elevation & Dust Profiles** | NASA | Defines Commander Mode landing-site solar budgets and thermal power penalties across **Jezero Crater** (`-2,500 m`), **Olympus Mons Slope** (`+14,000 m`), and **Hellas Planitia** (`-7,152 m`). | [NASA Solar System Treks — Mars Trek](https://trek.nasa.gov/mars/) |

> **Honest Telemetry Badge:** The Mission Control header and Data Sources modal transparently indicate whether solar flare data is currently streaming from `LIVE NASA DONKI API` or running on the `CURATED NASA DONKI / OSDR ARCHIVE` fallback.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Backend:** Express (`server.ts`) serving Vite middleware in development and static `dist/` in production
- **AI & Data:** `@google/genai` (`gemini-4-hydrogen`), NASA DONKI FLR API
- **Audio:** Browser Web Audio API (`AudioContext`)

---

## Getting Started

### Prerequisites
- **Node.js** `>= 20`
- **npm**

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and add your keys:
```bash
cp .env.example .env
```

```env
# Required for server-side CAPCOM AI debriefs & tactical hints (optional fallback works without it)
GEMINI_API_KEY="your_gemini_api_key"

# Optional: Custom NASA Open API key for live DONKI space weather fetches
VITE_NASA_API_KEY="your_nasa_api_key"

# Optional: Server port (defaults to 3000)
PORT=3000
```

### 3. Run Development Server
Starts the Express API server + Vite dev middleware on `http://localhost:3000`:
```bash
npm run dev
```

### 4. Build & Type-Check for Production
```bash
npm run lint
npm run build
npm start
```

---

## Project Structure

```text
├── server.ts                          # Express server + Gemini CAPCOM API routes (/api/capcom/*)
├── index.html                         # HTML entry point & Google Fonts
├── src/
│   ├── App.tsx                        # Main game loop, Sol simulation & crisis timer state
│   ├── index.css                      # Tailwind v4 setup, instrument bezels & animations
│   ├── assets/images/                 # Generated Lunar & Martian horizon terrain backdrops
│   ├── components/
│   │   ├── TopStatusHeader.tsx        # MET clock, 3 core gauges, DONKI badge & audio controls
│   │   ├── LunarOutpostVisualizer.tsx # Terrain + HUD overlay, animated power bus & dome cutaways
│   │   ├── PowerConsole.tsx           # 16-segment LED meters, DSN spectrogram & Earth Comms
│   │   ├── RadiationSparkline.tsx     # Live NASA OSDR radiation flux oscilloscope
│   │   ├── CrisisBanner.tsx           # Solar flare emergency countdown banner
│   │   ├── OnboardingModal.tsx        # Quick-Start guide, Cadet/Commander & Mars site picker
│   │   ├── SolDebriefModal.tsx        # End-of-Sol CAPCOM debrief & CSA Hydroponics fact
│   │   ├── DonkiModal.tsx             # 7-Sol NASA DONKI flare schedule viewer
│   │   ├── DataSourcesModal.tsx       # Dataset attribution (DONKI, OSDR, CSA, Mars Trek)
│   │   ├── EndGameModal.tsx           # Commander Rank certificate & mission trace log
│   │   └── GlossaryTerm.tsx           # Kid-friendly inline space science tooltips
│   ├── data/scienceData.ts            # Glossary definitions, CSA facts & Mars Trek site profiles
│   ├── services/
│   │   ├── nasaDonkiService.ts        # NASA DONKI FLR API client + 7-Sol archive fallback
│   │   └── capcomAiService.ts         # Client wrapper for /api/capcom/* with rule-based fallback
│   ├── types/game.ts                  # TypeScript interfaces for simulation state & telemetry
│   └── utils/
│       ├── simulation.ts              # Power clamping, crop penalty & OSDR mSv/day math
│       └── soundEngine.ts             # Web Audio synthesizer (squelch, alarms, ticks, chimes)
```

---

## Team

- **Code Crushers**
