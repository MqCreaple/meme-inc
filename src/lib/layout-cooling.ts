export interface Position {
  x: number;
  y: number;
}
export const COOLING = {
  damping: 0.8,
  maxIterations: 600,
  minIterations: 60,
  stableIterations: 20,
  relativeTolerance: 0.0001,
} as const;

/** Cool accepted displacements, which the FA2 supervisor feeds back to its worker. */
export class LayoutCooling {
  private positions = new Map<string, Position>();
  private iteration = 0;
  private stable = 0;
  private movement = 0;
  private minX = Infinity;
  private minY = Infinity;
  private maxX = -Infinity;
  private maxY = -Infinity;

  constructor(positions: Iterable<[string, Position]>) {
    for (const [id, point] of positions) this.positions.set(id, { ...point });
  }

  apply(id: string, proposed: Position, pinned?: Position): Position {
    const previous = this.positions.get(id)!;
    const alpha =
      COOLING.damping * (1 - this.iteration / COOLING.maxIterations) ** 2;
    const next = pinned ?? {
      x: previous.x + alpha * (proposed.x - previous.x),
      y: previous.y + alpha * (proposed.y - previous.y),
    };
    this.movement = Math.max(
      this.movement,
      Math.hypot(next.x - previous.x, next.y - previous.y),
    );
    this.minX = Math.min(this.minX, next.x);
    this.maxX = Math.max(this.maxX, next.x);
    this.minY = Math.min(this.minY, next.y);
    this.maxY = Math.max(this.maxY, next.y);
    this.positions.set(id, next);
    return next;
  }

  finishIteration(): boolean {
    this.iteration++;
    const scale = Math.max(
      1,
      Math.hypot(this.maxX - this.minX, this.maxY - this.minY),
    );
    this.stable =
      this.movement / scale <= COOLING.relativeTolerance ? this.stable + 1 : 0;
    this.movement = 0;
    this.minX = this.minY = Infinity;
    this.maxX = this.maxY = -Infinity;
    return (
      this.iteration >= COOLING.maxIterations ||
      (this.iteration >= COOLING.minIterations &&
        this.stable >= COOLING.stableIterations)
    );
  }
}
