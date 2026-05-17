import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentSuggestion } from '@block/shared';

import { ConfirmAction } from '@/features/agent/ConfirmAction';
import { useAgentStore } from '@/state/agentStore';
import { useBidStore } from '@/state/bidStore';


function makeSuggestion(): AgentSuggestion {
  return {
    id: `sug_${Math.random().toString(36).slice(2, 8)}`,
    kind: 'placeBid',
    vehicleId: 'v1',
    amount: 23200,
    rationale: 'AI rationale',
    sources: ['KBB'],
    confirmWindowMs: 5_000,
    ts: new Date().toISOString(),
  };
}

describe('agentStore + ConfirmAction', () => {
  beforeEach(() => {
    useAgentStore.setState({ active: null, open: false });
    useBidStore.setState({ optimistic: {}, lastToast: null });
    vi.useRealTimers();
  });

  it('pushSuggestion creates an active suggestion with a deadline window', () => {
    const before = Date.now();
    useAgentStore.getState().pushSuggestion(makeSuggestion());
    const active = useAgentStore.getState().active!;
    expect(active.suggestion.amount).toBe(23200);
    expect(active.deadlineMs - before).toBeGreaterThanOrEqual(4_999);
    expect(active.deadlineMs - before).toBeLessThanOrEqual(5_100);
  });

  it('renders the confirm card when a suggestion is active and auto-cancels at deadline', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onPlace = vi.fn().mockResolvedValue(undefined);
    useAgentStore.getState().pushSuggestion(makeSuggestion());
    render(<ConfirmAction onPlaceBid={onPlace} testTickMs={50} />);
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(6_000);
    expect(useAgentStore.getState().active).toBeNull();
    expect(onPlace).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('explicit confirm dispatches placeBid via the injected handler', async () => {
    const user = userEvent.setup();
    const onPlace = vi.fn().mockResolvedValue(undefined);
    useAgentStore.getState().pushSuggestion(makeSuggestion());
    render(<ConfirmAction onPlaceBid={onPlace} testTickMs={100} />);
    const confirm = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirm);
    expect(onPlace).toHaveBeenCalledTimes(1);
    expect(useAgentStore.getState().active).toBeNull();
  });
});
