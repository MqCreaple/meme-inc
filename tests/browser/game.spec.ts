import { assignNames } from '../../src/lib/names';
import { expect, test } from '@playwright/test';
test('play, inspect, edit, change feed and reset a network', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#legend span')).toHaveCount(8);
  await page.getByRole('button', { name: 'Launch meme' }).click();
  await expect(page.locator('#compute')).toHaveText('40/100');
  await expect(page.locator('#selected-meme')).toHaveValue('0');
  await page.getByRole('button', { name: 'Next round' }).click();
  await expect(page.locator('#round')).toHaveText('01');
  await expect(page.locator('#reach-detail')).toHaveText(
    '8 people have seen a meme',
  );
  await page.locator('#attribute-0').fill('20');
  await page.getByRole('button', { name: 'Apply draft attributes' }).click();
  await expect(page.locator('#meme-details')).toContainText('cute 20%');
  await expect(page.locator('#compute')).toHaveText('36/100');
  await page.locator('#network').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#person-title')).toHaveText(
    assignNames(300, 42)[0],
  );
  await expect(page.locator('#person-details meter')).toHaveCount(18);
  await page
    .getByRole('button', { name: 'Launch draft to this person' })
    .click();
  await expect(page.locator('#compute')).toHaveText('16/100');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('#launch')).toBeDisabled();
  await page.locator('#recommendation').selectOption('discovery');
  await expect(page.locator('#message')).toContainText(
    'priorities and graph forces updated',
  );
  await page.locator('#colour').selectOption('preference');
  await expect(page.locator('#legend span')).toHaveCount(4);
  await page.locator('#follow-edges').check();
  await page.locator('#friend-edges').uncheck();
  await page.locator('#size').selectOption('100');
  await page.getByRole('button', { name: 'New network' }).click();
  await expect(page.locator('#population')).toHaveText('100');
  await expect(page.locator('#round')).toHaveText('00');
  await expect(page.locator('#meme-count')).toHaveText('0 memes');
  await expect(page.locator('#compute')).toHaveText('60/100');
  expect(errors).toEqual([]);
});
test('mobile layout supports theme validation and literal user text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#legend span')).toHaveCount(8);
  await page.locator('input[name=theme][value=animals]').uncheck();
  await page.getByRole('button', { name: 'Launch meme' }).click();
  await expect(page.locator('#message')).toHaveText(
    'Select at least one theme.',
  );
  await page.locator('input[name=theme][value=game]').check();
  await page.locator('#meme-name').fill('<img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Launch meme' }).click();
  await expect(page.locator('#selected-meme option')).toHaveText(
    '<img src=x onerror=alert(1)>',
  );
  expect(await page.locator('#meme-details img').count()).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator('#network')).toHaveAttribute(
    'data-layout',
    'ready',
  );
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
test('desktop initial view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.locator('#legend span')).toHaveCount(8);
  await expect(page.locator('#network')).toHaveAttribute(
    'data-layout',
    'ready',
  );
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
});

test('Enter advances once without hijacking forms or native buttons', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#network')).toHaveAttribute(
    'data-layout',
    'ready',
  );
  await page.locator('#network').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#round')).toHaveText('01');
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(page.locator('#round')).toHaveText('02');
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('#round')).toHaveText('02');
  await page.locator('#meme-name').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#meme-count')).toHaveText('1 memes');
  await expect(page.locator('#round')).toHaveText('02');
  await page.locator('#next-round').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#round')).toHaveText('03');
  await page.locator('#seed').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#round')).toHaveText('00');
});

test('Sigma renders a worker layout and replaces renderers cleanly on reset', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const graph = page.locator('#network');
  await expect(graph).toHaveAttribute('data-layout', 'ready');
  await expect(graph.locator('canvas.sigma-mouse')).toHaveCount(1);
  await expect(graph.locator('canvas.sigma-edges')).toHaveCount(1);
  await graph.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#person-title')).toHaveText(
    assignNames(300, 42)[0],
  );
  await page.locator('#follow-edges').check();
  await page.locator('#friend-edges').uncheck();
  await page.locator('#reset-view').click();
  // Reset while a larger worker is still computing; stale results must be discarded.
  await page.locator('#size').selectOption('10000');
  await page.getByRole('button', { name: 'New network' }).click();
  await page.locator('#size').selectOption('100');
  await page.getByRole('button', { name: 'New network' }).click();
  await expect(graph).toHaveAttribute('data-layout', 'ready');
  await expect(graph.locator('canvas.sigma-mouse')).toHaveCount(1);
  await expect(page.locator('#population')).toHaveText('100');
  expect(errors).toEqual([]);
});

