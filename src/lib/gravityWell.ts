import * as THREE from 'three';
import { Body } from './physics';
import { GRID_SIZE } from './constants';

export type GravityWellGrid = {
    mesh: THREE.Mesh;
    /** Recompute vertex deformation from current body positions (call every frame). */
    update: () => void;
    /** Toggle visibility; recomputes immediately when enabled. */
    setVisible: (enabled: boolean) => void;
};

// ====================================================================
// Gravity Well Grid (curved based on gravitational potential)
// ====================================================================
// A wireframe plane whose vertices are displaced by the gravitational
// potential of all massive bodies, visualizing space-time curvature.
export function createGravityWellGrid(
    scene: THREE.Scene,
    bodies: Body[],
    getG: () => number,
    initiallyVisible: boolean
): GravityWellGrid {
    const gridDivisions = 200; // High resolution for smooth curvature
    const geometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, gridDivisions, gridDivisions);
    geometry.rotateX(-Math.PI / 2); // Rotate to horizontal (XZ plane)

    const material = new THREE.MeshBasicMaterial({
        color: 0xd3d3d3,
        wireframe: true,
        transparent: true,
        opacity: 0.05
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = initiallyVisible;
    scene.add(mesh);

    // Store original positions for reset
    const originalPositions = new Float32Array(geometry.attributes.position.array);

    function recompute() {
        const positions = geometry.attributes.position.array as Float32Array;
        const gVal = getG();
        const depthScale = 50; // Scale factor for visual effect (adjust for visibility)

        // Reset to original positions
        for (let i = 0; i < positions.length; i++) {
            positions[i] = originalPositions[i];
        }

        // Calculate reference potential at grid corners (far from bodies)
        const halfSize = GRID_SIZE / 2;
        const cornerPositions = [
            [halfSize, halfSize],
            [halfSize, -halfSize],
            [-halfSize, halfSize],
            [-halfSize, -halfSize]
        ];

        let referencePotential = 0;
        for (const [cx, cz] of cornerPositions) {
            referencePotential += potentialAt(cx, cz, gVal);
        }
        referencePotential /= cornerPositions.length; // Average

        // Apply gravitational deformation for each vertex
        for (let i = 0; i < positions.length; i += 3) {
            const totalPotential = potentialAt(positions[i], positions[i + 2], gVal);
            // Apply depth relative to reference (grid edges at Y=0)
            positions[i + 1] = (totalPotential - referencePotential) * depthScale;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals(); // Update normals for proper lighting
    }

    // Sum of gravitational potentials (-GM/r) from all massive bodies at (x, z)
    function potentialAt(x: number, z: number, gVal: number): number {
        let total = 0;
        for (const body of bodies) {
            if (body.isProbe) continue; // Skip probe (negligible mass)
            const dx = x - body.position[0];
            const dz = z - body.position[2];
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > 0.1) { // Avoid division by zero
                total += -(gVal * body.mass) / distance;
            }
        }
        return total;
    }

    // Recomputing deforms 200x200 = ~40k vertices against every body
    // (~360k distance calculations); doing that every frame causes visible
    // stutter. The bodies move little between frames, so refreshing the
    // grid every 4th frame (~15 Hz at 60 fps) is visually indistinguishable.
    const updateInterval = 4;
    let frameCounter = 0;

    function update() {
        if (!mesh.visible) return;
        frameCounter++;
        if (frameCounter < updateInterval) return;
        frameCounter = 0;
        recompute();
    }

    function setVisible(enabled: boolean) {
        mesh.visible = enabled;
        if (enabled) {
            recompute();
        }
    }

    return { mesh, update, setVisible };
}
