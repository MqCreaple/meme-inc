import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COOLING, LayoutCooling } from '../src/lib/layout-cooling';

test('damping decreases displacement and stops even a persistently oscillating layout', () => {
  const cooling = new LayoutCooling([['a', { x: 0, y: 0 }]]);
  let point = { x: 0, y: 0 },
    previousStep = Infinity,
    stopped = false;
  for (let i = 0; i < COOLING.maxIterations; i++) {
    // Large alternating force never meets the stability threshold by itself.
    const next = cooling.apply('a', {
      x: point.x + (i % 2 ? -1000000 : 1000000),
      y: 0,
    });
    const step = Math.abs(next.x - point.x);
    assert.ok(step <= previousStep);
    point = next;
    previousStep = step;
    stopped = cooling.finishIteration();
    if (i < COOLING.maxIterations - 1) assert.equal(stopped, false);
  }
  assert.equal(stopped, true);
});

test('quiet layouts settle after a warmup while a moving outlier prevents early settling', () => {
  const quiet = new LayoutCooling([['a', { x: 0, y: 0 }]]);
  for (let i = 1; i <= COOLING.minIterations; i++) {
    quiet.apply('a', { x: 0, y: 0 });
    assert.equal(quiet.finishIteration(), i === COOLING.minIterations);
  }
  const active = new LayoutCooling([
    ['a', { x: 0, y: 0 }],
    ['b', { x: 10, y: 0 }],
  ]);
  for (let i = 0; i < COOLING.minIterations + 5; i++) {
    active.apply('a', { x: 0, y: 0 });
    active.apply('b', { x: i % 2 ? 10 : -10, y: 0 });
    assert.equal(active.finishIteration(), false);
  }
});

test('dragged positions bypass damping and a new run starts warm', () => {
  const cooling = new LayoutCooling([['a', { x: 0, y: 0 }]]);
  const pinned = { x: 20, y: -10 };
  assert.deepEqual(cooling.apply('a', { x: 100, y: 100 }, pinned), pinned);
  const restart = new LayoutCooling([['a', pinned]]);
  assert.deepEqual(restart.apply('a', { x: 30, y: -10 }), { x: 28, y: -10 });
});
