# How It Works - Three.js and GPS to 3D Mapping

## Table of Contents
1. [Overview](#overview)
2. [Three.js Fundamentals](#threejs-fundamentals)
3. [GPS to 3D Coordinate Mapping](#gps-to-3d-coordinate-mapping)
4. [The Rendering Pipeline](#the-rendering-pipeline)
5. [Animation System](#animation-system)
6. [Performance Optimizations](#performance-optimizations)
7. [Visual Effects](#visual-effects)

---

## Overview

This visualization transforms 851 GPS running tracks from Tokyo into a real-time 3D animation. Each run becomes a glowing orb moving along its path simultaneously, creating a beautiful representation of Tokyo's running culture.

**Key Technologies:**
- **Three.js** - 3D graphics engine (WebGL wrapper)
- **React Three Fiber** - React renderer for Three.js
- **CatmullRomCurve3** - Smooth curve interpolation
- **InstancedMesh** - GPU-accelerated rendering for 851 orbs
- **Bloom Post-processing** - Glow effects

---

## Three.js Fundamentals

### What is Three.js?

Three.js is a JavaScript library that simplifies 3D graphics in the browser by wrapping WebGL (Web Graphics Library). It provides:

1. **Scene Graph**: Hierarchical structure of 3D objects
2. **Camera**: Defines what the viewer sees
3. **Renderer**: Converts 3D scene to 2D pixels
4. **Geometries**: Shapes (spheres, lines, planes)
5. **Materials**: How surfaces look (color, texture, shininess)
6. **Lights**: Illumination sources

### The Three.js Scene in This Project

```javascript
Scene (the 3D world)
├── Camera (viewpoint)
│   ├── Position: [0, 150, 150]
│   └── FOV: 50 degrees
│
├── Lighting
│   ├── AmbientLight (overall illumination)
│   ├── DirectionalLight (sun-like light)
│   └── PointLight (localized light source)
│
├── Floor (ground plane)
│   └── PlaneGeometry (1000x1000 units)
│
├── TrailLines (static paths)
│   └── BufferGeometry (all 851 paths as line segments)
│
├── RunnerOrbs (animated runners)
│   └── InstancedMesh (851 spheres rendered as one object)
│
└── OrbitControls (mouse interaction)
```

### React Three Fiber

Instead of vanilla Three.js, we use **React Three Fiber** (R3F), which lets us write Three.js scenes using React components:

```jsx
// Traditional Three.js (verbose)
const geometry = new THREE.SphereGeometry(0.8, 16, 16);
const material = new THREE.MeshStandardMaterial({ color: '#00FFFF' });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// React Three Fiber (declarative)
<mesh>
  <sphereGeometry args={[0.8, 16, 16]} />
  <meshStandardMaterial color="#00FFFF" />
</mesh>
```

**Benefits:**
- Declarative syntax (React-style)
- Automatic memory management
- Built-in hooks (useFrame for animation)
- Component reusability

---

## GPS to 3D Coordinate Mapping

### The Challenge

GPS data comes as:
- **Latitude** (north/south) - e.g., 35.6762° N
- **Longitude** (east/west) - e.g., 139.6503° E
- **Elevation** (height above sea level) - e.g., 40 meters

But Three.js needs **Cartesian coordinates**:
- **X-axis**: Horizontal (east/west)
- **Y-axis**: Vertical (up/down)
- **Z-axis**: Horizontal (north/south)

### The Solution: Planar Projection

We use a **simple planar projection** because all tracks are within Tokyo (small geographic area, ~50km radius). For city-scale visualizations, Earth's curvature is negligible.

#### Step 1: Calculate the Center Point

First, we find the geographic center of all tracks:

```javascript
// utils.js - calculateCenter()
function calculateCenter(tracks) {
  let totalLat = 0, totalLon = 0, totalPoints = 0;

  tracks.forEach(track => {
    track.points.forEach(point => {
      totalLat += point.lat;
      totalLon += point.lon;
      totalPoints++;
    });
  });

  return {
    lat: totalLat / totalPoints,  // Average latitude
    lon: totalLon / totalPoints   // Average longitude
  };
}
```

**Result for Tokyo tracks:**
- Center: ~35.68° N, 139.65° E
- This becomes the **origin (0, 0, 0)** in 3D space

#### Step 2: Convert GPS to Cartesian Coordinates

```javascript
// utils.js - gpsToCartesian()
function gpsToCartesian(lat, lon, ele, center) {
  // Scale factors (meters per degree at Tokyo's latitude)
  const latScale = 10000;  // config.projectionScale
  const lonScale = 10000 * Math.cos(center.lat * Math.PI / 180);

  // Calculate offsets from center
  const x = (lon - center.lon) * lonScale;
  const z = -(lat - center.lat) * latScale;  // Negative for north = -Z
  const y = ele * 0.1;  // Elevation scaled down

  return { x, y, z };
}
```

**How It Works:**

1. **Longitude → X-axis**
   - Difference from center longitude × scale factor
   - Positive X = east, negative X = west
   - Scale adjusted for latitude (degrees of longitude get smaller near poles)

2. **Latitude → Z-axis (inverted)**
   - Difference from center latitude × scale factor
   - **Negative sign**: In 3D graphics, north is typically -Z (like looking at a map)
   - Positive Z = south, negative Z = north

3. **Elevation → Y-axis**
   - Height above sea level × 0.1 (scaled down)
   - Y-axis points upward (standard 3D convention)

#### Why This Scale Factor?

**Scale Factor: 10,000** (from config.js)

- At Tokyo's latitude (~35°):
  - 1° latitude ≈ 111 km
  - 1° longitude ≈ 91 km (varies by latitude)

- With scale of 10,000:
  - 1° difference → 10,000 Three.js units
  - 0.001° (111m) → 10 units
  - 0.0001° (11m) → 1 unit

This creates a visually pleasing size where the entire Tokyo area fits well in the view.

### Real Example

Let's convert a real GPS point:

```javascript
// GPS point from Shinjuku Gyoen Park
const point = {
  lat: 35.6852,  // Latitude
  lon: 139.7100, // Longitude
  ele: 40        // 40 meters elevation
};

const center = {
  lat: 35.6800,
  lon: 139.6500
};

// Calculate X (longitude)
const lonScale = 10000 * Math.cos(35.68 * Math.PI / 180);
const x = (139.7100 - 139.6500) * lonScale;
// x ≈ (0.06) * 8090 ≈ 485 units (east of center)

// Calculate Z (latitude)
const latScale = 10000;
const z = -(35.6852 - 35.6800) * latScale;
// z ≈ -(0.0052) * 10000 ≈ -52 units (north of center)

// Calculate Y (elevation)
const y = 40 * 0.1;
// y = 4 units

// Result: { x: 485, y: 4, z: -52 }
```

### Coordinate System Visualization

```
        North (-Z)
            ↑
            |
            |
West (-X) ←─┼─→ East (+X)     Y-axis (↑ up)
            |                  points out
            |                  of page
            ↓
        South (+Z)

Origin (0,0,0) = Center of all Tokyo tracks
```

---

## The Rendering Pipeline

### Data Flow

```
1. GPX File (XML)
   ↓
2. parseGPX() → Extract GPS points
   [{lat: 35.68, lon: 139.65, ele: 40}, ...]
   ↓
3. calculateCenter() → Find geographic center
   {lat: 35.68, lon: 139.65}
   ↓
4. processTracks() → Convert each track
   a. Downsample (max 1000 points per track)
   b. gpsToCartesian() → Convert to 3D coordinates
   c. Create CatmullRomCurve3 → Smooth curve
   ↓
5. Render Loop (60 FPS)
   a. Calculate animation progress (0 to 1)
   b. Get point on each curve at progress
   c. Update InstancedMesh matrices
   d. Render frame with bloom effect
```

### Step-by-Step Breakdown

#### 1. Parse GPX File

```javascript
// TokyoRunVisualizer.jsx - loadGPXData()
const response = await fetch('/tokyo_runs_optimized.gpx');
const gpxString = await response.text();
const parsedTracks = parseGPX(gpxString);
// Result: 851 tracks with GPS points
```

#### 2. Create Smooth Curves

Each track becomes a **CatmullRomCurve3** - a smooth curve that passes through all points:

```javascript
// utils.js - processTracks()
const points3D = track.map(point => {
  const { x, y, z } = gpsToCartesian(point.lat, point.lon, point.ele, center);
  return new THREE.Vector3(x, y, z);
});

// Create smooth interpolation curve
const curve = new THREE.CatmullRomCurve3(points3D, false, 'catmullrom', 0.5);
```

**What is CatmullRomCurve3?**
- Interpolation curve that creates smooth paths between points
- `points3D`: Array of Vector3 positions
- `false`: Not a closed loop
- `'catmullrom'`: Interpolation type
- `0.5`: Tension (0.5 = smooth, 0 = sharp corners)

#### 3. Render Static Trails

All 851 paths rendered as one geometry:

```javascript
// utils.js - createTrailGeometry()
const positions = [];

tracks.forEach(track => {
  const points = track.curve.getPoints(50); // 50 points per curve

  // Create line segments
  for (let i = 0; i < points.length - 1; i++) {
    positions.push(points[i].x, points[i].y, points[i].z);
    positions.push(points[i+1].x, points[i+1].y, points[i+1].z);
  }
});

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
```

**Result**: One BufferGeometry with ~85,000 vertices (851 tracks × 50 points × 2 vertices per segment)

---

## Animation System

### The useFrame Hook

React Three Fiber provides `useFrame()` - a hook that runs **every frame** (~60 FPS):

```javascript
// TokyoRunVisualizer.jsx - RunnerOrbs component
const startTimeRef = useRef(Date.now());

useFrame(() => {
  // Calculate elapsed time
  const elapsed = (Date.now() - startTimeRef.current) / 1000;

  // Calculate progress (0 to 1) over 60 seconds
  const progress = (elapsed % 60) / 60;

  // Update all 851 orbs...
});
```

### Animation Loop Breakdown

**Every frame (16.67ms at 60 FPS):**

```javascript
// 1. Calculate animation progress (0 → 1 over 60 seconds)
const progress = (elapsed % 60) / 60;

// 2. For each of 851 tracks:
for (let i = 0; i < tracks.length; i++) {
  const track = tracks[i];

  // 3. Get position on curve at current progress
  const point = track.curve.getPoint(progress);
  // Returns THREE.Vector3 with interpolated position

  // 4. Update instance matrix
  tempObject.position.copy(point);
  tempObject.updateMatrix();
  meshRef.current.setMatrixAt(i, tempObject.matrix);
}

// 5. Tell Three.js to update GPU buffer
meshRef.current.instanceMatrix.needsUpdate = true;

// 6. Three.js renders the frame
```

### How curve.getPoint() Works

```javascript
// Given a curve with these control points:
const points = [
  new Vector3(0, 0, 0),
  new Vector3(10, 2, 5),
  new Vector3(20, 1, 15),
  new Vector3(30, 3, 20)
];

const curve = new THREE.CatmullRomCurve3(points);

// Get position at 25% along the curve
const position = curve.getPoint(0.25);
// Returns interpolated Vector3 between points[0] and points[1]

// Animation over 60 seconds:
// t=0s   → progress=0.0   → Start of curve
// t=15s  → progress=0.25  → 25% along curve
// t=30s  → progress=0.5   → Halfway
// t=45s  → progress=0.75  → 75% along curve
// t=60s  → progress=1.0   → End of curve (loops back to 0)
```

---

## Performance Optimizations

### Problem: Rendering 851 Orbs

**Naive approach (BAD):**
```jsx
{tracks.map(track => (
  <mesh key={track.id} position={calculatePosition(track)}>
    <sphereGeometry />
    <meshStandardMaterial />
  </mesh>
))}
```

**Result:** 851 draw calls = **extremely slow** (< 10 FPS)

### Solution: InstancedMesh

**InstancedMesh** = GPU instancing = render many identical objects in **one draw call**

```jsx
// TokyoRunVisualizer.jsx - RunnerOrbs
<instancedMesh ref={meshRef} args={[null, null, 851]}>
  <sphereGeometry args={[0.8, 16, 16]} />
  <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" />
</instancedMesh>
```

**How it works:**

1. **One Geometry**: All 851 orbs share the same sphere geometry
2. **One Material**: All orbs share the same material
3. **Instance Matrices**: Each orb has a transformation matrix (position, rotation, scale)
4. **GPU Rendering**: GPU renders all 851 instances in one draw call

```javascript
// Update instances every frame
for (let i = 0; i < 851; i++) {
  tempObject.position.set(x, y, z);  // Set position
  tempObject.updateMatrix();         // Calculate matrix
  meshRef.current.setMatrixAt(i, tempObject.matrix); // Store matrix
}
meshRef.current.instanceMatrix.needsUpdate = true; // Upload to GPU
```

**Performance gain:**
- **Before**: 851 draw calls → ~10 FPS
- **After**: 1 draw call → **60 FPS**
- **850x reduction** in draw calls!

### Other Optimizations

#### 1. Track Downsampling
```javascript
// utils.js - downsampleTrack()
// If track has > 1000 points, reduce to 1000
function downsampleTrack(points, maxPoints = 1000) {
  if (points.length <= maxPoints) return points;

  const step = points.length / maxPoints;
  return points.filter((_, i) => i % step === 0);
}
```

**Why:** Some running tracks have 5,000+ GPS points. We don't need that precision for visualization.

#### 2. Curve Subdivisions
```javascript
// config.js
curveSubdivisions: 50
```

Each curve is sampled at 50 points for trail rendering. Balance between smoothness and memory.

#### 3. Shared Geometry
```javascript
// All trail lines in ONE BufferGeometry
const geometry = createTrailGeometry(tracks);

// vs. creating 851 separate geometries (BAD)
```

---

## Visual Effects

### 1. Bloom Effect (Glow)

Bloom is a **post-processing effect** that makes bright objects glow:

```jsx
<EffectComposer>
  <Bloom
    intensity={1.5}              // How strong the glow
    luminanceThreshold={0.4}     // Brightness needed to glow
    luminanceSmoothing={0.9}     // Smoothness of glow transition
    radius={0.8}                 // Glow spread radius
  />
</EffectComposer>
```

**How Bloom Works:**

1. **Render Scene**: Normal 3D rendering
2. **Extract Bright Pixels**: Find pixels brighter than threshold (0.4)
3. **Blur**: Gaussian blur the bright pixels
4. **Composite**: Add blurred brightness back to original image

```
Original Frame       Bright Extraction       Blur            Final Composite
    [Scene]    →    [Bright pixels]    →   [Glow]    →    [Scene + Glow]
      ███                  █                ░█░░              ░███░
      ███                  █               ░███░             ░█████░
      ███                  █                ░█░░              ░███░
```

**Why orbs glow:**
```javascript
<meshStandardMaterial
  color="#00FFFF"              // Cyan color
  emissive="#00FFFF"           // Emit cyan light
  emissiveIntensity={2.5}      // Strong emission
  toneMapped={false}           // Don't tone map (stay bright)
/>
```

- `emissive` = color the object emits (self-illumination)
- `emissiveIntensity` = brightness of emission
- High intensity → exceeds bloom threshold → glow effect

### 2. Lighting Setup

```javascript
<ambientLight intensity={0.3} />
  // Overall scene illumination (no direction)

<directionalLight position={[50, 50, 50]} intensity={0.5} />
  // Sun-like light from top-right

<pointLight position={[0, 50, 0]} intensity={0.3} />
  // Light source above the center
```

**Why multiple lights:**
- Ambient: Base illumination (prevents pure black)
- Directional: Creates depth (shadows and highlights)
- Point: Adds focal lighting

### 3. Material Properties

```javascript
<meshStandardMaterial
  color="#00FFFF"        // Base color (cyan)
  emissive="#00FFFF"     // Self-illumination color
  emissiveIntensity={2.5} // Emission brightness
  toneMapped={false}     // Skip tone mapping (stay bright)
/>
```

**MeshStandardMaterial = Physically-Based Rendering (PBR)**
- Realistic light interaction
- `color`: Reflected light color
- `emissive`: Emitted light (independent of scene lighting)
- `toneMapped={false}`: Preserves high brightness for bloom

---

## Complete Rendering Cycle

### Frame-by-Frame (60 FPS)

```
Frame N (16.67ms budget):
│
├─ 1. Calculate Animation Progress
│    elapsed = 37.2s → progress = 0.62 (62% through animation)
│
├─ 2. Update 851 Orb Positions (useFrame loop)
│    For each track:
│      - Get point on curve at progress 0.62
│      - Update instance matrix
│      - Upload to GPU
│
├─ 3. Render Scene (Three.js)
│    - Camera projection (3D → 2D)
│    - Lighting calculations
│    - Material shading
│    - Draw orbs (1 draw call via InstancedMesh)
│    - Draw trails (1 draw call via LineSegments)
│    - Draw floor (1 draw call)
│    Total: ~5 draw calls for 851+ objects!
│
├─ 4. Post-Processing (Bloom)
│    - Extract bright pixels
│    - Gaussian blur
│    - Composite with original
│
└─ 5. Display Frame
     Output to canvas → 60 FPS animation
```

---

## Key Takeaways

### Three.js Scene Graph
- Hierarchical structure of cameras, lights, and objects
- React Three Fiber makes it declarative and React-friendly

### GPS → 3D Mapping
- **Planar projection** (good for city-scale data)
- **Center point** becomes origin (0, 0, 0)
- **Latitude → Z** (inverted), **Longitude → X**, **Elevation → Y**
- **Scale factor** (10,000) creates visually pleasing size

### Smooth Animation
- **CatmullRomCurve3** interpolates smooth paths
- **curve.getPoint(t)** returns position at progress t (0-1)
- **useFrame()** updates 60 times per second

### Performance
- **InstancedMesh**: 851 orbs in 1 draw call
- **Shared geometry**: One BufferGeometry for all trails
- **Downsampling**: Max 1000 points per track

### Visual Effects
- **Bloom**: Makes bright objects glow
- **Emissive materials**: Self-illuminating orbs
- **Multiple lights**: Depth and atmosphere

---

## Technical Summary

**Input:**
- 851 GPS tracks (lat/lon/elevation)
- 10MB GPX file

**Processing:**
1. Parse XML → extract GPS points
2. Calculate geographic center
3. Convert GPS → 3D Cartesian coordinates
4. Create smooth curves (CatmullRomCurve3)
5. Generate trail geometry (BufferGeometry)

**Rendering (60 FPS):**
1. Calculate animation progress (0-1 over 60s)
2. Update 851 instance matrices
3. Render scene (5 draw calls total)
4. Apply bloom post-processing
5. Display frame

**Result:**
- Real-time 3D animation
- 60 FPS performance
- Beautiful visual effects
- Interactive camera controls

---

*For more details, see the source files:*
- `utils.js` - GPS conversion and data processing
- `TokyoRunVisualizer.jsx` - Main rendering component
- `config.js` - All configurable parameters
