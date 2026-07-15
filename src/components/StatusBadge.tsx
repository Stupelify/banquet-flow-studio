
type StatusBadgeProps = {
  status: string;
  size?: 'sm' | 'md';
};

const STATUS_CONFIG = {
  confirmed: {
    label: 'Confirmed',
    cssClass: 'status-confirmed',
  },
  pending: {
    label: 'Pending',
    cssClass: 'status-pending',
  },
  cancelled: {
    label: 'Cancelled',
    cssClass: 'status-cancelled',
  },
  quotation: {
    label: 'Quotation',
    cssClass: 'status-quotation',
  },
  pencil: {
    label: 'Pencil',
    cssClass: 'status-pencil',
  },
  enquiry: {
    label: 'Enquiry',
    cssClass: 'status-enquiry',
  },
} as const;

const ROW_STRIPE_CLASSES = new Set(['confirmed', 'pencil', 'quotation', 'enquiry', 'cancelled']);

export function getRowStatusClass(status: string): string {
  const normalized = (status || '').trim().toLowerCase();
  return ROW_STRIPE_CLASSES.has(normalized) ? `st-${normalized}` : '';
}

function capitalizeStatus(status: string): string {
  if (!status) return 'Pending';
  return status
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export default function StatusBadge({
  status,
  size = 'md',
}: StatusBadgeProps) {
  const normalizedStatus = status.trim().toLowerCase();
  const config =
    STATUS_CONFIG[normalizedStatus as keyof typeof STATUS_CONFIG] ?? {
      label: capitalizeStatus(status),
      cssClass: 'status-pending',
    };

  return (
    <span
      className={`status-pill ${config.cssClass} ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''
      }`}
    >
      <span className="status-dot" />
      {config.label}
    </span>
  );
}
