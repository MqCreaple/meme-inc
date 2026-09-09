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
  await expect(page.locator('#person-title')).toHaveText('Person 001');
  await expect(page.locator('#person-details meter')).toHaveCount(18);
  await page
    .getByRole('button', { name: 'Launch draft to this person' })
    .click();
  await expect(page.locator('#compute')).toHaveText('16/100');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('#launch')).toBeDisabled();
  await page.locator('#recommendation').selectOption('discovery');
  await expect(page.locator('#message')).toContainText('priorities updated');
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
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
test('desktop initial view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.locator('#legend span')).toHaveCount(8);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
});
