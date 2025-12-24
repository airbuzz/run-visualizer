import React, { useRef } from 'react';
import { Text, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Static station markers component
 */
export function Stations({ center }) {
  const stations = [
    { name: '王子駅', lat: 35.7529945, lon: 139.7352965 },
    { name: '巣鴨駅', lat: 35.733163, lon: 139.738998 },
    { name: '上野駅', lat: 35.7115601, lon: 139.7697779 },
    { name: '日暮里駅', lat: 35.7281578, lon: 139.7680665 },
    { name: '皇居', lat: 35.6824, lon: 139.7527 },
    { name: '浅草駅', lat: 35.7098669, lon: 139.7945926 },
    { name: '池袋駅', lat: 35.729868, lon: 139.711442 },
    { name: '駒込駅', lat: 35.736601, lon: 139.746819 },
    { name: '大塚駅', lat: 35.731823, lon: 139.727514 },
    { name: '千石駅', lat: 35.727946, lon: 139.744849 },
  ];

  // Convert GPS to 3D coordinates (same as track conversion)
  const gpsToCartesian = (lat, lon, center) => {
    const projectionScale = 10000;
    const latScale = projectionScale;
    const lonScale = projectionScale * Math.cos(center.lat * Math.PI / 180);

    const x = (lon - center.lon) * lonScale;
    const z = -(lat - center.lat) * latScale;
    const y = 0; // Ground level

    return new THREE.Vector3(x, y, z);
  };

  return (
    <group>
      {stations.map((station, index) => {
        const position = gpsToCartesian(station.lat, station.lon, center);

        return (
          <group key={index} position={position}>
            {/* Small downward arrow */}
            <mesh position={[0, 1.5, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[1.5, 3, 8]} />
              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#FFFFFF"
                emissiveIntensity={2}
                toneMapped={false}
              />
            </mesh>

            {/* Station name label - always facing camera */}
            <Html position={[0, 6, 0]} center>
              <div style={{
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 900,
                textShadow: '0 0 4px #000000, 0 0 8px #000000',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                {station.name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
