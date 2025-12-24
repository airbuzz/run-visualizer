# Tokyo Run Visualizer

An interactive 3D visualization of running tracks throughout Tokyo. This project transforms GPS data from 851+ runs into a beautiful real-time animation, displaying glowing orbs moving simultaneously along their recorded paths.

![Tokyo Run Visualizer](den.png)

**Live Demo:** [View Project](https://your-deployment-url.vercel.app)

---

## Features

- **Real-time 3D Animation**: 851+ running tracks animated simultaneously
- **High Performance**: GPU-accelerated rendering using InstancedMesh (60 FPS)
- **Beautiful Effects**: Bloom post-processing for glowing orbs and trails
- **Interactive Camera**: OrbitControls for exploring the visualization
- **Station Markers**: Major Tokyo stations marked with labels
- **Automatic Camera Animation**: Cycles through featured runs every 4 seconds
- **Responsive Design**: Full-screen canvas with info overlays

---

## Tech Stack

- **React** + **Vite** - Fast development and build
- **Three.js** - 3D graphics engine
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F
- **@react-three/postprocessing** - Post-processing effects (Bloom)

---

## Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/airbuzz/run-visualizer.git
   cd run-visualizer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 in your browser

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

---

## Using Your Own GPS Data

### GPX File Format

This visualizer expects a GPX (GPS Exchange Format) file. Place your GPX file in the `public/` directory.

#### Required GPX Structure

```xml
<?xml version='1.0' encoding='UTF-8'?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <trk>
    <time>2012-05-01</time>
    <trkseg>
      <trkpt lat="35.743307" lon="139.740307">
      </trkpt>
      <trkpt lat="35.743415" lon="139.740078">
      </trkpt>
      <trkpt lat="35.743552" lon="139.739772">
      </trkpt>
      <!-- More trackpoints... -->
    </trkseg>
  </trk>

  <trk>
    <time>2012-05-06</time>
    <trkseg>
      <trkpt lat="35.689487" lon="139.691711">
      </trkpt>
      <!-- More trackpoints... -->
    </trkseg>
  </trk>

  <!-- More tracks... -->
</gpx>
```

#### Key Elements

- **`<trk>`**: Each track represents one run/route
- **`<time>`**: Track-level timestamp (optional, used for metadata)
- **`<trkseg>`**: Track segment containing trackpoints
- **`<trkpt lat="..." lon="...">`**: Individual GPS coordinates
  - `lat`: Latitude (required)
  - `lon`: Longitude (required)
  - `ele`: Elevation (optional, can be nested as `<ele>40</ele>`)

#### Example Single Track

```xml
<trk>
  <time>2024-12-24</time>
  <trkseg>
    <trkpt lat="35.681236" lon="139.767125"></trkpt>
    <trkpt lat="35.681892" lon="139.768234"></trkpt>
    <trkpt lat="35.682451" lon="139.769102"></trkpt>
    <trkpt lat="35.683187" lon="139.770538"></trkpt>
  </trkseg>
</trk>
```

### Optimizing Your GPX File

Large GPX files can slow down loading. Here's how to optimize:

#### 1. Remove Redundant Timestamps

The visualizer only needs one timestamp per track. Remove individual `<time>` tags from `<trkpt>` elements:

```bash
# macOS/Linux
sed -i '' '/^        <time>.*<\/time>$/d' your-file.gpx

# Linux
sed -i '/^        <time>.*<\/time>$/d' your-file.gpx
```

#### 2. Downsample Long Tracks

If tracks have thousands of points, consider downsampling. The visualizer automatically downsamples to max 1000 points per track (configurable in `config.js`).

### Getting GPX Data

**From GPS Devices/Apps:**
- Strava: Export activities as GPX
- Garmin Connect: Download GPX files
- Apple Health: Use third-party exporters
- Google Fit: Export location data

**Combining Multiple GPX Files:**

```bash
# Create a merged GPX file
cat file1.gpx file2.gpx > combined.gpx
```

Or use online GPX merging tools.

### Update the File Path

Edit `App.jsx` to point to your GPX file:

```javascript
// App.jsx
<TokyoRunVisualizer gpxFilePath="/your-runs.gpx" />
```

---

## Adding Station Markers

To add location markers (stations, landmarks), edit `components/Stations.jsx`:

```javascript
const stations = [
  { name: 'Tokyo Station', lat: 35.681236, lon: 139.767125 },
  { name: 'Shibuya', lat: 35.658034, lon: 139.701636 },
  { name: 'Your Location', lat: YOUR_LAT, lon: YOUR_LON },
];
```

### Getting Coordinates

**Google Maps Method:**
1. Right-click on a location in Google Maps
2. Click the coordinates to copy them
3. Format: `35.681236, 139.767125` (latitude, longitude)

**Reverse Geocoding (Address → Coordinates):**

Use free geocoding services to convert addresses to coordinates:

#### 1. **Nominatim (OpenStreetMap)**

```bash
# Example: Get coordinates for "Tokyo Tower, Japan"
curl "https://nominatim.openstreetmap.org/search?q=Tokyo+Tower,Japan&format=json&limit=1"
```

Response:
```json
[{
  "lat": "35.6585805",
  "lon": "139.7454329",
  "display_name": "Tokyo Tower, ..."
}]
```

#### 2. **Google Maps Geocoding API**

Requires API key (free tier available):

```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Tokyo+Tower&key=YOUR_API_KEY"
```

#### 3. **Online Tools**

- https://www.latlong.net/ - Simple address lookup
- https://www.gps-coordinates.net/ - Address to GPS converter

#### 4. **Node.js Script for Batch Geocoding**

```javascript
// geocode.js
const fetch = require('node-fetch');

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon)
    };
  }
  return null;
}

// Usage
geocode('Tokyo Tower, Japan').then(coords => {
  console.log(coords); // { lat: 35.6585805, lon: 139.7454329 }
});
```

**Important:** Respect API rate limits! Nominatim allows 1 request/second.

---

## Configuration

All visual settings are in `config.js`. Customize colors, animation speed, camera position, and more:

### Common Adjustments

```javascript
// config.js

// Animation speed (seconds for one complete loop)
animationDuration: 60,

// Orb appearance
orbColor: '#00FFFF',        // Cyan glowing orbs
orbSize: 0.8,               // Size of runner orbs
orbIntensity: 2.5,          // Glow brightness

// Trail paths
trailColor: '#FF1493',      // Hot pink trails
trailOpacity: 0.15,         // Trail transparency

// Camera position [x, y, z]
cameraPosition: [0, 150, 150],  // Angled view
cameraFov: 50,              // Field of view

// Bloom effect (glow)
bloomIntensity: 1.5,        // Glow strength
bloomRadius: 0.8,           // Glow spread

// Background
backgroundColor: '#000000', // Black background
```

See `config.js` for all available options.

---

## Project Structure

```
run-visualizer/
├── public/
│   └── tokyo_runs_optimized.gpx   # GPS data (10MB, 851 tracks)
│
├── components/
│   ├── InfoOverlay.jsx             # Featured run info display
│   └── Stations.jsx                # Station markers
│
├── hooks/
│   └── useCameraAnimation.jsx      # Camera animation logic
│
├── App.jsx                         # Main app entry
├── TokyoRunVisualizer.jsx          # Main 3D visualization
├── config.js                       # All configuration settings
├── utils.js                        # GPS processing utilities
├── main.jsx                        # React DOM entry
├── index.css                       # Global styles
│
└── package.json                    # Dependencies
```

---

## How It Works

### GPS to 3D Conversion

The visualizer converts GPS coordinates (latitude/longitude) to 3D Cartesian coordinates (x, y, z) using planar projection:

```javascript
// Center all tracks around Tokyo's geographic center
const center = calculateCenter(allTracks); // ~35.68°N, 139.65°E

// Convert each GPS point to 3D
function gpsToCartesian(lat, lon, elevation, center) {
  const scale = 10000;
  const x = (lon - center.lon) * scale * Math.cos(center.lat * π/180);
  const z = -(lat - center.lat) * scale;  // North = -Z
  const y = elevation * 0.1;
  return { x, y, z };
}
```

### Smooth Animation

Each track becomes a **CatmullRomCurve3** for smooth interpolation:

```javascript
const curve = new THREE.CatmullRomCurve3(points3D);

// Animation loop (60 FPS)
const progress = (time % 60) / 60;  // 0 to 1 over 60 seconds
const position = curve.getPoint(progress);  // Get point on curve
```

### Performance

**InstancedMesh** renders all 851 orbs in a single draw call:

```javascript
// Instead of 851 separate meshes (slow):
tracks.map(track => <mesh position={track.position} />)

// Use one InstancedMesh (fast):
<instancedMesh args={[null, null, 851]}>
  <sphereGeometry />
  <meshStandardMaterial />
</instancedMesh>
```

**Result:** ~850x fewer draw calls = 60 FPS with 851 animated orbs!

For detailed technical explanation, see [HOW_IT_WORKS.md](./HOW_IT_WORKS.md).

---

## Deployment

### Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

Or connect your GitHub repository to Vercel for automatic deployments.

### Deploy to Netlify

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder** via Netlify CLI or drag-and-drop on netlify.com

### Important for Deployment

- Ensure GPX file is in `public/` directory
- Large GPX files (>10MB) may need CDN or compression
- Set appropriate cache headers for GPX files

---

## Performance Tips

### For Large Datasets

If you have 1000+ tracks or very long tracks:

1. **Increase downsampling** (in `config.js`):
   ```javascript
   maxPointsPerTrack: 500,  // Reduce from 1000
   ```

2. **Reduce curve subdivisions**:
   ```javascript
   curveSubdivisions: 30,  // Reduce from 50
   ```

3. **Lower orb segments** (less detailed spheres):
   ```javascript
   orbSegments: 8,  // Reduce from 16
   ```

4. **Disable bloom** temporarily:
   ```javascript
   // Comment out in TokyoRunVisualizer.jsx
   // <EffectComposer>
   //   <Bloom ... />
   // </EffectComposer>
   ```

---

## Troubleshooting

### "Failed to load GPX file"
- Ensure file is in `public/` directory
- Check file path in `App.jsx` starts with `/`
- Verify file is valid XML

### Visualization appears empty
- Check browser console for errors
- Verify GPX file has `<trkpt>` elements with `lat` and `lon` attributes
- Ensure coordinates are in decimal degrees (not DMS format)

### Low FPS / Performance issues
- Reduce `orbSegments`, `maxPointsPerTrack`, `curveSubdivisions`
- Check GPU usage (open browser task manager)
- Try disabling bloom effect

### Coordinates don't match expected location
- Verify latitude/longitude order (lat first, lon second)
- Check coordinate system (decimal degrees required)
- Ensure coordinates are in reasonable range:
  - Latitude: -90 to 90
  - Longitude: -180 to 180

---

## Data Privacy

This project processes GPS data **entirely client-side**. No data is uploaded to external servers. The GPX file is:
- Loaded directly from the `public/` folder
- Parsed in the browser using JavaScript
- Never transmitted to any third party

If deploying publicly, consider:
- Using anonymized/generalized GPS data
- Removing identifying metadata from GPX files
- Adding authentication if needed

---

## Credits

**Created by:** [Dunes](https://dunes.jp)
**GitHub:** [airbuzz/run-visualizer](https://github.com/airbuzz/run-visualizer)

**Technologies:**
- [Three.js](https://threejs.org/) - 3D graphics
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) - React renderer for Three.js
- [Vite](https://vitejs.dev/) - Build tool
- [React](https://react.dev/) - UI framework

---

## License

MIT License - Feel free to use this project for your own GPS visualizations!

---

## Contributing

Contributions welcome! Feel free to:
- Report bugs via GitHub Issues
- Submit pull requests
- Share your own visualizations
- Suggest new features

---

## Related Documentation

- [HOW_IT_WORKS.md](./HOW_IT_WORKS.md) - Deep dive into Three.js and GPS mapping
- [CLAUDE.md](./CLAUDE.md) - Complete project documentation

---

**Enjoy visualizing your runs!** 🏃‍♂️✨
