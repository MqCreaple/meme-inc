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

test('visible force graph uses normalized priorities and excludes hidden edge mass', async () => {
  const { createForceGraph, updateGraphPriorities } =
    await import('../src/lib/network-graph');
  const { normalizedPriorities, RULES } = await import('../src/lib/simulation');
  const game = new Simulation(100),
    graph = createNetworkGraph(game);
  const friendGraph = createForceGraph(graph, true, false);
  assert.equal(friendGraph.directedSize, 0);
  assert.equal(friendGraph.undirectedSize, graph.undirectedSize);
  friendGraph.forEachEdge((_id, data) =>
    assert.equal(data.weight, RULES.friendPriority),
  );
  for (const mode of ['interests', 'discovery'] as const) {
    game.recommendation = mode;
    updateGraphPriorities(graph, game);
    game.follows.forEach((edges, id) => {
      const weights = normalizedPriorities(
        edges,
        game.people[id],
        game.people,
        mode,
      );
      edges.forEach((edge, i) =>
        assert.equal(
          graph.getEdgeAttribute(
            `follow:${edge.follower}:${edge.author}`,
            'weight',
          ),
          weights[i],
        ),
      );
    });
  }
  assert.equal(createForceGraph(graph, false, true).undirectedSize, 0);
  assert.equal(createForceGraph(graph, false, false).size, 0);
  assert.equal(createForceGraph(graph, true, true).size, graph.size);
});

test('stronger edge weights pull a symmetric pair closer', async () => {
  const { MultiGraph } = await import('graphology');
  const graph = new MultiGraph();
  graph.addNode('centre', { x: 0, y: 0, size: 1, fixed: true });
  graph.addNode('strong', { x: -20, y: 0, size: 1 });
  graph.addNode('weak', { x: 20, y: 0, size: 1 });
  graph.addUndirectedEdge('centre', 'strong', { weight: 1 });
  graph.addUndirectedEdge('centre', 'weak', { weight: 0.05 });
  arrangeNetwork(graph);
  assert.ok(
    Math.abs(graph.getNodeAttribute('strong', 'x')) <
      Math.abs(graph.getNodeAttribute('weak', 'x')),
  );
  assert.equal(graph.getNodeAttribute('centre', 'x'), 0);
});