test('live forces respond to channel and priority changes and can be paused', async ({
  page,
}) => {
  await page.goto('/');
  const graph = page.locator('#network');
  await expect(graph).toHaveAttribute('data-layout', 'ready');
  await page.locator('#pause-layout').check();
  await page.locator('#pause-layout').uncheck();
  const frame = Number(await graph.getAttribute('data-layout-frame'));
  await expect
    .poll(async () => Number(await graph.getAttribute('data-layout-frame')))
    .toBeGreaterThan(frame + 3);
  let revision = Number(await graph.getAttribute('data-layout-revision'));
  await page.locator('#follow-edges').check();
  await expect
    .poll(async () => Number(await graph.getAttribute('data-layout-revision')))
    .toBeGreaterThan(revision);
  revision = Number(await graph.getAttribute('data-layout-revision'));
  await page.locator('#recommendation').selectOption('discovery');
  await expect
    .poll(async () => Number(await graph.getAttribute('data-layout-revision')))
    .toBeGreaterThan(revision);
  await page.locator('#friend-edges').uncheck();
  await page.locator('#follow-edges').uncheck();
  await expect(graph).toHaveAttribute('data-layout', 'paused');
  await page.locator('#friend-edges').check();
  await expect(graph).toHaveAttribute('data-layout', 'ready');
  await page.locator('#pause-layout').check();
  const stopped = await graph.getAttribute('data-layout-frame');
  await expect(graph).toHaveAttribute('data-layout', 'paused');
  await page.waitForTimeout(150);
  expect(await graph.getAttribute('data-layout-frame')).toBe(stopped);
  await page.locator('#pause-layout').uncheck();
  await expect(graph).toHaveAttribute('data-layout', 'ready');
});

test('a person can be dragged without panning the graph', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  const graph = page.locator('#network');
  await expect(graph).toHaveAttribute('data-layout', 'ready');
  await page.locator('#pause-layout').check();
  await graph.scrollIntoViewIfNeeded();
  const box = (await graph.boundingBox())!;
  let picked: { x: number; y: number } | undefined;
  // Find a real rendered node by hit testing; no dependency on layout timing or coordinates.
  for (let y = box.height * 0.35; y < box.height * 0.65 && !picked; y += 12) {
    for (let x = box.width * 0.35; x < box.width * 0.65 && !picked; x += 12) {
      await page.mouse.click(box.x + x, box.y + y);
      if (await page.locator('#person-panel').isVisible())
        picked = { x: box.x + x, y: box.y + y };
    }
  }
  expect(picked).toBeDefined();
  const name = await page.locator('#person-title').textContent();
  await page.mouse.move(picked!.x, picked!.y);
  await page.mouse.down();
  await page.mouse.move(picked!.x + 70, picked!.y + 45, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#person-title')).toHaveText(name!);
  await page.mouse.click(picked!.x + 70, picked!.y + 45);
  await expect(page.locator('#person-title')).toHaveText(name!);
  await page.mouse.click(picked!.x, picked!.y);
  expect(
    (await page.locator('#person-panel').isVisible()) &&
      (await page.locator('#person-title').textContent()) === name,
  ).toBe(false);
});

test('memory controls select variants or families and creativity modes are available', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#launch').click();
  await expect(page.locator('#memory-controls')).toBeVisible();
  await expect(page.locator('#memory-meme')).toHaveValue('0');
  await page.locator('#meme-name').fill('Another meme');
  await page.locator('#launch').click();
  await page.locator('#memory-meme').selectOption('0');
  await expect(page.locator('#selected-meme')).toHaveValue('0');
  await page.locator('#memory-scope').selectOption('family');
  await page.locator('#selected-meme').selectOption('1');
  await expect(page.locator('#memory-meme')).toHaveValue('1');
  await page.locator('#colour').selectOption('creativity');
  await expect(page.locator('#memory-controls')).toBeHidden();
  await expect(page.locator('#legend')).toContainText('creativity');
  await page.locator('#next-round').click();
  await page.locator('#colour').selectOption('creators');
  await expect(page.locator('#legend')).toContainText('Created this round');
});

test('layout settles automatically and restarts after a force change', async ({
  page,
}) => {
  await page.goto('/');
  const graph = page.locator('#network');
  await expect(graph).toHaveAttribute('data-layout-motion', 'settled', {
    timeout: 20000,
  });
  const frame = await graph.getAttribute('data-layout-frame');
  await page.waitForTimeout(300);
  expect(await graph.getAttribute('data-layout-frame')).toBe(frame);
  await page.locator('#follow-edges').check();
  await expect
    .poll(async () => Number(await graph.getAttribute('data-layout-frame')))
    .toBeGreaterThan(Number(frame));
  await expect(graph).toHaveAttribute('data-layout-motion', 'settled', {
    timeout: 20000,
  });
  const settledAgain = await graph.getAttribute('data-layout-frame');
  await page.locator('#colour').selectOption('creativity');
  await page.locator('#next-round').click();
  await page.waitForTimeout(150);
  expect(await graph.getAttribute('data-layout-frame')).toBe(settledAgain);
});
