import { expect, test } from '@playwright/test';

/**
 * The Phase 2 integration smoke:
 *   browse → detail → intel → bid → live update
 *
 * Runs against the built Fastify server on :4000 (NOT MSW).
 * Proves the contract holds end-to-end across both engineer agents.
 */
test.describe('smoke: buyer happy path', () => {
  test('browse → detail → intel → bid', async ({ page, request }) => {
    // ─── health check first ──────────────────────────────────────────────────
    const health = await request.get('/api/health');
    expect(health.ok()).toBe(true);

    // ─── inventory page loads ────────────────────────────────────────────────
    const inventoryResponse = page.waitForResponse(
      (r) => r.url().includes('/api/vehicles?') && r.status() === 200,
    );
    await page.goto('/');
    await inventoryResponse;

    const grid = page.getByTestId('inventory-grid');
    await expect(grid).toBeVisible();

    // ─── click first vehicle card → detail page ──────────────────────────────
    const firstLink = grid.getByRole('link').first();
    await expect(firstLink).toBeVisible();
    const href = await firstLink.getAttribute('href');
    expect(href).toMatch(/^\/v\//);
    const vehicleId = href!.replace('/v/', '');

    // Register both detail + intel listeners BEFORE the click. The intel
    // request fires from the lazily-mounted IntelTabs as soon as the route
    // resolves, so we need to be listening before navigation starts.
    const detailResponse = page.waitForResponse(
      (r) => r.url().endsWith(`/api/vehicles/${vehicleId}`) && r.status() === 200,
    );
    const intelResponsePromise = page.waitForResponse(
      (r) => r.url().includes(`/api/vehicles/${vehicleId}/intel`) && r.status() === 200,
      { timeout: 20_000 },
    );
    await firstLink.click();
    await detailResponse;
    await expect(page).toHaveURL(new RegExp(`/v/${vehicleId}$`));

    const intelResponse = await intelResponsePromise;
    const intelJson = await intelResponse.json();
    expect(intelJson.results.length).toBeGreaterThan(0);

    // ─── place a bid via the form ───────────────────────────────────────────
    // VehiclePage renders BOTH a desktop and a mobile BidPanel; both contain
    // an input with id `bid-amount-<vid>`. Filter to the visible one.
    const bidInput = page.locator(`input#bid-amount-${vehicleId}`).filter({ visible: true }).first();
    await expect(bidInput).toBeVisible();
    const minNext = Number(await bidInput.getAttribute('min'));
    expect(minNext).toBeGreaterThan(0);

    const submittedAmount = minNext;
    await bidInput.fill(String(submittedAmount));

    const bidResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/vehicles/${vehicleId}/bids`) &&
        r.request().method() === 'POST' &&
        r.status() === 200,
    );
    await page
      .getByRole('button', { name: /place bid/i })
      .filter({ visible: true })
      .first()
      .click();
    const bidResult = await (await bidResponse).json();

    expect(bidResult.currentBid).toBe(submittedAmount);
    expect(bidResult.bid.amount).toBe(submittedAmount);
  });

  test('agent: invoke returns suggestion for "bid <amount>"', async ({ request }) => {
    const list = await request.get('/api/vehicles?limit=1');
    expect(list.ok()).toBe(true);
    const { items } = await list.json();
    expect(items.length).toBe(1);
    const vehicleId = items[0].id;

    const vehicleFetch = await request.get(`/api/vehicles/${vehicleId}`);
    const vehicle = await vehicleFetch.json();
    const target =
      Math.max(vehicle.starting_bid, vehicle.current_bid) + 500;

    const invoke = await request.post('/api/agent/invoke', {
      data: {
        utterance: `bid ${target}`,
        context: { vehicleId },
      },
    });
    expect(invoke.ok()).toBe(true);
    const body = await invoke.json();
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(body.suggestions.length).toBeGreaterThan(0);
    expect(body.suggestions[0].kind).toBe('placeBid');
    expect(body.suggestions[0].amount).toBe(target);
    expect(body.suggestions[0].vehicleId).toBe(vehicleId);
  });

  test('providers catalog reachable', async ({ request }) => {
    const res = await request.get('/api/providers');
    expect(res.ok()).toBe(true);
    const { providers } = await res.json();
    expect(providers.length).toBeGreaterThanOrEqual(30);
    const categories = new Set(providers.map((p: { category: string }) => p.category));
    expect(categories.has('valuation')).toBe(true);
    expect(categories.has('history')).toBe(true);
    expect(categories.has('safety')).toBe(true);
    expect(categories.has('social')).toBe(true);
  });
});
