import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignNames, TWO_PART_CAPACITY } from '../src/lib/names';
import { Simulation, type MemeDraft } from '../src/lib/simulation';
import {
  memoryStrength,
  mutationCreators,
  recentCreators,
  CREATOR_WINDOW,
} from '../src/lib/visual-state';

test('names are unique at 10,000 and middle names appear only after pairs run out', () => {
  const names = assignNames(10000, 42);
  assert.equal(new Set(names).size, 10000);
  assert.ok(
    names
      .slice(0, TWO_PART_CAPACITY)
      .every((name) => name.split(' ').length === 2),
  );
  assert.ok(
    names
      .slice(TWO_PART_CAPACITY)
      .every((name) => name.split(' ').length === 3),
  );
  assert.deepEqual(assignNames(300, 42), names.slice(0, 300));
  assert.notDeepEqual(assignNames(100, 42), assignNames(100, 43));
});

test('family memory includes descendants and filters unrelated creations', () => {
  const game = new Simulation(100);
  const draft: MemeDraft = {
    name: 'A',
    themes: [1, 0, 0, 0, 0, 0, 0, 0],
    attributes: [0.5, 0.5, 0.5, 0.5],
    template: { immutability: 0.3, shareability: 0.8 },
  };
  const root = game.launch(draft),
    other = game.launch({ ...draft, name: 'B' });
  const child = { ...root, id: 2, parent: root.id, creator: 0, born: 3 };
  const grandchild = { ...child, id: 3, parent: child.id, creator: 1, born: 4 };
  const unrelated = { ...other, id: 4, parent: other.id, creator: 2, born: 4 };
  for (const meme of [child, grandchild, unrelated])
    game.memes.set(meme.id, meme);
  game.people[0].memory = new Map([
    [root.id, 0.1],
    [child.id, 0.2],
    [grandchild.id, 0.3],
    [other.id, 1],
  ]);
  assert.equal(
    memoryStrength(game.people[0], game.memes, child, 'variant'),
    0.2,
  );
  assert.ok(
    Math.abs(
      memoryStrength(game.people[0], game.memes, child, 'family') - 0.6,
    ) < 1e-9,
  );
  assert.equal(
    memoryStrength(game.people[0], game.memes, undefined, 'family'),
    0,
  );
  game.round = 4;
  assert.deepEqual(
    mutationCreators(game, 4, true, root, 'family'),
    new Set([1]),
  );
  assert.deepEqual(mutationCreators(game, 4, true, root, 'variant'), new Set());
  assert.deepEqual(
    mutationCreators(game, 4, true, grandchild, 'variant'),
    new Set([1]),
  );
  assert.deepEqual(
    mutationCreators(game, 4, false, root, 'variant'),
    new Set([1, 2]),
  );
  assert.equal(recentCreators(game).get(0), 0.8);
  assert.equal(recentCreators(game).get(1), 1);
  game.round += CREATOR_WINDOW;
  assert.equal(recentCreators(game).size, 0);
});
