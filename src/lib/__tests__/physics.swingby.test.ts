import { stepBodies, Body } from '../physics';

describe('physics swing-by detection', () => {
  it('detects swing-by when probe passes close to planet', () => {
    // Setup: star at origin, planet at (0,0,50) orbiting, probe on intercept course
    const star: Body = { id: 'star', mass: 10000, position: [0, 0, 0], velocity: [0, 0, 0], radius: 5 };
    const planet: Body = { id: 'planet', mass: 800, position: [0, 0, 50], velocity: [4, 0, 0], radius: 6 };
    // place probe slightly offset so it will pass near the planet
    const probe: Body = { id: 'probe', mass: 1, position: [-20, 0, 60], velocity: [6, 0, -4], radius: 0.5, isProbe: true };

    let bodies = [star, planet, probe];
    let simTime = 0;
    const dt = 0.02;
    const maxSteps = 5000;
    let totalEvents = 0;

    for (let step = 0; step < maxSteps; step++) {
      const res = stepBodies(bodies, dt, 1.0, simTime, 0.05, { encounterMultiplier: 2.5, deltaVThreshold: 0.01, minGap: 0.2 });
      bodies = res.bodies;
      simTime += dt;
      if (res.events && res.events.swingBys.length) {
        totalEvents += res.events.swingBys.length;
      }
    }

    // Expect at least one swing-by detected in this close-pass scenario
    expect(totalEvents).toBeGreaterThanOrEqual(1);
  });
});
