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

  // Camera Animation Settings
  cameraAnimation: {
    enabled: true,
    intervalSeconds: 4,          // Time between track changes
    transitionSeconds: 1.5,      // Duration of camera transition
    inactivityTimeout: 3,        // Seconds of inactivity before resuming auto-animation
    viewingAngleHorizontal: 45,  // Degrees
    viewingAngleVertical: 30,    // Degrees
    distancePaddingFactor: 1.8,  // Camera distance multiplier
    minDistance: 50,             // Minimum camera distance
    maxDistance: 300,            // Maximum camera distance
    heightOffsetFactor: 0.3,     // Height above track center
  },

  // Featured Run Highlight Settings
  featuredRun: {
    color: '#FFFF00',            // Bright yellow
    emissiveIntensity: 4.0,      // Brighter than normal orbs
    size: 1.2,                   // Larger than normal orbs
  },

  // Dimmed Runs Settings
  dimmedRuns: {
    opacityFactor: 0.4,          // Reduce opacity to 40%
    emissiveIntensityFactor: 0.6, // Reduce glow
  },

  // Info Overlay Settings
  infoOverlay: {
    enabled: true,
    position: 'bottom-right',    // or 'top-right', 'bottom-left', etc.
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#00FFFF',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '14px',
  },
};
