import FA2Layout from 'graphology-layout-forceatlas2/worker';
import { layoutSettings } from './network-layout';
import { LayoutCooling } from './layout-cooling';
import type { MultiGraph } from 'graphology';

/** Animate with damping, then stop the worker loop when settled or its budget expires. */
export class LiveLayout {
  private supervisor;
  private handlePositions: () => void;
  constructor(
    private graph: MultiGraph,
    onPositions: () => void,
    pinned: (id: string) => { x: number; y: number } | undefined,
    onSettled: () => void,
  ) {
    const cooling = new LayoutCooling(
      graph.nodes().map((id) => [
        id,
        {
          x: graph.getNodeAttribute(id, 'x'),
          y: graph.getNodeAttribute(id, 'y'),
        },
      ]),
    );
    this.handlePositions = () => {
      onPositions();
      if (cooling.finishIteration()) {
        // Stop inside this callback; killing would clear matrices while the
        // supervisor is still processing them. The idle worker is killed on replacement.
        this.supervisor.stop();
        onSettled();
      }
    };
    graph.on('eachNodeAttributesUpdated', this.handlePositions);
    this.supervisor = new FA2Layout(graph, {
      getEdgeWeight: 'weight',
      outputReducer: (id, attributes) => ({
        ...attributes,
        ...cooling.apply(id, { x: attributes.x, y: attributes.y }, pinned(id)),
      }),
      settings: layoutSettings(graph),
    });
    this.supervisor.start();
  }
  kill() {
    this.supervisor.kill();
    this.graph.removeListener(
      'eachNodeAttributesUpdated',
      this.handlePositions,
    );
  }
}
