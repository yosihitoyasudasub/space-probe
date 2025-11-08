import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { Body, cloneBodies, stepBodies, PHYSICS_CONSTANTS } from './physics';

// ====================================================================
// Physics Scale Factors and Units
// ====================================================================
// This simulation uses a scaled unit system for game playability:
// - Mass: Earth mass = 1.0, Sun mass = 333,000 (realistic ratio)
// - Distance: 1 AU = 100 scene units
// - Time: Accelerated by factor of ~1,000,000 (1 real second ≈ 11.6 simulation days)
// - This gives Earth orbital period of ~30 seconds (vs 365 days in reality)
// ====================================================================

export const PHYSICS_SCALE = {
    // Mass scale: Earth mass = 1.0
    EARTH_MASS: 1.0,
    SUN_MASS: 333000,  // Realistic Sun/Earth mass ratio

    // Distance scale: 1 AU = 100 scene units
    AU: 100,

    // Time scale: ~1 million times faster than reality
    // (Earth completes orbit in ~30 seconds instead of 365 days)
    TIME_SCALE: 1e6,

    // Gravity constant adjusted for our unit system
    // This value gives realistic orbital mechanics with scaled time
    G: 0.133,

    // Velocity conversion: scene units/sec to km/s
    // Based on Earth orbital velocity: ~21 scene units/sec = 30 km/s (real)
    VELOCITY_TO_KM_PER_SEC: 1.43,  // multiply scene velocity by this to get km/s

    // Fuel consumption rate: % consumed per unit delta-v
    // With dvScale = 0.02, single direction thrust consumes 0.02% per frame
    // Total fuel = 100%, allows ~5000 frames (~83 seconds at 60fps) of continuous thrust
    FUEL_CONSUMPTION_RATE: 1.0,
};

// Legacy constant for backward compatibility
export const DEFAULT_G = PHYSICS_SCALE.G;

// ====================================================================
// Camera and Rendering Constants
// ====================================================================

export const CAMERA_CONSTANTS = {
    // Camera field of view in degrees (not radians)
    FOV_DEGREES: 60,

    // Near and far clipping planes (scene units)
    // Objects closer than NEAR or farther than FAR will not be rendered
    NEAR_PLANE: 0.1,        // 0.1 scene units (very close)
    FAR_PLANE: 50000,       // 50,000 scene units (500 AU) - enough to see entire solar system

    // Initial camera position (scene units) - viewing from above and behind
    INITIAL_POSITION: {
        x: 0,
        y: 400,     // 4 AU above the orbital plane
        z: 2200     // 22 AU away from the sun
    },

    // Maximum pixel ratio for performance (limits high-DPI rendering cost)
    // Capped at 2 to prevent excessive GPU load on 4K+ displays
    MAX_PIXEL_RATIO: 2
} as const;

export const LIGHTING_CONSTANTS = {
    // Ambient light intensity (0-1 scale, unitless)
    // Lower values make shadows more prominent by darkening non-illuminated areas
    AMBIENT_INTENSITY: 0.2,  // Reduced from 0.6 to make shadows darker

    // Directional light intensity (0-1 scale, unitless)
    // Simulates sunlight with direction and shadows
    DIRECTIONAL_INTENSITY: 1.2,  // Increased from 0.8 for stronger contrast

    // Directional light position (scene units)
    // Light comes from this direction (not a physical location)
    DIRECTIONAL_POSITION: {
        x: 5,
        y: 10,
        z: 7.5
    }
} as const;

export const BLOOM_CONSTANTS = {
    // UnrealBloomPass parameters for glowing sun effect
    STRENGTH: 1.5,      // Bloom intensity (0 = no glow, higher = brighter glow)
    RADIUS: 0.4,        // Bloom spread (0 = tight, 1 = wide)
    THRESHOLD: 0.85     // Minimum brightness to trigger bloom (0 = all objects glow, 1 = only very bright)
} as const;

// ====================================================================
// Grid and Visualization Constants
// ====================================================================

export const GRID_CONSTANTS = {
    // Flat reference grid (GridHelper)
    FLAT_GRID: {
        SIZE: 7000,             // Grid size (scene units) - 70 AU, covers outer planets
        DIVISIONS: 1000,        // Number of grid divisions
        COLOR_CENTER: 0x444444, // Center line color (dark gray)
        COLOR_GRID: 0x222222    // Grid line color (darker gray)
    },

    // Gravity well visualization (curved grid based on gravitational potential)
    GRAVITY_GRID: {
        SIZE: 7000,             // Grid size (scene units) - same as flat grid
        DIVISIONS: 200,         // Number of grid divisions (lower for performance)
        OPACITY: 0.05,          // Grid opacity (very transparent)
        DEPTH_SCALE: 50         // Visual depth scale factor for gravity well curvature
    }
} as const;

export const STAR_FIELD_CONSTANTS = {
    // Background stars for speed sensation
    COUNT: 8000,                    // Number of stars (balance between visual richness and performance)
    MIN_RADIUS: 5000,               // Minimum distance from center (scene units)
    MAX_RADIUS: 10000,              // Maximum distance from center (scene units)
    SIZE: 10,                       // Point size for star rendering
    OPACITY: 0.8                    // Star opacity
} as const;

export const TRAIL_CONSTANTS = {
    // Probe trajectory trail visualization
    MAX_POINTS: 200,               // Maximum trail points (limits memory usage)
                                    // At 100ms per point, this is 200 seconds of trail
    UPDATE_INTERVAL_MS: 100,        // Milliseconds between trail point additions
    COLOR: 0x00ff88,                // Trail color (cyan-green)
    OPACITY: 0.0,                   // Trail opacity (0.0 = fully transparent, 1.0 = opaque)
    CURVE_TENSION: 0.5              // Catmull-Rom curve tension (0 = loose, 1 = tight)
} as const;

export const VISUALIZATION_CONSTANTS = {
    // Planetary orbit lines
    ORBIT_LINE: {
        SEGMENTS: 512,              // Number of points in orbit circle (increased for smoother curves)
        OPACITY: 0.3,               // Orbit line opacity
        LINE_WIDTH: 1               // Line width (note: may not work in all browsers)
    },

    // Swing-by influence zones (torus around planets)
    INFLUENCE_ZONE: {
        TUBE_THICKNESS_RATIO: 0.08, // Tube thickness as ratio of radius (8% of encounter radius)
        RADIAL_SEGMENTS: 8,         // Number of radial segments (lower for performance)
        TUBULAR_SEGMENTS: 64,       // Number of tubular segments (higher for smoothness)
        COLOR: 0x808080,            // Zone color
        OPACITY: 0.2               // Zone opacity
    },

    // Predicted trajectory (dashed line showing future path)
    PREDICTION: {
        TIME_SECONDS: 15,           // How far into the future to predict (seconds)
        STEPS: 150,                 // Number of prediction steps (10 steps per second)
        UPDATE_INTERVAL_MS: 500,    // Milliseconds between prediction updates
        DASH_SIZE: 3,               // Dashed line dash length
        GAP_SIZE: 2,                // Dashed line gap length
        COLOR: 0xffaa00,            // Prediction line color (orange)
        OPACITY: 0.6                // Prediction line opacity
    },

    // Swing-by event markers (temporary red spheres)
    EVENT_MARKER: {
        RADIUS: 0.8,                // Marker sphere radius (scene units)
        SEGMENTS: 8,                // Sphere detail (lower for performance)
        COLOR: 0xff0000,            // Marker color (red)
        DURATION_MS: 1200           // How long marker stays visible (milliseconds)
    }
} as const;

// ====================================================================
// Celestial Body Constants
// ====================================================================

