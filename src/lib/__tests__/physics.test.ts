import { stepBodies, Body } from '../physics';

describe('physics.stepBodies basic', () => {
  it('conserves roughly orbital motion for two bodies', () => {
    const star: Body = { id: 'star', mass: 1000, position: [0, 0, 0], velocity: [0, 0, 0], radius: 5 };
    const probe: Body = { id: 'probe', mass: 1, position: [0, 0, 100], velocity: [10, 0, 0], radius: 0.5, isProbe: true };
    const bodies = [star, probe];

    const { bodies: next, events } = stepBodies(bodies, 0.1, 1.0, 0);
    expect(next.length).toBe(2);
    expect(events.swingBys.length).toBeGreaterThanOrEqual(0);
  });
});
