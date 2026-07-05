export type InputState = {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
};

/**
 * Compute the thrust delta-v for one physics step from the current input.
 *
 * Controls are velocity-relative: up/down thrust along/against the direction
 * of travel, left/right thrust perpendicular to it in the XZ plane. When the
 * probe is (nearly) stationary there is no meaningful "forward", so controls
 * fall back to world axes.
 */
export function computeThrustDV(
    velocity: { x: number; y: number; z: number },
    input: InputState,
    dvScale: number
): [number, number, number] {
    const dv: [number, number, number] = [0, 0, 0];

    const { x: vx, z: vz } = velocity;
    const speed = Math.sqrt(vx * vx + velocity.y * velocity.y + vz * vz);

    if (speed > 0.001) {
        // Normalize velocity to get forward direction (XZ plane)
        const fx = vx / speed;
        const fz = vz / speed;

        // Right direction = cross(forward, up[0,1,0]) = [fz, 0, -fx], normalized
        const rx = fz;
        const rz = -fx;
        const rLen = Math.sqrt(rx * rx + rz * rz);
        const rnx = rLen > 0.001 ? rx / rLen : 1;
        const rnz = rLen > 0.001 ? rz / rLen : 0;

        if (input.left) {
            // Thrust to the left (opposite of right direction)
            dv[0] += rnx * dvScale;
            dv[2] += rnz * dvScale;
        }
        if (input.right) {
            dv[0] -= rnx * dvScale;
            dv[2] -= rnz * dvScale;
        }
        if (input.up) {
            // Thrust forward (in velocity direction)
            dv[0] += fx * dvScale;
            dv[2] += fz * dvScale;
        }
        if (input.down) {
            // Thrust backward (brake)
            dv[0] -= fx * dvScale;
            dv[2] -= fz * dvScale;
        }
    } else {
        // Fallback to world-axis control when stationary
        if (input.left) dv[0] -= dvScale;
        if (input.right) dv[0] += dvScale;
        if (input.up) dv[2] -= dvScale;
        if (input.down) dv[2] += dvScale;
    }

    return dv;
}
