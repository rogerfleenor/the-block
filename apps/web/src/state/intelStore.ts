import { create } from 'zustand';

import type { VehicleIntel } from '@block/shared';

interface IntelState {
  /** Cached intel keyed by vehicleId. Cleared on hard refresh. */
  byVehicle: Record<string, VehicleIntel | undefined>;
  dismissedRiskBanners: Record<string, boolean>;
}

interface IntelActions {
  set(vehicleId: string, intel: VehicleIntel): void;
  dismissRisk(vehicleId: string): void;
  clear(): void;
}

export const useIntelStore = create<IntelState & IntelActions>((set) => ({
  byVehicle: {},
  dismissedRiskBanners: {},
  set(vehicleId, intel) {
    set((state) => ({ byVehicle: { ...state.byVehicle, [vehicleId]: intel } }));
  },
  dismissRisk(vehicleId) {
    set((state) => ({
      dismissedRiskBanners: { ...state.dismissedRiskBanners, [vehicleId]: true },
    }));
  },
  clear() {
    set({ byVehicle: {}, dismissedRiskBanners: {} });
  },
}));
