import { Tag } from '@/ui/Tag';

interface ReserveBadgeProps {
  reserve: number | null;
  currentBid: number;
  className?: string;
}

export function ReserveBadge({ reserve, currentBid, className }: ReserveBadgeProps) {
  if (reserve === null)
    return (
      <Tag tone="success" className={className}>
        No reserve
      </Tag>
    );
  const met = currentBid >= reserve;
  return met ? (
    <Tag tone="success" className={className}>
      Reserve met
    </Tag>
  ) : (
    <Tag tone="neutral" className={className}>
      Reserve not met
    </Tag>
  );
}
