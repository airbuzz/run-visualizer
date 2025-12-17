import { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { config } from '../config';
import { calculateOptimalCameraPosition, easeInOutCubic } from '../utils';

/**
 * Custom hook for automated camera animation
 * Manages camera transitions, user interaction detection, and featured track selection
 */
export function useCameraAnimation(tracks, orbitControlsRef) {
  const { camera } = useThree();
  const [featuredTrackIndex, setFeaturedTrackIndex] = useState(null);
  const [animationState, setAnimationState] = useState('AUTO'); // AUTO, TRANSITIONING, USER_CONTROL

  // Refs
  const lastInteractionRef = useRef(0);
  const transitionStartRef = useRef(null);
  const transitionDataRef = useRef(null);
  const intervalTimerRef = useRef(null);
  const animationStateRef = useRef('AUTO');
  const featuredTrackIndexRef = useRef(null);

  const cfg = config.cameraAnimation;

  // Keep refs in sync with state
  useEffect(() => {
    animationStateRef.current = animationState;
  }, [animationState]);

  useEffect(() => {
    featuredTrackIndexRef.current = featuredTrackIndex;
  }, [featuredTrackIndex]);

  // Detect user interaction
  useEffect(() => {
    if (!orbitControlsRef.current) return;

    const controls = orbitControlsRef.current;

    const handleInteraction = () => {
      // Ignore change events triggered by our own camera animation
      const currentState = animationStateRef.current;
      if (currentState === 'TRANSITIONING') {
        console.log('[Camera Animation] Ignoring change event during transition');
        return;
      }

      lastInteractionRef.current = Date.now();
      if (currentState === 'AUTO') {
        console.log('[Camera Animation] User interaction detected, pausing animation');
        setAnimationState('USER_CONTROL');
      }
    };

    controls.addEventListener('change', handleInteraction);

    return () => {
      controls.removeEventListener('change', handleInteraction);
    };
  }, [orbitControlsRef]);

  // Resume auto-animation after inactivity
  useEffect(() => {
    if (animationState !== 'USER_CONTROL') return;

    console.log('[Camera Animation] Starting inactivity check');
    const checkInactivity = setInterval(() => {
      const timeSinceInteraction = (Date.now() - lastInteractionRef.current) / 1000;

      if (timeSinceInteraction > cfg.inactivityTimeout) {
        console.log('[Camera Animation] Inactivity timeout reached, resuming animation');
        setAnimationState('AUTO');
      }
    }, 1000);

    return () => {
      console.log('[Camera Animation] Stopping inactivity check');
      clearInterval(checkInactivity);
    };
  }, [animationState, cfg.inactivityTimeout]);

  // Set up interval timer - only runs when tracks change, not when state changes
  useEffect(() => {
    console.log('[Camera Animation] Setting up interval. Enabled:', cfg.enabled, 'Tracks:', tracks?.length);

    if (!cfg.enabled || !tracks || tracks.length === 0) {
      console.log('[Camera Animation] Early return - not enabled or no tracks');
      return;
    }

    // Function to select random track
    const selectRandomTrack = () => {
      if (!tracks || tracks.length === 0) return null;

      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * tracks.length);
      } while (newIndex === featuredTrackIndexRef.current && tracks.length > 1);

      return newIndex;
    };

    // Function to start transition
    const startTransition = (trackIndex) => {
      console.log('[Camera Animation] startTransition called for track:', trackIndex);
      if (!tracks || !tracks[trackIndex]) {
        console.log('[Camera Animation] No tracks or invalid index');
        return;
      }

      const track = tracks[trackIndex];
      const { position: targetPos, target: targetLookAt } =
        calculateOptimalCameraPosition(track, camera.fov);

      console.log('[Camera Animation] Camera position:', camera.position);
      console.log('[Camera Animation] Target position:', targetPos);
      console.log('[Camera Animation] Target lookAt:', targetLookAt);

      transitionDataRef.current = {
        startPosition: camera.position.clone(),
        startTarget: orbitControlsRef.current?.target.clone() || new THREE.Vector3(),
        targetPosition: targetPos,
        targetLookAt: targetLookAt,
      };

      transitionStartRef.current = Date.now();
      setAnimationState('TRANSITIONING');
      console.log('[Camera Animation] State set to TRANSITIONING');
    };

    // Function to run on interval
    const runInterval = () => {
      console.log('[Camera Animation] Running interval. State:', animationStateRef.current);
      if (animationStateRef.current === 'AUTO') {
        const newTrackIndex = selectRandomTrack();
        console.log('[Camera Animation] Selected track:', newTrackIndex);
        if (newTrackIndex !== null) {
          setFeaturedTrackIndex(newTrackIndex);
          startTransition(newTrackIndex);
        }
      }
    };

    // Run immediately
    runInterval();

    // Set up interval
    intervalTimerRef.current = setInterval(runInterval, cfg.intervalSeconds * 1000);
    console.log('[Camera Animation] Interval set up for every', cfg.intervalSeconds, 'seconds');

    return () => {
      console.log('[Camera Animation] Cleaning up interval');
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
        intervalTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, cfg.enabled, cfg.intervalSeconds]);

  // Animation frame - handle transitions
  useFrame(() => {
    if (animationState !== 'TRANSITIONING' || !transitionDataRef.current) return;

    const elapsed = (Date.now() - transitionStartRef.current) / 1000;
    const progress = Math.min(elapsed / cfg.transitionSeconds, 1);
    const easedProgress = easeInOutCubic(progress);

    const { startPosition, startTarget, targetPosition, targetLookAt } = transitionDataRef.current;

    // Lerp camera position
    camera.position.lerpVectors(startPosition, targetPosition, easedProgress);

    // Lerp orbit controls target
    if (orbitControlsRef.current) {
      const newTarget = new THREE.Vector3().lerpVectors(startTarget, targetLookAt, easedProgress);
      orbitControlsRef.current.target.copy(newTarget);
      orbitControlsRef.current.update();
    }

    // Log progress every 10%
    if (Math.floor(progress * 10) !== Math.floor((progress - 0.01) * 10)) {
      console.log('[Camera Animation] Transition progress:', (progress * 100).toFixed(0) + '%');
    }

    // Transition complete
    if (progress >= 1) {
      console.log('[Camera Animation] Transition complete, setting state back to AUTO');
      setAnimationState('AUTO');
      transitionDataRef.current = null;
    }
  });

  return {
    featuredTrackIndex,
    isAutoAnimating: animationState === 'AUTO',
    isTransitioning: animationState === 'TRANSITIONING',
  };
}
