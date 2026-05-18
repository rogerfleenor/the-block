import { buildPurchaseAssessment } from '@block/shared';

import { getFacts } from './facts.js';

export async function getPurchaseAssessment(vehicleId: string) {
  const computed = await getFacts(vehicleId);
  if (!computed) return undefined;
  return buildPurchaseAssessment({
    vehicleId,
    vehicle: computed.vehicle,
    facts: computed.facts,
    recommendedValue: computed.recommended?.value,
  });
}
