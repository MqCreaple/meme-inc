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
2. Click **Next round** to process feeds, share memes, and gain **8 compute**, up to 100. Start with 60. The sandbox has no fixed end round: try to maximize reach and keep your ideas circulating.
3. Choose a feed strategy: balanced, similar interests, or discovery. Priorities are normalized across each viewer's outgoing follow edges; friend priorities remain fixed.
4. Click a node to inspect interests, Gaussian preference means and widths, personality, connections, cumulative creativity, and remembered memes. You can also launch the current draft to just that person for 20 compute. Use **Back** to return to the draft controls.
5. Select an original or remix in the ecosystem menu to visualize its memory across the network. **Apply draft attributes** spends 12 compute to edit that existing meme's four attributes. Its identity and memories persist, and future reactions use the changed content.
6. Toggle friendship/following edges, change colours, drag to pan, scroll to zoom, or reset the view. Focus the canvas and use arrow keys to inspect nodes without a mouse; Escape clears selection. Selected follow-edge arrows point **follower → author**; content travels in the reverse direction.
7. Start a new network with a seed and 100, 300, 1,000, or 10,000 people. This clears the current game. Repeating the seed and actions reproduces the simulation.

**Total reach** counts distinct people who have ever viewed any meme. **Memory** is specific to the selected meme, so originals and remixes have separate memory populations. Shares count publishing actions per channel, not the number of recipients. The activity chart shows viewers in each of the last 40 rounds.

## First-draft modelling choices

The design intentionally leaves constants and parts of the algorithm open. These are explicit prototype choices, not a claim that the model has been calibrated against real social networks:

- Interests are normalized cubed exponential samples (nonnegative, L1 norm 1), encouraging sparse interests. Preference means are uniform; widths are normal around 0.5, clamped to 0.2–0.8. Personality traits are clamped normal samples. Recoverability has mean 0.18; the other traits have mean 0.5. Standard deviation is 0.18.
- Friend graphs use four k-means iterations at each of two scales (3 and 8 centres), stochastic assignment among the three nearest centres, and a local ring with two forward neighbours and 12% random rewiring. Duplicate and self edges are excluded, and friendship is reciprocal.
- Follow graphs use a degree-weighted sampling urn with interest-based acceptance. Each person attempts up to five distinct follows, with 200 bounded attempts. This approximates preferential attachment with homophily; scale-free behaviour has not been statistically established.
- Gaussian preference functions have unit peaks (`A = sqrt(2π)σ`). Excitement multiplies the four preferences, interest affinity, a 1.12 juxtaposition multiplier per extra theme, context, and novelty. Context adds 0.5 times trendy or tribal.
- Meme distance uses theme/attribute/template weights of 0.5/0.7/0.3. Template distance is Euclidean distance over immutability and shareability. Novelty uses `c3=1`, `c4=0.8 × novelty × min(1, nearest memory strength)`, `c5=0.6`, and familiarity/novelty widths 0.22/0.65. Empty memory gives a novelty multiplier of 1. Including strength lets fading memories actually recover their appeal.
- Each person processes `1 + floor(attention × 7)` distinct memes per round. Feeds rank friend deliveries at a fixed priority of 0.3 and follow deliveries by their normalized edge weight. Duplicate memes consume one attention slot; ties preserve arrival order. Unread deliveries expire at round end. Memory uses the design's decay-plus-binary-seen recurrence after scoring, and entries below 0.03 are removed.
- Creativity accumulates by the personality creativity score each round. Mutation attempts have probability `0.12 × creativity`, shift attributes toward the creator's preferences with a small Gaussian perturbation, and may add the creator's strongest theme for highly creative people. Cost is immutability times meme distance. The new meme, with a 0.15 creator bonus, determines sharing. Original/root/parent lineage is retained.
- Friend/public sharing thresholds are `0.35/0.65 + 0.3 × (1 − tribal/trendy)`. Share probability is `clamp((excitement − threshold) × shareability, 0, 1)`. Either delivery channel can produce both friend and public shares. All shares arrive **next round**, preventing within-round cascades and person-order bias.
- Public recommendation modes multiply each edge's weight by 1, `0.05 + interest dot product`, or `0.05 + interest distance` before per-viewer normalization. These are starter strategies for the design's TODO recommendation section.
- The canvas uses a fixed community layout, not a force simulation. At 10,000 nodes it samples background edges for readability; selecting a node reveals its connections. The complete graphs still drive simulation. A 2,000-meme cap limits remix growth. The engine runs on the main thread; dense, long sessions at 10,000 people can pause the UI. Workers, persistence, detailed edge editing, template theme restrictions, and game balancing are future work.

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
- `src/lib/app.ts`: browser controls, canvas rendering, inspection, and activity history.
- `src/pages/index.astro`, `src/styles/global.css`: responsive 70/30 desktop layout and stacked mobile layout.
- `tests/`: engine invariants and browser workflows.

Astro setup follows the [official installation guide](https://docs.astro.build/en/install-and-setup/) and [client-side script guidance](https://docs.astro.build/en/guides/client-side-scripts/).
