import { MultiGraph } from 'graphology';
import type { Simulation } from './simulation';

/** Keep friendship and directed follows as separate edges, even for the same pair. */
export function createNetworkGraph(game: Simulation) {
  const graph = new MultiGraph({ allowSelfLoops: false });
  for (const p of game.people) {
    graph.addNode(String(p.id), {
      x: p.x * 100,
      y: p.y * 100,
      label: `Person ${String(p.id + 1).padStart(3, '0')}`,
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
            weight: 1,
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
          weight: 0.15,
          type: 'arrow',
          size: 0.5,
          color: '#d3dce5',
        },
      );
    }),
  );
  return graph;
}
