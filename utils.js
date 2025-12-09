import * as THREE from 'three';
import { config } from './config';

/**
 * Parse GPX XML string and extract all tracks with their track points
 * @param {string} gpxString - Raw GPX XML string
 * @returns {Array} Array of tracks, each containing an array of {lat, lon, ele} points
 */
export function parseGPX(gpxString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxString, 'text/xml');

  const tracks = [];
  const trkElements = xmlDoc.getElementsByTagName('trk');

  for (let i = 0; i < trkElements.length; i++) {
    const trkElement = trkElements[i];
    const trkpts = trkElement.getElementsByTagName('trkpt');

    if (trkpts.length === 0) continue;

    const points = [];
    for (let j = 0; j < trkpts.length; j++) {
      const trkpt = trkpts[j];
      const lat = parseFloat(trkpt.getAttribute('lat'));
      const lon = parseFloat(trkpt.getAttribute('lon'));

      // Try to get elevation if it exists
      const eleElements = trkpt.getElementsByTagName('ele');
      const ele = eleElements.length > 0 ? parseFloat(eleElements[0].textContent) : 0;

      if (!isNaN(lat) && !isNaN(lon)) {
        points.push({ lat, lon, ele });
      }
    }

    if (points.length > 0) {
      tracks.push(points);
    }
  }

  return tracks;
}

/**
 * Downsample a track to reduce the number of points for performance
 * @param {Array} points - Array of points
 * @param {number} maxPoints - Maximum number of points to keep
 * @returns {Array} Downsampled array of points
 */
function downsampleTrack(points, maxPoints) {
  if (points.length <= maxPoints) return points;

  const step = points.length / maxPoints;
  const downsampled = [];

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.floor(i * step);
    downsampled.push(points[index]);
  }

  // Always include the last point
  if (downsampled[downsampled.length - 1] !== points[points.length - 1]) {
    downsampled.push(points[points.length - 1]);
  }

  return downsampled;
}

/**
 * Calculate the center point (centroid) of all GPS coordinates
 * @param {Array} tracks - Array of tracks, each containing points with lat/lon
 * @returns {Object} Center point {lat, lon}
 */
function calculateCenter(tracks) {
  let totalLat = 0;
  let totalLon = 0;
  let totalPoints = 0;

  tracks.forEach(track => {
    track.forEach(point => {
      totalLat += point.lat;
      totalLon += point.lon;
      totalPoints++;
    });
  });

  return {
    lat: totalLat / totalPoints,
    lon: totalLon / totalPoints
  };
}

/**
 * Convert GPS coordinates (lat/lon) to 3D Cartesian coordinates (x, y, z)
 * Uses a simple planar projection relative to the center point
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} ele - Elevation (optional)
 * @param {Object} center - Center point {lat, lon}
 * @returns {Object} 3D coordinates {x, y, z}
 */
function gpsToCartesian(lat, lon, ele, center) {
  // Simple planar projection
  // At Tokyo's latitude (~35°), 1 degree of latitude ≈ 111km
  // 1 degree of longitude ≈ 91km (varies by latitude)

  const latScale = config.projectionScale;
  const lonScale = config.projectionScale * Math.cos(center.lat * Math.PI / 180);

  const x = (lon - center.lon) * lonScale;
  const z = -(lat - center.lat) * latScale; // Negative Z to match typical map orientation
  const y = ele * config.elevationScale;

  return { x, y, z };
}

/**
 * Process all tracks: downsample, convert to 3D coordinates, and create curves
 * @param {Array} tracks - Array of tracks from parseGPX
 * @returns {Array} Array of processed track objects with curves and 3D points
 */
export function processTracks(tracks) {
  if (!tracks || tracks.length === 0) return [];

  // Calculate center point for projection
  const center = calculateCenter(tracks);

  const processedTracks = [];

  tracks.forEach((track, index) => {
    // Downsample if needed
    const downsampledTrack = downsampleTrack(track, config.maxPointsPerTrack);

    // Convert to 3D coordinates
    const points3D = downsampledTrack.map(point => {
      const { x, y, z } = gpsToCartesian(point.lat, point.lon, point.ele, center);
      return new THREE.Vector3(x, y, z);
    });

    // Need at least 2 points for a curve
    if (points3D.length < 2) return;

    // Create a smooth curve using CatmullRomCurve3
    let curve;
    try {
      curve = new THREE.CatmullRomCurve3(points3D, false, 'catmullrom', 0.5);
    } catch (error) {
      console.warn(`Failed to create curve for track ${index}:`, error);
      return;
    }

    processedTracks.push({
      id: index,
      points: points3D,
      curve: curve,
      originalPointCount: track.length,
      processedPointCount: points3D.length
    });
  });

  return processedTracks;
}

/**
 * Get a point on a curve at a specific progress (0 to 1)
 * @param {THREE.CatmullRomCurve3} curve - The curve to sample
 * @param {number} progress - Progress along the curve (0 to 1)
 * @returns {THREE.Vector3} Point on the curve
 */
export function getPointOnCurve(curve, progress) {
  // Clamp progress between 0 and 1
  const t = Math.max(0, Math.min(1, progress));
  return curve.getPoint(t);
}

/**
 * Create geometry for trail lines (static paths)
 * @param {Array} processedTracks - Array of processed tracks with curves
 * @returns {THREE.BufferGeometry} Geometry for all trail lines
 */
export function createTrailGeometry(processedTracks) {
  const positions = [];

  processedTracks.forEach(track => {
    // Get points along the curve
    const points = track.curve.getPoints(config.curveSubdivisions);

    // Add line segments
    for (let i = 0; i < points.length - 1; i++) {
      positions.push(points[i].x, points[i].y, points[i].z);
      positions.push(points[i + 1].x, points[i + 1].y, points[i + 1].z);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  return geometry;
}

/**
 * Calculate bounding box for all tracks
 * @param {Array} processedTracks - Array of processed tracks
 * @returns {Object} Bounding box {min: {x, y, z}, max: {x, y, z}, center: {x, y, z}, size: {x, y, z}}
 */
export function calculateBoundingBox(processedTracks) {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity
  };

  processedTracks.forEach(track => {
    track.points.forEach(point => {
      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.minY = Math.min(bounds.minY, point.y);
      bounds.maxY = Math.max(bounds.maxY, point.y);
      bounds.minZ = Math.min(bounds.minZ, point.z);
      bounds.maxZ = Math.max(bounds.maxZ, point.z);
    });
  });

  return {
    min: { x: bounds.minX, y: bounds.minY, z: bounds.minZ },
    max: { x: bounds.maxX, y: bounds.maxY, z: bounds.maxZ },
    center: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
      z: (bounds.minZ + bounds.maxZ) / 2
    },
    size: {
      x: bounds.maxX - bounds.minX,
      y: bounds.maxY - bounds.minY,
      z: bounds.maxZ - bounds.minZ
    }
  };
}
