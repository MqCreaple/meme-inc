import { assignNames } from './names';
export const THEMES = [
  'sports',
  'music',
  'film',
  'drama',
  'technology',
  'game',
  'fashion',
  'animals',
] as const;
export const ATTRIBUTES = [
  'cute',
  'absurd',
  'aggressive',
  'intellectual',
] as const;
export const PERSONALITIES = [
  'trendy',
  'tribal',
  'creativity',
  'novelty',
  'recoverability',
  'attention',
] as const;
export const RULES = {
  launchCost: 20,
  editCost: 12,
  income: 8,
  maxCompute: 100,
  memoryThreshold: 0.03,
  juxtaposition: 1.12,
  context: 0.5,
  familiarSigma: 0.22,
  novelSigma: 0.65,
  creatorBonus: 0.15,
  friendPriority: 0.3,
  maxMemes: 2000,
} as const;
export type Channel = 'friend' | 'follow';
export type Recommendation = 'balanced' | 'interests' | 'discovery';
export interface Person {
  id: number;
  name: string;
  interests: number[];
  preferences: { mean: number; sigma: number }[];
  personality: Record<(typeof PERSONALITIES)[number], number>;
  memory: Map<number, number>;
  creativity: number;
  community: number;
  x: number;
  y: number;
}
export interface Follow {
  follower: number;
  author: number;
  weight: number;
}
export interface Meme {
  id: number;
  root: number;
  parent?: number;
  creator?: number;
  name: string;
  themes: number[];
  attributes: number[];
  template: { immutability: number; shareability: number };
  born: number;
}
export type MemeDraft = Pick<
  Meme,
  'name' | 'themes' | 'attributes' | 'template'
>;
export interface Delivery {
  meme: number;
  author: number;
  channel: Channel;
}
export interface RoundStats {
  round: number;
  viewers: number;
  views: number;
  shares: number;
  mutations: number;
  reach: number;
}
export const clamp = (n: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, n));
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rng: () => number, mean: number, sigma: number) {
  return (
    mean +
    sigma *
      Math.sqrt(-2 * Math.log(Math.max(1e-10, rng()))) *
      Math.cos(2 * Math.PI * rng())
  );
}
function distance(a: number[], b: number[]) {
  return Math.hypot(...a.map((v, i) => v - b[i]));
}
export function memeDistance(a: MemeDraft, b: MemeDraft) {
  return (
    0.5 * distance(a.themes, b.themes) +
    0.7 * distance(a.attributes, b.attributes) +
    0.3 *
      Math.hypot(
        a.template.immutability - b.template.immutability,
        a.template.shareability - b.template.shareability,
      )
  );
}
function affinity(p: Person, m: MemeDraft) {
  return p.interests.reduce((s, v, i) => s + v * m.themes[i], 0);
}
export function excitement(
  p: Person,
  m: Meme,
  channel: Channel,
  memes: Map<number, Meme>,
): number {
  // A = sqrt(2 pi) sigma gives each Gaussian a unit peak.
  const base =
    p.preferences.reduce(
      (v, pref, i) =>
        v * Math.exp(-0.5 * ((m.attributes[i] - pref.mean) / pref.sigma) ** 2),
      1,
    ) *
    (1 + affinity(p, m));
  let nearest = Infinity;
  let strength = 0;
  for (const [id, memory] of p.memory) {
    const remembered = memes.get(id);
    if (!remembered) continue;
    const d = memeDistance(m, remembered);
    if (d < nearest) {
      nearest = d;
      strength = memory;
    }
  }
  // The draft leaves memory strength and the empty-memory case unspecified.
  const novelty = Number.isFinite(nearest)
    ? 1 -
      0.8 *
        p.personality.novelty *
        Math.min(1, strength) *
        Math.exp(-(nearest ** 2) / (2 * RULES.familiarSigma ** 2)) +
      0.6 * nearest * Math.exp(-(nearest ** 2) / (2 * RULES.novelSigma ** 2))
    : 1;
  const context =
    1 +
    RULES.context * p.personality[channel === 'friend' ? 'tribal' : 'trendy'];
  return (
    base *
    RULES.juxtaposition ** (m.themes.filter(Boolean).length - 1) *
    context *
    novelty
  );
}
export function normalizedPriorities(
  edges: Follow[],
  person: Person,
  people: Person[],
  mode: Recommendation,
): number[] {
  const weights = edges.map(
    (edge) =>
      edge.weight *
      (mode === 'balanced'
        ? 1
        : mode === 'interests'
          ? 0.05 +
            person.interests.reduce(
              (s, v, i) => s + v * people[edge.author].interests[i],
              0,
            )
          : 0.05 + distance(person.interests, people[edge.author].interests)),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (total > 0 ? w / total : 1 / edges.length));
}

