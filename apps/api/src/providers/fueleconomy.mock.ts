import { makeFuelEconomyProvider } from './_fuelEconomy.js';

export const fueleconomyProvider = makeFuelEconomyProvider({
  name: 'fueleconomy',
  envFlag: 'FUELECONOMY_LIVE',
});
