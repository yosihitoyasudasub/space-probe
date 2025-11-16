/**
 * Sound Effects Configuration
 *
 * This file defines all sound effects used in the game, their sources,
 * and playback settings.
 */

export interface SoundConfig {
    src: string[];      // Audio file paths (multiple formats for compatibility)
    volume: number;     // Default volume (0.0 - 1.0)
    loop: boolean;      // Whether to loop the sound
    rate?: number;      // Playback rate (pitch) - default 1.0
}

export const SOUND_EFFECTS = {
    // Engine sounds
    ENGINE_THRUST: {
        src: ['/sounds/engine/thrust-loop.mp3'],
        volume: 0.4,
        loop: true,
        rate: 1.0
    } as SoundConfig,

    ENGINE_IDLE: {
        src: ['/sounds/engine/idle-loop.webm', '/sounds/engine/idle-loop.mp3', '/sounds/engine/idle-loop.wav'],
        volume: 0.2,
        loop: true,
        rate: 1.0
    } as SoundConfig,

    // Event sounds
    SLINGSHOT: {
        src: ['/sounds/events/slingshot.webm', '/sounds/events/slingshot.mp3', '/sounds/events/slingshot.wav'],
        volume: 0.6,
        loop: false
    } as SoundConfig,

    FUEL_LOW: {
        src: ['/sounds/events/fuel-low.webm', '/sounds/events/fuel-low.mp3', '/sounds/events/fuel-low.wav'],
        volume: 0.5,
        loop: false
    } as SoundConfig,

    MISSION_COMPLETE: {
        src: ['/sounds/events/mission-complete.webm', '/sounds/events/mission-complete.mp3', '/sounds/events/mission-complete.wav'],
        volume: 0.7,
        loop: false
    } as SoundConfig,

    // Ambient sounds
    SPACE_AMBIENCE: {
        src: ['/sounds/ambient/space-ambience.webm', '/sounds/ambient/space-ambience.mp3', '/sounds/ambient/space-ambience.wav'],
        volume: 0.15,
        loop: true
    } as SoundConfig,

    // UI sounds
    UI_CLICK: {
        src: ['/sounds/ui/click.webm', '/sounds/ui/click.mp3', '/sounds/ui/click.wav'],
        volume: 0.3,
        loop: false
    } as SoundConfig,

    UI_HOVER: {
        src: ['/sounds/ui/hover.webm', '/sounds/ui/hover.mp3', '/sounds/ui/hover.wav'],
        volume: 0.2,
        loop: false
    } as SoundConfig
} as const;

export type SoundEffectName = keyof typeof SOUND_EFFECTS;
