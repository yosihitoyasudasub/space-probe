import * as THREE from 'three';

export type Trail = {
    addPoint: (p: THREE.Vector3) => void;
};

// Trail (orbit path) - sample points stored as Vector3 and rendered smooth via Catmull-Rom
export function createTrail(scene: THREE.Scene): Trail {
    const trailPoints: THREE.Vector3[] = [];
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88 });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);

    function addPoint(p: THREE.Vector3) {
        const maxPoints = 2000;
        trailPoints.push(p.clone());
        if (trailPoints.length > maxPoints) {
            trailPoints.shift();
        }

        if (trailPoints.length >= 2) {
            const curve = new THREE.CatmullRomCurve3(trailPoints, false, 'catmullrom', 0.5);
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

    return { addPoint };
}
