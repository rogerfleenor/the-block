import { makeFuelEconomyProvider } from './_fuelEconomy.js';

export const epaGreenProvider = makeFuelEconomyProvider({
  name: 'epaGreen',
  envFlag: 'EPA_GREEN_LIVE',
});
