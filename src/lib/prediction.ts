import * as THREE from 'three';
import { Body, cloneBodies, stepBodies } from './physics';
import { SWING_BY_OPTIONS } from './constants';
import { PlanetEntry } from './solarSystem';

export type TrajectoryPrediction = {
    /** Recompute the predicted path (internally throttled). Call every frame. */
    update: () => void;
};

// ====================================================================
// Predicted Trajectory Visualization
// ====================================================================
// Display future trajectory based on current velocity and gravity, plus
// swing-by success probability indicators floating above planets.
export function createTrajectoryPrediction(
    scene: THREE.Scene,
    deps: {
        bodies: Body[];
        planets: PlanetEntry[];
        getG: () => number;
        getSimTime: () => number;
    }
): TrajectoryPrediction {
    const predictionPoints: THREE.Vector3[] = [];
    const predictionGeometry = new THREE.BufferGeometry();
    const predictionMaterial = new THREE.LineDashedMaterial({
        color: 0xffaa00,
        dashSize: 3,
        gapSize: 2,
        linewidth: 1,
        transparent: true,
        opacity: 0.6
    });
    const predictionLine = new THREE.Line(predictionGeometry, predictionMaterial);
    scene.add(predictionLine);

    // Success prediction indicators (text sprites near planets)
    const successIndicators: { planetId: string; mesh: THREE.Sprite; probability: number }[] = [];

    function drawTextTexture(text: string, color: number): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 128;
        context.font = 'Bold 48px Arial';
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 64);
        return new THREE.CanvasTexture(canvas);
    }

    // Create success indicators for each planet
    for (const pm of deps.planets) {
        const spriteMaterial = new THREE.SpriteMaterial({ map: drawTextTexture('', 0x00ff00), transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(20, 10, 1);
        sprite.visible = false;
        scene.add(sprite);
        successIndicators.push({ planetId: pm.id, mesh: sprite, probability: 0 });
    }

    let lastPredictionUpdate = 0;
    const predictionUpdateInterval = 500; // Update every 500ms

    function update() {
        const now = performance.now();
        if (now - lastPredictionUpdate < predictionUpdateInterval) return;
        lastPredictionUpdate = now;

        // Clone current bodies state for prediction
        const predictedBodies: Body[] = cloneBodies(deps.bodies);
        const probeIndex = predictedBodies.findIndex(b => b.id === 'probe');
        if (probeIndex < 0) return;

        // Run simulation forward for predictionTime seconds
        const predictionTime = 15; // seconds
        const predictionSteps = 150; // number of points
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

        const gRun = deps.getG();
        let predSimTime = deps.getSimTime();

        // Simulate future trajectory
        for (let i = 0; i < predictionSteps; i++) {
            const { bodies: nextBodies, events } = stepBodies(predictedBodies, dt, gRun, predSimTime, 0.5, SWING_BY_OPTIONS);
            predSimTime += dt;

            // Copy nextBodies back to predictedBodies
            for (let j = 0; j < nextBodies.length; j++) {
                predictedBodies[j] = { ...nextBodies[j] };
            }

            // Store probe position
            const probePos = predictedBodies[probeIndex].position;
            predictionPoints.push(new THREE.Vector3(probePos[0], probePos[1], probePos[2]));

            // Check for predicted swing-bys
            for (const ev of events.swingBys) {
                if (ev.probeId !== 'probe') continue;
                const indicator = successIndicators.find(ind => ind.planetId === ev.bodyId);
                if (indicator) {
                    // Calculate success probability based on deltaV
                    const probability = Math.min(ev.deltaV / 1.0, 1.0) * 100;
                    indicator.probability = Math.max(indicator.probability, probability);
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
            predictionLine.visible = true;
        } else {
            predictionLine.visible = false;
        }

        updateIndicators();
    }

    function updateIndicators() {
        for (const indicator of successIndicators) {
            if (indicator.probability <= 0) {
                indicator.mesh.visible = false;
                continue;
            }
            const pm = deps.planets.find(p => p.id === indicator.planetId);
            if (!pm) continue;

            // Position indicator above planet
            const offset = pm.def.radius * 4;
            indicator.mesh.position.set(
                pm.mesh.position.x,
                pm.mesh.position.y + offset,
                pm.mesh.position.z
            );

            // Update text based on probability
            const probabilityText = `${Math.round(indicator.probability)}%`;
            const color = indicator.probability > 70 ? 0x00ff00 :
                          indicator.probability > 40 ? 0xffaa00 : 0xff0000;

            indicator.mesh.material.map = drawTextTexture(probabilityText, color);
            indicator.mesh.material.needsUpdate = true;
            indicator.mesh.visible = true;
        }
    }

    return { update };
}
