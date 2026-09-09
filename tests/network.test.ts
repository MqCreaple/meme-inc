import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/lib/simulation';
import { createNetworkGraph } from '../src/lib/network-graph';
import { arrangeNetwork } from '../src/lib/network-layout';

test('visual graph preserves both channels and layout leaves the simulation unchanged', () => {
  const game = new Simulation(100);
  const graph = createNetworkGraph(game);
  assert.equal(graph.order, game.size);
  assert.equal(
    graph.undirectedSize,
    game.friends.reduce((s, friends) => s + friends.size, 0) / 2,
  );
  assert.equal(graph.directedSize, game.follows.flat().length);
  for (const edges of game.follows)
    for (const edge of edges) {
      const key = `follow:${edge.follower}:${edge.author}`;
      assert.deepEqual(graph.extremities(key), [
        String(edge.follower),
        String(edge.author),
      ]);
      assert.equal(graph.getEdgeAttribute(key, 'type'), 'arrow');
    }
  const before = structuredClone(game.people);
  const a = arrangeNetwork(graph);
  const b = arrangeNetwork(createNetworkGraph(game));
  assert.deepEqual(a, b);
  assert.ok(a.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
  assert.deepEqual(game.people, before);
});

test('connected people become closer relative to the whole network', () => {
  const graph = createNetworkGraph(new Simulation(300));
  const length = (a: string, b: string) =>
    Math.hypot(
      graph.getNodeAttribute(a, 'x') - graph.getNodeAttribute(b, 'x'),
      graph.getNodeAttribute(a, 'y') - graph.getNodeAttribute(b, 'y'),
    );
  function relativeEdgeLength() {
    let edges = 0,
      pairs = 0,
      count = 0;
    graph.forEachUndirectedEdge((_key, _attr, a, b) => {
      edges += length(a, b);
    });
    const nodes = graph.nodes();
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        pairs += length(nodes[i], nodes[j]);
        count++;
      }
    return edges / graph.undirectedSize / (pairs / count);
  }
  const before = relativeEdgeLength();
  arrangeNetwork(graph);
  assert.ok(
    relativeEdgeLength() < before * 0.8,
    'Topology layout should shorten friend edges relative to average node separation',
  );
});
