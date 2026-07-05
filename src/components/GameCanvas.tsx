"use client";

import React, { useEffect, useRef } from 'react';
import { createGameLoop, GameLoop } from '../lib/gameLoop';
import { CameraView, HudSample } from '../lib/types';
import { findProbeModel } from '../lib/probeModels';
import { InputState } from '../lib/thrust';

interface Props {
    /** Receives throttled probe-state snapshots for the HUD */
    onHudSample?: (sample: HudSample) => void;
    probeSpeedMult?: number;
    gravityG?: number;
    starMass?: number;
    cameraView?: CameraView;
    gravityGridEnabled?: boolean;
    gridEnabled?: boolean;
    selectedModel?: string;
    isSimulationStarted?: boolean;
    /** Shared input state mutated by TouchControls, read every physics step */
    inputStateRef?: React.RefObject<InputState>;
    /** Receives the restart handler so external UI (TouchControls) can trigger it */
    restartRef?: React.RefObject<(() => void) | null>;
}

/**
 * Thin React bridge around the game loop (lib/gameLoop.ts): renders the
 * canvas, mirrors props into refs the loop can read live, and forwards HUD
 * samples back into React state.
 */
const GameCanvas: React.FC<Props> = ({ onHudSample, probeSpeedMult = 1.05, gravityG = 1.0, starMass = 4000, cameraView = 'free', gravityGridEnabled = false, gridEnabled = true, selectedModel = 'space_fighter', isSimulationStarted = false, inputStateRef, restartRef }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const loopRef = useRef<GameLoop | null>(null);

    // Mirror frequently-changing props into refs so the long-lived game loop
    // (and restart) always sees the current values without re-mounting.
    const cameraViewRef = useRef<CameraView>(cameraView);
    const isSimulationStartedRef = useRef<boolean>(isSimulationStarted);
    const gravityGridEnabledRef = useRef<boolean>(gravityGridEnabled);
    const gridEnabledRef = useRef<boolean>(gridEnabled);
    const selectedModelRef = useRef<string>(selectedModel);

    useEffect(() => {
        cameraViewRef.current = cameraView;
    }, [cameraView]);

    useEffect(() => {
        isSimulationStartedRef.current = isSimulationStarted;
    }, [isSimulationStarted]);

    // Update gravity grid when gravityGridEnabled changes
    useEffect(() => {
        gravityGridEnabledRef.current = gravityGridEnabled;
        loopRef.current?.getThree()?.updateGravityGrid(gravityGridEnabled);
    }, [gravityGridEnabled]);

    // Update flat grid when gridEnabled changes
    useEffect(() => {
        gridEnabledRef.current = gridEnabled;
        loopRef.current?.getThree()?.updateGrid(gridEnabled);
    }, [gridEnabled]);

    // Handle probe model switching
    useEffect(() => {
        const isFirstRender = selectedModelRef.current === selectedModel && !loopRef.current;
        selectedModelRef.current = selectedModel;
        if (isFirstRender) return;
        const modelData = findProbeModel(selectedModel);
        loopRef.current?.getThree()?.switchProbeModel(modelData?.path ?? null, modelData?.orientation);
    }, [selectedModel]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const loop = createGameLoop({
            canvas,
            // input state shared with TouchControls (falls back to a local
            // object when no ref is provided)
            input: inputStateRef?.current ?? { left: false, right: false, up: false, down: false },
            getOptions: () => {
                const modelData = findProbeModel(selectedModelRef.current);
                return {
                    probeSpeedMult,
                    G: gravityG,
                    starMass,
                    gravityGridEnabled: gravityGridEnabledRef.current,
                    gridEnabled: gridEnabledRef.current,
                    probeModelPath: modelData?.path ?? null,
                    orientation: modelData?.orientation,
                };
            },
            getCameraView: () => cameraViewRef.current,
            isSimulationStarted: () => isSimulationStartedRef.current,
            onHudSample,
        });

        loopRef.current = loop;
        loop.start();

        // Register the restart handler for external UI (TouchControls)
        if (restartRef) restartRef.current = loop.restart;

        return () => {
            loop.dispose();
            loopRef.current = null;
            if (restartRef) restartRef.current = null;
        };
    }, [onHudSample, probeSpeedMult, gravityG, starMass, inputStateRef, restartRef]);

    return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh' }} />;
};

export default GameCanvas;
