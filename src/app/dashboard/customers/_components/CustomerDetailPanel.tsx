
import { Edit, Star, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { formatDateCompact, formatDateDDMMYYYY } from '@/lib/date';
import { formatINR } from '@/lib/format';
import { customerInitials, type CustomerDetailData } from '../_lib/types';

function CustomerStars({ rating }: { rating?: string | null }) {
  const n = Number(rating || 0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= n ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </span>
  );
}

function CustomerDetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-4)]">{label}</p>
      <p className="text-sm text-[var(--text-1)] mt-0.5">{value || '—'}</p>
    </div>
  );
}

export default function CustomerDetailPanel({
  customer,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  customer: CustomerDetailData;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const bookings = customer.bookings || [];
  const lifetimeValue = bookings.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const altPhone = customer.alterPhone || customer.alternatePhone;
  const location = [customer.city, customer.state].filter(Boolean).join(', ');

  return (
    <div>
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 rounded-full flex items-center justify-center text-base font-semibold text-white"
            style={{ width: 52, height: 52, background: 'var(--primary-600, #0d9488)' }}
          >
            {customerInitials(customer.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-1)]">{customer.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <CustomerStars rating={customer.rating} />
              <span className="text-xs text-[var(--text-3)]">
                {customer.visitCount ?? 0} visits
                {customer.occupation ? ` · ${customer.occupation}` : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button type="button" className="btn btn-secondary text-xs px-2.5 py-1.5" onClick={onEdit}>
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="btn btn-secondary text-xs px-2.5 py-1.5"
                style={{ color: '#dc2626' }}
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          {[
            ['Lifetime value', formatINR(lifetimeValue)],
            ['Bookings', String(bookings.length)],
            ['Priority', `${customer.priority ?? 3}/5`],
            ['Member since', formatDateDDMMYYYY(customer.createdAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-4)]">{k}</p>
              <p className="text-base font-semibold text-[var(--text-1)] mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 px-6 py-5">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Contact</h3>
          <div className="grid grid-cols-2 gap-3">
            <CustomerDetailField label="Phone" value={`${customer.phoneCountryCode || '+91'} ${customer.phone}`} />
            <CustomerDetailField label="Alt phone" value={altPhone} />
            <CustomerDetailField label="Email" value={customer.email} />
            <CustomerDetailField label="City" value={location || customer.city} />
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Profile</h3>
          <div className="grid grid-cols-2 gap-3">
            <CustomerDetailField label="Community" value={customer.caste} />
            <CustomerDetailField
              label="DOB"
              value={customer.dateOfBirth ? formatDateDDMMYYYY(customer.dateOfBirth) : null}
            />
            <CustomerDetailField
              label="Anniversary"
              value={customer.anniversary ? formatDateDDMMYYYY(customer.anniversary) : null}
            />
            <CustomerDetailField label="Company" value={customer.companyName} />
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Tax</h3>
          <div className="grid grid-cols-2 gap-3">
            <CustomerDetailField label="GST" value={customer.gstNumber} />
            <CustomerDetailField label="PAN" value={customer.panNumber} />
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Referrals</h3>
          <div className="grid grid-cols-2 gap-3">
            <CustomerDetailField label="Referred by" value={customer.referredBy?.name || 'Direct'} />
            <CustomerDetailField
              label="Referred"
              value={
                customer.referrals && customer.referrals.length
                  ? customer.referrals.map((r) => r.name).join(', ')
                  : 'None'
              }
            />
          </div>
        </section>
      </div>

      {customer.notes && (
        <div className="px-6 pb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-2">Notes</h3>
          <p className="text-sm text-[var(--text-2)] leading-relaxed bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 whitespace-pre-wrap">
            {customer.notes}
          </p>
        </div>
      )}

      <div className="px-6 pb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-2">Booking history</h3>
        <div className="card overflow-hidden p-0">
          {bookings.length ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="data-table">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-2.5 px-4 text-xs font-semibold text-[var(--text-3)]">Function</th>
                      <th className="py-2.5 px-4 text-xs font-semibold text-[var(--text-3)]">Date</th>
                      <th className="py-2.5 px-4 text-xs font-semibold text-[var(--text-3)] text-right">Total</th>
                      <th className="py-2.5 px-4 text-xs font-semibold text-[var(--text-3)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2.5 px-4 text-sm text-[var(--text-1)]">{b.functionName}</td>
                        <td className="py-2.5 px-4 text-sm text-[var(--text-2)] whitespace-nowrap">{formatDateCompact(b.functionDate)}</td>
                        <td className="py-2.5 px-4 text-sm text-right font-medium text-[var(--text-1)]">
                          {formatINR(b.grandTotal || 0)}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden mobile-card-list">
                {bookings.map((b) => (
                  <div key={b.id} className="mobile-card">
                    <div className="mobile-card-header">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="mobile-card-title">{b.functionName}</div>
                        <div className="mobile-card-subtitle">{formatDateCompact(b.functionDate)}</div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Total</span>
                      <span className="mobile-card-value">{formatINR(b.grandTotal || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-[var(--text-4)]">No bookings yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
