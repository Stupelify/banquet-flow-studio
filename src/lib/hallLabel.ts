type HallRef = {
  hall?: {
    name?: string | null;
    banquet?: { name?: string | null } | null;
  } | null;
};

/**
 * "Banquet / Hall" labels joined with commas. When the banquet and hall share
 * a name (single-hall venues like Divinity Pavilion) the name is shown once —
 * "Divinity Pavilion / Divinity Pavilion" reads as a bug.
 */
export function formatBookingHallNames(halls: HallRef[] | null | undefined): string {
  return (halls || [])
    .map(({ hall }) => {
      if (!hall) return null;
      const banquet = hall.banquet?.name?.trim() || '';
      const name = hall.name?.trim() || '';
      if (banquet && name && banquet.toLowerCase() === name.toLowerCase()) {
        return name;
      }
      return [banquet, name].filter(Boolean).join(' / ');
    })
    .filter(Boolean)
    .join(', ');
}
