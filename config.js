export const config = {
  // Animation settings
  animationDuration: 60, // seconds
  animationLoop: true,

  // Visual colors
  orbColor: '#00FFFF', // cyan
  trailColor: '#FF1493', // hot pink/magenta
  floorColor: '#1a1a1a', // dark grey
  backgroundColor: '#000000', // black

  // Orb settings
  orbSize: 0.8,
  orbIntensity: 2.5,
  orbSegments: 16,

  // Trail settings
  trailOpacity: 0.15,
  trailLineWidth: 1,

  // Floor settings
  floorSize: 1000,
  floorGridDivisions: 50,

  // Post-processing
  bloomIntensity: 1.5,
  bloomLuminanceThreshold: 0.4,
  bloomLuminanceSmoothing: 0.9,
  bloomRadius: 0.8,

  // Camera settings
  cameraPosition: [0, 150, 150],
  cameraFov: 50,
  cameraNear: 0.1,
  cameraFar: 2000,

  // Projection settings (for GPS to 3D conversion)
  projectionScale: 10000, // Scale factor for lat/lon conversion
  elevationScale: 0.1, // Scale factor for elevation

  // Performance settings
  maxPointsPerTrack: 1000, // Downsample tracks with more points
  curveSubdivisions: 50, // Points to use for CatmullRomCurve3

  // Stats
  showStats: false,
};
