"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl } from 'howler';
import { SOUND_EFFECTS, SoundEffectName } from '../lib/soundConstants';

/**
 * Sound Effects Manager Hook
 *
 * Manages all game sound effects using Howler.js
 * Supports multiple simultaneous sounds, looping, volume control, and pitch adjustment
 */
export const useSoundEffects = () => {
    const soundsRef = useRef<Map<SoundEffectName, Howl>>(new Map());
    const [enabled, setEnabled] = useState<boolean>(true);  // Default: enabled
    const [masterVolume, setMasterVolume] = useState<number>(0.5);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Initialize sound objects (lazy initialization for mobile compatibility)
    const initializeSounds = useCallback(() => {
        if (isInitialized) return;

        try {
            // Create Howl instances for all sound effects
            Object.entries(SOUND_EFFECTS).forEach(([name, config]) => {
                const sound = new Howl({
                    src: config.src,
                    volume: config.volume * masterVolume,
                    loop: config.loop,
                    rate: config.rate || 1.0,
                    preload: true,  // Preload files for smooth playback
                    html5: true,  // Use HTML5 Audio for better mobile Safari compatibility
                });

                soundsRef.current.set(name as SoundEffectName, sound);
            });

            setIsInitialized(true);
            console.log('Sound effects initialized');

            // Unlock audio on mobile Safari by playing a dummy sound
            // This must be done within a user interaction (e.g., START button click)
            const firstSound = soundsRef.current.values().next().value;
            if (firstSound) {
                const originalVolume = firstSound.volume();
                firstSound.volume(0);  // Mute
                firstSound.play();     // Play to unlock
                setTimeout(() => {
                    firstSound.stop();
                    firstSound.volume(originalVolume);  // Restore volume
                }, 100);
                console.log('Audio unlocked for mobile Safari');
            }
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
        if (!enabled) return;

        const sound = soundsRef.current.get(name);
        if (sound) {
            sound.play();
        }
    }, [enabled]);

    // Stop a sound effect
    const stop = useCallback((name: SoundEffectName) => {
        const sound = soundsRef.current.get(name);
        if (sound) {
            sound.stop();
        }
    }, []);

    // Pause a sound effect (preserves position)
    const pause = useCallback((name: SoundEffectName) => {
        const sound = soundsRef.current.get(name);
        if (sound) {
            sound.pause();
        }
    }, []);

    // Resume a paused sound
    const resume = useCallback((name: SoundEffectName) => {
        if (!enabled) return;

        const sound = soundsRef.current.get(name);
        if (sound) {
            sound.play();
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
        const sound = soundsRef.current.get(name);
        return sound ? sound.playing() : false;
    }, []);

    // Stop all sounds
    const stopAll = useCallback(() => {
        soundsRef.current.forEach((sound) => {
            sound.stop();
        });
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
