import { MultiGraph } from 'graphology';
import { RULES, normalizedPriorities, type Simulation } from './simulation';

/** Keep friendship and directed follows as separate edges, even for the same pair. */
export function createNetworkGraph(game: Simulation) {
  const graph = new MultiGraph({ allowSelfLoops: false });
  for (const p of game.people) {
    graph.addNode(String(p.id), {
      x: p.x * 100,
      y: p.y * 100,
      label: p.name,
      size: game.size > 1000 ? 2 : 3.5,
      color: '#85b861',
    });
  }
  game.friends.forEach((friends, a) =>
    friends.forEach((b) => {
      if (b > a)
        graph.addUndirectedEdgeWithKey(
          `friend:${a}:${b}`,
          String(a),
          String(b),
          {
            channel: 'friend',
            weight: RULES.friendPriority,
            type: 'line',
            size: 0.5,
            color: '#d6dfd0',
          },
        );
    }),
  );
  game.follows.forEach((edges) =>
    edges.forEach((e) => {
      graph.addDirectedEdgeWithKey(
        `follow:${e.follower}:${e.author}`,
        String(e.follower),
        String(e.author),
        {
          channel: 'follow',
          weight: 0,
          type: 'arrow',
          size: 0.5,
          color: '#d3dce5',
        },
      );
    }),
  );
  updateGraphPriorities(graph, game);
  return graph;
}

/** Mean follow priority: this prototype assigns the same edge priority to every meme from its author. */
export function updateGraphPriorities(graph: MultiGraph, game: Simulation) {
  game.follows.forEach((edges, id) => {
    const priorities = normalizedPriorities(
      edges,
      game.people[id],
      game.people,
      game.recommendation,
    );
    edges.forEach((edge, i) =>
      graph.setEdgeAttribute(
        `follow:${edge.follower}:${edge.author}`,
        'weight',
        priorities[i],
      ),
    );
  });
}

/** Hidden channels contribute neither attraction nor degree mass to the live layout. */
export function createForceGraph(
  graph: MultiGraph,
  friends: boolean,
  follows: boolean,
) {
  const forces = graph.copy();
  forces.forEachEdge((edge, attributes) => {
    if (!(attributes.channel === 'friend' ? friends : follows))
      forces.dropEdge(edge);
  });
  return forces;
}
