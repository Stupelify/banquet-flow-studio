import { AlertTriangle } from 'lucide-react';
import FormPromptModal from '@/components/FormPromptModal';
import { locationFor, locationStyle, statusClass } from '../_lib/event-styles';
import { STATUS_LABEL } from '../copy';

export type SelectedEvent = {
  kind: 'booking' | 'enquiry' | 'google';
  id: string;
  title: string;
  kicker: string;
  status: string;
  banquetName?: string;
  dateLabel: string;
  timeLabel: string;
  customer?: string;
  guests?: number;
  revenue?: number;
  pencilExpiresAt?: string | null;
  source: 'software' | 'google';
  htmlLink?: string;
  conflict: boolean;
};

export default function EventDetailPanel({
  open,
  event,
  banquetIndex,
  canEditBooking,
  onClose,
  onOpen,
}: {
  open: boolean;
  event: SelectedEvent | null;
  banquetIndex: Map<string, number>;
  canEditBooking: boolean;
  onClose: () => void;
  onOpen: (event: SelectedEvent) => void;
}) {
  if (!event) return null;
  const loc = locationFor(event.banquetName, banquetIndex);
  const shape = statusClass(event.status);
  const openLabel =
    event.kind === 'google' ? 'Open in Google' : event.kind === 'enquiry' ? 'Open enquiry' : 'Open booking';
  const canOpen = event.kind !== 'booking' || canEditBooking;

  const rows: Array<[string, string]> = [
    ['Date', event.dateLabel],
    ['Time', event.timeLabel],
  ];
  if (event.customer) rows.push(['Customer', event.customer]);
  if (event.guests) rows.push(['Guests', String(event.guests)]);
  rows.push(['Source', event.source === 'google' ? 'Google Calendar' : 'BIKA_OPS']);
  if (event.revenue && event.revenue > 0) {
    rows.push(['Revenue', `₹${event.revenue.toLocaleString('en-IN')}`]);
  }
  if (shape === 'pencil' && event.pencilExpiresAt) {
    rows.push([
      'Pencil expires',
      new Date(event.pencilExpiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    ]);
  }

  return (
    <FormPromptModal
      open={open}
      title={event.title}
      onClose={onClose}
      widthClass="max-w-lg"
      headerContent={
        <div className="min-w-0">
          <div className="ncal-p-kicker">{event.kicker}</div>
          <span className="block truncate text-base font-semibold text-[var(--text-1)]">
            {event.title}
          </span>
        </div>
      }
    >
      <div>
        {event.conflict && (
          <div className="ncal-p-conflict">
            <AlertTriangle size={14} aria-hidden="true" />
            Overlaps another booking in this hall
          </div>
        )}
        <span className="ncal-p-badge" style={locationStyle(loc)}>
          <i />
          {STATUS_LABEL[shape] ?? event.status}
        </span>
        <dl className="ncal-p-details">
          {rows.map(([label, value]) => (
            <div className="ncal-p-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="ncal-p-actions">
        <button type="button" className="ncal-p-sec-btn" onClick={onClose}>
          Close
        </button>
        {canOpen && (
          <button type="button" className="ncal-p-pri-btn" onClick={() => onOpen(event)}>
            {openLabel}
          </button>
        )}
      </div>
    </FormPromptModal>
  );
}
