import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { config } from './config';
import { parseGPX, processTracks, createTrailGeometry, getPointOnCurve, calculateBoundingBox } from './utils';

/**
 * Component that renders animated runner orbs using InstancedMesh for performance
 */
function RunnerOrbs({ tracks }) {
  const meshRef = useRef();
  const startTimeRef = useRef(Date.now());
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempVector = useMemo(() => new THREE.Vector3(), []);

  const count = tracks.length;

  useFrame(() => {
    if (!meshRef.current) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const progress = config.animationLoop
      ? (elapsed % config.animationDuration) / config.animationDuration
      : Math.min(elapsed / config.animationDuration, 1);

    // Update each instance
    for (let i = 0; i < count; i++) {
      const track = tracks[i];
      if (!track.curve) continue;

      // Get position on curve based on progress
      const point = getPointOnCurve(track.curve, progress);

      // Set position and scale
      tempObject.position.copy(point);
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();

      // Update instance matrix
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[config.orbSize, config.orbSegments, config.orbSegments]} />
      <meshStandardMaterial
        color={config.orbColor}
        emissive={config.orbColor}
        emissiveIntensity={config.orbIntensity}
        toneMapped={false}
      />
    </instancedMesh>
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
function Scene({ tracks }) {
  if (!tracks || tracks.length === 0) {
    return null;
  }

  return (
    <>
      <Lighting />
      <Floor />
      <TrailLines tracks={tracks} />
      <RunnerOrbs tracks={tracks} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.5}
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
      {stats && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: config.orbColor,
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '10px',
          borderRadius: '5px'
        }}>
          <div>Tracks: {stats.totalTracks}</div>
          <div>Area: {Math.round(stats.boundingBox.size.x / 10)}km × {Math.round(stats.boundingBox.size.z / 10)}km</div>
          <div>Duration: {config.animationDuration}s</div>
        </div>
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
        <Scene tracks={tracks} />

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
