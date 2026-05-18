import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const shotsDir = path.join(process.cwd(), 'screenshots');

/**
 * Captures PNGs for docs / demos. Run from repo root:
 *   npm run build && npm run screenshots
 */
test.describe('screenshots', () => {
  test('inventory, vehicle detail, Risk tab', async ({ page }) => {
    fs.mkdirSync(shotsDir, { recursive: true });

    await page.goto('/');
    await page.waitForResponse((r) => r.url().includes('/api/vehicles?') && r.status() === 200);
    await expect(page.getByTestId('inventory-grid')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shotsDir, '01-inventory.png'), fullPage: true });

    const grid = page.getByTestId('inventory-grid');
    const firstLink = grid.getByRole('link').first();
    await expect(firstLink).toBeVisible();
    const href = await firstLink.getAttribute('href');
    expect(href).toMatch(/^\/v\//);
    const vehicleId = href!.replace('/v/', '');

    const detailRes = page.waitForResponse(
      (r) => r.url().endsWith(`/api/vehicles/${vehicleId}`) && r.status() === 200,
    );
    const intelRes = page.waitForResponse(
      (r) => r.url().includes(`/api/vehicles/${vehicleId}/intel`) && r.status() === 200,
      { timeout: 25_000 },
    );

    await firstLink.click();
    await detailRes;
    await intelRes;

    await expect(page).toHaveURL(new RegExp(`/v/${vehicleId}$`));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(shotsDir, '02-vehicle-overview.png'), fullPage: true });

    const assessmentRes = page.waitForResponse(
      (r) => r.url().includes(`/api/agent/purchase-assessment/${vehicleId}`) && r.status() === 200,
      { timeout: 25_000 },
    );
    await page.getByRole('tab', { name: 'Risk' }).click();
    await assessmentRes;
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(shotsDir, '03-vehicle-risk-tab.png'), fullPage: true });
  });
});
