"use client";

import { useEffect, useRef, useState } from 'react';

export interface BGMTrack {
    name: string;
    path: string;
}

export const BGM_TRACKS: BGMTrack[] = [
    { name: 'Cinematic', path: '/audio/bgm/Cinematic.mp3' },
    { name: 'Study Buddy', path: '/audio/bgm/Study Buddy.mp3' },
];

interface BGMManagerProps {
    enabled: boolean;
    volume: number;
    selectedTrack: string;
}

export const useBGM = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [enabled, setEnabled] = useState<boolean>(false);  // Default: disabled
    const [volume, setVolume] = useState<number>(0.3);
    const [selectedTrack, setSelectedTrack] = useState<string>(BGM_TRACKS[0].path);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    // Initialize audio element (lazy initialization for Safari compatibility)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Don't create Audio object immediately to avoid Safari issues
            // It will be created when enabled is set to true
            return () => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                }
            };
        }
    }, []);

    // Handle track change
    useEffect(() => {
        if (audioRef.current && audioRef.current.src !== selectedTrack) {
            const wasPlaying = !audioRef.current.paused;
            const currentTime = audioRef.current.currentTime;

            audioRef.current.pause();
            audioRef.current.src = selectedTrack;
            audioRef.current.volume = volume;
            audioRef.current.loop = true;

            if (wasPlaying && enabled) {
                audioRef.current.play().catch(e => {
                    console.warn('Failed to play BGM:', e);
                    setIsPlaying(false);
                });
            }
        }
    }, [selectedTrack]);

    // Handle enabled/disabled state
    useEffect(() => {
        if (enabled) {
            // Lazy initialization: create Audio object only when user enables BGM
            if (!audioRef.current) {
                try {
                    audioRef.current = new Audio(selectedTrack);
                    audioRef.current.loop = true;
                    audioRef.current.volume = volume;
                } catch (e) {
                    console.error('Failed to create Audio object:', e);
                    setIsPlaying(false);
                    return;
                }
            }

            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(e => {
                console.warn('Failed to play BGM:', e);
                setIsPlaying(false);
            });
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [enabled]);

    // Handle volume change
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    return {
        enabled,
        setEnabled,
        volume,
        setVolume,
        selectedTrack,
        setSelectedTrack,
        isPlaying,
    };
};

const BGMManager: React.FC<BGMManagerProps> = ({ enabled, volume, selectedTrack }) => {
    // This component doesn't render anything, it just manages the audio
    return null;
};

export default BGMManager;
