import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { config } from './config';
import { parseGPX, processTracks, createTrailGeometry, getPointOnCurve, calculateBoundingBox, calculateCenter } from './utils';
import { useCameraAnimation } from './hooks/useCameraAnimation';
import { InfoOverlay } from './components/InfoOverlay';
import { Stations } from './components/Stations';

/**
 * Component that renders animated runner orbs using InstancedMesh for performance
 */
function RunnerOrbs({ tracks, featuredTrackIndex }) {
  const nonFeaturedMeshRef = useRef();
  const featuredMeshRef = useRef();
  const startTimeRef = useRef(Date.now());
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  const count = tracks.length;

  useFrame(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const progress = config.animationLoop
      ? (elapsed % config.animationDuration) / config.animationDuration
      : Math.min(elapsed / config.animationDuration, 1);

    // Blinking effect for featured orb - oscillates between high and higher intensity
    const blinkSpeed = 3; // Blinks per second
    const blinkProgress = (Math.sin(elapsed * blinkSpeed * Math.PI * 2) + 1) / 2;
    const blinkIntensity = 10 + blinkProgress * 8; // Oscillates between 10 and 18

    let nonFeaturedIndex = 0;
    let featuredIndex = 0;

    // Update each instance
    for (let i = 0; i < count; i++) {
      const track = tracks[i];
      if (!track.curve) continue;

      // Get position on curve based on progress
      const point = getPointOnCurve(track.curve, progress);

      tempObject.position.copy(point);

      if (i === featuredTrackIndex) {
        // Featured orb - larger size
        tempObject.scale.set(
          config.featuredRun.size,
          config.featuredRun.size,
          config.featuredRun.size
        );
        tempObject.updateMatrix();

        if (featuredMeshRef.current) {
          featuredMeshRef.current.setMatrixAt(featuredIndex, tempObject.matrix);
          featuredIndex++;
        }
      } else {
        // Non-featured orb - normal size
        tempObject.scale.set(1, 1, 1);
        tempObject.updateMatrix();

        if (nonFeaturedMeshRef.current) {
          nonFeaturedMeshRef.current.setMatrixAt(nonFeaturedIndex, tempObject.matrix);
          nonFeaturedIndex++;
        }
      }
    }

    if (nonFeaturedMeshRef.current) {
      nonFeaturedMeshRef.current.instanceMatrix.needsUpdate = true;
      nonFeaturedMeshRef.current.count = nonFeaturedIndex;
    }

    if (featuredMeshRef.current) {
      featuredMeshRef.current.instanceMatrix.needsUpdate = true;
      featuredMeshRef.current.count = featuredIndex;
      // Update blinking intensity
      featuredMeshRef.current.material.emissiveIntensity = blinkIntensity;
    }
  });

  return (
    <>
      {/* Non-featured orbs (dimmed) */}
      <instancedMesh ref={nonFeaturedMeshRef} args={[null, null, count]}>
        <sphereGeometry args={[config.orbSize, config.orbSegments, config.orbSegments]} />
        <meshStandardMaterial
          color={config.orbColor}
          emissive={config.orbColor}
          emissiveIntensity={config.orbIntensity * config.dimmedRuns.emissiveIntensityFactor}
          toneMapped={false}
          opacity={config.dimmedRuns.opacityFactor}
          transparent
        />
      </instancedMesh>

      {/* Featured orb (blinking white with radiant light) */}
      <instancedMesh ref={featuredMeshRef} args={[null, null, 1]}>
        <sphereGeometry args={[config.orbSize * 1.5, config.orbSegments, config.orbSegments]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={12}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

/**
 * Component that renders static trail lines for all tracks
 */
function TrailLines({ tracks }) {
  const geometry = useMemo(() => createTrailGeometry(tracks), [tracks]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={config.trailColor}
        transparent
        opacity={config.trailOpacity}
        linewidth={config.trailLineWidth}
      />
    </lineSegments>
  );
}

/**
 * Component that renders the floor plane
 */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <planeGeometry args={[config.floorSize, config.floorSize]} />
      <meshStandardMaterial color={config.floorColor} roughness={0.8} metalness={0.2} />
    </mesh>
  );
}

