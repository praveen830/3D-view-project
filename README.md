# Milky Way Explorer 🌌

An interactive real-time 3D web application built with **Vite**, **Three.js**, and **GSAP**, visualizing the entire **Milky Way Galaxy**, **100+ confirmed exoplanet systems** sourced directly from the **NASA Exoplanet Archive**, and our **Solar System** with all 8 planets and Pluto.

Inspired by [solar-educ.vercel.app](https://solar-educ.vercel.app/) and scaled up to galactic dimensions!

---

## 🌟 Key Features

### 1. Three Zoom Levels of Exploration
1. **Galaxy View (Macro Level)**:
   - Procedural Milky Way spiral galaxy powered by **50,000 particles** (`THREE.Points`) with 4 logarithmic spiral arms, central bulge, exponential disc thickness, and realistic stellar color temperature gradient.
   - Clickable glowing markers for landmark and multi-planet star systems.
   - Highlighted pulsating **"You Are Here (Sun)"** beacon in the Orion Arm.
2. **System View (Meso Level)**:
   - Smooth GSAP camera transition flying directly to any chosen star system.
   - Central host star with pulsing corona glow, realistic spectral classification, and dynamic illumination.
   - Planets revolving along visible anti-aliased orbit rings.
3. **Planet View (Micro Level)**:
   - Close-up 3D orbit around the selected planet with true axial tilt and rotation.
   - Glassmorphism Fact-Sheet Panel displaying physical specs, orbital metrics, atmospheric conditions, and fun facts.

### 2. Scientific Data from NASA
- **Official NASA Values** for the Sun and all 8 planets + Pluto in `solar-system.json`.
- **Live NASA TAP Query Engine** (`fetch_nasa_exoplanets.py`) connecting to the NASA Exoplanet Archive (`ps` table) to query over 6,000 confirmed exoplanets, filter the top 100 most interesting systems, compute 3D Cartesian coordinates in light-years, and export `systems.json`.

### 3. Interactive Tools
- **OrbitControls**: Drag to rotate, pinch/wheel to zoom with smooth damping.
- **Floating Toolbar**: Zoom +/- buttons, pause/play orbit animation, orbit speed selector (`0.5x`, `1.0x`, `2.0x`, `5.0x`), toggle orbit lines, toggle star labels, Home button.
- **Guided Tour Mode**: Automated cosmic journey stopping at Galaxy -> Solar System -> Mercury -> Venus -> Earth -> Mars -> Jupiter -> Saturn -> Uranus -> Neptune -> Pluto -> TRAPPIST-1 -> Proxima Centauri with educational narrative cards.
- **Instant Bilingual Switch (EN / FR)**: One-click toggle switching all labels, metrics, tour cards, and factsheets between English and French.
- **Deep Space Audio Synthesizer**: Native Web Audio API ambient cosmic drone and interaction chimes (zero external audio file dependencies).
- **Search Bar with Autocomplete**: Jump directly to any planet or star system.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python 3](https://www.python.org/) (optional, only needed if you want to re-query the NASA API)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Dev Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000` to explore the galaxy!

### 3. Build for Production
```bash
npm run build
```
Generates an optimized bundle in `/dist` ready for instant deployment.

---

## 🛰️ Deploying to Vercel

### Option A: Via GitHub (Recommended)
1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Milky Way Explorer"
   ```
2. Create a new repository on [GitHub](https://github.com/new).
3. Push your repository:
   ```bash
   git remote add origin https://github.com/your-username/milky-way-explorer.git
   git branch -M main
   git push -u origin main
   ```
4. Log into [Vercel](https://vercel.com).
5. Click **"Add New Project"** -> **"Import Git Repository"**.
6. Select your repository. Vercel will automatically detect **Vite** with build command `npm run build` and output directory `dist`.
7. Click **Deploy**!

### Option B: Via Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 📁 Project Structure

```
├── fetch_nasa_exoplanets.py    # Python script querying NASA Exoplanet Archive via TAP
├── index.html                  # Main responsive HTML with glassmorphism UI
├── package.json                # Project dependencies (Three.js, GSAP, Vite)
├── vite.config.js              # Vite bundler configuration
├── vercel.json                 # Vercel deployment configuration
├── public/
│   └── favicon.svg             # Cosmic SVG favicon
└── src/
    ├── main.js                 # Three.js scene, camera, render loop & UI controllers
    ├── galaxy.js               # Procedural 50,000-particle spiral galaxy generator
    ├── textures.js             # Canvas procedural texture generator for all planets
    ├── audio.js                # Web Audio API deep space ambient drone & chimes
    ├── i18n.js                 # Bilingual translation dictionary (EN / FR)
    ├── style.css               # Space glassmorphism styles & animations
    └── data/
        ├── solar-system.json   # Hand-written NASA values for Sun + 8 planets + Pluto
        ├── systems.json        # 101 star systems generated from NASA Exoplanet Archive
        ├── famous-descriptions.json # EN/FR descriptions for 20 famous star systems
        └── credits.json        # Sources, NASA archives & texture references
```

---

## 📜 Data Sources & Attributions

- **NASA Exoplanet Archive (IPAC / Caltech)**: [https://exoplanetarchive.ipac.caltech.edu/](https://exoplanetarchive.ipac.caltech.edu/)
- **NASA Planetary Fact Sheets (Goddard)**: [https://nssdc.gsfc.nasa.gov/planetary/factsheet/](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- **Solar System Scope (Free Textures under CC BY 4.0)**: [https://www.solarsystemscope.com/textures/](https://www.solarsystemscope.com/textures/)
- **NASA Visible Earth & Scientific Visualization Studio (Public Domain)**: [https://visibleearth.nasa.gov/](https://visibleearth.nasa.gov/)
