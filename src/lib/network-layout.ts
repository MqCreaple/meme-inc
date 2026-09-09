import forceAtlas2 from 'graphology-layout-forceatlas2';
import type { MultiGraph } from 'graphology';

/** A fixed iteration budget makes the layout repeatable, independent of machine speed. */
export function arrangeNetwork(graph: MultiGraph) {
  forceAtlas2.assign(graph, {
    iterations: graph.order > 1000 ? 200 : 350,
    settings: {
      ...forceAtlas2.inferSettings(graph),
      barnesHutOptimize: true,
      linLogMode: false,
      gravity: 1,
      scalingRatio: 10,
      slowDown: 5,
      edgeWeightInfluence: 1,
    },
    getEdgeWeight: 'weight',
  });
  return graph.nodes().map((id) => ({
    id,
    x: graph.getNodeAttribute(id, 'x') as number,
    y: graph.getNodeAttribute(id, 'y') as number,
  }));
}
