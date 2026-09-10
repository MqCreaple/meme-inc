import Sigma from 'sigma';
import { LiveLayout } from './live-layout';
import {
  createNetworkGraph,
  createForceGraph,
  updateGraphPriorities,
} from './network-graph';
import type { Simulation } from './simulation';

export class NetworkView {
  private graph;
  private renderer: Sigma;
  private layout?: LiveLayout;
  private selected?: string;
  private friendsVisible = true;
  private followsVisible = false;
  private neighbours = new Set<string>();
  private recommendation;
  private paused = false;
  private generation = 0;
  private frames = 0;
  private dragged?: { id: string; pointer: number };
  private controller = new AbortController();
  private pulseNodes = new Set<number>();
  private pulseRound = -1;
  private pulseUntil = 0;
  private animation = 0;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(
    private container: HTMLElement,
    private game: Simulation,
    onSelect: (id?: number) => void,
  ) {
    this.graph = createNetworkGraph(game);
    this.recommendation = game.recommendation;
    this.renderer = new Sigma(this.graph, container, {
      minCameraRatio: 0.15,
      maxCameraRatio: 3,
      labelRenderedSizeThreshold: 8,
      nodeReducer: (node, data) => {
        const pulse =
          this.pulseNodes.has(Number(node)) &&
          performance.now() < this.pulseUntil;
        const bright =
          pulse &&
          (this.reducedMotion.matches ||
            Math.floor(performance.now() / 180) % 2 === 0);
        return {
          ...data,
          color: bright
            ? '#e6a42a'
            : this.selected &&
                node !== this.selected &&
                !this.neighbours.has(node)
              ? '#dce2d7'
              : data.color,
          highlighted: node === this.selected || bright,
          forceLabel: node === this.selected,
          size: (node === this.selected ? 7 : data.size) + (bright ? 3 : 0),
        };
      },
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
        size: this.selected ? 0.5 + 2 * data.weight : 0.3 + data.weight,
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
    const options = { capture: true, signal: this.controller.signal };
    container.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button !== 0 || this.dragged) return;
        const rect = container.getBoundingClientRect();
        let closest: string | undefined,
          distance = 12;
        this.graph.forEachNode((id, attributes) => {
          const point = this.renderer.graphToViewport({
            x: attributes.x,
            y: attributes.y,
          });
          const d = Math.hypot(
            point.x - event.clientX + rect.left,
            point.y - event.clientY + rect.top,
          );
          if (d < distance) {
            closest = id;
            distance = d;
          }
        });
        if (closest === undefined) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        container.setPointerCapture(event.pointerId);
        container.focus();
        this.dragged = { id: closest, pointer: event.pointerId };
        if (!this.renderer.getCustomBBox())
          this.renderer.setCustomBBox(this.renderer.getBBox());
        this.renderer.getCamera().disable();
        this.graph.setNodeAttribute(closest, 'fixed', true);
        onSelect(Number(closest));
        this.restartLayout();
      },
      options,
    );
    container.addEventListener(
      'pointermove',
      (event) => {
        if (!this.dragged || event.pointerId !== this.dragged.pointer) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const rect = container.getBoundingClientRect();
        const point = this.renderer.viewportToGraph({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        this.graph.mergeNodeAttributes(this.dragged.id, point);
      },
      options,
    );
    const release = (event: PointerEvent) => {
      if (!this.dragged || event.pointerId !== this.dragged.pointer) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.graph.setNodeAttribute(this.dragged.id, 'fixed', false);
      this.dragged = undefined;
      this.renderer.getCamera().enable();
      this.restartLayout();
    };
    container.addEventListener('pointerup', release, options);
    container.addEventListener('pointercancel', release, options);
    container.addEventListener('lostpointercapture', release, options);
    document.addEventListener('visibilitychange', () => this.restartLayout(), {
      signal: this.controller.signal,
    });
    this.restartLayout();
  }

  private restartLayout() {
    this.layout?.kill();
    this.layout = undefined;
    const generation = ++this.generation;
    this.container.dataset.layoutRevision = String(generation);
    const status = document.getElementById('layout-status')!;
    if (
      this.paused ||
      document.hidden ||
      (!this.friendsVisible && !this.followsVisible)
    ) {
      this.container.dataset.layout = 'paused';
      this.container.dataset.layoutMotion = 'paused';
      status.textContent = this.paused
        ? 'Layout paused · drag to arrange'
        : 'Select a graph to animate connections';
      return;
    }
    const forces = createForceGraph(
      this.graph,
      this.friendsVisible,
      this.followsVisible,
    );
    this.container.dataset.layout = 'running';
    this.container.dataset.layoutMotion = 'active';
    status.textContent = 'Live layout · drag a person to move them';
    this.layout = new LiveLayout(
      forces,
      () => {
        if (generation !== this.generation) return;
        this.graph.updateEachNodeAttributes((id, attributes) => {
          if (id === this.dragged?.id) return attributes;
          const position = forces.getNodeAttributes(id);
          return { ...attributes, x: position.x, y: position.y };
        });
        this.container.dataset.layout = 'ready';
        this.container.dataset.layoutFrame = String(++this.frames);
      },
      (id) =>
        id === this.dragged?.id
          ? {
              x: this.graph.getNodeAttribute(id, 'x'),
              y: this.graph.getNodeAttribute(id, 'y'),
            }
          : undefined,
      () => {
        if (generation !== this.generation) return;
        this.container.dataset.layoutMotion = 'settled';
        status.textContent = 'Layout settled · drag a person to rearrange';
      },
    );
  }

  update(
    colour: (id: number) => string,
    selected: number | undefined,
    friends: boolean,
    follows: boolean,
    pulseNodes: Set<number>,
  ) {
    const changed =
      friends !== this.friendsVisible ||
      follows !== this.followsVisible ||
      this.recommendation !== this.game.recommendation;
    this.selected = selected === undefined ? undefined : String(selected);
    this.friendsVisible = friends;
    this.followsVisible = follows;
    this.recommendation = this.game.recommendation;
    if (changed) {
      updateGraphPriorities(this.graph, this.game);
      this.restartLayout();
    }
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
    this.pulseNodes = pulseNodes;
    if (this.game.round !== this.pulseRound) {
      this.pulseRound = this.game.round;
      this.pulseUntil = performance.now() + 1600;
    }
    if (
      !this.animation &&
      pulseNodes.size &&
      performance.now() < this.pulseUntil
    )
      this.animatePulse();
    this.renderer.refresh();
  }
  private animatePulse = () => {
    this.renderer.refresh();
    this.animation =
      performance.now() < this.pulseUntil
        ? requestAnimationFrame(this.animatePulse)
        : 0;
  };
  setPaused(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    this.restartLayout();
  }
  resetView() {
    this.renderer.setCustomBBox(null);
    this.renderer.getCamera().animatedReset();
  }
  kill() {
    this.generation++;
    this.controller.abort();
    cancelAnimationFrame(this.animation);
    this.layout?.kill();
    this.layout = undefined;
    this.renderer.kill();
  }
}
