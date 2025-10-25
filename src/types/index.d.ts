// This file defines TypeScript types and interfaces used throughout the application.

declare module 'three/examples/jsm/controls/OrbitControls' {
    import { Camera, EventDispatcher, MOUSE, TOUCH, Vector3 } from 'three';

    export class OrbitControls extends EventDispatcher {
        constructor(object: Camera, domElement?: HTMLElement);

        object: Camera;
        domElement: HTMLElement | Document;

        enabled: boolean;
        target: Vector3;

        minDistance: number;
        maxDistance: number;

        minZoom: number;
        maxZoom: number;

        minPolarAngle: number;
        maxPolarAngle: number;

        minAzimuthAngle: number;
        maxAzimuthAngle: number;

        enableDamping: boolean;
        dampingFactor: number;

        enableZoom: boolean;
        zoomSpeed: number;

        enableRotate: boolean;
        rotateSpeed: number;

        enablePan: boolean;
        panSpeed: number;
        screenSpacePanning: boolean;
        keyPanSpeed: number;

        autoRotate: boolean;
        autoRotateSpeed: number;

        enableKeys: boolean;

        mouseButtons: {
            LEFT?: MOUSE;
            MIDDLE?: MOUSE;
            RIGHT?: MOUSE;
        };

        touches: {
            ONE?: TOUCH;
            TWO?: TOUCH;
        };

        update(): boolean;

        saveState(): void;
        reset(): void;

        dispose(): void;

        getPolarAngle(): number;
        getAzimuthalAngle(): number;
        getDistance(): number;
    }
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