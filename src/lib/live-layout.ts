import FA2Layout from 'graphology-layout-forceatlas2/worker';
import { layoutSettings } from './network-layout';
import type { MultiGraph } from 'graphology';

/** Continuous worker retains ForceAtlas2 velocity state between iterations. */
export class LiveLayout {
  private supervisor;
  constructor(
    private graph: MultiGraph,
    private onPositions: () => void,
    pinned: (id: string) => { x: number; y: number } | undefined,
  ) {
    graph.on('eachNodeAttributesUpdated', onPositions);
    this.supervisor = new FA2Layout(graph, {
      getEdgeWeight: 'weight',
      outputReducer: (id, attributes) => ({ ...attributes, ...pinned(id) }),
      settings: layoutSettings(graph),
    });
    this.supervisor.start();
  }
  kill() {
    this.supervisor.kill();
    this.graph.removeListener('eachNodeAttributesUpdated', this.onPositions);
  }
}
