export default function BookingTermsSection({
  compact = false,
  hideTitle = false,
}: {
  compact?: boolean;
  hideTitle?: boolean;
}) {
  const items = [
    '30% advance at booking. Balance payment to be completed at least 4 days before the event.',
    'Extra plates above expected guests are strictly chargeable.',
    'No menu modifications are entertained within 3 days of the event date.',
    'Advance booking money may be forfeited on cancellation, subject to company discretion.',
    'Sound or music after 10:15 PM is not permissible.',
  ];

  return (
    <section
      className={`rounded-2xl border border-[var(--border-2)] bg-[var(--surface-2)] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {!hideTitle && (
        <h3
          className={`font-semibold text-[var(--text-1)] ${compact ? 'text-sm mb-1.5' : 'text-lg mb-2'}`}
        >
          Terms & Conditions
        </h3>
      )}
      <ul
        className={`list-disc space-y-1 pl-5 text-[var(--text-2)] ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
