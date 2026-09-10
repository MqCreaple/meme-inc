# Meme Inc. 模因公司

A playable first draft of the round-based social-network game in [design.md](design.md), implemented with Astro and TypeScript. Create a meme, tune the public feed, and watch people share, forget, and remix it across separate friend and follow graphs.

## Run locally

Use Node.js 22.12+ and npm 9.6.5+.

```sh
npm ci
npm run dev
```

Open http://localhost:4321. `npm run build` generates a static site in `dist/`; `npm run preview` serves that build. No backend, account, API keys, or database is required. Game state lives in the current tab and resets on refresh. Fonts use Google Fonts when available, with local fallbacks.

## Play

1. Choose one or more themes, a name, four attributes, and optional template settings. Launching costs **20 compute** and queues the meme for eight people with matching interests.
2. Click **Next round** or press **Enter** outside form controls to process feeds, share memes, and gain **8 compute**, up to 100. Start with 60. The sandbox has no fixed end round: try to maximize reach and keep your ideas circulating.
3. Choose a feed strategy: balanced, similar interests, or discovery. Priorities are normalized across each viewer's outgoing follow edges; friend priorities remain fixed.
4. Click a node to inspect interests, Gaussian preference means and widths, personality, connections, cumulative creativity, and remembered memes. You can also launch the current draft to just that person for 20 compute. Use **Back** to return to the draft controls.
5. Select **Meme memory** to choose a meme directly below the graph. Inspect **This variant only** or **All related variants** (the original and every descendant). The ecosystem menu stays in sync. **Apply draft attributes** spends 12 compute to edit that existing meme's four attributes. Its identity and memories persist, and future reactions use the changed content.
6. Toggle friendship/following edges to change both the drawing and the forces. Drag a person to move them, drag empty space to pan, scroll to zoom, or reset the view. Use **Pause layout** to hold positions while inspecting; people can still be dragged while paused. Focus the canvas and use arrow keys to inspect nodes without a mouse; Escape clears selection. Selected follow-edge arrows point **follower → author**; content travels in the reverse direction.
7. Start a new network with a seed and 100, 300, 1,000, or 10,000 people. This clears the current game. Repeating the seed and actions reproduces the simulation.

**Total reach** counts distinct people who have ever viewed any meme. **Memory** shows either the selected variant or the sum of memories across its family, saturating at strength 1. Shares count publishing actions per channel, not the number of recipients. The activity chart shows viewers in each of the last 40 rounds.

**Cumulative creativity** colours people by their saved creativity (intensity `C / (C + 10)`, so 10 saved gives half intensity). **Recent creators** highlights people who made a variant in the last five rounds, fading by round age. New creators briefly pulse gold for 1.6 seconds; in memory mode only creations matching the selected variant/family pulse. Reduced-motion preferences replace the blink with a steady highlight. Player-injected originals do not count as a person's creation.

Every person has a unique, fictional name. A separate seeded shuffle assigns unused given/family-name combinations first; middle names are introduced only after those combinations run out. Names never consume the simulation's random stream.

## First-draft modelling choices

The design intentionally leaves constants and parts of the algorithm open. These are explicit prototype choices, not a claim that the model has been calibrated against real social networks:

