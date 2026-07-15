
import { Link } from '@/lib/router-compat';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { TableSkeleton } from '@/components/Skeletons';
import Button from '@/components/ui/Button';
import CustomerDetailPanel from './CustomerDetailPanel';
import {
  CUSTOMERS_PAGE_SIZE,
  customerInitials,
  type CustomerDetailData,
  type CustomerRow,
} from '../_lib/types';

interface ListProps {
  customers: CustomerRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (updater: (page: number) => number) => void;
  canViewCustomer: boolean;
  canEditCustomer: boolean;
  canDeleteCustomer: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Mobile card list with its pagination footer. */
export function CustomersMobileList({
  customers,
  totalCount,
  totalPages,
  currentPage,
  setCurrentPage,
  canViewCustomer,
  canEditCustomer,
  canDeleteCustomer,
  onEdit,
  onDelete,
}: ListProps) {
  return (
    <div className="md:hidden">
      <div className="mobile-card-list">
        {customers.map((customer) => (
          <div key={customer.id} className="mobile-card">
            <div className="mobile-card-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mobile-card-title">{customer.name}</div>
              </div>
            </div>
            <div className="mobile-card-row">
              <span className="mobile-card-label">Phone</span>
              <span className="mobile-card-value">
                {(customer.phoneCountryCode || '+91') + ' ' + customer.phone}
              </span>
            </div>
            {customer.email && (
              <div className="mobile-card-row">
                <span className="mobile-card-label">Email</span>
                <span className="mobile-card-value">{customer.email}</span>
              </div>
            )}
            {(customer.city || customer.state) && (
              <div className="mobile-card-row">
                <span className="mobile-card-label">Location</span>
                <span className="mobile-card-value">
                  {customer.city && customer.state
                    ? `${customer.city}, ${customer.state}`
                    : customer.city || customer.state}
                </span>
              </div>
            )}
            <div className="mobile-card-meta" style={{ marginTop: 8 }}>
              <span className="mobile-card-meta-item">
                {customer._count?.enquiries ?? 0} enquiries
              </span>
              <span className="mobile-card-meta-item">
                {customer._count?.bookings ?? 0} bookings
              </span>
            </div>
            <div className="mobile-card-actions">
              {canViewCustomer && (
                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className="mobile-card-action-btn"
                >
                  <Eye style={{ width: 14, height: 14 }} aria-hidden="true" />
                  View
                </Link>
              )}
              {canEditCustomer && (
                <button
                  type="button"
                  className="mobile-card-action-btn"
                  onClick={() => onEdit(customer.id)}
                >
                  <Edit style={{ width: 14, height: 14 }} aria-hidden="true" />
                  Edit
                </button>
              )}
              {canDeleteCustomer && (
                <button
                  type="button"
                  className="mobile-card-action-btn"
                  onClick={() => onDelete(customer.id)}
                  style={{ color: '#dc2626' }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {totalCount > CUSTOMERS_PAGE_SIZE && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-2)]">
            Showing {(currentPage - 1) * CUSTOMERS_PAGE_SIZE + 1}-
            {Math.min(currentPage * CUSTOMERS_PAGE_SIZE, totalCount)} of{' '}
            {totalCount} customers
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-[var(--text-2)]">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MasterDetailProps extends ListProps {
  selectedCustomerId: string | null;
  selectCustomer: (id: string) => void;
  selectedCustomerDetail: CustomerDetailData | null;
  selectedCustomerLoading: boolean;
}

/** Desktop master-detail split: roster on the left, full profile on the right. */
export function CustomersMasterDetail({
  customers,
  totalCount,
  totalPages,
  currentPage,
  setCurrentPage,
  canEditCustomer,
  canDeleteCustomer,
  onEdit,
  onDelete,
  selectedCustomerId,
  selectCustomer,
  selectedCustomerDetail,
  selectedCustomerLoading,
}: MasterDetailProps) {
  return (
    <div className="hidden md:flex" style={{ height: 640, border: '1px solid var(--border)', borderRadius: 'var(--radius, 12px)', overflow: 'hidden' }}>
      <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {customers.map((customer) => {
            const isSelected = selectedCustomerId === customer.id;
            return (
              <button
                key={customer.id}
                type="button"
                onClick={() => selectCustomer(customer.id)}
                className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 border-b border-[var(--border)] transition-colors ${
                  isSelected ? 'bg-primary-50 dark:bg-primary-500/10' : 'hover:bg-[var(--surface-2)]'
                }`}
                style={{ borderLeft: `2px solid ${isSelected ? 'var(--primary-600, #0d9488)' : 'transparent'}` }}
              >
                <div
                  className="flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ width: 34, height: 34, background: 'var(--surface-3, var(--surface-2))', color: 'var(--text-2)' }}
                >
                  {customerInitials(customer.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-1)] truncate">{customer.name}</p>
                  <p className="text-xs text-[var(--text-3)]">
                    {(customer.phoneCountryCode || '+91') + ' ' + customer.phone}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[11px] text-[var(--text-3)]">
                    {customer._count?.bookings ?? 0} bookings
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {totalCount > CUSTOMERS_PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[var(--border)]">
            <Button
              type="button"
              size="sm"
              className="text-xs px-2.5 py-1.5"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Prev
            </Button>
            <span className="text-xs text-[var(--text-3)]">
              {currentPage} / {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              className="text-xs px-2.5 py-1.5"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">
        {selectedCustomerLoading ? (
          <div className="py-6 px-6">
            <TableSkeleton rows={5} />
          </div>
        ) : selectedCustomerDetail ? (
          <CustomerDetailPanel
            customer={selectedCustomerDetail}
            canEdit={canEditCustomer}
            canDelete={canDeleteCustomer}
            onEdit={() => onEdit(selectedCustomerDetail.id)}
            onDelete={() => onDelete(selectedCustomerDetail.id)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-[var(--text-3)]">
            Select a customer
          </div>
        )}
      </div>
    </div>
  );
}
