# 🚨 The Last-Minute Life Saver

> **An autonomous, proactive AI companion designed to handle academic chaos, auto-extract syllabus deadlines, map dangerous weekly workloads, and squeeze out maximum focus when the pressure is on.**

---

## 🌌 Overview

**The Last-Minute Life Saver** is a high-fidelity, full-stack productivity companion designed to rescue students, developers, and creators from the brink of deadline disasters. Built with an immersive, high-contrast Slate aesthetic, the application combines modern calendar planning, voice-activated task logging, intelligent syllabus document parsing, interactive focus tools, and predictive analytics. 

No more cramming, no more forgotten assignments, and no more panic. The Last-Minute Life Saver actively tracks your active hours, forecasts upcoming "Danger Zones", and acts as an autonomous coach to get you across the finish line.

---

## ⚡ Core Features & How They Work

### 1. 🔥 Weekly Deadline Timeline & Danger Zones (Powered by Recharts)
*   **The Problem:** Traditional calendars show deadlines as single points in time, failing to capture the *cramming pressure* of overlapping submissions.
*   **The Solution:** An interactive, predictive 7-day bar chart visualization built with **Recharts**. It calculates the cumulative estimated work hours due each day.
*   **How it Works:** 
    *   **Danger Threshold (4h):** If cumulative pending hours exceed 4 hours or contain high/critical items, the day flashes as a **CRITICAL DANGER ZONE** (Code Red).
    *   **Interactive Drill-down:** Click any bar on the timeline to instantly inspect that day's scheduled deadlines, priority tiers, and categories.
    *   **Sassy AI Forecasts:** Provides responsive, humorus, and motivating focus advice based on the day's pressure level (e.g., *"Put down the video games, schedule a 25/5 Pomodoro power play, and crush this backlog!"*).

### 2. 🎙️ Natural Language & Voice-Activated Task Entry
*   **The Problem:** Creating a task manually by filling out forms with inputs, priority dropdowns, and date selectors is tedious.
*   **The Solution:** High-speed natural language parsing that extracts dates, times, categories, priorities, and sub-tasks automatically.
*   **How it Works:**
    *   Supports both text inputs and full **speech-to-text voice transcripts**.
    *   Intelligently understands absolute dates (e.g., *"January 15th"*, *"28/06/2026"*), relative dates (e.g., *"tomorrow"*, *"yesterday"*, *"next tuesday"*), and day-offsets (e.g., *"parso"*, *"aaj"*, *"now"*).
    *   Regex matches times (e.g., *"at 4:00 PM"*, *"timing 2 PM"*) and automatically appends them to the title.
    *   Identifies context keywords (like *"wedding"*, *"shadi"*, *"physics lab"*, *"interview"*, *"react backend"*) to auto-categorize work, set priorities, and pre-populate multi-step subtask plans.

### 3. 📄 AI-Powered Syllabus & Screenshot Extractor
*   **The Problem:** Course syllabi, homework sheets, and exam calendars are distributed as messy PDFs or screenshots that users rarely look at.
*   **The Solution:** A drag-and-drop file uploader that leverages server-side **Gemini API** vision capabilities to instantly parse any document or image.
*   **How it Works:**
    *   Drop a syllabus PDF, photo, or screenshot of an assignment list.
    *   The backend model extracts all key deadlines, parses milestones, assigns realistic effort estimates, and populates them directly into your database.

### 4. 📅 Interactive Calendar & Micro-Scheduler
*   **The Problem:** Knowing *what* is due is only half the battle; you need to schedule *when* you are going to do it.
*   **The Solution:** A full-featured timeline grid mapping your hours.
*   **How it Works:**
    *   Organize your day into **Focus Blocks**, **Breaks**, **Classes**, **Sleep**, and **Personal time**.
    *   Enables linking specific sub-tasks to micro-time blocks, ensuring you have a dedicated, non-conflicting slot to get the work done.

### 5. 🤖 Dynamic Chat Assistant with Speech Synthesis
*   **The Problem:** Static tools feel cold and don't help you adjust when your schedule falls apart.
*   **The Solution:** A friendly, context-aware AI coach powered by the server-side Gemini SDK.
*   **How it Works:**
    *   Engage in chat using voice or text.
    *   Ask the agent to reorganize a messy day, suggest sub-tasks for a new project, or guide you through a study panic attack.
    *   The assistant features smart, clickable conversation suggestions to keep you moving forward.

### 6. ⏱️ Active Focus Timer (Pomodoro)
*   **The Problem:** Distractions are everywhere when studying at the last minute.
*   **The Solution:** An aesthetic, countdown focus block with standard Pomodoro intervals (25 mins work, 5 mins break) or custom configurations.
*   **How it Works:**
    *   Select your active target task or subtask.
    *   Ticking sound indicators and progress rings guide your work loops.
    *   Helps you record finished intervals directly to your task metrics.

### 7. ⚡ Autonomous Agent Telemetry & Activity Logs
*   **The Problem:** Users want to feel that their system is actively working for them.
*   **The Solution:** A terminal-style running log panel that reveals the AI's internal updates, scheduling reasoning, and system notifications.

---

## 🛠️ Tech Stack

*   **Frontend Library:** React 18
*   **Programming Language:** TypeScript
*   **Development & Bundling:** Vite
*   **Styling & Theme:** Tailwind CSS (Custom Dark Cosmic Slate color system)
*   **Visualizations & Graphs:** Recharts (Area charts, Composed Bar charts, Custom cell bars, and Reference Lines)
*   **Animation Engine:** Framer Motion (`motion/react`)
*   **Icons:** Lucide React
*   **Database & Auth:** Firebase Firestore & Firebase Authentication (for robust cloud persistence)
*   **AI Engine:** Google GenAI SDK (Gemini Flash integration)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your system.

### Installation
1.  Install the required dependencies:
    ```bash
    npm install
    ```
2.  Define your API credentials in a `.env` file (copied from `.env.example`):
    ```bash
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

### Run the App in Development Mode
Start the local server supporting fast reloads:
```bash
npm run dev
```

### Build for Production
Compile the React frontend and bundle the backend TypeScript server:
```bash
npm run build
```

### Run the Production Build
Launch the optimized application on the production server:
```bash
npm run start
```

---

## 🎨 Visual Identity

The interface is styled using a custom-tailored **Cosmic Slate Theme**:
*   **Backgrounds:** Deep charcoals (`#0a0a0a`, `#171717`) coupled with border definition accents (`#262626`).
*   **Accents:** Vibrantly balanced neon warnings — safe emerald (`#10b981`), caution amber (`#f59e0b`), and critical danger red (`#ef4444`) to direct focus where it matters most.
*   **Typography:** Elegant **Space Grotesk** display titles paired with high-readability **Inter** body text, and **JetBrains Mono** for technical stats, metrics, and telemetry logging.