export const CELESTIAL_CONSTANTS = {
    // Central star (Sun)
    STAR: {
        RADIUS: 5,                  // Star visual radius (scene units)
        COLOR: 0xffee88,            // Star color (yellow-white)
        EMISSIVE: 0xffaa00,         // Emissive color for bloom (orange)
        EMISSIVE_INTENSITY: 2.5     // Emissive strength for bloom effect
    },

    // Probe (spacecraft)
    PROBE: {
        INITIAL_RADIUS_AU: 1.0,                         // Initial orbital radius (astronomical units)
        DEFAULT_SPEED_MULTIPLIER: 1.0,                  // Speed multiplier (1.0 = perfect circular orbit, >1.0 = escape trajectory)
        MIN_VELOCITY_FOR_RUNNING: 1e-3,                 // Minimum velocity to show "Running" status (scene units/s)
        MIN_VELOCITY_FOR_ROTATION: 0.1,                 // Minimum velocity to apply directional rotation (scene units/s)
        ROTATION_SPEED: 0.15,                           // Rotation interpolation speed (slerp factor, 0-1)
        VOYAGER_SCALE: 3,                               // Built-in Voyager model scale factor
        GLB_TARGET_SIZE: 15                             // Target size for loaded GLB models (scene units)
    },

    // Orbit controls
    ORBIT_CONTROLS: {
        DAMPING_FACTOR: 0.05        // Camera damping coefficient (0 = no damping, 1 = full damping)
    }
} as const;

// ====================================================================
// Planet Orbital Data (for mission system)
// ====================================================================
// Orbital radius of each planet in astronomical units (AU)
// Used by mission system to create orbit-reach missions

export const PLANET_ORBITS = {
    Mercury: 0.39,
    Venus: 0.72,
    Earth: 1.00,
    Mars: 1.52,
    Jupiter: 5.20,
    Saturn: 9.58,
    Uranus: 19.20,
    Neptune: 30.05,
} as const;

export type PlanetName = keyof typeof PLANET_ORBITS;

export type ProbeState = {
    position: THREE.Vector3;
    velocity: THREE.Vector3; // vector velocity in scene units/sec
    distance: number; // accumulated path length
    fuel: number; // percent
    slingshots: number;
    status: string;
};

// ====================================================================
// Probe Model Creation Functions
// ====================================================================

/**
 * Create a Voyager-style probe using Three.js primitives
 */
function createVoyagerProbe(): THREE.Group {
    const probe = new THREE.Group();

    // Main body (10-sided cylinder approximation)
    const bodyGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI / 2;
    probe.add(body);

    // Parabolic antenna (dish)
    const dishGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.8, roughness: 0.2 });
    const dish = new THREE.Mesh(dishGeom, dishMat);
    dish.rotation.x = Math.PI / 2;
    dish.position.set(0, 0, 0.3);
    probe.add(dish);

    // Antenna feed (center of dish)
    const feedGeom = new THREE.ConeGeometry(0.15, 0.4, 8);
    const feedMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const feed = new THREE.Mesh(feedGeom, feedMat);
    feed.rotation.x = Math.PI / 2;
    feed.position.set(0, 0, 0.5);
    probe.add(feed);

    // RTG boom (Radioisotope Thermoelectric Generator)
    const rtgBoomGeom = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
    const rtgBoomMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const rtgBoom = new THREE.Mesh(rtgBoomGeom, rtgBoomMat);
    rtgBoom.rotation.z = Math.PI / 2;
    rtgBoom.position.set(-1.5, -0.3, 0);
    probe.add(rtgBoom);

    // RTG power source (box at end of boom)
    const rtgGeom = new THREE.BoxGeometry(0.2, 0.2, 0.3);
    const rtgMat = new THREE.MeshStandardMaterial({ color: 0x444444, emissive: 0x330000 });
    const rtg = new THREE.Mesh(rtgGeom, rtgMat);
    rtg.position.set(-3, -0.3, 0);
    probe.add(rtg);

    // Magnetometer boom
    const magBoomGeom = new THREE.CylinderGeometry(0.03, 0.03, 4, 6);
    const magBoomMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const magBoom = new THREE.Mesh(magBoomGeom, magBoomMat);
    magBoom.rotation.z = Math.PI / 2;
    magBoom.position.set(2, 0.2, 0);
    probe.add(magBoom);

    // Magnetometer sensor
    const magSensorGeom = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const magSensorMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const magSensor = new THREE.Mesh(magSensorGeom, magSensorMat);
    magSensor.position.set(4, 0.2, 0);
    probe.add(magSensor);

    // Science instruments platform
    const instrumentsGeom = new THREE.BoxGeometry(0.4, 0.3, 0.3);
    const instrumentsMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const instruments = new THREE.Mesh(instrumentsGeom, instrumentsMat);
    instruments.position.set(0, 0.35, 0);
    probe.add(instruments);

    // Scale up for visibility
    const scale = CELESTIAL_CONSTANTS.PROBE.VOYAGER_SCALE;
    probe.scale.set(scale, scale, scale);

    return probe;
}

/**
 * Load a GLB model and return it as a Group
 * @param modelPath Path to the GLB file (relative to public folder)
 * @param onLoad Callback when model is loaded successfully
 * @param onError Callback when loading fails
 */
