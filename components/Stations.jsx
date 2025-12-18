import React, { useRef } from 'react';
import { Text, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Static station markers component
 */
export function Stations({ center }) {
  const stations = [
    { name: 'OJI STATION | 王子駅', lat: 35.7529945, lon: 139.7352965 },
    { name: 'SUGAMO STATION | 巣鴨駅', lat: 35.7334192, lon: 139.7367099 },
    { name: 'UENO STATION | 上野駅', lat: 35.7115601, lon: 139.7697779 },
    { name: 'NIPPORI STATION | 日暮里駅', lat: 35.7281578, lon: 139.7680665 },
    { name: 'IMPERIAL PALACE | 皇居', lat: 35.6824, lon: 139.7527 },
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
