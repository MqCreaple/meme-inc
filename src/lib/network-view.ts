import Sigma from 'sigma';
import LayoutWorker from './network-layout.worker?worker';
import { createNetworkGraph } from './network-graph';
import type { Simulation } from './simulation';

export class NetworkView {
  private graph;
  private renderer: Sigma;
  private worker?: Worker;
  private selected?: string;
  private friendsVisible = true;
  private followsVisible = false;
  private neighbours = new Set<string>();

  constructor(
    private container: HTMLElement,
    game: Simulation,
    onSelect: (id?: number) => void,
  ) {
    this.graph = createNetworkGraph(game);
    this.renderer = new Sigma(this.graph, container, {
      minCameraRatio: 0.15,
      maxCameraRatio: 3,
      labelRenderedSizeThreshold: 8,
      nodeReducer: (node, data) => ({
        ...data,
        color:
          this.selected && node !== this.selected && !this.neighbours.has(node)
            ? '#dce2d7'
            : data.color,
        highlighted: node === this.selected,
        forceLabel: node === this.selected,
        size: node === this.selected ? 7 : data.size,
      }),
      edgeReducer: (edge, data) => ({
        ...data,
        hidden:
          (data.channel === 'friend'
            ? !this.friendsVisible
            : !this.followsVisible) ||
          (this.selected !== undefined &&
            !this.graph.hasExtremity(edge, this.selected)),
        color: this.selected
          ? data.channel === 'friend'
            ? '#739064'
            : '#7d98b8'
          : data.color,
        size: this.selected ? 1 : data.size,
      }),
    });
    this.renderer.on('clickNode', ({ node }) => {
      container.focus();
      onSelect(Number(node));
    });
    this.renderer.on('clickStage', () => {
      container.focus();
      onSelect();
    });
    this.startLayout();
  }

  private startLayout() {
    const worker = new LayoutWorker();
    this.worker = worker;
    this.container.dataset.layout = 'running';
    this.container.setAttribute('aria-busy', 'true');
    const status = document.getElementById('layout-status')!;
    status.textContent = 'Arranging connections…';
    worker.onmessage = (
      event: MessageEvent<{ id: string; x: number; y: number }[]>,
    ) => {
      if (this.worker !== worker) return;
      for (const { id, x, y } of event.data)
        this.graph.mergeNodeAttributes(id, { x, y });
      this.renderer.refresh();
      this.container.dataset.layout = 'ready';
      this.container.setAttribute('aria-busy', 'false');
      status.textContent = 'Connection-based layout';
      worker.terminate();
      this.worker = undefined;
    };
    worker.onerror = () => {
      if (this.worker !== worker) return;
      this.container.dataset.layout = 'error';
      this.container.setAttribute('aria-busy', 'false');
      status.textContent = 'Layout failed. Create a new network to retry.';
      worker.terminate();
      this.worker = undefined;
    };
    worker.postMessage(this.graph.export());
  }

  update(
    colour: (id: number) => string,
    selected: number | undefined,
    friends: boolean,
    follows: boolean,
  ) {
    this.selected = selected === undefined ? undefined : String(selected);
    this.friendsVisible = friends;
    this.followsVisible = follows;
    this.neighbours.clear();
    if (this.selected !== undefined)
      this.graph.forEachEdge(
        this.selected,
        (_edge, attributes, source, target) => {
          if (attributes.channel === 'friend' ? friends : follows) {
            this.neighbours.add(source);
            this.neighbours.add(target);
          }
        },
      );
    this.graph.updateEachNodeAttributes((node, attributes) => ({
      ...attributes,
      color: colour(Number(node)),
    }));
    this.renderer.refresh();
  }

  resetView() {
    this.renderer.getCamera().animatedReset();
  }
  kill() {
    this.worker?.terminate();
    this.worker = undefined;
    this.renderer.kill();
  }
}
