import React from 'react';

export function KpiCardSkeleton() {
  return (
    <div className="kpi-grid">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="kpi-card">
          <div className="skeleton" style={{ height: 10, width: 90, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 26, width: 140, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 16, width: 80 }} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="py-3 px-4">
                  <div
                    className="skeleton"
                    style={{ height: 12, width: `${60 + ((colIdx + rowIdx) % 4) * 10}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Matches bookings desktop table: function, customer, date, guests, hall, status, amount (+ optional actions). */
export function BookingsTableSkeleton({
  rows = 8,
  showActions = false,
}: {
  rows?: number;
  showActions?: boolean;
}) {
  return <TableSkeleton rows={rows} columns={showActions ? 8 : 7} />;
}

/** Matches payments desktop table column count. */
export function PaymentsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return <TableSkeleton rows={rows} columns={6} />;
}

/** Toolbar + month grid placeholder for calendar initial load. */
export function CalendarPageSkeleton() {
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="ncal-root" aria-hidden="true" style={{ minHeight: 560 }}>
      <div className="ncal-toolbar">
        <div className="skeleton" style={{ height: 18, width: 140, borderRadius: 6 }} />
        <div className="skeleton ncal-mobile-hide" style={{ height: 12, width: 96, borderRadius: 6 }} />
        <div className="ncal-t-spacer" />
        <div className="skeleton ncal-mobile-hide" style={{ height: 26, width: 190, borderRadius: 6 }} />
        <div className="ncal-t-seg ncal-mobile-hide">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ height: 22, width: 54, borderRadius: 4 }} />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="skeleton" style={{ height: 26, width: idx === 0 ? 58 : 26, borderRadius: 6 }} />
        ))}
      </div>
      <div className="ncal-board">
        <div className="ncal-board-inner" style={{ minWidth: 0 }}>
          <div className="ncal-month-board" style={{ minHeight: 512 }}>
            <div className="ncal-month-col-headers">
              {weekdays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="ncal-month-grid">
              {Array.from({ length: 42 }).map((_, dayIdx) => (
                <div key={dayIdx} className="ncal-month-day">
                  <div className="skeleton" style={{ height: 14, width: 22, borderRadius: 4, margin: '0 0 8px 2px' }} />
                  <div className="ncal-month-lines">
                    {Array.from({ length: dayIdx % 3 === 0 ? 1 : 2 }).map((__, lineIdx) => (
                      <div
                        key={lineIdx}
                        className="skeleton"
                        style={{
                          height: 13,
                          width: `${lineIdx === 0 ? 76 : 58}%`,
                          borderRadius: 4,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: 8,
      }}
    >
      {Array.from({ length: 35 }).map((_, idx) => (
        <div key={idx} className="card" style={{ padding: 12, minHeight: 72 }}>
          <div className="skeleton" style={{ height: 10, width: 36, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 8, width: '80%' }} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="card" style={{ padding: 20 }}>
          <div className="skeleton" style={{ height: 14, width: 160, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 10, width: '80%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 10, width: '65%' }} />
        </div>
      ))}
    </div>
  );
}
