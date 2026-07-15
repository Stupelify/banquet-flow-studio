import { Building2, IndianRupee, Users } from 'lucide-react';
import { format, addDays } from 'date-fns';

type Booking = {
  id: string;
  functionName: string;
  functionType: string;
  functionDate: string;
  functionTime: string;
  status: string;
  customer?: { name: string; phone: string } | null;
  packs?: Array<{
    startTime?: string | null;
    endTime?: string | null;
    hallIds?: string[];
  }>;
  halls?: Array<{ hallId: string }>;
};

interface HallCardProps {
  hall: {
    id: string;
    name: string;
    capacity: number;
    floatingCapacity?: number | null;
    basePrice?: number | null;
    rate?: string | null;
    photo?: string | null;
    banquet?: { name: string } | null;
  };
  startDate: Date;
  bookings: Booking[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function HallCard({
  hall,
  startDate,
  bookings,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: HallCardProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  // Determine if there is a booking for a specific date
  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter((b) => {
      if (b.functionDate.startsWith(dateStr)) {
        // check if this booking contains this hall
        const hasHall = b.halls?.some((h) => h.hallId === hall.id) || b.packs?.some((p) => p.hallIds?.includes(hall.id));
        return hasHall;
      }
      return false;
    });
  };

  const price = hall.basePrice ?? hall.rate ?? 0;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'box-shadow 0.15s',
      }}
      className="hall-card"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 10,
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {hall.photo ? (
            <img
              src={hall.photo}
              alt={hall.name}
              loading="lazy"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Building2 size={24} style={{ color: 'var(--text-4)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>{hall.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-4)' }}>{hall.banquet?.name || 'No Banquet'}</div>
        </div>
        {(canEdit || canDelete) && (
          <div style={{ display: 'flex', gap: 6 }}>
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                style={{ fontSize: 12, color: 'var(--teal-600)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={14} style={{ color: 'var(--text-4)' }} />
          {hall.capacity}{hall.floatingCapacity ? ` - ${hall.floatingCapacity}` : ''} pax
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
          <IndianRupee size={12} />
          {typeof price === 'number' ? price.toLocaleString('en-IN') : price || 'N/A'}
        </div>
      </div>

      {/* 7-Day Occupancy Strip */}
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-4)', marginBottom: 8 }}>
          7-Day Occupancy
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {days.map((date, i) => {
            const dayBookings = getBookingsForDate(date);
            const isOccupied = dayBookings.length > 0;
            // check if confirmed
            const isConfirmed = dayBookings.some((b) => b.status === 'confirmed');
            
            let bg = 'var(--surface-2)';
            let title = 'Available';
            
            if (isOccupied) {
              bg = isConfirmed ? 'var(--teal-500)' : '#f59e0b';
              title = dayBookings.map((b) => `${b.functionName} (${b.functionTime || 'N/A'}) - ${b.status}`).join('\n');
            }

            return (
              <div
                key={i}
                title={`${format(date, 'MMM d')}: ${title}`}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 6,
                  background: bg,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isOccupied ? 'pointer' : 'default',
                  border: isOccupied ? 'none' : '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: isOccupied ? 'rgba(255,255,255,0.9)' : 'var(--text-4)' }}>
                  {format(date, 'EEE')}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: isOccupied ? 'white' : 'var(--text-3)' }}>
                  {format(date, 'd')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
