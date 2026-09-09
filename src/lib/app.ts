import {
  ATTRIBUTES,
  PERSONALITIES,
  RULES,
  Simulation,
  THEMES,
  clamp,
  type MemeDraft,
  type Recommendation,
} from './simulation';
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const select = (id: string) => $<HTMLSelectElement>(id);
const button = (id: string) => $<HTMLButtonElement>(id);
const palette = [
  '#bf9241',
  '#aa76a0',
  '#6f91b8',
  '#cf8274',
  '#58a99c',
  '#859c4d',
  '#b285a8',
  '#85b861',
];
const prefPalette = ['#d68ba2', '#caaf47', '#c4775b', '#759bcc'];
let game = new Simulation();
let selectedPerson: number | undefined;
let selectedMeme: number | undefined;
let zoom = 1;
let pan = { x: 0, y: 0 };
const canvas = $<HTMLCanvasElement>('network');
const ctx = canvas.getContext('2d')!;
let width = 0,
  height = 0;
const text = (id: string, value: string | number) => {
  $(id).textContent = String(value);
};
const message = (value: string) => text('message', value);
function draft(): MemeDraft {
  return {
    name: input('meme-name').value,
    themes: THEMES.map((theme) =>
      Number(
        document.querySelector<HTMLInputElement>(
          `input[name="theme"][value="${theme}"]`,
        )!.checked,
      ),
    ),
    attributes: ATTRIBUTES.map(
      (_, i) => Number(input(`attribute-${i}`).value) / 100,
    ),
    template: {
      immutability: Number(input('immutability').value) / 100,
      shareability: Number(input('shareability').value) / 100,
    },
  };
}
function attempt(action: () => void) {
  try {
    action();
    render();
  } catch (error) {
    message(error instanceof Error ? error.message : 'Something went wrong.');
  }
}
function point(p: { x: number; y: number }) {
  const scale = Math.min(width, height) * 0.43 * zoom;
  return {
    x: width / 2 + p.x * scale + pan.x,
    y: height / 2 + p.y * scale + pan.y,
  };
}
function mix(colours: string[], weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const rgb = [0, 1, 2].map((channel) =>
    Math.round(
      colours.reduce(
        (s, c, i) =>
          s +
          (parseInt(c.slice(1 + channel * 2, 3 + channel * 2), 16) *
            weights[i]) /
            total,
        0,
      ),
    ),
  );
  return `rgb(${rgb.join(',')})`;
}
function draw() {
  ctx.clearRect(0, 0, width, height);
  const positions = game.people.map(point);
  const isLarge = game.size > 1000;
  function line(a: number, b: number, follow = false) {
    if (isLarge && selectedPerson === undefined && (a % 7 !== 0 || b % 3 !== 0))
      return;
    const selected = a === selectedPerson || b === selectedPerson;
    if (selectedPerson !== undefined && !selected) return;
    const from = positions[a],
      to = positions[b];
    ctx.strokeStyle = follow
      ? selected
        ? '#899fb6aa'
        : '#a1b4c62b'
      : selected
        ? '#6d8967bb'
        : '#8caa7633';
    ctx.lineWidth = selected ? 1.1 : 0.6;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    // Arrows point from follower to author, matching the stored edge direction.
    if (follow && selected) {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const x = from.x + (to.x - from.x) * 0.7,
        y = from.y + (to.y - from.y) * 0.7;
      ctx.beginPath();
      ctx.moveTo(x - 5 * Math.cos(angle - 0.5), y - 5 * Math.sin(angle - 0.5));
      ctx.lineTo(x, y);
      ctx.lineTo(x - 5 * Math.cos(angle + 0.5), y - 5 * Math.sin(angle + 0.5));
      ctx.stroke();
    }
  }
  if (input('friend-edges').checked)
    game.friends.forEach((friends, a) =>
      friends.forEach((b) => {
        if (b > a) line(a, b);
      }),
    );
  if (input('follow-edges').checked)
    game.follows.forEach((edges) =>
      edges.forEach((e) => line(e.follower, e.author, true)),
    );
  for (const p of game.people) {
    const pos = positions[p.id];
    const mode = select('colour').value;
    const memory =
      selectedMeme === undefined ? 0 : (p.memory.get(selectedMeme) ?? 0);
    const colour =
      mode === 'memory'
        ? mix(['#d8dfd2', '#286640'], [1 - clamp(memory), clamp(memory)])
        : mode === 'preference'
          ? mix(
              prefPalette,
              p.preferences.map((pref) => pref.mean),
            )
          : mix(palette, p.interests);
    ctx.globalAlpha =
      selectedPerson === undefined ||
      selectedPerson === p.id ||
      game.friends[selectedPerson].has(p.id)
        ? 1
        : 0.35;
    ctx.beginPath();
    ctx.arc(
      pos.x,
      pos.y,
      (isLarge ? 1.8 : 3.5) * Math.sqrt(zoom),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    if (p.id === selectedPerson) {
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8 * Math.sqrt(zoom), 0, Math.PI * 2);
      ctx.strokeStyle = '#234f36';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
function legend() {
  const mode = select('colour').value;
  const labels =
    mode === 'interest'
      ? THEMES
      : mode === 'preference'
        ? ATTRIBUTES
        : ['No memory', 'Strong memory'];
  const colours =
    mode === 'interest'
      ? palette
      : mode === 'preference'
        ? prefPalette
        : ['#d8dfd2', '#286640'];
  $('legend').replaceChildren(
    ...labels.map((label, i) => {
      const span = document.createElement('span'),
        dot = document.createElement('i');
      dot.style.background = colours[i];
      span.append(dot, label);
      return span;
    }),
  );
}
function bars(
  parent: HTMLElement,
  title: string,
  labels: readonly string[],
  values: number[],
) {
  const heading = document.createElement('h3');
  heading.textContent = title;
  parent.append(heading);
  labels.forEach((label, i) => {
    const row = document.createElement('label');
    row.className = 'bar-row';
    const value = document.createElement('span');
    value.textContent = `${Math.round(values[i] * 100)}%`;
    const meter = document.createElement('meter');
    meter.min = 0;
    meter.max = 1;
    meter.value = values[i];
    meter.setAttribute('aria-label', label);
    row.append(label, value, meter);
    parent.append(row);
  });
}
function renderPerson() {
  $('global-controls').hidden = selectedPerson !== undefined;
  $('person-panel').hidden = selectedPerson === undefined;
  if (selectedPerson === undefined) return;
  const p = game.people[selectedPerson];
  text('person-title', `Person ${String(p.id + 1).padStart(3, '0')}`);
  const details = $('person-details');
  details.replaceChildren();
  const summary = document.createElement('p');
  summary.className = 'help';
  summary.textContent = `${game.friends[p.id].size} friends · following ${game.follows[p.id].length} · ${game.followers[p.id].length} followers · ${p.creativity.toFixed(2)} creativity saved`;
  details.append(summary);
  bars(details, 'Interests', THEMES, p.interests);
  bars(
    details,
    'Preference sweet spots',
    ATTRIBUTES,
    p.preferences.map((pref) => pref.mean),
  );
  const sigmas = document.createElement('p');
  sigmas.className = 'help';
  sigmas.textContent = `Gaussian widths (σ): ${p.preferences.map((pref, i) => `${ATTRIBUTES[i]} ${pref.sigma.toFixed(2)}`).join(' · ')}`;
  details.append(sigmas);
  bars(
    details,
    'Personality',
    PERSONALITIES,
    PERSONALITIES.map((k) => p.personality[k]),
  );
  const heading = document.createElement('h3');
  heading.textContent = 'Meme memory';
  details.append(heading);
  if (!p.memory.size) {
    const empty = document.createElement('p');
    empty.className = 'help';
    empty.textContent = 'No memes seen yet.';
    details.append(empty);
  }
  for (const [id, strength] of [...p.memory].sort((a, b) => b[1] - a[1])) {
    const item = document.createElement('button');
    item.className = 'memory-item';
    item.textContent = `${game.memes.get(id)!.name} · ${strength.toFixed(2)}`;
    item.onclick = () => {
      selectedMeme = id;
      select('colour').value = 'memory';
      render();
    };
    details.append(item);
  }
}
function renderMemes() {
  const picker = select('selected-meme');
  picker.replaceChildren();
  if (!game.memes.size) picker.add(new Option('No memes yet', ''));
  for (const m of game.memes.values())
    picker.add(new Option(m.name, String(m.id)));
  picker.value = selectedMeme === undefined ? '' : String(selectedMeme);
  text('meme-count', `${game.memes.size} memes`);
  const details = $('meme-details');
  details.replaceChildren();
  const meme =
    selectedMeme === undefined ? undefined : game.memes.get(selectedMeme);
  const info = document.createElement('p');
  info.className = 'help';
  info.textContent = meme
    ? `${meme.parent === undefined ? 'Original' : `Remix of ${game.memes.get(meme.parent)!.name}`} · born round ${meme.born} · remembered by ${game.memoryCount(meme.id)} people. Themes: ${THEMES.filter((_, i) => meme.themes[i]).join(', ')}.`
    : 'Originals and community remixes will appear here.';
  details.append(info);
  if (meme) {
    const attributes = document.createElement('p');
    attributes.className = 'help';
    attributes.textContent = ATTRIBUTES.map(
      (name, i) => `${name} ${Math.round(meme.attributes[i] * 100)}%`,
    ).join(' · ');
    details.append(attributes);
  }
  button('edit-meme').disabled = !meme || game.compute < RULES.editCost;
}
function render() {
  text('round', String(game.round).padStart(2, '0'));
  text('population', game.size.toLocaleString());
  text('network-size', `${game.size.toLocaleString()} NODES`);
  text('reach', `${Math.round((game.reached.size / game.size) * 100)}%`);
  text('reach-detail', `${game.reached.size} people have seen a meme`);
  text('compute', `${game.compute}/100`);
  const latest = game.history.at(-1);
  text('shares', latest?.shares ?? 0);
  text('mutation-detail', `${latest?.mutations ?? 0} new remixes`);
  button('launch').disabled = game.compute < RULES.launchCost;
  button('seed-person').disabled = game.compute < RULES.launchCost;
  text(
    'canvas-status',
    game.memes.size
      ? `${game.pending.filter((feed) => feed.length).length} people have memes waiting`
      : 'Your network is ready. Launch a meme to start the chain.',
  );
  if (latest)
    text(
      'activity-text',
      `${latest.views} views by ${latest.viewers} people this round. ${latest.shares} shares; ${latest.mutations} remixes.`,
    );
  else
    text(
      'activity-text',
      'Nothing is moving yet. Every idea starts somewhere.',
    );
  const svg = $('history-chart');
  const data = game.history.slice(-40);
  const values = [0, ...data.map((s) => s.viewers)];
  const top = Math.max(1, ...values);
  const points = values
    .map(
      (value, i) =>
        `${(i * 480) / Math.max(1, values.length - 1)},${60 - (value / top) * 52}`,
    )
    .join(' ');
  svg.innerHTML = `<path d="M0 60 H480" stroke="currentColor" opacity=".15"/><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2"/>`;
  svg.setAttribute(
    'aria-label',
    `Viewers over the last ${data.length} rounds: ${data.map((s) => s.viewers).join(', ') || 'none'}`,
  );
  renderPerson();
  renderMemes();
  legend();
  draw();
}
$('meme-form').addEventListener('submit', (event) => {
  event.preventDefault();
  attempt(() => {
    const meme = game.launch(draft());
    selectedMeme = meme.id;
    select('colour').value = 'memory';
    message(
      `Launched “${meme.name}” to 8 people. Advance a round to watch it spread.`,
    );
  });
});
$('seed-person').onclick = () =>
  attempt(() => {
    const meme = game.launch(draft(), selectedPerson);
    selectedMeme = meme.id;
    select('colour').value = 'memory';
    message(
      `Launched “${meme.name}” to Person ${selectedPerson! + 1}. Advance a round to see their reaction.`,
    );
  });
$('next-round').onclick = () =>
  attempt(() => {
    const stats = game.step();
    message(
      `Round ${stats.round}: ${stats.viewers} people viewed memes, ${stats.shares} shares, ${stats.mutations} remixes. +8 compute (up to 100).`,
    );
  });
$('edit-meme').onclick = () =>
  attempt(() => {
    game.edit(selectedMeme!, draft().attributes);
    message(
      'Updated the selected meme with the draft’s four attributes. Future reactions use the new values.',
    );
  });
$('recommendation').onchange = () => {
  game.recommendation = select('recommendation').value as Recommendation;
  message('Feed priorities updated for the next round.');
};
$('selected-meme').onchange = () => {
  selectedMeme =
    select('selected-meme').value === ''
      ? undefined
      : Number(select('selected-meme').value);
  select('colour').value = 'memory';
  render();
};
ATTRIBUTES.forEach((_, i) => {
  input(`attribute-${i}`).oninput = () =>
    text(`attribute-value-${i}`, `${input(`attribute-${i}`).value}%`);
});
for (const id of ['colour', 'friend-edges', 'follow-edges'])
  $(id).onchange = () => {
    legend();
    draw();
  };
$('close-person').onclick = () => {
  selectedPerson = undefined;
  render();
};
$('reset-view').onclick = () => {
  zoom = 1;
  pan = { x: 0, y: 0 };
  draw();
};
$('network-form').addEventListener('submit', (event) => {
  event.preventDefault();
  attempt(() => {
    game = new Simulation(
      Number(select('size').value),
      Number(input('seed').value),
    );
    selectedPerson = undefined;
    selectedMeme = undefined;
    game.recommendation = select('recommendation').value as Recommendation;
    zoom = 1;
    pan = { x: 0, y: 0 };
    message('New network created. Create a meme to begin.');
  });
});
new ResizeObserver(() => {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}).observe(canvas);
canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - width / 2,
      y = event.clientY - rect.top - height / 2;
    const next = clamp(zoom * Math.exp(-event.deltaY * 0.001), 0.5, 5),
      ratio = next / zoom;
    pan = { x: x - (x - pan.x) * ratio, y: y - (y - pan.y) * ratio };
    zoom = next;
    draw();
  },
  { passive: false },
);
let pointer:
  | { x: number; y: number; startX: number; startY: number; moved: boolean }
  | undefined;
canvas.onpointerdown = (event) => {
  canvas.setPointerCapture(event.pointerId);
  pointer = {
    x: event.clientX,
    y: event.clientY,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
};
canvas.onpointermove = (event) => {
  if (!pointer) return;
  pointer.moved ||=
    Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) >
    4;
  pan.x += event.clientX - pointer.x;
  pan.y += event.clientY - pointer.y;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  draw();
};
canvas.onpointerup = (event) => {
  if (pointer && !pointer.moved) {
    const rect = canvas.getBoundingClientRect();
    let nearest = 14;
    selectedPerson = undefined;
    for (const p of game.people) {
      const pos = point(p);
      const d = Math.hypot(
        pos.x - (event.clientX - rect.left),
        pos.y - (event.clientY - rect.top),
      );
      if (d < nearest) {
        nearest = d;
        selectedPerson = p.id;
      }
    }
    render();
  }
  pointer = undefined;
};
canvas.onpointercancel = () => {
  pointer = undefined;
};
canvas.onkeydown = (event) => {
  if (event.key === 'Escape') {
    selectedPerson = undefined;
    render();
  }
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    selectedPerson =
      selectedPerson === undefined
        ? 0
        : (selectedPerson + (forward ? 1 : -1) + game.size) % game.size;
    render();
  }
};
render();
