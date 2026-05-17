import type { Vehicle } from '@block/shared';

import { formatKm } from '@/lib/format';


interface SpecsProps {
  vehicle: Vehicle;
}

export function Specs({ vehicle }: SpecsProps) {
  const rows: Array<[string, string]> = [
    ['Year / make / model', `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`],
    ['Body / drivetrain', `${vehicle.body_style} · ${vehicle.drivetrain}`],
    ['Engine / transmission', `${vehicle.engine} · ${vehicle.transmission}`],
    ['Odometer', formatKm(vehicle.odometer_km)],
    ['Fuel', vehicle.fuel_type],
    ['Exterior / interior', `${vehicle.exterior_color} / ${vehicle.interior_color}`],
    ['Location', `${vehicle.city}, ${vehicle.province}`],
    ['Title', vehicle.title_status],
    ['Lot / VIN', `${vehicle.lot} · ${vehicle.vin}`],
  ];
  return (
    <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-neutral-500">{k}</dt>
          <dd className="text-neutral-900 dark:text-neutral-100">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
