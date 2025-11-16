"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { SOUND_EFFECTS, SoundEffectName } from '../lib/soundConstants';

/**
 * Sound Effects Manager Hook
 *
 * Manages all game sound effects using Howler.js
 * Supports multiple simultaneous sounds, looping, volume control, and pitch adjustment
 */
export const useSoundEffects = () => {
    const soundsRef = useRef<Map<SoundEffectName, Howl>>(new Map());
    const playingRef = useRef<Set<SoundEffectName>>(new Set());  // Track which sounds are playing
    const [enabled, setEnabled] = useState<boolean>(true);  // Default: enabled
    const [masterVolume, setMasterVolume] = useState<number>(0.5);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Initialize sound objects
    const initializeSounds = useCallback(async () => {
        if (isInitialized) return;

        try {
            console.log('Initializing sound effects with Web Audio API...');

            // Create Howl instances for all sound effects (Web Audio API with buffer)
            const loadPromises: Promise<void>[] = [];

            Object.entries(SOUND_EFFECTS).forEach(([name, config]) => {
                const sound = new Howl({
                    src: config.src,
                    volume: config.volume * masterVolume,
                    loop: config.loop,
                    rate: config.rate || 1.0,
                    preload: true,  // Preload and buffer sounds
                    // html5: false (default) - Use Web Audio API for stability on mobile
                });

                // Wait for sound to load
                const loadPromise = new Promise<void>((resolve) => {
                    sound.once('load', () => {
                        console.log(`Loaded sound: ${name}`);
                        resolve();
                    });
                    sound.once('loaderror', (id, error) => {
                        console.error(`Failed to load sound ${name}:`, error);
                        resolve(); // Continue even if one sound fails
                    });
                });

                loadPromises.push(loadPromise);
                soundsRef.current.set(name as SoundEffectName, sound);
            });

            // Wait for all sounds to load
            await Promise.all(loadPromises);
            console.log('All sounds loaded');

            // Resume AudioContext (CRITICAL for mobile browsers)
            if (Howler.ctx) {
                console.log('AudioContext state:', Howler.ctx.state);
                if (Howler.ctx.state === 'suspended') {
                    await Howler.ctx.resume();
                    console.log('AudioContext resumed successfully');
                }
            }

            setIsInitialized(true);
            console.log('Sound effects fully initialized and ready');
        } catch (error) {
            console.error('Failed to initialize sound effects:', error);
        }
    }, [isInitialized, masterVolume]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            soundsRef.current.forEach((sound) => {
                sound.unload();
            });
            soundsRef.current.clear();
            playingRef.current.clear();
        };
    }, []);

    // Update volumes when master volume changes
    useEffect(() => {
        soundsRef.current.forEach((sound, name) => {
            const config = SOUND_EFFECTS[name];
            sound.volume(config.volume * masterVolume);
        });
    }, [masterVolume]);

    // Play a sound effect
    const play = useCallback((name: SoundEffectName) => {
        if (!enabled) {
            console.log('Sound effects disabled');
            return;
        }

        // Check if already playing
        if (playingRef.current.has(name)) {
            console.log(`${name} is already playing`);
            return;
        }

        const sound = soundsRef.current.get(name);
        if (sound) {
            try {
                sound.play();
                playingRef.current.add(name);
                console.log(`Playing ${name}`);
            } catch (error) {
                console.error(`Error playing ${name}:`, error);
            }
        } else {
            console.error(`Sound ${name} not found`);
        }
    }, [enabled]);

    // Stop a sound effect
    const stop = useCallback((name: SoundEffectName) => {
        const sound = soundsRef.current.get(name);
        if (sound) {
            sound.stop();
            playingRef.current.delete(name);
            console.log(`Stopped ${name}`);
        }
    }, []);

    // Pause a sound effect (preserves position)
    const pause = useCallback((name: SoundEffectName) => {
        const sound = soundsRef.current.get(name);
        if (sound) {
            sound.pause();
            playingRef.current.delete(name);
        }
    }, []);

    // Resume a paused sound
    const resume = useCallback((name: SoundEffectName) => {
        if (!enabled) return;

        const sound = soundsRef.current.get(name);
        if (sound) {
            sound.play();
            playingRef.current.add(name);
        }
    }, [enabled]);

    // Set volume for a specific sound
    const setVolume = useCallback((name: SoundEffectName, volume: number) => {
        const sound = soundsRef.current.get(name);
        if (sound) {
            sound.volume(volume * masterVolume);
        }
    }, [masterVolume]);

    // Set playback rate (pitch) for a specific sound
    const setRate = useCallback((name: SoundEffectName, rate: number) => {
        const sound = soundsRef.current.get(name);
        if (sound) {
            sound.rate(rate);
        }
    }, []);

    // Check if a sound is currently playing
    const isPlaying = useCallback((name: SoundEffectName): boolean => {
        return playingRef.current.has(name);
    }, []);

    // Stop all sounds
    const stopAll = useCallback(() => {
        soundsRef.current.forEach((sound) => {
            sound.stop();
        });
        playingRef.current.clear();
    }, []);

    return {
        enabled,
        setEnabled,
        masterVolume,
        setMasterVolume,
        play,
        stop,
        pause,
        resume,
        setVolume,
        setRate,
        isPlaying,
        stopAll,
        isInitialized,
        initializeSounds,
    };
};

export type SoundEffectsContextType = ReturnType<typeof useSoundEffects>;
