import { TravelSegment } from '@/types/travel';

// Shared logic to determine primary location for a step
export function determinePrimaryLocation(segments: TravelSegment[]): string {
  if (!segments || segments.length === 0) return '';

  const isValidAddress = (address?: string): boolean => {
    if (!address) return false;
    const trimmed = address.trim();
    if (trimmed.length < 3) return false;
    // Exclude airport code patterns (e.g., LIS-RAI) or standalone IATA codes
    if (/^[A-Z]{3}-[A-Z]{3}$/.test(trimmed)) return false;
    if (/^[A-Z]{3}$/.test(trimmed)) return false;
    return true;
  };

  const withValidAddress = segments.filter(s => isValidAddress(s.address));

  const durationDays = (s: TravelSegment): number => {
    const parse = (d?: string) => (d ? new Date(d) : undefined);
    const start = parse(s.start_date);
    const end = parse(s.end_date);

    const isValidDate = (d?: Date) => !!d && !isNaN(d.getTime());

    if (isValidDate(start) && isValidDate(end)) {
      const sDate = new Date(start!.getFullYear(), start!.getMonth(), start!.getDate());
      const eDate = new Date(end!.getFullYear(), end!.getMonth(), end!.getDate());
      const diff = Math.round((eDate.getTime() - sDate.getTime()) / 86400000) + 1; // inclusive
      return diff > 0 ? diff : 0;
    }
    if (isValidDate(start)) {
      // Consider a single-day segment as 1 day
      return 1;
    }
    return 0;
  };

  if (withValidAddress.length === 0) {
    // No valid addresses → fallback to first available address
    const fb = segments.find(s => s.address && s.address.trim());
    return fb?.address?.trim() || '';
  }

  const maxDur = Math.max(...withValidAddress.map(durationDays));
  const candidates = withValidAddress.filter(s => durationDays(s) === maxDur);

  if (candidates.length === 1) {
    return candidates[0].address!.trim();
  }

  // Tie or no clear longest: prefer a hotel anywhere in the step
  const hotel = segments.find(s => s.segment_type === 'hotel' && isValidAddress(s.address));
  if (hotel) return hotel.address!.trim();

  // Final fallback: earliest valid address by start_date
  const earliest = withValidAddress
    .slice()
    .sort((a, b) => {
      const aTime = a.start_date ? new Date(a.start_date).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.start_date ? new Date(b.start_date).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })[0];

  return earliest?.address?.trim() || '';
}
