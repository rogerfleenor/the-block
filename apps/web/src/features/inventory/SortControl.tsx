interface SortControlProps {
  value: string;
  onChange: (next: string) => void;
}

const OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'ending_soon', label: 'Ending soon' },
  { id: 'price_asc', label: 'Price ↑' },
  { id: 'price_desc', label: 'Price ↓' },
  { id: 'newest', label: 'Newest' },
  { id: 'most_bids', label: 'Most bids' },
];

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-neutral-500">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        {OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
