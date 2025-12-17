# Tokyo Run Visualizer - Complete Documentation

## Overview
A high-performance 3D visualization of 851 running tracks in Tokyo, built with React Three Fiber. The visualization displays glowing orbs (runners) moving simultaneously along their recorded GPS paths over a 60-second animation loop, creating a beautiful representation of Tokyo's running culture.

## Live Demo
- **Deployed on:** Vercel
- **Tech Stack:** React + Vite + Three.js + React Three Fiber

---

## Table of Contents
1. [Project Architecture](#project-architecture)
2. [File Structure](#file-structure)
3. [How It Works](#how-it-works)
4. [Getting Started](#getting-started)
5. [Configuration](#configuration)
6. [Deployment](#deployment)
7. [Performance Optimizations](#performance-optimizations)
8. [Troubleshooting](#troubleshooting)
9. [Customization Guide](#customization-guide)

---

## Project Architecture

### Core Components

**TokyoRunVisualizer.jsx** (Main Component)
- Loads and parses GPX data
- Manages state and data processing
- Renders the 3D canvas and UI
- Implements post-processing effects (Bloom)

**utils.js** (Data Processing)
- `parseGPX()` - Parses 851 tracks from GPX XML
- `processTracks()` - Converts GPS coordinates to 3D Cartesian space
- `createTrailGeometry()` - Generates static path lines
- GPS → 3D projection using planar projection relative to Tokyo's center

**config.js** (Configuration)
- All adjustable parameters in one place
- Colors, animation settings, camera, bloom effects
- Easy to modify without touching component code

**App.jsx** (Entry Point)
- Simple wrapper that loads the visualizer with the GPX file path

---

## File Structure

```
run-visu/
├── public/
│   └── tokyo_runs_optimized.gpx   # 851 running tracks (15MB)
│
├── src/ (or root)
│   ├── App.jsx                     # Main app entry
│   ├── TokyoRunVisualizer.jsx      # Main 3D visualization component
│   ├── config.js                   # Configuration parameters
│   ├── utils.js                    # GPX parsing & data processing
│   ├── main.jsx                    # React DOM entry point
│   ├── index.css                   # Global styles
│   └── index.html                  # HTML template
│
├── package.json                    # Dependencies and scripts
├── vite.config.js                  # Vite build configuration
├── .gitignore                      # Git ignore rules
└── claude.md                       # This file!
```

---

## How It Works

### 1. Data Loading & Parsing
```javascript
// App.jsx passes the GPX file path
<TokyoRunVisualizer gpxFilePath="/tokyo_runs_optimized.gpx" />

// TokyoRunVisualizer.jsx fetches and parses
const response = await fetch(gpxFilePath);
const gpxString = await response.text();
const parsedTracks = parseGPX(gpxString); // Extract 851 tracks
```

### 2. GPS to 3D Conversion
```javascript
// utils.js converts lat/lon to x/y/z coordinates
function gpsToCartesian(lat, lon, ele, center) {
  const x = (lon - center.lon) * lonScale;
  const z = -(lat - center.lat) * latScale;
  const y = ele * elevationScale;
  return { x, y, z };
}
```

**Why this works:**
- All tracks are centered around Tokyo's geographic center (0, 0, 0)
- Simple planar projection (good enough for city-scale data)
- Z-axis is inverted to match typical map orientation (north = negative Z)

### 3. Smooth Animation Curves
```javascript
// Each track becomes a CatmullRomCurve3 for smooth interpolation
const curve = new THREE.CatmullRomCurve3(points3D, false, 'catmullrom', 0.5);

// In animation loop (useFrame):
const progress = (elapsed % 60) / 60; // 0 to 1 over 60 seconds
const point = curve.getPoint(progress); // Get position on curve
```

### 4. High-Performance Rendering
```javascript
// Instead of 851 separate meshes, use ONE InstancedMesh
<instancedMesh ref={meshRef} args={[null, null, 851]}>
  <sphereGeometry args={[0.8, 16, 16]} />
  <meshStandardMaterial
    color="#00FFFF"
    emissive="#00FFFF"
    emissiveIntensity={2.5}
  />
</instancedMesh>

// Update all 851 instances in one loop
for (let i = 0; i < 851; i++) {
  const point = getPointOnCurve(tracks[i].curve, progress);
  tempObject.position.copy(point);
  tempObject.updateMatrix();
  meshRef.current.setMatrixAt(i, tempObject.matrix);
}
meshRef.current.instanceMatrix.needsUpdate = true;
```

### 5. Visual Effects
```javascript
// Bloom effect makes orbs glow
<EffectComposer>
  <Bloom
    intensity={1.5}
    luminanceThreshold={0.4}
    radius={0.8}
  />
</EffectComposer>
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000

3. **Build for production:**
   ```bash
   npm run build
   ```
   Creates optimized build in `dist/` folder

4. **Preview production build:**
   ```bash
   npm run preview
   ```

### Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "three": "^0.170.0",
  "@react-three/fiber": "^8.17.10",
  "@react-three/drei": "^9.117.3",
  "@react-three/postprocessing": "^2.16.3",
  "postprocessing": "^6.36.4"
}
```

---

## Configuration

All settings in `config.js`:

### Animation Settings
```javascript
animationDuration: 60,    // Seconds for one complete loop
animationLoop: true,      // Loop animation continuously
```

### Colors
```javascript
orbColor: '#00FFFF',      // Cyan glowing orbs
trailColor: '#FF1493',    // Hot pink/magenta trails
floorColor: '#1a1a1a',    // Dark grey floor
backgroundColor: '#000000' // Black background
```

### Visual Settings
```javascript
orbSize: 0.8,             // Sphere radius
orbIntensity: 2.5,        // Emissive glow intensity
trailOpacity: 0.15,       // Trail line transparency
```

### Post-Processing (Bloom)
```javascript
bloomIntensity: 1.5,              // Overall bloom strength
bloomLuminanceThreshold: 0.4,     // What brightness starts glowing
bloomLuminanceSmoothing: 0.9,     // Smoothness of glow transition
bloomRadius: 0.8,                 // Glow spread radius
```

### Camera
```javascript
cameraPosition: [0, 150, 150],    // Initial x, y, z position
cameraFov: 50,                    // Field of view
```

### Performance
```javascript
maxPointsPerTrack: 1000,    // Downsample long tracks
curveSubdivisions: 50,      // Points for smooth curves
```

---

## Deployment

### Deploy to Vercel

#### Method 1: Vercel CLI
```bash
npm install -g vercel
vercel
```

#### Method 2: GitHub Integration
1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. Go to https://vercel.com/new
3. Import your repository
4. Vercel auto-detects Vite settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Click "Deploy"

### Important for Deployment
✅ GPX file MUST be in `public/` folder
✅ Path in App.jsx is `/tokyo_runs_optimized.gpx` (correct)
✅ Vercel serves `public/` files from root URL automatically

---

## Performance Optimizations

### 1. InstancedMesh (Critical!)
- **Before:** 851 separate meshes = 851 draw calls
- **After:** 1 InstancedMesh = 1 draw call
- **Result:** ~850x reduction in draw calls

### 2. Track Downsampling
```javascript
maxPointsPerTrack: 1000
```
- Long tracks get downsampled to max 1000 points
- Maintains visual quality while reducing memory

### 3. Curve Subdivision
```javascript
curveSubdivisions: 50
```
- Each curve uses 50 points for rendering
- Balance between smoothness and performance

### 4. Geometry Reuse
```javascript
// Trail lines use single BufferGeometry
const geometry = createTrailGeometry(tracks);
```
- All trail lines in one geometry
- Shared material across all lines

### 5. Browser Optimizations
- Vite build minification
- Tree shaking unused code
- Code splitting
- Asset optimization

---

## Troubleshooting

### "Failed to load GPX file"
**Problem:** GPX file not found
**Solution:** Ensure `tokyo_runs_optimized.gpx` is in `public/` folder

### Blank Screen / No Visualization
**Check:**
1. Browser console for errors (F12)
2. GPX file loaded successfully
3. Canvas element rendered
4. WebGL support enabled in browser

### Low FPS / Performance Issues
**Solutions:**
1. Reduce `orbSegments` in config (16 → 8)
2. Increase `maxPointsPerTrack` threshold
3. Reduce `curveSubdivisions`
4. Disable bloom effect temporarily
5. Close other GPU-intensive apps

### Orbs Not Visible
**Check:**
1. `orbIntensity` and `bloomIntensity` values
2. Camera position - try zooming out
3. Background color contrast

### Animation Not Looping
**Solution:** Set `animationLoop: true` in config.js

---

## Customization Guide

### Change Animation Speed
```javascript
// config.js
animationDuration: 30,  // Faster (30 seconds)
animationDuration: 120, // Slower (2 minutes)
```

### Change Colors
```javascript
// config.js
orbColor: '#FF0000',      // Red orbs
trailColor: '#00FF00',    // Green trails
```

### Adjust Glow Effect
```javascript
// More intense glow
bloomIntensity: 3.0,
orbIntensity: 5.0,

// Subtle glow
bloomIntensity: 0.5,
orbIntensity: 1.0,
```

### Change Camera View
```javascript
// Top-down view
cameraPosition: [0, 300, 0],

// Side view
cameraPosition: [200, 100, 0],

// Angled view (default)
cameraPosition: [0, 150, 150],
```

### Make Orbs Larger/Smaller
```javascript
orbSize: 1.5,  // Larger
orbSize: 0.3,  // Smaller
```

### Show FPS Stats
```javascript
showStats: true,  // Top-left FPS counter
```

### Add More Visible Trails
```javascript
trailOpacity: 0.4,    // More visible (was 0.15)
trailLineWidth: 2,    // Thicker lines
```

---

## Technical Details

### Coordinate System
- **Origin (0,0,0):** Center of all Tokyo running data
- **X-axis:** East-West (longitude)
- **Y-axis:** Elevation (height)
- **Z-axis:** North-South (latitude, inverted)

### Data Processing Pipeline
```
GPX XML → parseGPX() → Raw lat/lon points
  ↓
processTracks() → GPS to Cartesian conversion
  ↓
CatmullRomCurve3 → Smooth interpolation curves
  ↓
InstancedMesh → GPU-accelerated rendering
```

### Animation Loop
```
useFrame() called every frame (~60 FPS)
  ↓
Calculate elapsed time
  ↓
Convert to progress (0-1) over 60 seconds
  ↓
For each track: curve.getPoint(progress)
  ↓
Update instance matrix
  ↓
Render frame
```

---

## Credits & License

**Created by:** Claude (Anthropic)
**For:** Tokyo Running Data Visualization
**Tech:** React Three Fiber, Three.js, Vite
**Data:** 851 GPS tracks from Tokyo runs

---

## Quick Reference

### Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Build for production
npm run preview      # Preview production build
vercel               # Deploy to Vercel
```

### Key Files to Edit
- `config.js` - Change colors, animation, effects
- `App.jsx` - Change GPX file path
- `TokyoRunVisualizer.jsx` - Modify 3D scene
- `utils.js` - Adjust data processing

### Support
- Check browser console (F12) for errors
- Ensure WebGL is supported
- Use Chrome/Firefox for best performance
- Minimum recommended: 4GB RAM, dedicated GPU

---

**Last Updated:** December 2024
**Version:** 1.0.0
