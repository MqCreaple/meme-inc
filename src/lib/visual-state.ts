import type { Meme, Person, Simulation } from './simulation';
export type MemoryScope = 'variant' | 'family';
export const CREATOR_WINDOW = 5;
export function matchesMeme(
  meme: Meme,
  selected: Meme | undefined,
  scope: MemoryScope,
) {
  return (
    !!selected &&
    (scope === 'family' ? meme.root === selected.root : meme.id === selected.id)
  );
}
export function memoryStrength(
  person: Person,
  memes: Map<number, Meme>,
  selected: Meme | undefined,
  scope: MemoryScope,
) {
  let total = 0;
  for (const [id, memory] of person.memory) {
    const meme = memes.get(id);
    if (meme && matchesMeme(meme, selected, scope)) total += memory;
  }
  return total;
}
export function recentCreators(game: Simulation) {
  const recent = new Map<number, number>();
  for (const meme of game.memes.values()) {
    if (meme.creator === undefined) continue;
    const age = game.round - meme.born;
    if (age >= 0 && age < CREATOR_WINDOW)
      recent.set(
        meme.creator,
        Math.max(recent.get(meme.creator) ?? 0, 1 - age / CREATOR_WINDOW),
      );
  }
  return recent;
}
export function mutationCreators(
  game: Simulation,
  round: number,
  memoryMode: boolean,
  selected: Meme | undefined,
  scope: MemoryScope,
) {
  const creators = new Set<number>();
  for (const meme of game.memes.values()) {
    if (
      meme.creator !== undefined &&
      meme.born === round &&
      (!memoryMode || matchesMeme(meme, selected, scope))
    )
      creators.add(meme.creator);
  }
  return creators;
}
