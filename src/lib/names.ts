// Small, curated fictional-name pools; no personal data or external service.
const GIVEN =
  'Alex Alice Amelia Andrew Anna Arthur Ava Benjamin Blake Caleb Charlotte Chloe Daniel David Dylan Eleanor Elena Eli Elijah Emily Emma Ethan Eva Evelyn Felix Finn Gabriel Grace Hannah Harper Henry Isla Ivy Jack Jacob James Jane Jasper John Joseph Julia Leo Liam Lily Lucas Lucy Maya Mia Noah Oliver Olivia Oscar Owen Ruby Samuel Sarah Sophia Theo Thomas Violet William Zoe'.split(
    ' ',
  );
const FAMILY =
  'Adams Allen Anderson Bailey Baker Bell Bennett Black Brooks Brown Campbell Carter Clark Collins Cooper Cox Davis Edwards Evans Fisher Foster Fox Garcia Gray Green Hall Harris Hayes Hill Hughes Jackson James Johnson Jones Kelly King Lane Lee Lewis Long Martin Miller Mitchell Moore Morgan Morris Nelson Parker Perry Price Reed Reid Richardson Riley Roberts Robinson Rose Ross Scott Shaw Smith Stewart Stone Taylor Thomas Thompson Turner Walker Ward Watson White Williams Wilson Wood Wright Young'.split(
    ' ',
  );
const MIDDLE =
  'Avery Cameron Casey Drew Ellis Emery Francis Hayden Jordan Lee Morgan Quinn Reese River Robin Rowan Sage Sam Sky Taylor'.split(
    ' ',
  );
export const TWO_PART_CAPACITY = GIVEN.length * FAMILY.length;
export function assignNames(count: number, seed: number): string[] {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > TWO_PART_CAPACITY * (MIDDLE.length + 1)
  )
    throw new Error('Name pool capacity exceeded.');
  // Independent shuffle: adding names must not consume simulation randomness.
  let state = seed >>> 0;
  const rng = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const pairs = Array.from({ length: TWO_PART_CAPACITY }, (_, i) => i);
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return Array.from({ length: count }, (_, i) => {
    const pair = pairs[i % pairs.length];
    const given = GIVEN[Math.floor(pair / FAMILY.length)],
      family = FAMILY[pair % FAMILY.length];
    const layer = Math.floor(i / pairs.length);
    return layer === 0
      ? `${given} ${family}`
      : `${given} ${MIDDLE[layer - 1]} ${family}`;
  });
}