- Interests are normalized cubed exponential samples (nonnegative, L1 norm 1), encouraging sparse interests. Preference means are uniform; widths are normal around 0.5, clamped to 0.2–0.8. Personality traits are clamped normal samples. Recoverability has mean 0.18; the other traits have mean 0.5. Standard deviation is 0.18.
- Friend graphs use four k-means iterations at each of two scales (3 and 8 centres), stochastic assignment among the three nearest centres, and a local ring with two forward neighbours and 12% random rewiring. Duplicate and self edges are excluded, and friendship is reciprocal.
- Follow graphs use a degree-weighted sampling urn with interest-based acceptance. Each person attempts up to five distinct follows, with 200 bounded attempts. This approximates preferential attachment with homophily; scale-free behaviour has not been statistically established.
- Gaussian preference functions have unit peaks (`A = sqrt(2π)σ`). Excitement multiplies the four preferences, interest affinity, a 1.12 juxtaposition multiplier per extra theme, context, and novelty. Context adds 0.5 times trendy or tribal.
- Meme distance uses theme/attribute/template weights of 0.5/0.7/0.3. Template distance is Euclidean distance over immutability and shareability. Novelty uses `c3=1`, `c4=0.8 × novelty × min(1, nearest memory strength)`, `c5=0.6`, and familiarity/novelty widths 0.22/0.65. Empty memory gives a novelty multiplier of 1. Including strength lets fading memories actually recover their appeal.
- Each person processes `1 + floor(attention × 7)` distinct memes per round. Feeds rank friend deliveries at a fixed priority of 0.3 and follow deliveries by their normalized edge weight. Duplicate memes consume one attention slot; ties preserve arrival order. Unread deliveries expire at round end. Memory uses the design's decay-plus-binary-seen recurrence after scoring, and entries below 0.03 are removed.
- Creativity accumulates by the personality creativity score each round. Mutation attempts have probability `0.12 × creativity`, shift attributes toward the creator's preferences with a small Gaussian perturbation, and may add the creator's strongest theme for highly creative people. Cost is immutability times meme distance. The new meme, with a 0.15 creator bonus, determines sharing. Original/root/parent lineage, creator ID, and creation round are retained.
- Friend/public sharing thresholds are `0.35/0.65 + 0.3 × (1 − tribal/trendy)`. Share probability is `clamp((excitement − threshold) × shareability, 0, 1)`. Either delivery channel can produce both friend and public shares. All shares arrive **next round**, preventing within-round cascades and person-order bias.
- Public recommendation modes multiply each edge's weight by 1, `0.05 + interest dot product`, or `0.05 + interest distance` before per-viewer normalization. These are starter strategies for the design's TODO recommendation section.
- [Sigma.js](https://www.sigmajs.org/) renders the full network with WebGL. [Graphology ForceAtlas2](https://graphology.github.io/standard-library/layout-forceatlas2.html) animates in a worker with Barnes–Hut repulsion, then settles automatically. Each activation damps proposed displacements by `0.8 × (1 − iteration / 600)²` and feeds the damped positions back into the solver. After a 60-iteration warmup, 20 consecutive iterations with maximum node movement below 0.0001 of the graph diagonal stop the loop. A 600-iteration cap guarantees termination even if residual motion persists; elapsed settling time depends on network size and hardware. Only visible channels contribute attraction and degree mass. Friendship weights equal the fixed friend-feed priority (0.3). Follow weights equal each viewer's normalized recommendation priority for that author; because this prototype assigns that priority to every meme from an author, it is also the mean per-meme priority. Changing recommendation mode rebuilds those weights immediately. Greater weights produce stronger attraction. Selecting a person filters the display without changing the force graph.
- Dragging holds a person's position under the pointer while other nodes react, releasing them back to the simulation on pointer release/cancellation. The camera stays fixed during dragging. Pausing, hiding the tab, or hiding both graphs stops layout work. Dragging, changing channels/priorities, or resuming restarts cooling from the current positions. Ordinary rounds and colour changes preserve a settled layout; replacing a network terminates its worker, animation, and event handlers. Round outcomes and names remain seed-reproducible, but live visual positions depend on elapsed animation time and dragging.
- A 2,000-meme cap limits remix growth. The simulation engine still runs on the main thread; dense, long sessions at 10,000 people can pause the UI. Moving round processing to a worker, persistence, detailed edge editing, template theme restrictions, and game balancing are future work.

## Development

```sh
npm run check                 # Astro diagnostics and TypeScript
npm test                      # deterministic engine tests
npx playwright install chromium
npm run test:e2e               # Chromium gameplay and responsive-layout tests
npm run build
```

On a fresh Linux host, `npx playwright install --with-deps chromium` also installs browser system dependencies. A ready-to-enable CI template in `docs/ci.yml.example` runs all checks, including browser tests. Copy it to `.github/workflows/ci.yml` using credentials with workflow write permission to enable GitHub Actions.

- `src/lib/simulation.ts`: seeded generation, state, scoring, resource rules, and synchronous round transitions; independent of the DOM.
- `src/lib/app.ts`: browser controls, keyboard shortcuts, inspection, and activity history.
- `src/lib/network-{graph,layout,view}.ts`, `live-layout.ts`: graph adapter, shared force settings, live worker, dragging, and Sigma rendering.
- `src/lib/names.ts`, `visual-state.ts`: unique name assignment and memory/creator visualisation rules.
- `src/pages/index.astro`, `src/styles/global.css`: responsive 70/30 desktop layout and stacked mobile layout.
- `tests/`: engine invariants and browser workflows.

Astro setup follows the [official installation guide](https://docs.astro.build/en/install-and-setup/) and [client-side script guidance](https://docs.astro.build/en/guides/client-side-scripts/).