/**
 * Component that sets up the scene lighting
 */
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[50, 50, 50]} intensity={0.5} castShadow />
      <pointLight position={[0, 50, 0]} intensity={0.3} />
    </>
  );
}

/**
 * Main scene component that contains all 3D elements
 */
function Scene({ tracks, center, onFeaturedTrackChange }) {
  const orbitControlsRef = useRef();
  const { featuredTrackIndex, isTransitioning } = useCameraAnimation(tracks, orbitControlsRef);

  // Notify parent component of featured track changes
  useEffect(() => {
    if (onFeaturedTrackChange) {
      onFeaturedTrackChange(featuredTrackIndex);
    }
  }, [featuredTrackIndex, onFeaturedTrackChange]);

  if (!tracks || tracks.length === 0) {
    return null;
  }

  return (
    <>
      <Lighting />
      <Floor />
      <TrailLines tracks={tracks} />
      <RunnerOrbs tracks={tracks} featuredTrackIndex={featuredTrackIndex} />
      {center && <Stations center={center} />}
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.5}
        enabled={!isTransitioning}
      />
      {config.showStats && <Stats />}
    </>
  );
}

/**
 * Main Tokyo Run Visualizer component
 */
export default function TokyoRunVisualizer({ gpxFilePath }) {
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [featuredTrackIndex, setFeaturedTrackIndex] = useState(null);
  const [center, setCenter] = useState(null);

  useEffect(() => {
    async function loadGPXData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch the GPX file
        const response = await fetch(gpxFilePath);
        if (!response.ok) {
          throw new Error(`Failed to load GPX file: ${response.statusText}`);
        }

        const gpxString = await response.text();

        // Parse GPX
        console.time('Parse GPX');
        const parsedTracks = parseGPX(gpxString);
        console.timeEnd('Parse GPX');
        console.log(`Parsed ${parsedTracks.length} tracks`);

        // Calculate center for station positioning
        const trackCenter = calculateCenter(parsedTracks);
        console.log('Center:', trackCenter);
        setCenter(trackCenter);

        // Process tracks (convert to 3D, create curves)
        console.time('Process Tracks');
        const processedTracks = processTracks(parsedTracks);
        console.timeEnd('Process Tracks');
        console.log(`Processed ${processedTracks.length} tracks`);

        // Calculate bounding box
        const bbox = calculateBoundingBox(processedTracks);
        console.log('Bounding box:', bbox);

        // Set stats
        setStats({
          totalTracks: processedTracks.length,
          boundingBox: bbox
        });

        setTracks(processedTracks);
      } catch (err) {
        console.error('Error loading GPX data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (gpxFilePath) {
      loadGPXData();
    }
  }, [gpxFilePath]);

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: config.backgroundColor,
        color: config.orbColor,
        fontFamily: 'monospace',
        fontSize: '18px'
      }}>
        Loading Tokyo running data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: config.backgroundColor,
        color: '#ff0000',
        fontFamily: 'monospace',
        fontSize: '18px',
        padding: '20px',
        textAlign: 'center'
      }}>
        Error: {error}
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: config.backgroundColor,
        color: config.orbColor,
        fontFamily: 'monospace',
        fontSize: '18px'
      }}>
        No tracks found in GPX file
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Info overlay for featured track */}
      {tracks && featuredTrackIndex !== null && (
        <InfoOverlay featuredTrack={tracks[featuredTrackIndex]} />
      )}

      <Canvas
        camera={{
          position: config.cameraPosition,
          fov: config.cameraFov,
          near: config.cameraNear,
          far: config.cameraFar
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0
        }}
        style={{ background: config.backgroundColor }}
      >
        <Scene tracks={tracks} center={center} onFeaturedTrackChange={setFeaturedTrackIndex} />

        <EffectComposer>
          <Bloom
            intensity={config.bloomIntensity}
            luminanceThreshold={config.bloomLuminanceThreshold}
            luminanceSmoothing={config.bloomLuminanceSmoothing}
            radius={config.bloomRadius}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
