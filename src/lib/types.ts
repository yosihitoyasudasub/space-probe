import * as THREE from 'three';

// Probe state exposed to the HUD and visual sync
export type ProbeState = {
    position: THREE.Vector3;
    velocity: THREE.Vector3; // vector velocity in scene units/sec
    distance: number; // accumulated path length
    fuel: number; // percent
    slingshots: number;
    status: string;
};

// Controls how a probe model is oriented relative to its velocity
//   - autoAlign: automatically align longest dimension with velocity vector
//   - rotationY: manual Y-axis rotation (radians) - applied before auto-alignment
//   - invertDirection: invert the direction after alignment (for models facing backwards)
export type ProbeOrientation = {
    autoAlign?: boolean;
    rotationY?: number;
    invertDirection?: boolean;
};

// Tuning options accepted by initThreeJS
export type InitOptions = {
    probeSpeedMult?: number;
    G?: number;
    starMass?: number;
    gravityGridEnabled?: boolean;
    gridEnabled?: boolean;
    probeModelPath?: string | null;
    orientation?: ProbeOrientation;
};

// A single sample in the HUD history charts
export interface DataPoint {
    time: number;
    value: number;
}
