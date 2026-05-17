import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { BidPanel } from '@/features/bidding/BidPanel';
import { allVehicles } from '@/mocks/fixtures';
import { useBidStore } from '@/state/bidStore';

function renderPanel(vehicleId: string) {
  const v = allVehicles().find((x) => x.id === vehicleId)!;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BidPanel vehicle={v} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('bid flow (MSW)', () => {
  beforeEach(() => {
    useBidStore.setState({ optimistic: {}, lastToast: null });
  });

  it('places a valid bid against MSW and updates the optimistic state', async () => {
    const user = userEvent.setup();
    const v = allVehicles()[0]!;
    renderPanel(v.id);
    const input = await screen.findByLabelText(/your bid/i);
    const minNext = v.current_bid + Math.max(100, Math.ceil(v.current_bid * 0.01));
    const bidAmount = minNext + 500;
    await user.clear(input);
    await user.type(input, String(bidAmount));
    const placeBtn = screen.getByRole('button', { name: /place bid/i });
    await user.click(placeBtn);
    await waitFor(() => {
      expect(useBidStore.getState().lastToast?.kind).toBe('success');
    });
  });
});
