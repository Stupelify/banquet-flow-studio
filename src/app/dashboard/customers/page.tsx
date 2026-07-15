
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Filter, Plus, Search, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';
import Toolbar from '@/components/Toolbar';
import FloatingActionButton from '@/components/FloatingActionButton';
import { CTA_NEW_CUSTOMER } from '@/lib/copy';
import EmptyState from '@/components/EmptyState';
import FilterPanel from '@/components/FilterPanel';
import { TableSkeleton } from '@/components/Skeletons';
import Button from '@/components/ui/Button';
import { useCustomersList } from './_hooks/useCustomersList';
import { useCustomerForm } from './_hooks/useCustomerForm';
import CustomerFormModal from './_components/CustomerFormModal';
import { CustomersMasterDetail, CustomersMobileList } from './_components/CustomersList';
import { initialColumnSearch } from './_lib/types';

export default function CustomersPage() {
  const { user } = useAuthStore();
  const permissionSet = useMemo(() => user?.permissions || [], [user?.permissions]);
  const canViewCustomer = hasAnyPermission(permissionSet, ['view_customer', 'manage_customers']);
  const canAddCustomer = hasAnyPermission(permissionSet, ['add_customer', 'manage_customers']);
  const canEditCustomer = hasAnyPermission(permissionSet, ['edit_customer', 'manage_customers']);
  const canDeleteCustomer = hasAnyPermission(permissionSet, ['delete_customer', 'manage_customers']);

  const list = useCustomersList({ canViewCustomer });
  const form = useCustomerForm({ useServer: list.useServer, onSaved: list.loadCustomers });
  const [showFilters, setShowFilters] = useState(false);

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete this customer?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;

    try {
      await api.deleteCustomer(id);
      toast.success('Customer deleted successfully');
      await list.loadCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const activeFilterCount = Object.values(list.columnSearch).filter(Boolean).length;

  const listProps = {
    customers: list.paginatedCustomers,
    totalCount: list.totalCount,
    totalPages: list.totalPages,
    currentPage: list.currentPage,
    setCurrentPage: list.setCurrentPage,
    canViewCustomer,
    canEditCustomer,
    canDeleteCustomer,
    onEdit: (id: string) => void form.openEditPrompt(id),
    onDelete: handleDelete,
  };

  return (
    <div className="ops-route ops-list-route">
      <Toolbar
        title="Customers"
        stats={[
          { label: 'Total', value: list.totalCount },
          { label: 'Active filters', value: activeFilterCount },
        ]}
        actions={
          canAddCustomer ? (
            <Button
              type="button"
              variant="primary"
              onClick={form.openCreatePrompt}
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
              icon={<Plus className="w-4 h-4" />}
            >
              Add Customer
            </Button>
          ) : null
        }
      />

      {!canViewCustomer && (
        <div className="card border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
          You do not have permission to view customers.
        </div>
      )}

      <CustomerFormModal
        form={form}
        useServer={list.useServer}
        referrerOptions={list.referrerOptions}
      />

      <div className="card">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-4)]" />
            <input
              type="text"
              value={list.globalSearch}
              onChange={(e) => list.setGlobalSearch(e.target.value)}
              placeholder="Overall search across all customer columns..."
              className="input pl-10 pr-10"
            />
            {list.globalSearch && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={list.clearSearch}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-4)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <button type="button" className="btn btn-secondary flex items-center justify-center h-[42px] px-3 md:px-4" onClick={() => setShowFilters(true)}>
            <Filter className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ops-filter-count">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="card">
        {!canViewCustomer ? (
          <EmptyState
            icon={Users}
            variant="page"
            title="No data available"
            description="You do not have access to view customers."
          />
        ) : list.loading ? (
          <div className="py-6">
            <TableSkeleton rows={8} />
          </div>
        ) : list.totalCount === 0 ? (
          <EmptyState
            icon={list.globalSearch ? Search : Users}
            variant={
              list.globalSearch
                ? 'search'
                : activeFilterCount > 0
                  ? 'filter'
                  : 'page'
            }
            title={
              list.globalSearch
                ? 'No customers match your search'
                : activeFilterCount > 0
                  ? 'No matches'
                  : 'No customers found'
            }
            description={
              list.globalSearch || activeFilterCount > 0
                ? `"${list.globalSearch || Object.values(list.columnSearch).find(Boolean)}" returned no results.`
                : 'Add your first customer to get started.'
            }
            action={
              list.globalSearch
                ? { label: 'Clear search', onClick: () => list.setGlobalSearch('') }
                : activeFilterCount > 0
                  ? { label: 'Clear filters', onClick: () => list.setColumnSearch(initialColumnSearch) }
                  : canAddCustomer
                    ? { label: CTA_NEW_CUSTOMER, onClick: form.openCreatePrompt }
                    : undefined
            }
          />
        ) : (
          <>
            <CustomersMobileList {...listProps} />
            <CustomersMasterDetail
              {...listProps}
              selectedCustomerId={list.selectedCustomerId}
              selectCustomer={(id) => void list.selectCustomer(id)}
              selectedCustomerDetail={list.selectedCustomerDetail}
              selectedCustomerLoading={list.selectedCustomerLoading}
            />
          </>
        )}
      </div>

      {canAddCustomer && (
        <FloatingActionButton
          onClick={form.openCreatePrompt}
          label={CTA_NEW_CUSTOMER}
        />
      )}

      <FilterPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        activeCount={activeFilterCount}
        onClearAll={() => list.setColumnSearch({ name: '', contact: '', location: '', stats: '', createdAt: '' })}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder="Search name or phone" value={list.columnSearch.name} onChange={(e) => list.handleColumnSearch('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Contact</label>
            <input className="input" placeholder="Search contact" value={list.columnSearch.contact} onChange={(e) => list.handleColumnSearch('contact', e.target.value)} />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" placeholder="Search location" value={list.columnSearch.location} onChange={(e) => list.handleColumnSearch('location', e.target.value)} />
          </div>
          <div>
            <label className="label">Stats</label>
            <input className="input" placeholder="Search stats" value={list.columnSearch.stats} onChange={(e) => list.handleColumnSearch('stats', e.target.value)} />
          </div>
          <div>
            <label className="label">Created Date</label>
            <input type="date" className="input" value={list.columnSearch.createdAt} onChange={(e) => list.handleColumnSearch('createdAt', e.target.value)} />
          </div>
        </div>
      </FilterPanel>
    </div>
  );
}
