// This file defines TypeScript types and interfaces used throughout the application.

declare module 'three' {
    export * from 'three/src/Three';
}

interface Planet {
    name: string;
    radius: number;
    distance: number;
    speed: number;
    color: string;
    mass: number;
    gravityCoefficient?: number;
}

interface Probe {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    fuel: number;
    slingshotCount: number;
    maxDistance: number;
    gameWon: boolean;
    inOrbit: boolean;
    forceOrbitalMode: boolean;
    orbitalAngle: number;
    orbitingPlanet: Planet | null;
    planetOrbitAngle: number;
    planetOrbitMode: boolean;
}