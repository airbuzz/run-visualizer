import React, { useState, useEffect } from 'react';
import { config } from '../config';

const GEOAPIFY_API_KEY = '1739bdee3fcd44baae35f084f874c881';

/**
 * Info overlay component that displays featured run information
 */
export function InfoOverlay({ featuredTrack }) {
  const [startLocation, setStartLocation] = useState('Fetching...');
  const [endLocation, setEndLocation] = useState('Fetching...');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Trigger blur animation when track changes
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 600);

    if (!featuredTrack?.metadata) {
      setStartLocation('Unknown');
      setEndLocation('Unknown');
      return () => clearTimeout(timer);
    }

    const { startLat, startLon, endLat, endLon } = featuredTrack.metadata;

    // Helper function to fetch location name
    const fetchLocationName = async (lat, lon) => {
      try {
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_API_KEY}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch location');
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const properties = data.features[0].properties;
          // Build location name from available fields
          const parts = [];

          if (properties.suburb) parts.push(properties.suburb);
          else if (properties.district) parts.push(properties.district);
          else if (properties.neighbourhood) parts.push(properties.neighbourhood);

          if (properties.city) parts.push(properties.city);
          else if (properties.county) parts.push(properties.county);

          return parts.length > 0 ? parts.join(', ') : properties.formatted || 'Tokyo, Japan';
        } else {
          return 'Tokyo, Japan';
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        return 'Tokyo, Japan';
      }
    };

    // Fetch both locations
    const fetchBothLocations = async () => {
      setStartLocation('Fetching...');
      setEndLocation('Fetching...');

      const [start, end] = await Promise.all([
        fetchLocationName(startLat, startLon),
        fetchLocationName(endLat, endLon)
      ]);

      setStartLocation(start);
      setEndLocation(end);
    };

    if (startLat && startLon && endLat && endLon) {
      fetchBothLocations();
    }

    return () => clearTimeout(timer);
  }, [featuredTrack]);

  if (!featuredTrack || !config.infoOverlay.enabled) {
    return null;
  }

  const { metadata } = featuredTrack;

  // Format GPS coordinates
  const displayLat = metadata.startLat?.toFixed(6) || 'N/A';
  const displayLon = metadata.startLon?.toFixed(6) || 'N/A';

  // Transition style for blur effect
  const transitionStyle = {
    transition: 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
    opacity: isTransitioning ? 0 : 1,
    filter: isTransitioning ? 'blur(10px)' : 'blur(0px)',
  };

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '30px',
      transform: 'translateY(-50%)',
      color: '#FFFFFF',
      zIndex: 1000,
    }}>
      {/* Run number - large white text */}
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        fontWeight: 900,
        fontSize: '35px',
        color: '#FFFFFF',
        marginBottom: '8px',
        letterSpacing: '-0.5px',
        ...transitionStyle,
      }}>
        <span style={{ opacity: 0.75 }}>RUN</span>{metadata.index + 1}
      </div>

      {/* Date */}
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        fontWeight: 900,
        fontSize: '22px',
        color: '#FFFFFF',
        marginBottom: '12px',
        letterSpacing: '-0.3px',
        ...transitionStyle,
      }}>
        {metadata.timestamp || 'Unknown'}
      </div>

      {/* Location route - no blur, just fade */}
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        fontWeight: 700,
        fontSize: '15px',
        color: '#FFFFFF',
        marginBottom: '8px',
        opacity: 0.9,
      }}>
        {startLocation} → {endLocation}
      </div>

      {/* GPS Coordinates */}
      <div style={{
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", monospace',
        fontSize: '13px',
        color: '#FFFFFF',
        opacity: 0.7,
        letterSpacing: '0.5px',
        ...transitionStyle,
      }}>
        {displayLat}, {displayLon}
      </div>
    </div>
  );
}
