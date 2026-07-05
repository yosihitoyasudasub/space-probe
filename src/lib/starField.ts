import * as THREE from 'three';

// ====================================================================
// Star Field for Speed Sensation
// ====================================================================
// Create background stars with color variation for visual depth
export function createStarField(scene: THREE.Scene): THREE.Points {
    const starCount = 8000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        // Position: random spherical distribution
        const radius = 5000 + Math.random() * 10000; // 5000-15000 range
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
        size: 10,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    return stars;
}
