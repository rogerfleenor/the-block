import { Tag } from '@/ui/Tag';

interface ReserveBadgeProps {
  reserve: number | null;
  currentBid: number;
}

export function ReserveBadge({ reserve, currentBid }: ReserveBadgeProps) {
  if (reserve === null) return <Tag tone="success">No reserve</Tag>;
  const met = currentBid >= reserve;
  return met ? <Tag tone="success">Reserve met</Tag> : <Tag tone="neutral">Reserve not met</Tag>;
}