function loadGLBProbe(
    modelPath: string,
    onLoad: (model: THREE.Group) => void,
    onError: (error: any) => void,
    orientation?: { autoAlign?: boolean; rotationY?: number; invertDirection?: boolean }
): void {
    const loader = new GLTFLoader();

    loader.load(
        modelPath,
        (gltf) => {
            const model = gltf.scene;

            // Calculate bounding box to get model dimensions
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            // Auto-normalize: scale to target size
            const targetSize = CELESTIAL_CONSTANTS.PROBE.GLB_TARGET_SIZE;
            const normalizedScale = targetSize / maxDim;
            model.scale.setScalar(normalizedScale);

            console.log(`Model dimensions: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
            console.log(`Auto-scaling to ${targetSize} units (scale: ${normalizedScale.toFixed(4)})`);

            // Center model at origin (optional, helps with consistent positioning)
            box.setFromObject(model); // Recalculate after scaling
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);

            // Determine longest dimension (axis) for auto-alignment
            let longestAxis = 'z'; // default
            if (size.x > size.y && size.x > size.z) {
                longestAxis = 'x';
            } else if (size.y > size.x && size.y > size.z) {
                longestAxis = 'y';
            }
            console.log(`Longest axis: ${longestAxis} (${longestAxis === 'x' ? size.x.toFixed(2) : longestAxis === 'y' ? size.y.toFixed(2) : size.z.toFixed(2)} units)`);

            // Apply manual rotation if specified
            if (orientation?.rotationY !== undefined) {
                model.rotation.y = orientation.rotationY;
                console.log(`Applied manual rotation Y: ${orientation.rotationY.toFixed(2)} radians`);
            }

            // Auto-align longest dimension with forward direction (Z-axis)
            if (orientation?.autoAlign) {
                if (longestAxis === 'x') {
                    // Rotate 90 degrees to align X with Z
                    model.rotation.y = Math.PI / 2;
                    console.log('Auto-aligned: Rotated X-axis to face forward');
                } else if (longestAxis === 'y') {
                    // Rotate 90 degrees around X to align Y with Z
                    model.rotation.x = Math.PI / 2;
                    console.log('Auto-aligned: Rotated Y-axis to face forward');
                }
                // If longestAxis === 'z', no additional rotation needed
            } else {
                // Fallback to default 180 degree rotation if not auto-aligning
                model.rotation.y = Math.PI;
            }

            // Store orientation config on model for use in velocity tracking
            (model as any).orientationConfig = orientation;

            // Brighten all materials in the model
            model.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    const material = child.material;

                    // Handle both single material and array of materials
                    const materials = Array.isArray(material) ? material : [material];

                    materials.forEach((mat: any) => {
                        // Check if material color is dark or light
                        let isDark = false;
                        const hsl = { h: 0, s: 0, l: 0 };

                        if (mat.color) {
                            mat.color.getHSL(hsl);
                            isDark = hsl.l < 0.5; // Lightness < 0.5 = dark color

                            // Increase color brightness
                            mat.color.multiplyScalar(1.1);
                        }

                        // Add emissive color only for dark models for consistent brightness
                        if (mat.emissive !== undefined && isDark) {
                            // Set emissive to a fraction of the base color for self-illumination
                            const emissiveColor = mat.color ? mat.color.clone().multiplyScalar(0.5) : new THREE.Color(0x333333);
                            mat.emissive = emissiveColor;
                            console.log(`Applied emissive to dark material (L=${hsl.l.toFixed(2)})`);
                        } else if (mat.emissive !== undefined && !isDark) {
                            console.log(`Skipped emissive for bright material (L=${hsl.l.toFixed(2)})`);
                        }

                        // Adjust other properties for better visibility
                        if (mat.metalness !== undefined) {
                            mat.metalness = Math.min(mat.metalness * 1.2, 1.0);
                        }
                        if (mat.roughness !== undefined) {
                            mat.roughness = Math.max(mat.roughness * 0.7, 0.3);
                        }
                    });
                }
            });

            console.log('GLB model loaded successfully:', modelPath);
            onLoad(model);
        },
        (progress) => {
            // Loading progress (optional)
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`Loading model: ${percent.toFixed(0)}%`);
        },
        (error) => {
            console.error('Error loading GLB model:', error);
            onError(error);
        }
    );
}

export function initThreeJS(canvas: HTMLCanvasElement, options?: { probeSpeedMult?: number; G?: number; starMass?: number; gravityGridEnabled?: boolean; gridEnabled?: boolean; planetOrbitsEnabled?: boolean; predictionEnabled?: boolean; probeModelPath?: string | null; orientation?: { autoAlign?: boolean; rotationY?: number; invertDirection?: boolean } }) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        CAMERA_CONSTANTS.FOV_DEGREES,
        window.innerWidth / window.innerHeight,
        CAMERA_CONSTANTS.NEAR_PLANE,
        CAMERA_CONSTANTS.FAR_PLANE
    );
    camera.position.set(
        CAMERA_CONSTANTS.INITIAL_POSITION.x,
        CAMERA_CONSTANTS.INITIAL_POSITION.y,
        CAMERA_CONSTANTS.INITIAL_POSITION.z
    );

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CAMERA_CONSTANTS.MAX_PIXEL_RATIO));

    // Enable shadow mapping for realistic planet lighting
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for better visual quality

    // Setup post-processing for bloom effect
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom pass for glowing sun (reduced to minimize spread and artifacts)
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,   // strength: reduced to 0.8 for minimal glow
        0.3,   // radius: small radius to keep glow tight around sun
        0.9    // threshold: higher threshold (only very bright objects glow)
    );
    composer.addPass(bloomPass);

    // Film Grain effect for cinematic quality
    // FilmPass constructor: (noiseIntensity, scanlinesIntensity)
    const filmPass = new FilmPass(
        0.15,  // noise intensity (adds texture/grain)
        0.0    // scanline intensity (0 = disabled)
    );
    composer.addPass(filmPass);

    // Vignette effect (darkens edges for focus)
    const VignetteShader = {
        uniforms: {
            tDiffuse: { value: null },
            offset: { value: 0.8 },    // 0.5-1.0 (lower = stronger)
            darkness: { value: 1.2 }   // 1.0-2.0 (higher = darker)
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float offset;
            uniform float darkness;
            varying vec2 vUv;

            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
                color.rgb = mix(color.rgb, vec3(0.0), dot(uv, uv) * darkness);
                gl_FragColor = color;
            }
        `
    };
    const vignettePass = new ShaderPass(VignetteShader);
    composer.addPass(vignettePass);

    // Ambient light with slight blue tint (scattered starlight in space)
    const ambient = new THREE.AmbientLight(0x0a0a1a, LIGHTING_CONSTANTS.AMBIENT_INTENSITY);
    scene.add(ambient);

    // Sun light with realistic color temperature (5500K - slightly warm white/yellow)
    // PointLight emits light in all directions from a single point (like a star)
    const sunLight = new THREE.PointLight(0xffffee, LIGHTING_CONSTANTS.DIRECTIONAL_INTENSITY, 0, 0);
    // Color: 0xffffee = warm white (realistic sun color)
    // Parameters: color, intensity, distance (0 = infinite), decay (0 = no decay for game visibility)

    // Configure shadow casting for the sun's light
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;  // Very high resolution for sharp, detailed shadows
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 5000;     // Cover most of solar system (50 AU)
    sunLight.shadow.bias = -0.00005;       // Fine-tuned to reduce acne while maintaining shadow strength

    // Position light at the sun (will be updated dynamically)
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Simple grid for reference (large enough to show outer planets)
    const grid = new THREE.GridHelper(
        GRID_CONSTANTS.FLAT_GRID.SIZE,
        GRID_CONSTANTS.FLAT_GRID.DIVISIONS,
        GRID_CONSTANTS.FLAT_GRID.COLOR_CENTER,
        GRID_CONSTANTS.FLAT_GRID.COLOR_GRID
    );
    grid.visible = options?.gridEnabled ?? false;
    scene.add(grid);

    // ====================================================================
    // Gravity Well Grid (curved based on gravitational potential)
    // ====================================================================
    const gridSize = GRID_CONSTANTS.GRAVITY_GRID.SIZE;
    const gridDivisions = GRID_CONSTANTS.GRAVITY_GRID.DIVISIONS;
    const gravityWellGeometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);
    gravityWellGeometry.rotateX(-Math.PI / 2); // Rotate to horizontal (XZ plane)

    // Wireframe material for the gravity well
    const gravityWellMaterial = new THREE.MeshBasicMaterial({
        color: 0xd3d3d3,
        wireframe: true,
        transparent: true,
        opacity: GRID_CONSTANTS.GRAVITY_GRID.OPACITY
    });

    const gravityWellMesh = new THREE.Mesh(gravityWellGeometry, gravityWellMaterial);
    gravityWellMesh.visible = options?.gravityGridEnabled ?? false;
    scene.add(gravityWellMesh);

    // Store original positions for reset
    const originalPositions = new Float32Array(gravityWellGeometry.attributes.position.array);

    // Create a list of bodies: central star, planets, probe
    const bodies: Body[] = [];
    const planetMeshes: { id: string; mesh: THREE.Mesh; rotationSpeed: number }[] = [];

    // central star at origin (can be overridden via options)
    const starMass = options?.starMass ?? PHYSICS_SCALE.SUN_MASS;
    const starGeom = new THREE.SphereGeometry(CELESTIAL_CONSTANTS.STAR.RADIUS, 24, 24);
    const starMat = new THREE.MeshStandardMaterial({
        color: CELESTIAL_CONSTANTS.STAR.COLOR,
        emissive: CELESTIAL_CONSTANTS.STAR.EMISSIVE,
        emissiveIntensity: CELESTIAL_CONSTANTS.STAR.EMISSIVE_INTENSITY
    });
    const starMesh = new THREE.Mesh(starGeom, starMat);
    starMesh.position.set(0, 0, 0);
    scene.add(starMesh);
    // allow the star to move under gravity (we'll initialize COM-zero velocities below)
    bodies.push({ id: 'star', mass: starMass, position: [0, 0, 0], velocity: [0, 0, 0], radius: 5, isProbe: false });

    // ====================================================================
    // Solar System Planet Definitions
    // ====================================================================
    // Units:
    // - rAU: Orbital radius in astronomical units (1 AU = Earth-Sun distance = 100 scene units)
    // - radius: Visual radius in scene units (NOT to scale with real planets for visibility)
    // - mass: Mass in Earth masses (Earth = 1.0)
    // - phase: Initial orbital phase angle in radians (determines starting position)
    // - color: Hex color code for planet appearance
    // - axialTilt: Axial tilt in radians (rotation axis inclination relative to orbital plane)
    // - rotationSpeed: Rotation speed in radians per frame (Y-axis rotation)
    // https://www.solarsystemscope.com/textures/
    const AU = PHYSICS_SCALE.AU;
    const solarDefs = [
        { id: 'Mercury', rAU: 0.39, radius: 3, color: 0xaaaaaa, phase: 0, mass: 0.055, axialTilt: 0.034 * Math.PI / 180, rotationSpeed: 0.010 },      // Very slow rotation (58.6 Earth days) - 2x speed
        { id: 'Venus',   rAU: 0.72, radius: 5, color: 0xffddaa, phase: 0.5, mass: 0.815, axialTilt: 177.4 * Math.PI / 180, rotationSpeed: -0.006 },    // Retrograde rotation (243 Earth days, backward!) - 2x speed
        { id: 'Earth',   rAU: 1.00, radius: 5.5, color: 0x3366ff, phase: 1.0, mass: 1.0, axialTilt: 23.5 * Math.PI / 180, rotationSpeed: 0.02 },    // Standard rotation (24 hours) - 2x speed
        { id: 'Mars',    rAU: 1.52, radius: 4, color: 0xff6633, phase: 1.6, mass: 0.107, axialTilt: 25.2 * Math.PI / 180, rotationSpeed: 0.02 },    // Similar to Earth (24.6 hours) - 2x speed
        { id: 'Jupiter', rAU: 5.20, radius: 14, color: 0xffcc77, phase: 2.2, mass: 317.8, axialTilt: 3.1 * Math.PI / 180, rotationSpeed: 0.04 },   // Fast rotation (9.9 hours) - 2x speed
        { id: 'Saturn',  rAU: 9.58, radius: 12, color: 0xffee88, phase: 3.0, mass: 95.16, axialTilt: 26.7 * Math.PI / 180, rotationSpeed: 0.036 },   // Fast rotation (10.7 hours) - 2x speed
        { id: 'Uranus',  rAU:19.20, radius: 9, color: 0x88ccff, phase: 4.0, mass: 14.5, axialTilt: 97.8 * Math.PI / 180, rotationSpeed: 0.024 },     // Medium rotation (17.2 hours) - 2x speed
        { id: 'Neptune', rAU:30.05, radius: 9, color: 0x3366aa, phase: 5.0, mass: 17.1, axialTilt: 28.3 * Math.PI / 180, rotationSpeed: 0.026 },     // Medium rotation (16 hours) - 2x speed
    ];

    // Create texture loader for planet textures
    const textureLoader = new THREE.TextureLoader();

    const starMassScaled = starMass; // use starMass as mass scale
    for (const pd of solarDefs) {
        const pdR = pd.rAU * AU;
        const geom = new THREE.SphereGeometry(pd.radius, 16, 16);

        // Attempt to load texture for this planet (convention: /textures/{planetname}.jpg)
        // If texture doesn't exist, fall back to solid color material
        const texturePath = `/textures/${pd.id.toLowerCase()}.jpg`;
        const mat = new THREE.MeshStandardMaterial({ color: pd.color }); // Default to solid color

        // Try to load texture
        textureLoader.load(
            texturePath,
            (texture) => {
                // Success: texture loaded, apply it to the material
                mat.map = texture;
                mat.color.set(0xffffff); // Reset color to white to show texture correctly
                mat.needsUpdate = true;
                console.log(`Texture loaded for ${pd.id}: ${texturePath}`);
            },
            undefined, // onProgress
            (error) => {
                // Error: texture not found, keep using solid color
                console.log(`No texture for ${pd.id}, using solid color (${texturePath} not found)`);
            }
        );

        const mesh = new THREE.Mesh(geom, mat);
        const x = Math.sin(pd.phase) * pdR;
        const z = Math.cos(pd.phase) * pdR;
        mesh.position.set(x, 0, z);

        // Apply axial tilt (rotation axis inclination)
        mesh.rotation.z = pd.axialTilt;

        // Enable shadow receiving for realistic lighting from the sun
        // Planets only receive shadows, not cast them (no planet-to-planet shadows)
        mesh.castShadow = false;
        mesh.receiveShadow = true;

        scene.add(mesh);
        planetMeshes.push({ id: pd.id, mesh, rotationSpeed: pd.rotationSpeed });
    const gVal = options?.G ?? DEFAULT_G;
    const v = Math.sqrt((gVal * starMassScaled) / pdR);
        const vx = v * Math.cos(pd.phase);
        const vz = -v * Math.sin(pd.phase);
        bodies.push({ id: pd.id, mass: pd.mass, position: [x, 0, z], velocity: [vx, 0, vz], radius: pd.radius });
    }

    // probe initial (starts at 1.0 AU - Earth orbit distance)
    // Create Voyager-style probe (will be replaced by GLB model if loading succeeds)
    let probe = createVoyagerProbe();

    const probeR = CELESTIAL_CONSTANTS.PROBE.INITIAL_RADIUS_AU * PHYSICS_SCALE.AU;
    probe.position.set(0, 0, probeR);

    // Store orientation config on built-in Voyager probe
    (probe as any).orientationConfig = options?.orientation;

    // Attempt to load GLB model from public/models/ directory
    // If loading fails or probeModelPath is null, use the Voyager probe
    const modelPath = options?.probeModelPath;
    if (modelPath) {
        // Hide Voyager while loading GLB model
        probe.visible = false;
    }
    scene.add(probe);

    if (modelPath) {
        loadGLBProbe(
            modelPath,
            (loadedModel) => {
                // Success: replace the probe with the loaded GLB model
                console.log('GLB model loaded, replacing probe');

                // Copy position from current probe to loaded model
                loadedModel.position.copy(probe.position);

                // Remove old probe from scene
                scene.remove(probe);

                // Add loaded model to scene
                scene.add(loadedModel);

                // Update probe reference to point to loaded model
                probe = loadedModel;

                console.log('Probe replaced with GLB model successfully');
            },
            (error) => {
                // Error: keep using the Voyager probe as fallback
                console.log('Failed to load GLB model, using Voyager probe as fallback');
                console.error('GLB loading error:', error);
                // Show Voyager probe on loading failure
                probe.visible = true;
            },
            options?.orientation
        );
    } else {
        console.log('Using built-in Voyager probe (no GLB model specified)');
    }

    const gVal = options?.G ?? DEFAULT_G;
    const probeMult = options?.probeSpeedMult ?? CELESTIAL_CONSTANTS.PROBE.DEFAULT_SPEED_MULTIPLIER;
    const vCircular = Math.sqrt((gVal * starMass) / probeR);
    const probeBody: Body = { id: 'probe', mass: 1, position: [0, 0, probeR], velocity: [vCircular * probeMult, 0, 0], radius: 0.6, isProbe: true };
    bodies.push(probeBody);

    // --- CENTER-OF-MASS (COM) velocity zeroing ---
    // After creating all bodies, compute total momentum and apply a uniform
    // velocity offset so total momentum is zero. This keeps the system's
    // center-of-mass stationary while allowing the star to move.
    (function zeroCOM() {
        let totalPx = 0, totalPy = 0, totalPz = 0;
        let totalMass = 0;
        for (const b of bodies) {
            totalPx += b.mass * b.velocity[0];
            totalPy += b.mass * b.velocity[1];
            totalPz += b.mass * b.velocity[2];
            totalMass += b.mass;
        }
        if (totalMass > 0) {
            const vx = totalPx / totalMass;
            const vy = totalPy / totalMass;
            const vz = totalPz / totalMass;
            // subtract COM velocity from each body so net momentum becomes zero
            for (const b of bodies) {
                b.velocity[0] -= vx;
                b.velocity[1] -= vy;
                b.velocity[2] -= vz;
            }
            console.log('COM-zero velocity applied, offset:', vx.toFixed(6), vy.toFixed(6), vz.toFixed(6));
        }
    })();

    // (COM position zeroing will be performed once after state is created)

    // OrbitControls for interactive camera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = CELESTIAL_CONSTANTS.ORBIT_CONTROLS.DAMPING_FACTOR;
    controls.enablePan = true;
    controls.update();

    // ====================================================================
    // Star Field for Speed Sensation
    // ====================================================================
    // Create background stars with color variation for visual depth
    function createStarField() {
        const starCount = STAR_FIELD_CONSTANTS.COUNT;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            // Position: random spherical distribution
            const radius = STAR_FIELD_CONSTANTS.MIN_RADIUS + Math.random() * (STAR_FIELD_CONSTANTS.MAX_RADIUS - STAR_FIELD_CONSTANTS.MIN_RADIUS);
            const theta = Math.random() * Math.PI * 2;   // 0-2π
            const phi = Math.acos(2 * Math.random() - 1); // 0-π (uniform sphere)

            starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            starPositions[i * 3 + 2] = radius * Math.cos(phi);

            // Color: mostly white, occasionally bluish or yellowish
            const colorChoice = Math.random();
            if (colorChoice < 0.7) {
                // White
                starColors[i * 3] = 1;
                starColors[i * 3 + 1] = 1;
                starColors[i * 3 + 2] = 1;
            } else if (colorChoice < 0.85) {
                // Bluish white
                starColors[i * 3] = 0.8;
                starColors[i * 3 + 1] = 0.9;
                starColors[i * 3 + 2] = 1;
            } else {
                // Yellowish white
                starColors[i * 3] = 1;
                starColors[i * 3 + 1] = 0.95;
                starColors[i * 3 + 2] = 0.8;
            }
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: STAR_FIELD_CONSTANTS.SIZE,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: STAR_FIELD_CONSTANTS.OPACITY
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);
    }

    createStarField();

    // Trail (orbit path) - sample points stored as Vector3 and rendered smooth via Catmull-Rom
    const trailPoints: THREE.Vector3[] = [];
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
        color: TRAIL_CONSTANTS.COLOR,
        transparent: true,
        opacity: TRAIL_CONSTANTS.OPACITY
    });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);

    function addTrailPoint(p: THREE.Vector3) {
        trailPoints.push(p.clone());
        if (trailPoints.length > TRAIL_CONSTANTS.MAX_POINTS) {
            trailPoints.shift();
        }

        if (trailPoints.length >= 2) {
            const curve = new THREE.CatmullRomCurve3(trailPoints, false, 'catmullrom', TRAIL_CONSTANTS.CURVE_TENSION);
            const divisions = Math.min(Math.max(trailPoints.length * 6, 64), 3000);
            const smoothPoints = curve.getPoints(divisions);
            const positions: number[] = [];
            for (let i = 0; i < smoothPoints.length; i++) {
                positions.push(smoothPoints[i].x, smoothPoints[i].y, smoothPoints[i].z);
            }
            trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            trailGeometry.setDrawRange(0, positions.length / 3);
            trailGeometry.computeBoundingSphere();
        }
    }

    // ====================================================================
    // Velocity Vector Visualization
    // ====================================================================
    // Display probe's velocity as an arrow (direction and magnitude)
    // Temporarily disabled
    /*
    const velocityArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0), // initial direction
        probe.position,              // origin
        10,                          // length
        0xff0000,                    // color (red)
        3,                           // head length
        2                            // head width
    );
    scene.add(velocityArrow);
    */

    /*
    function updateVelocityArrow() {
        const speed = state.velocity.length();
        if (speed > 0.001) {
            const direction = state.velocity.clone().normalize();
            velocityArrow.setDirection(direction);
            // Scale arrow length with speed (but cap at reasonable size)
            const arrowLength = Math.min(speed * 2, 50);
            velocityArrow.setLength(arrowLength, 3, 2);

            // Color based on speed (blue -> green -> yellow -> red)
            const speedRatio = Math.min(speed / 50, 1); // normalize to 0-1
            if (speedRatio < 0.33) {
                // Blue to green
                const t = speedRatio / 0.33;
                velocityArrow.setColor(new THREE.Color(0, t, 1 - t));
            } else if (speedRatio < 0.66) {
                // Green to yellow
                const t = (speedRatio - 0.33) / 0.33;
                velocityArrow.setColor(new THREE.Color(t, 1, 0));
            } else {
                // Yellow to red
                const t = (speedRatio - 0.66) / 0.34;
                velocityArrow.setColor(new THREE.Color(1, 1 - t, 0));
            }

            velocityArrow.position.copy(state.position);
            velocityArrow.visible = true;
        } else {
            velocityArrow.visible = false;
        }
    }
    */

    // ====================================================================
    // Swing-by Influence Zones Visualization
    // ====================================================================
    // Display encounter radius around each planet as a torus (donut ring)
    const influenceZones: THREE.Mesh[] = [];

    for (const pm of planetMeshes) {
        const planetData = solarDefs.find(pd => pd.id === pm.id);
        if (!planetData) continue;

        const encounterRadius = planetData.radius * 2.5; // encounterMultiplier

        // Create torus (ring)
        const torusGeometry = new THREE.TorusGeometry(
            encounterRadius,           // radius
            encounterRadius * VISUALIZATION_CONSTANTS.INFLUENCE_ZONE.TUBE_THICKNESS_RATIO,
            VISUALIZATION_CONSTANTS.INFLUENCE_ZONE.RADIAL_SEGMENTS,
            VISUALIZATION_CONSTANTS.INFLUENCE_ZONE.TUBULAR_SEGMENTS
        );

        const torusMaterial = new THREE.MeshBasicMaterial({
            color: VISUALIZATION_CONSTANTS.INFLUENCE_ZONE.COLOR,
            transparent: true,
            opacity: VISUALIZATION_CONSTANTS.INFLUENCE_ZONE.OPACITY,
            side: THREE.DoubleSide
        });

        const torus = new THREE.Mesh(torusGeometry, torusMaterial);
        // Rotate to align with XZ plane (horizontal)
        torus.rotation.x = Math.PI / 2;
        torus.position.copy(pm.mesh.position);
        torus.visible = false;  // Hide influence zones
        scene.add(torus);
        influenceZones.push(torus);

        // Store reference for updating position
        (pm as any).influenceZone = torus;
    }

    // ====================================================================
    // Planetary Orbit Visualization
    // ====================================================================
    // Display circular orbits for each planet
    const orbitLines: THREE.Line[] = [];

    for (const pd of solarDefs) {
        const orbitRadius = pd.rAU * AU;
        const segments = VISUALIZATION_CONSTANTS.ORBIT_LINE.SEGMENTS;

        // Use EllipseCurve for mathematically perfect circle (ellipse is special case where xRadius = yRadius)
        const curve = new THREE.EllipseCurve(
            0, 0,                      // Center (aX, aY)
            orbitRadius, orbitRadius,  // X radius, Y radius (equal for circle)
            0, 2 * Math.PI,            // Start angle, end angle (full circle)
            false,                     // Clockwise
            0                          // Rotation angle
        );

        // Generate high-resolution 2D points and convert to 3D space
        const points2D = curve.getPoints(segments);
        const points3D = points2D.map(p => new THREE.Vector3(p.x, 0, p.y));

        // Create line geometry
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points3D);
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: pd.color,
            transparent: true,
            opacity: VISUALIZATION_CONSTANTS.ORBIT_LINE.OPACITY,
            linewidth: VISUALIZATION_CONSTANTS.ORBIT_LINE.LINE_WIDTH
        });

        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        orbitLine.visible = options?.planetOrbitsEnabled ?? true;
        scene.add(orbitLine);
        orbitLines.push(orbitLine);
    }

    // ====================================================================
    // Predicted Trajectory Visualization (Phase 2)
    // ====================================================================
    // Display future trajectory based on current velocity and gravity
    const predictionPoints: THREE.Vector3[] = [];
    const predictionGeometry = new THREE.BufferGeometry();
    const predictionMaterial = new THREE.LineDashedMaterial({
        color: VISUALIZATION_CONSTANTS.PREDICTION.COLOR,
        dashSize: VISUALIZATION_CONSTANTS.PREDICTION.DASH_SIZE,
        gapSize: VISUALIZATION_CONSTANTS.PREDICTION.GAP_SIZE,
        linewidth: VISUALIZATION_CONSTANTS.ORBIT_LINE.LINE_WIDTH,
        transparent: true,
        opacity: VISUALIZATION_CONSTANTS.PREDICTION.OPACITY
    });
    const predictionLine = new THREE.Line(predictionGeometry, predictionMaterial);
    predictionLine.visible = options?.predictionEnabled ?? true;
    scene.add(predictionLine);

    // Success prediction indicators (text sprites near planets)
    const successIndicators: { planetId: string; mesh: THREE.Sprite; probability: number }[] = [];

    function createTextSprite(text: string, color: number = 0xffffff): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 128;
        context.font = 'Bold 48px Arial';
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(20, 10, 1);
        return sprite;
    }

    // Create success indicators for each planet
    for (const pm of planetMeshes) {
        const sprite = createTextSprite('', 0x00ff00);
        sprite.visible = false;
        scene.add(sprite);
        successIndicators.push({ planetId: pm.id, mesh: sprite, probability: 0 });
    }

    let lastPredictionUpdate = 0;
    const predictionUpdateInterval = VISUALIZATION_CONSTANTS.PREDICTION.UPDATE_INTERVAL_MS;
    let predictionEnabledState = options?.predictionEnabled ?? true;

    function updatePredictedTrajectory() {
        // Early return if prediction is disabled
        if (!predictionEnabledState) return;

        const now = performance.now();
        if (now - lastPredictionUpdate < predictionUpdateInterval) return;
        lastPredictionUpdate = now;

        // Clone current bodies state for prediction
        const predictedBodies = cloneBodies(bodies);
        const probeIndex = predictedBodies.findIndex(b => b.id === 'probe');
        if (probeIndex < 0) return;

        // Run simulation forward for predictionTime seconds
        const predictionTime = VISUALIZATION_CONSTANTS.PREDICTION.TIME_SECONDS;
        const predictionSteps = VISUALIZATION_CONSTANTS.PREDICTION.STEPS;
        const dt = predictionTime / predictionSteps;

        predictionPoints.length = 0;
        predictionPoints.push(new THREE.Vector3(
            predictedBodies[probeIndex].position[0],
            predictedBodies[probeIndex].position[1],
            predictedBodies[probeIndex].position[2]
        ));

        // Reset success probabilities
        for (const indicator of successIndicators) {
            indicator.probability = 0;
        }

        const gRun = options?.G ?? DEFAULT_G;
        let predSimTime = simTime;

        // Simulate future trajectory
        for (let i = 0; i < predictionSteps; i++) {
            const { bodies: nextBodies, events } = stepBodies(predictedBodies, dt, gRun, predSimTime, PHYSICS_CONSTANTS.DEFAULT_SOFTENING, swingOptions);
            predSimTime += dt;

            // Copy nextBodies back to predictedBodies (safely handle type)
            for (let j = 0; j < nextBodies.length; j++) {
                predictedBodies[j] = { ...nextBodies[j] } as any;
            }

            // Store probe position
            const probePos = predictedBodies[probeIndex].position;
            predictionPoints.push(new THREE.Vector3(probePos[0], probePos[1], probePos[2]));

            // Check for predicted swing-bys
            if (events && events.swingBys && events.swingBys.length > 0) {
                for (const ev of events.swingBys) {
                    if (ev.probeId === 'probe') {
                        const indicator = successIndicators.find(ind => ind.planetId === ev.bodyId);
                        if (indicator) {
                            // Calculate success probability based on deltaV
                            const probability = Math.min(ev.deltaV / 1.0, 1.0) * 100;
                            indicator.probability = Math.max(indicator.probability, probability);
                        }
                    }
                }
            }
        }

        // Update prediction line geometry
        if (predictionPoints.length >= 2) {
            const positions: number[] = [];
            for (const point of predictionPoints) {
                positions.push(point.x, point.y, point.z);
            }
            predictionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            predictionGeometry.computeBoundingSphere();
            predictionLine.computeLineDistances(); // Required for dashed lines
            // Don't override user's visibility setting
        }

        // Update success indicators
        for (const indicator of successIndicators) {
            if (indicator.probability > 0) {
                const pm = planetMeshes.find(p => p.id === indicator.planetId);
                if (pm) {
                    // Position indicator above planet
                    const planetData = solarDefs.find(pd => pd.id === indicator.planetId);
                    const offset = planetData ? planetData.radius * 4 : 30;
                    indicator.mesh.position.set(
                        pm.mesh.position.x,
                        pm.mesh.position.y + offset,
                        pm.mesh.position.z
                    );

                    // Update text based on probability
                    const probabilityText = `${Math.round(indicator.probability)}%`;
                    const color = indicator.probability > 70 ? 0x00ff00 :
                                  indicator.probability > 40 ? 0xffaa00 : 0xff0000;

                    // Update sprite texture
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d')!;
                    canvas.width = 256;
                    canvas.height = 128;
                    context.font = 'Bold 48px Arial';
                    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(probabilityText, 128, 64);

                    const texture = new THREE.CanvasTexture(canvas);
                    indicator.mesh.material.map = texture;
                    indicator.mesh.material.needsUpdate = true;
                    indicator.mesh.visible = true;
                }
            } else {
                indicator.mesh.visible = false;
            }
        }
    }

    // Simulation state derived from bodies: expose probe state for HUD and visual sync
    const state: ProbeState = {
        position: probe.position.clone(),
        velocity: new THREE.Vector3(probeBody.velocity[0], probeBody.velocity[1], probeBody.velocity[2]),
        distance: 0,
        fuel: 100,
        slingshots: 0,
        status: 'Idle',
    };

    // --- CENTER-OF-MASS (COM) position zeroing ---
    // Shift all body positions so that the initial center-of-mass position is at the origin.
    (function zeroCOMPosition() {
        let mx = 0, my = 0, mz = 0;
        let totalMass = 0;
        for (const b of bodies) {
            mx += b.mass * b.position[0];
            my += b.mass * b.position[1];
            mz += b.mass * b.position[2];
            totalMass += b.mass;
        }
        if (totalMass > 0) {
            const cx = mx / totalMass;
            const cy = my / totalMass;
            const cz = mz / totalMass;
            // subtract COM position from each body's position
            for (const b of bodies) {
                b.position[0] -= cx;
                b.position[1] -= cy;
                b.position[2] -= cz;
            }
            // adjust visual meshes to match new positions
            try {
                starMesh.position.set(bodies.find((b) => b.id === 'star')!.position[0], bodies.find((b) => b.id === 'star')!.position[1], bodies.find((b) => b.id === 'star')!.position[2]);
                for (const pm of planetMeshes) {
                    const b = bodies.find((bb) => bb.id === pm.id);
                    if (b) pm.mesh.position.set(b.position[0], b.position[1], b.position[2]);
                }
                // probe
                const pb = bodies.find((b) => b.id === 'probe');
                if (pb) {
                    probe.position.set(pb.position[0], pb.position[1], pb.position[2]);
                    state.position.copy(probe.position);
                }
            } catch (e) {
                // ignore if meshes not ready
            }
            console.log('COM-zero position applied:', cx.toFixed(3), cy.toFixed(3), cz.toFixed(3));
        }
    })();

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CAMERA_CONSTANTS.MAX_PIXEL_RATIO));
        composer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', onResize);

    let simTime = 0;

    // ====================================================================
    // Swing-by Detection Tuning Options
    // ====================================================================
    // These values are tuned for the solar system simulation with realistic mass ratios.
    // They differ from PHYSICS_CONSTANTS.DEFAULT_SWING_BY_OPTIONS for the following reasons:
    //
    // - deltaVThreshold: 0.01 (vs default 0.05)
    //   Lower threshold to detect weaker gravity assists from inner planets (Mercury, Venus, Mars)
    //   With realistic Sun/planet mass ratios, inner planet swing-bys produce smaller deltaV
    //   Gas giants (Jupiter, Saturn) still produce significant effects detectable at this threshold
    //
    // - minGap: 0.4 (vs default 0.5)
    //   Slightly shorter cooldown allows for closer planet flybys to be detected separately
    //   Useful when probe passes through multiple planets in quick succession
    //
    // - encounterMultiplier: 2.5 (matches default)
    //   Standard detection radius works well for realistic planet sizes
    const swingOptions = {
        encounterMultiplier: 2.5,
        deltaVThreshold: 0.01,
        minGap: 0.4
    };

    // simple visual markers for swing-by events
    const eventMarkers: THREE.Mesh[] = [];

    function stepSimulation(dt: number) {
        // call physics.stepBodies with plain-data bodies
        const gRun = options?.G ?? DEFAULT_G;
        const { bodies: nextBodies, events } = stepBodies(bodies, dt, gRun, simTime, PHYSICS_CONSTANTS.DEFAULT_SOFTENING, swingOptions);
        simTime += dt;

        // apply nextBodies back to visuals and local bodies
        for (const nb of nextBodies) {
                const idx = bodies.findIndex((b) => b.id === nb.id);
                // if the body is marked static (e.g., the central star), don't overwrite its position
                const orig = idx >= 0 ? bodies[idx] : null;
                if (idx >= 0 && !orig?.isStatic) {
                    bodies[idx] = nb;
                }
            // apply to mesh
            if (nb.id === 'probe') {
                probe.position.set(nb.position[0], nb.position[1], nb.position[2]);
                state.position.copy(probe.position);
                state.velocity.set(nb.velocity[0], nb.velocity[1], nb.velocity[2]);
                // accumulate distance -- simple approximation
                state.distance += vecLen([nb.velocity[0] * dt, nb.velocity[1] * dt, nb.velocity[2] * dt]);
                // Update status: check fuel first, then velocity
                if (state.fuel <= 0) {
                    state.status = 'Fuel Depleted';
                } else {
                    state.status = state.velocity.length() > CELESTIAL_CONSTANTS.PROBE.MIN_VELOCITY_FOR_RUNNING ? 'Running' : 'Idle';
                }

                // Smoothly rotate probe to face velocity direction
                const speed = state.velocity.length();
                if (speed > CELESTIAL_CONSTANTS.PROBE.MIN_VELOCITY_FOR_ROTATION) { // Only rotate if moving fast enough
                    // Calculate target direction from velocity vector
                    let direction = state.velocity.clone().normalize();

                    // Check if model has orientation config with invertDirection flag
                    const orientationConfig = (probe as any).orientationConfig;
                    const shouldInvert = orientationConfig?.invertDirection ?? true; // default to true for backward compatibility

                    // Invert direction if configured (for models that face backwards)
                    if (shouldInvert) {
                        direction.negate();
                    }

                    // Create a matrix that looks in the velocity direction
                    const targetMatrix = new THREE.Matrix4();
                    targetMatrix.lookAt(
                        new THREE.Vector3(0, 0, 0),  // origin
                        direction,                    // direction (inverted if configured)
                        new THREE.Vector3(0, 1, 0)   // up vector
                    );

                    // Extract target quaternion from matrix
                    const targetQuaternion = new THREE.Quaternion();
                    targetQuaternion.setFromRotationMatrix(targetMatrix);

                    // Smoothly interpolate (slerp) from current to target rotation
                    // Lower value = smoother/slower rotation, higher = faster
                    probe.quaternion.slerp(targetQuaternion, CELESTIAL_CONSTANTS.PROBE.ROTATION_SPEED);
                }
            }
            // update planet meshes (check if this body's id is in planetMeshes array)
            const pm = planetMeshes.find((p) => p.id === nb.id);
            if (pm) {
                pm.mesh.position.set(nb.position[0], nb.position[1], nb.position[2]);
                // Update influence zone position to match planet
                if ((pm as any).influenceZone) {
                    (pm as any).influenceZone.position.copy(pm.mesh.position);
                }
            }
            // (star is now movable) synchronize star mesh to its simulated position
            if (nb.id === 'star') {
                starMesh.position.set(nb.position[0], nb.position[1], nb.position[2]);
                // Update sun light position to match the sun (PointLight emits radially from this point)
                sunLight.position.copy(starMesh.position);
            }
        }

        // Update velocity arrow visualization
        // updateVelocityArrow(); // Temporarily disabled

        // Update predicted trajectory (Phase 2)
        updatePredictedTrajectory();

        // Update gravity well grid if enabled
        updateGravityWellGrid();

        // handle events (swing-bys)
        if (events && events.swingBys && events.swingBys.length) {
            for (const ev of events.swingBys) {
                if (ev.probeId === 'probe') {
                    state.slingshots += 1;
                    console.log(`Swing-by detected at t=${ev.time.toFixed(2)}: probe around ${ev.bodyId} deltaV=${ev.deltaV.toFixed(3)}`);
                    // find body position for marker
                    const body = nextBodies.find((b) => b.id === ev.bodyId);
                    if (body) {
                        const markerGeom = new THREE.SphereGeometry(
                            VISUALIZATION_CONSTANTS.EVENT_MARKER.RADIUS,
                            VISUALIZATION_CONSTANTS.EVENT_MARKER.SEGMENTS,
                            VISUALIZATION_CONSTANTS.EVENT_MARKER.SEGMENTS
                        );
                        const markerMat = new THREE.MeshBasicMaterial({ color: VISUALIZATION_CONSTANTS.EVENT_MARKER.COLOR });
                        const marker = new THREE.Mesh(markerGeom, markerMat);
                        marker.position.set(body.position[0], body.position[1], body.position[2]);
                        scene.add(marker);
                        eventMarkers.push(marker);
                        // fade out marker after specified duration
                        setTimeout(() => {
                            scene.remove(marker);
                            const i = eventMarkers.indexOf(marker);
                            if (i >= 0) eventMarkers.splice(i, 1);
                        }, VISUALIZATION_CONSTANTS.EVENT_MARKER.DURATION_MS);
                    }
                    // flash probe material if available (main body)
                    try {
                        const bodyMesh: any = probe.children[0]; // Main body is first child
                        const mat: any = bodyMesh?.material;
                        if (mat && mat.emissive) {
                            const prev = mat.emissive.clone ? mat.emissive.clone() : null;
                            mat.emissive.setHex(0xff4444);
                            setTimeout(() => {
                                if (prev && mat.emissive && mat.emissive.set) mat.emissive.copy(prev);
                            }, 500);
                        }
                    } catch (e) {
                        // ignore material issues
                    }
                }
            }
        }
    }

    // bind the exported applyDeltaVToProbe to modify the local bodies array
    (function bindApply() {
        const mod = (dv: [number, number, number]) => {
            const idx = bodies.findIndex((b) => b.id === 'probe');
            if (idx >= 0) {
                bodies[idx].velocity[0] += dv[0];
                bodies[idx].velocity[1] += dv[1];
                bodies[idx].velocity[2] += dv[2];
            }
        };
        try {
            // expose on window so consumer code in GameCanvas can call it reliably
            (window as any).__applyDeltaVToProbe = mod;
        } catch (e) {
            // ignore if window isn't available
        }
    })();

    // ====================================================================
    // Gravity Well Grid Update Function
    // ====================================================================
    // Update throttling: Only update every 100ms instead of every frame (60fps)
    // This reduces CPU load from ~970万 calculations/sec to ~160万 calculations/sec (83% reduction)
    let lastGravityUpdate = 0;
    const GRAVITY_UPDATE_INTERVAL_MS = 100;  // Update every 100ms (10 times per second)

    function updateGravityWellGrid() {
        if (!gravityWellMesh.visible) return;

        // Throttle updates to reduce CPU load
        const now = performance.now();
        if (now - lastGravityUpdate < GRAVITY_UPDATE_INTERVAL_MS) return;
        lastGravityUpdate = now;

        const positions = gravityWellGeometry.attributes.position.array as Float32Array;
        const gVal = options?.G ?? DEFAULT_G;
        const depthScale = GRID_CONSTANTS.GRAVITY_GRID.DEPTH_SCALE;

        // Reset to original positions
        for (let i = 0; i < positions.length; i++) {
            positions[i] = originalPositions[i];
        }

        // Calculate reference potential at grid corners (far from bodies)
        const halfSize = gridSize / 2;
        const cornerPositions = [
            [halfSize, halfSize],
            [halfSize, -halfSize],
            [-halfSize, halfSize],
            [-halfSize, -halfSize]
        ];

        let referencePotential = 0;
        for (const [cx, cz] of cornerPositions) {
            let cornerPotential = 0;
            for (const body of bodies) {
                if (body.isProbe) continue;
                const dx = cx - body.position[0];
                const dz = cz - body.position[2];
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance > 0.1) {
                    cornerPotential += -(gVal * body.mass) / distance;
                }
            }
            referencePotential += cornerPotential;
        }
        referencePotential /= cornerPositions.length; // Average

        // Apply gravitational deformation for each vertex
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            let totalPotential = 0;

            // Calculate gravitational potential from all massive bodies
            for (const body of bodies) {
                if (body.isProbe) continue; // Skip probe (negligible mass)

                const dx = x - body.position[0];
                const dz = z - body.position[2];
                const distance = Math.sqrt(dx * dx + dz * dz);

                if (distance > 0.1) { // Avoid division by zero
                    // Gravitational potential: -GM/r (negative, creates a well)
                    const potential = -(gVal * body.mass) / distance;
                    totalPotential += potential;
                }
            }

            // Apply depth relative to reference (grid edges at Y=0)
            const relativeDepth = totalPotential - referencePotential;
            positions[i + 1] = relativeDepth * depthScale;
        }

        gravityWellGeometry.attributes.position.needsUpdate = true;
        gravityWellGeometry.computeVertexNormals(); // Update normals for proper lighting
    }

    // Toggle gravity grid visibility
    function updateGravityGrid(enabled: boolean) {
        gravityWellMesh.visible = enabled;
        if (enabled) {
            // Force immediate update when enabling by resetting the timestamp
            lastGravityUpdate = 0;
            updateGravityWellGrid();
        }
    }

    // Toggle flat grid visibility
    function updateGrid(enabled: boolean) {
        grid.visible = enabled;
    }

    // Toggle planet orbits visibility
    function updatePlanetOrbits(enabled: boolean) {
        orbitLines.forEach(line => {
            line.visible = enabled;
        });
    }

    // Toggle prediction trajectory visibility
    function updatePrediction(enabled: boolean) {
        predictionEnabledState = enabled;
        predictionLine.visible = enabled;
        // Also toggle success indicators
        successIndicators.forEach(indicator => {
            indicator.mesh.visible = enabled;
        });
    }

    function dispose() {
        window.removeEventListener('resize', onResize);
        composer.dispose();
        renderer.dispose();
        scene.traverse((obj: any) => {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mat = obj.material as any;
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose && m.dispose());
                else mat.dispose && mat.dispose();
            }
        });
    }

    // Switch probe model without resetting state
    function switchProbeModel(newModelPath: string | null, orientation?: { autoAlign?: boolean; rotationY?: number; invertDirection?: boolean }) {
        // Save current state
        const currentPosition = probe.position.clone();
        const currentRotation = probe.quaternion.clone();

        // Create new probe model
        let newProbe: THREE.Group;

        if (newModelPath) {
            // Load GLB model
            loadGLBProbe(
                newModelPath,
                (loadedModel) => {
                    // Apply saved state to new model
                    loadedModel.position.copy(currentPosition);
                    loadedModel.quaternion.copy(currentRotation);

                    // Remove old probe
                    scene.remove(probe);

                    // Add new probe
                    scene.add(loadedModel);
                    probe = loadedModel;

                    console.log('Probe model switched successfully');
                },
                (error) => {
                    console.error('Failed to switch probe model:', error);
                },
                orientation
            );
        } else {
            // Use built-in Voyager
            newProbe = createVoyagerProbe();
            newProbe.position.copy(currentPosition);
            newProbe.quaternion.copy(currentRotation);

            // Store orientation config on Voyager model too
            (newProbe as any).orientationConfig = orientation;

            // Remove old probe
            scene.remove(probe);

            // Add new probe
            scene.add(newProbe);
            probe = newProbe;

            console.log('Switched to built-in Voyager probe');
        }
    }

    return { scene, camera, renderer, composer, dispose, state, probe, controls, addTrailPoint, stepSimulation, updateGravityGrid, updateGrid, updatePlanetOrbits, updatePrediction, switchProbeModel, planetMeshes };
}

// small helper to allow external callers to apply delta-v to the probe
// We'll export a typed wrapper that others can call if they capture the
// init's return value; but for convenience also provide this function
// that will be replaced when initThreeJS is called.
export function applyDeltaVToProbe(_dv: [number, number, number]) {
    // no-op placeholder; actual implementation bound in initThreeJS's closure
    console.warn('applyDeltaVToProbe called before init; ignoring');
}

// small helper to compute vector length for [x,y,z]
function vecLen(v: [number, number, number]) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export default initThreeJS;