export class Simulation {
  readonly rng: () => number;
  readonly people: Person[];
  readonly friends: Set<number>[];
  readonly follows: Follow[][];
  readonly followers: number[][];
  readonly memes = new Map<number, Meme>();
  readonly reached = new Set<number>();
  readonly history: RoundStats[] = [];
  pending: Delivery[][];
  round = 0;
  compute = 60;
  recommendation: Recommendation = 'balanced';
  constructor(
    public readonly size = 300,
    public readonly seed = 42,
  ) {
    if (!Number.isInteger(size) || size < 100 || size > 10000)
      throw new Error('Population must be between 100 and 10,000.');
    this.rng = random(seed);
    const names = assignNames(size, seed);
    this.people = Array.from({ length: size }, (_, id) => {
      const raw = THEMES.map(
        () => (-Math.log(Math.max(1e-10, this.rng()))) ** 3,
      );
      const sum = raw.reduce((a, b) => a + b, 0);
      return {
        id,
        name: names[id],
        interests: raw.map((v) => v / sum),
        preferences: ATTRIBUTES.map(() => ({
          mean: this.rng(),
          sigma: clamp(gaussian(this.rng, 0.5, 0.1), 0.2, 0.8),
        })),
        personality: Object.fromEntries(
          PERSONALITIES.map((k) => [
            k,
            clamp(
              gaussian(this.rng, k === 'recoverability' ? 0.18 : 0.5, 0.18),
              0.01,
              0.99,
            ),
          ]),
        ) as Person['personality'],
        memory: new Map(),
        creativity: 0,
        community: 0,
        x: 0,
        y: 0,
      };
    });
    this.friends = Array.from({ length: size }, () => new Set());
    this.follows = Array.from({ length: size }, () => []);
    this.followers = Array.from({ length: size }, () => []);
    this.pending = Array.from({ length: size }, () => []);
    this.constructFriends();
    this.constructFollows();
  }
  private connect(a: number, b: number) {
    if (a !== b) {
      this.friends[a].add(b);
      this.friends[b].add(a);
    }
  }
  private constructFriends() {
    for (const k of [3, 8]) {
      let centres = Array.from({ length: k }, () => [
        ...this.people[Math.floor(this.rng() * this.size)].interests,
      ]);
      for (let iteration = 0; iteration < 4; iteration++) {
        const groups: Person[][] = Array.from({ length: k }, () => []);
        for (const p of this.people) {
          const nearest = centres
            .map((c, id) => ({ id, d: distance(p.interests, c) }))
            .sort((a, b) => a.d - b.d)[0];
          groups[nearest.id].push(p);
        }
        centres = groups.map((group, i) =>
          group.length
            ? THEMES.map(
                (_, j) =>
                  group.reduce((s, p) => s + p.interests[j], 0) / group.length,
              )
            : centres[i],
        );
      }
      const groups: Person[][] = Array.from({ length: k }, () => []);
      for (const p of this.people) {
        const nearest = centres
          .map((c, id) => ({
            id,
            w: 1 / (distance(p.interests, c) + 0.01) ** 4,
          }))
          .sort((a, b) => b.w - a.w)
          .slice(0, 3);
        let draw = this.rng() * nearest.reduce((s, v) => s + v.w, 0);
        const group = nearest.find((v) => (draw -= v.w) <= 0)!.id;
        groups[group].push(p);
        if (k === 8) {
          p.community = group;
          const angle = (2 * Math.PI * group) / k;
          p.x = Math.cos(angle) * 0.62 + gaussian(this.rng, 0, 0.17);
          p.y = Math.sin(angle) * 0.62 + gaussian(this.rng, 0, 0.17);
        }
      }
      for (const group of groups)
        for (let i = 0; i < group.length; i++) {
          for (
            let offset = 1;
            offset <= Math.min(2, group.length - 1);
            offset++
          ) {
            const j =
              this.rng() < 0.12
                ? Math.floor(this.rng() * group.length)
                : (i + offset) % group.length;
            this.connect(group[i].id, group[j].id);
          }
        }
    }
  }
  private constructFollows() {
    // Degree-weighted urn and interest rejection combine preferential attachment with homophily.
    const urn = this.people.map((p) => p.id);
    for (const p of this.people) {
      const chosen = new Set<number>();
      for (let tries = 0; chosen.size < 5 && tries < 200; tries++) {
        const author = urn[Math.floor(this.rng() * urn.length)];
        const similarity = p.interests.reduce(
          (s, v, i) => s + v * this.people[author].interests[i],
          0,
        );
        if (
          author === p.id ||
          chosen.has(author) ||
          this.rng() > 0.15 + 0.85 * similarity
        )
          continue;
        chosen.add(author);
        this.follows[p.id].push({ follower: p.id, author, weight: 1 });
        this.followers[author].push(p.id);
        urn.push(author);
      }
    }
  }
  private validateDraft(draft: MemeDraft) {
    if (!draft.name.trim() || draft.name.length > 48)
      throw new Error('Give your meme a name of 1–48 characters.');
    if (
      draft.themes.length !== 8 ||
      draft.themes.some((v) => v !== 0 && v !== 1) ||
      !draft.themes.some(Boolean)
    )
      throw new Error('Select at least one theme.');
    if (
      draft.attributes.length !== 4 ||
      [
        ...draft.attributes,
        draft.template.immutability,
        draft.template.shareability,
      ].some((v) => !Number.isFinite(v) || v < 0 || v > 1)
    )
      throw new Error('Meme attributes must be between 0 and 1.');
  }
  launch(draft: MemeDraft, target?: number): Meme {
    this.validateDraft(draft);
    if (this.compute < RULES.launchCost)
      throw new Error('Not enough compute. Advance a round to recharge.');
    if (this.memes.size >= RULES.maxMemes)
      throw new Error(
        'This network has reached its meme limit. Start a new network.',
      );
    if (target !== undefined && !this.people[target])
      throw new Error('Unknown seed person.');
    const meme = this.addMeme(draft);
    this.compute -= RULES.launchCost;
    const seeds =
      target === undefined
        ? [...this.people]
            .sort((a, b) => affinity(b, meme) - affinity(a, meme))
            .slice(0, 8)
        : [this.people[target]];
    for (const p of seeds)
      this.pending[p.id].push({
        meme: meme.id,
        author: p.id,
        channel: 'friend',
      });
    return meme;
  }
  private addMeme(draft: MemeDraft, parent?: Meme, creator?: number) {
    const id = this.memes.size;
    const meme: Meme = {
      ...draft,
      name: draft.name.trim(),
      themes: [...draft.themes],
      attributes: [...draft.attributes],
      template: { ...draft.template },
      id,
      root: parent?.root ?? id,
      parent: parent?.id,
      creator,
      born: this.round,
    };
    this.memes.set(id, meme);
    return meme;
  }
  edit(id: number, attributes: number[]) {
    const meme = this.memes.get(id);
    if (!meme) throw new Error('Select a meme first.');
    this.validateDraft({ ...meme, attributes });
    if (this.compute < RULES.editCost)
      throw new Error('Not enough compute. Advance a round to recharge.');
    meme.attributes = [...attributes];
    this.compute -= RULES.editCost;
  }
  private mutate(p: Person, original: Meme): Meme | undefined {
    if (
      this.memes.size >= RULES.maxMemes ||
      this.rng() > 0.12 * p.personality.creativity
    )
      return;
    const attributes = original.attributes.map((a, i) =>
      clamp(
        a +
          (p.preferences[i].mean - a) * (0.1 + this.rng() * 0.3) +
          gaussian(this.rng, 0, 0.03),
      ),
    );
    const themes = [...original.themes];
    const favourite = p.interests.indexOf(Math.max(...p.interests));
    if (
      p.personality.creativity > 0.75 &&
      p.interests[favourite] > 0.3 &&
      this.rng() < 0.2
    )
      themes[favourite] = 1;
    const draft = { ...original, attributes, themes };
    const cost = original.template.immutability * memeDistance(original, draft);
    if (p.creativity < cost) return;
    p.creativity -= cost;
    return this.addMeme(
      {
        ...draft,
        name: `${this.memes.get(original.root)!.name.slice(0, 32)} · remix ${this.memes.size}`,
      },
      original,
      p.id,
    );
  }
  step(): RoundStats {
    const next: Delivery[][] = Array.from({ length: this.size }, () => []);
    const stats: RoundStats = {
      round: ++this.round,
      viewers: 0,
      views: 0,
      shares: 0,
      mutations: 0,
      reach: 0,
    };
    for (const p of this.people) {
      p.creativity += p.personality.creativity;
      const edges = this.follows[p.id];
      const weights = normalizedPriorities(
        edges,
        p,
        this.people,
        this.recommendation,
      );
      const priority = new Map(edges.map((e, i) => [e.author, weights[i]]));
      const ranked = this.pending[p.id]
        .map((d) => ({
          ...d,
          priority:
            d.channel === 'friend'
              ? RULES.friendPriority
              : (priority.get(d.author) ?? 0),
        }))
        .sort((a, b) => b.priority - a.priority);
      const seen = new Set<number>();
      const capacity = 1 + Math.floor(p.personality.attention * 7);
      for (const delivery of ranked) {
        if (seen.size >= capacity) break;
        if (seen.has(delivery.meme)) continue;
        const original = this.memes.get(delivery.meme)!;
        seen.add(original.id);
        stats.views++;
        this.reached.add(p.id);
        const mutated = this.mutate(p, original);
        if (mutated) stats.mutations++;
        const meme = mutated ?? original;
        const score =
          excitement(p, meme, delivery.channel, this.memes) +
          (mutated ? RULES.creatorBonus : 0);
        for (const channel of ['friend', 'follow'] as const) {
          const trait =
            p.personality[channel === 'friend' ? 'tribal' : 'trendy'];
          const threshold =
            (channel === 'friend' ? 0.35 : 0.65) + 0.3 * (1 - trait);
          const probability = clamp(
            (score - threshold) * meme.template.shareability,
          );
          if (this.rng() >= probability) continue;
          stats.shares++;
          const recipients =
            channel === 'friend' ? this.friends[p.id] : this.followers[p.id];
          for (const recipient of recipients)
            next[recipient].push({ meme: meme.id, author: p.id, channel });
        }
      }
      if (seen.size) stats.viewers++;
      // Use M(t) to score the round; apply M(t+1) only after processing the feed.
      for (const [id, strength] of p.memory) {
        const updated =
          strength * (1 - p.personality.recoverability) + Number(seen.has(id));
        if (updated < RULES.memoryThreshold) p.memory.delete(id);
        else p.memory.set(id, updated);
      }
      for (const id of seen) if (!p.memory.has(id)) p.memory.set(id, 1);
    }
    this.pending = next;
    this.compute = Math.min(RULES.maxCompute, this.compute + RULES.income);
    stats.reach = this.reached.size;
    this.history.push(stats);
    return stats;
  }
  memoryCount(id: number) {
    return this.people.filter((p) => p.memory.has(id)).length;
  }
}
