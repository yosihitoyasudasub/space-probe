import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ProbeOrientation } from './types';

// A probe object in the scene; carries its orientation config so velocity
// tracking knows how to face the model.
export type ProbeObject = THREE.Group & { orientationConfig?: ProbeOrientation };

/**
 * Create a Voyager-style probe using Three.js primitives
 */
export function createVoyagerProbe(): ProbeObject {
    const probe = new THREE.Group() as ProbeObject;

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
    probe.scale.set(3, 3, 3);

    return probe;
}

/**
 * Load a GLB model and return it as a Group
 * @param modelPath Path to the GLB file (relative to public folder)
 * @param onLoad Callback when model is loaded successfully
 * @param onError Callback when loading fails
 */
export function loadGLBProbe(
    modelPath: string,
    onLoad: (model: ProbeObject) => void,
    onError: (error: any) => void,
    orientation?: ProbeOrientation
): void {
    const loader = new GLTFLoader();

    loader.load(
        modelPath,
        (gltf) => {
            const model = gltf.scene as ProbeObject;

            // Calculate bounding box to get model dimensions
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            // Auto-normalize: scale to target size
            const targetSize = 15; // Target size in scene units (3x larger for better visibility)
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
            model.orientationConfig = orientation;

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
