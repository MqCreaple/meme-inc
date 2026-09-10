import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Simulation,
  excitement,
  normalizedPriorities,
  RULES,
  type MemeDraft,
} from '../src/lib/simulation';
const draft = (): MemeDraft => ({
  name: 'Test cat',
  themes: [0, 0, 0, 0, 0, 0, 0, 1],
  attributes: [0.5, 0.5, 0.5, 0.5],
  template: { immutability: 0.35, shareability: 0.85 },
});
test('seeded networks are reproducible with valid attributes and graph direction', () => {
  const a = new Simulation(100, 17),
    b = new Simulation(100, 17);
  assert.deepEqual(a.people, b.people);
  assert.deepEqual(a.friends, b.friends);
  assert.deepEqual(a.follows, b.follows);
  for (const p of a.people) {
    assert.ok(Math.abs(p.interests.reduce((s, v) => s + v, 0) - 1) < 1e-10);
    assert.ok(p.preferences.every((pref) => pref.sigma > 0));
    assert.ok(Object.values(p.personality).every((v) => v >= 0 && v <= 1));
    assert.ok(!a.friends[p.id].has(p.id));
    for (const friend of a.friends[p.id])
      assert.ok(a.friends[friend].has(p.id));
    assert.equal(
      new Set(a.follows[p.id].map((e) => e.author)).size,
      a.follows[p.id].length,
    );
    for (const edge of a.follows[p.id]) {
      assert.notEqual(edge.follower, edge.author);
      assert.ok(a.followers[edge.author].includes(p.id));
    }
  }
});
test('public priorities sum to one and uniform scaling cannot buy extra attention', () => {
  const g = new Simulation(100);
  for (const mode of ['balanced', 'interests', 'discovery'] as const) {
    const p = g.people[0],
      edges = g.follows[0];
    const weights = normalizedPriorities(edges, p, g.people, mode);
    assert.ok(Math.abs(weights.reduce((a, b) => a + b, 0) - 1) < 1e-10);
    const scaled = normalizedPriorities(
      edges.map((e) => ({ ...e, weight: e.weight * 100 })),
      p,
      g.people,
      mode,
    );
    weights.forEach((w, i) => assert.ok(Math.abs(w - scaled[i]) < 1e-10));
  }
});
test('launches and edits spend compute, reject invalid input without changing state', () => {
  const g = new Simulation(100);
  assert.throws(() => g.launch({ ...draft(), themes: Array(8).fill(0) }));
  assert.throws(() => g.launch(draft(), -1));
  assert.equal(g.compute, 60);
  assert.equal(g.memes.size, 0);
  const m = g.launch(draft());
  assert.equal(g.compute, 40);
  assert.equal(g.pending.flat().length, 8);
  g.edit(m.id, [0.1, 0.2, 0.3, 0.4]);
  assert.equal(g.compute, 28);
  assert.equal(m.attributes[0], 0.1);
  assert.throws(() => g.edit(m.id, [NaN, 0, 0, 0]));
  assert.equal(g.compute, 28);
  g.launch(draft());
  assert.throws(() => g.launch(draft()));
  assert.equal(g.compute, 8);
  g.step();
  assert.equal(g.compute, 16);
});
test('attention deduplicates deliveries and memory follows decay plus a binary seen flag', () => {
  const g = new Simulation(100),
    p = g.people[0];
  const m = g.launch(draft(), 0);
  p.personality.creativity = 0;
  p.personality.recoverability = 0.25;
  p.personality.attention = 0;
  p.memory.set(m.id, 2);
  g.pending[0].push({ meme: m.id, author: 1, channel: 'friend' });
  assert.equal(g.step().views, 1);
  assert.equal(p.memory.get(m.id), 2.5);
  g.pending = g.people.map(() => []);
  g.step();
  assert.equal(p.memory.get(m.id), 1.875);
  p.memory.set(m.id, RULES.memoryThreshold / 2);
  g.pending = g.people.map(() => []);
  g.step();
  assert.equal(p.memory.has(m.id), false);
});
test('attention limits unique memes and all generated shares wait until the next round', () => {
  const g = new Simulation(100),
    p = g.people[0];
  p.personality.attention = 0;
  p.personality.creativity = 0;
  for (let i = 0; i < 3; i++) g.launch(draft(), 0);
  const stats = g.step();
  assert.equal(stats.views, 1);
  assert.equal(stats.viewers, 1);
  assert.equal(p.memory.size, 1);
});
test('novelty penalizes remembered memes and fading memory restores excitement', () => {
  const g = new Simulation(100),
    p = g.people[0],
    m = g.launch(draft());
  const fresh = excitement(p, m, 'friend', g.memes);
  p.memory.set(m.id, 1);
  const familiar = excitement(p, m, 'friend', g.memes);
  p.memory.set(m.id, 0.1);
  const faded = excitement(p, m, 'friend', g.memes);
  assert.ok(fresh > faded && faded > familiar);
});
test('sharing delivers to friends and followers, never to authors a viewer follows', () => {
  const g = new Simulation(100);
  for (let i = 0; i < g.size; i++) {
    g.friends[i].clear();
    g.followers[i] = [];
    g.follows[i] = [];
  }
  g.friends[0].add(1);
  g.friends[1].add(0);
  g.followers[0].push(2);
  g.follows[2].push({ follower: 2, author: 0, weight: 1 });
  g.followers[3].push(0);
  g.follows[0].push({ follower: 0, author: 3, weight: 1 });
  const p = g.people[0];
  p.personality.creativity = 0;
  p.personality.trendy = 1;
  p.personality.tribal = 1;
  // Multiple themes and exact preference matching make sharing probability one in both channels.
  g.launch(
    {
      ...draft(),
      themes: Array(8).fill(1),
      attributes: p.preferences.map((v) => v.mean),
      template: { immutability: 1, shareability: 1 },
    },
    0,
  );
  const stats = g.step();
  assert.equal(stats.shares, 2);
  assert.equal(stats.viewers, 1);
  assert.equal(g.pending[1][0].channel, 'friend');
  assert.equal(g.pending[2][0].channel, 'follow');
  assert.equal(g.pending[3].length, 0);
});
test('multi-round runs preserve budgets, finite memories, mutation lineage and reproducibility', () => {
  const run = () => {
    const g = new Simulation(100, 5);
    for (let round = 0; round < 40; round++) {
      if (g.compute >= 20 && round % 3 === 0) g.launch(draft());
      g.step();
      assert.ok(g.compute >= 0 && g.compute <= 100);
      for (const p of g.people) {
        assert.ok(p.creativity >= 0);
        for (const memory of p.memory.values())
          assert.ok(Number.isFinite(memory) && memory >= RULES.memoryThreshold);
      }
    }
    for (const meme of g.memes.values())
      if (meme.parent !== undefined) {
        assert.ok(meme.id > meme.parent);
        assert.equal(meme.root, g.memes.get(meme.parent)!.root);
        assert.ok(meme.attributes.every((v) => v >= 0 && v <= 1));
      }
    assert.ok(g.history.some((s) => s.mutations > 0));
    return g.history;
  };
  assert.deepEqual(run(), run());
});
test('mutation spends distance-weighted creativity and evaluates the new meme for sharing', async () => {
  const { memeDistance } = await import('../src/lib/simulation');
  const g = new Simulation(100),
    p = g.people[0];
  Object.defineProperty(g, 'rng', { value: () => 0.01 });
  p.personality.creativity = 1;
  const original = g.launch(draft(), 0);
  const stats = g.step();
  assert.equal(stats.mutations, 1);
  assert.ok(stats.shares > 0);
  const remix = g.memes.get(1)!;
  assert.equal(remix.parent, original.id);
  assert.equal(remix.creator, p.id);
  assert.equal(remix.born, g.round);
  assert.ok(
    Math.abs(
      p.creativity -
        (1 - original.template.immutability * memeDistance(original, remix)),
    ) < 1e-10,
  );
  assert.ok(g.pending.flat().every((delivery) => delivery.meme === remix.id));
});
