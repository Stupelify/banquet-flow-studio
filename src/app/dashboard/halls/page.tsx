
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Building2, Edit, Filter, Landmark, Save, Search, Trash2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from '@/lib/router-compat';
import FormPromptModal from '@/components/FormPromptModal';
import FilterPanel from '@/components/FilterPanel';
import EmptyState from '@/components/EmptyState';
import SortableHeader from '@/components/SortableHeader';
import TablePagination from '@/components/TablePagination';
import { TableSkeleton } from '@/components/Skeletons';
import {
  SortState,
  TableColumnConfig,
  filterAndSortRows,
  getNextSort,
} from '@/lib/tableUtils';
import Toolbar from '@/components/Toolbar';
import { formatDisplayNumber } from '@/lib/displayNumbers';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';
import { Tab, TabList, TabPanel, Tabs } from '@/components/ui';

function formatHallRateDisplay(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return formatDisplayNumber(n, 2);
}

interface Banquet {
  id: string;
  name: string;
  location: string;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  halls?: Array<{ id: string }>;
}

interface Hall {
  id: string;
  name: string;
  capacity: number;
  floatingCapacity?: number | null;
  basePrice?: number | null;
  area?: number | null;
  order?: number | null;
  photo?: string | null;
  location?: string | null;
  rate?: string | null;
  banquet?: {
    id: string;
    name: string;
  } | null;
}

const initialBanquetForm = {
  name: '',
  location: '',
};

const initialHallForm = {
  name: '',
  location: '',
  rate: '',
  area: '',
  capacity: '',
  order: '',
  photo: '',
  photoFileName: '',
  banquetId: '',
};

const initialBanquetColumnSearch = {
  name: '',
  location: '',
  halls: '',
};

const initialHallColumnSearch = {
  name: '',
  capacity: '',
  pricing: '',
};

const BANQUETS_PAGE_SIZE = 75;
const HALLS_PAGE_SIZE = 75;
const NO_BANQUETS: Banquet[] = [];
const NO_HALLS: Hall[] = [];
type VenueSection = 'banquet' | 'hall';

function isVenueSection(value: string | null): value is VenueSection {
  return value === 'banquet' || value === 'hall';
}

function HallsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const permissionSet = useMemo(() => user?.permissions || [], [user?.permissions]);
  const canViewBanquet = hasAnyPermission(permissionSet, ['view_banquet', 'manage_halls']);
  const canAddBanquet = hasAnyPermission(permissionSet, ['add_banquet', 'manage_halls']);
  const canEditBanquet = hasAnyPermission(permissionSet, ['edit_banquet', 'manage_halls']);
  const canDeleteBanquet = hasAnyPermission(permissionSet, ['delete_banquet', 'manage_halls']);
  const canViewHall = hasAnyPermission(permissionSet, ['view_hall', 'manage_halls']);
  const canAddHall = hasAnyPermission(permissionSet, ['add_hall', 'manage_halls']);
  const canEditHall = hasAnyPermission(permissionSet, ['edit_hall', 'manage_halls']);
  const canDeleteHall = hasAnyPermission(permissionSet, ['delete_hall', 'manage_halls']);

  // React Query owns fetching (stale-while-revalidate — saves/deletes
  // invalidate instead of flashing the page back to a loading state).
  const canFetchBanquet = hasAnyPermission(permissionSet, ['view_banquet', 'add_banquet', 'edit_banquet', 'add_hall', 'manage_halls']);
  const canFetchHall = hasAnyPermission(permissionSet, ['view_hall', 'add_hall', 'edit_hall', 'manage_halls']);
  const queryClient = useQueryClient();
  const venuesQuery = useQuery({
    queryKey: ['venues', { canFetchBanquet, canFetchHall }],
    queryFn: async () => {
      const [banquetsRes, hallsRes] = await Promise.all([
        canFetchBanquet ? api.getBanquets({ page: 1, limit: 5000 }) : Promise.resolve(null),
        canFetchHall ? api.getHalls({ page: 1, limit: 5000 }) : Promise.resolve(null),
      ]);
      return {
        banquets: (banquetsRes?.data?.data?.banquets || []) as Banquet[],
        halls: (hallsRes?.data?.data?.halls || []) as Hall[],
      };
    },
    enabled: canFetchBanquet || canFetchHall,
    placeholderData: keepPreviousData,
  });
  const banquets = venuesQuery.data?.banquets ?? NO_BANQUETS;
  const halls = venuesQuery.data?.halls ?? NO_HALLS;
  const loading = venuesQuery.isLoading && (canFetchBanquet || canFetchHall);

  useEffect(() => {
    if (venuesQuery.isError) toast.error('Failed to load venue data');
  }, [venuesQuery.isError]);
  const [savingBanquet, setSavingBanquet] = useState(false);
  const [savingHall, setSavingHall] = useState(false);
  const [showBanquetPrompt, setShowBanquetPrompt] = useState(false);
  const [showHallPrompt, setShowHallPrompt] = useState(false);
  const [editingBanquetId, setEditingBanquetId] = useState<string | null>(null);
  const [editingHallId, setEditingHallId] = useState<string | null>(null);
  const [banquetForm, setBanquetForm] = useState(initialBanquetForm);
  const [hallForm, setHallForm] = useState(initialHallForm);
  const [banquetGlobalSearch, setBanquetGlobalSearch] = useState('');
  const [banquetColumnSearch, setBanquetColumnSearch] = useState(
    initialBanquetColumnSearch
  );
  const [hallGlobalSearch, setHallGlobalSearch] = useState('');
  const [hallColumnSearch, setHallColumnSearch] = useState(initialHallColumnSearch);
  const [banquetSort, setBanquetSort] = useState<SortState>({
    key: 'name',
    direction: 'asc',
  });
  const [hallSort, setHallSort] = useState<SortState>({
    key: 'name',
    direction: 'asc',
  });
  const [banquetPage, setBanquetPage] = useState(1);
  const [showBanquetFilters, setShowBanquetFilters] = useState(false);
  const [showHallFilters, setShowHallFilters] = useState(false);
  const [hallPage, setHallPage] = useState(1);
  const [activeVenueSection, setActiveVenueSection] = useState<VenueSection>('banquet');
  const sectionParam = searchParams.get('section');

  const banquetColumns = useMemo<TableColumnConfig<Banquet>[]>(
    () => [
      { key: 'name', accessor: (banquet) => banquet.name },
      {
        key: 'location',
        accessor: (banquet) =>
          [banquet.location, banquet.city, banquet.state].filter(Boolean).join(', '),
      },
      { key: 'halls', accessor: (banquet) => banquet.halls?.length || 0 },
    ],
    []
  );

  const hallColumns = useMemo<TableColumnConfig<Hall>[]>(
    () => [
      {
        key: 'name',
        accessor: (hall) => `${hall.name} ${hall.banquet?.name || 'No banquet'}`,
      },
      {
        key: 'capacity',
        accessor: (hall) =>
          `${hall.capacity}${hall.floatingCapacity ? ` ${hall.floatingCapacity}` : ''}`,
      },
      {
        key: 'pricing',
        accessor: (hall) => hall.basePrice ?? hall.rate ?? 0,
      },
    ],
    []
  );

  const filteredBanquets = useMemo(
    () =>
      filterAndSortRows(
        banquets,
        banquetColumns,
        banquetGlobalSearch,
        banquetColumnSearch,
        banquetSort
      ),
    [
      banquets,
      banquetColumns,
      banquetGlobalSearch,
      banquetColumnSearch,
      banquetSort,
    ]
  );

  const filteredHalls = useMemo(
    () =>
      filterAndSortRows(halls, hallColumns, hallGlobalSearch, hallColumnSearch, hallSort),
    [halls, hallColumns, hallGlobalSearch, hallColumnSearch, hallSort]
  );

  const banquetTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredBanquets.length / BANQUETS_PAGE_SIZE)),
    [filteredBanquets.length]
  );

  const hallTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredHalls.length / HALLS_PAGE_SIZE)),
    [filteredHalls.length]
  );

  const paginatedBanquets = useMemo(() => {
    const safePage = Math.min(Math.max(banquetPage, 1), banquetTotalPages);
    const startIndex = (safePage - 1) * BANQUETS_PAGE_SIZE;
    return filteredBanquets.slice(startIndex, startIndex + BANQUETS_PAGE_SIZE);
  }, [banquetPage, banquetTotalPages, filteredBanquets]);

  const paginatedHalls = useMemo(() => {
    const safePage = Math.min(Math.max(hallPage, 1), hallTotalPages);
    const startIndex = (safePage - 1) * HALLS_PAGE_SIZE;
    return filteredHalls.slice(startIndex, startIndex + HALLS_PAGE_SIZE);
  }, [hallPage, hallTotalPages, filteredHalls]);

  const firstAllowedVenueSection = useMemo<VenueSection | null>(() => {
    if (canViewBanquet) return 'banquet';
    if (canViewHall) return 'hall';
    return null;
  }, [canViewBanquet, canViewHall]);

  useEffect(() => {
    if (!firstAllowedVenueSection) return;

    const requestedSection = isVenueSection(sectionParam) ? sectionParam : null;
    const requestedSectionAllowed =
      requestedSection === 'banquet'
        ? canViewBanquet
        : requestedSection === 'hall'
          ? canViewHall
          : false;

    const nextSection =
      requestedSection && requestedSectionAllowed
        ? requestedSection
        : firstAllowedVenueSection;

    if (activeVenueSection !== nextSection) {
      setActiveVenueSection(nextSection);
    }

    if (sectionParam !== nextSection) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', nextSection);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [
    activeVenueSection,
    canViewBanquet,
    canViewHall,
    firstAllowedVenueSection,
    pathname,
    router,
    searchParams,
    sectionParam,
  ]);

  const navigateToVenueSection = (section: VenueSection) => {
    const allowed = section === 'banquet' ? canViewBanquet : canViewHall;
    if (!allowed) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setBanquetPage(1);
  }, [banquetGlobalSearch, banquetColumnSearch, banquetSort]);

  useEffect(() => {
    setHallPage(1);
  }, [hallGlobalSearch, hallColumnSearch, hallSort]);

  useEffect(() => {
    if (banquetPage <= banquetTotalPages) return;
    setBanquetPage(banquetTotalPages);
  }, [banquetPage, banquetTotalPages]);

  useEffect(() => {
    if (hallPage <= hallTotalPages) return;
    setHallPage(hallTotalPages);
  }, [hallPage, hallTotalPages]);

  // Mutation call sites still `await loadData()` — now a cache invalidation.
  const loadData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['venues'] });
  };

  // Default the hall form's banquet to the first banquet once loaded.
  useEffect(() => {
    if (banquets.length > 0) {
      setHallForm((prev) => ({ ...prev, banquetId: prev.banquetId || banquets[0].id }));
    }
  }, [banquets]);

  const openCreateBanquet = () => {
    setEditingBanquetId(null);
    setBanquetForm(initialBanquetForm);
    setShowBanquetPrompt(true);
  };

  const openEditBanquet = (banquet: Banquet) => {
    setEditingBanquetId(banquet.id);
    setBanquetForm({
      name: banquet.name || '',
      location: banquet.location || '',
    });
    setShowBanquetPrompt(true);
  };

  const submitBanquet = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!banquetForm.name.trim() || !banquetForm.location.trim()) {
      toast.error('Banquet name and location are required');
      return;
    }
    try {
      setSavingBanquet(true);
      const payload = {
        name: banquetForm.name.trim(),
        location: banquetForm.location.trim(),
      };
      if (editingBanquetId) {
        await api.updateBanquet(editingBanquetId, payload);
      } else {
        await api.createBanquet(payload);
      }
      toast.success(editingBanquetId ? 'Banquet updated' : 'Banquet created');
      setShowBanquetPrompt(false);
      setEditingBanquetId(null);
      setBanquetForm(initialBanquetForm);
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          (editingBanquetId ? 'Failed to update banquet' : 'Failed to create banquet')
      );
    } finally {
      setSavingBanquet(false);
    }
  };

  const openCreateHall = () => {
    setEditingHallId(null);
    setHallForm((prev) => ({
      ...initialHallForm,
      banquetId: prev.banquetId || banquets[0]?.id || '',
    }));
    setShowHallPrompt(true);
  };

  const openEditHall = (hall: Hall) => {
    setEditingHallId(hall.id);
    setHallForm({
      name: hall.name || '',
      location: hall.location || '',
      rate:
        hall.rate ||
        (typeof hall.basePrice === 'number' ? String(hall.basePrice) : ''),
      area: hall.area !== null && hall.area !== undefined ? String(hall.area) : '',
      capacity: hall.capacity !== null && hall.capacity !== undefined ? String(hall.capacity) : '',
      order: hall.order !== null && hall.order !== undefined ? String(hall.order) : '',
      photo: hall.photo || '',
      photoFileName: hall.photo ? 'Existing image' : '',
      banquetId: hall.banquet?.id || '',
    });
    setShowHallPrompt(true);
  };

  const submitHall = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hallForm.name.trim() || !hallForm.banquetId) {
      toast.error('Hall name and banquet are required');
      return;
    }
    try {
      setSavingHall(true);
      const payload = {
        name: hallForm.name.trim(),
        capacity: hallForm.capacity ? Number(hallForm.capacity) : 1,
        area: hallForm.area ? Number(hallForm.area) : undefined,
        order: hallForm.order ? Number(hallForm.order) : undefined,
        photo: hallForm.photo || undefined,
        images: hallForm.photo ? [hallForm.photo] : undefined,
        location: hallForm.location.trim() || undefined,
        rate: hallForm.rate.trim() || undefined,
        banquetId: hallForm.banquetId,
      };
      if (editingHallId) {
        await api.updateHall(editingHallId, payload);
      } else {
        await api.createHall(payload);
      }
      toast.success(editingHallId ? 'Hall updated' : 'Hall created');
      setShowHallPrompt(false);
      setEditingHallId(null);
      setHallForm((prev) => ({
        ...initialHallForm,
        banquetId: prev.banquetId,
      }));
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          (editingHallId ? 'Failed to update hall' : 'Failed to create hall')
      );
    } finally {
      setSavingHall(false);
    }
  };

  const handleHallImageUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setHallForm((prev) => ({
        ...prev,
        photo: typeof reader.result === 'string' ? reader.result : '',
        photoFileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const deleteBanquet = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete this banquet?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.deleteBanquet(id);
      toast.success('Banquet deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete banquet');
    }
  };

  const deleteHall = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete this hall?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.deleteHall(id);
      toast.success('Hall deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete hall');
    }
  };

  return (
    <div className="ops-route ops-catalog-route">
      <Toolbar
        title="Venues & Halls"
        stats={[
          { label: 'Venues', value: banquets.length },
          { label: 'Halls', value: halls.length },
        ]}
      />

      {!canViewBanquet && !canViewHall && (
        <div className="card border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
          You do not have permission to view venue tables.
        </div>
      )}

      <FormPromptModal
        open={showBanquetPrompt}
        title={editingBanquetId ? 'Edit Banquet' : 'Create Banquet'}
        onClose={() => {
          setShowBanquetPrompt(false);
          setEditingBanquetId(null);
          setBanquetForm(initialBanquetForm);
        }}
        widthClass="max-w-3xl"
      >
        <form className="space-y-4" onSubmit={submitBanquet}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">
                Banquet Name <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="Banquet name"
                className="input"
                value={banquetForm.name}
                onChange={(e) =>
                  setBanquetForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="label">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="Location"
                className="input"
                value={banquetForm.location}
                onChange={(e) =>
                  setBanquetForm((prev) => ({ ...prev, location: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowBanquetPrompt(false);
                setEditingBanquetId(null);
                setBanquetForm(initialBanquetForm);
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={savingBanquet}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingBanquet ? 'Saving...' : 'Submit'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      <FormPromptModal
        open={showHallPrompt}
        title={editingHallId ? 'Edit Hall' : 'Create Hall'}
        onClose={() => {
          setShowHallPrompt(false);
          setEditingHallId(null);
          setHallForm((prev) => ({
            ...initialHallForm,
            banquetId: prev.banquetId,
          }));
        }}
        widthClass="max-w-3xl"
      >
        <form className="space-y-4" onSubmit={submitHall}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Hall Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="Hall name"
                value={hallForm.name}
                onChange={(e) => setHallForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">
                Select Banquet <span className="text-red-500">*</span>
              </label>
              <select
                className="input"
                value={hallForm.banquetId}
                onChange={(e) => setHallForm((prev) => ({ ...prev, banquetId: e.target.value }))}
                required
              >
                <option value="">Select banquet</option>
                {banquets.map((banquet) => (
                  <option key={banquet.id} value={banquet.id}>
                    {banquet.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Rate</label>
              <input
                className="input"
                placeholder="Rate"
                value={hallForm.rate}
                onChange={(e) => setHallForm((prev) => ({ ...prev, rate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Area</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                placeholder="Area"
                value={hallForm.area}
                onChange={(e) =>
                  setHallForm((prev) => ({ ...prev, area: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input
                className="input"
                type="number"
                min={1}
                placeholder="Max guests"
                value={hallForm.capacity}
                onChange={(e) =>
                  setHallForm((prev) => ({ ...prev, capacity: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Hall Location</label>
              <input
                className="input"
                placeholder="Hall location"
                value={hallForm.location}
                onChange={(e) => setHallForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Order</label>
              <input
                className="input"
                type="number"
                min={0}
                placeholder="Order"
                value={hallForm.order}
                onChange={(e) => setHallForm((prev) => ({ ...prev, order: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Hall Image</label>
              <label className="block rounded-2xl border-2 border-dashed border-[var(--border-2)] bg-[var(--surface-2)] p-4 hover:border-primary-300 transition cursor-pointer">
                <div className="text-sm text-[var(--text-2)]">
                  {hallForm.photoFileName
                    ? `Selected: ${hallForm.photoFileName}`
                    : 'Drag and drop or select image file'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleHallImageUpload(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowHallPrompt(false);
                setEditingHallId(null);
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={savingHall}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingHall ? 'Saving...' : 'Submit'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      {(canViewBanquet || canViewHall) && (
        <Tabs
          value={activeVenueSection}
          onValueChange={(section) => navigateToVenueSection(section as VenueSection)}
          variant="section"
          aria-label="Venue sections"
        >
          <TabList className="ops-section-tabs">
            <Tab value="banquet" disabled={!canViewBanquet}>
              Banquet
            </Tab>
            <Tab value="hall" disabled={!canViewHall}>
              Hall
            </Tab>
          </TabList>

          <div className="ops-catalog-panel card">
        <TabPanel value="banquet">
          <>
            <div className="page-head mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-1)]">Banquet table</h2>
              {canAddBanquet && (
                <button
                  type="button"
                  className="btn btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                  onClick={openCreateBanquet}
                >
                  <Landmark className="w-4 h-4" />
                  Add
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
                <input
                  className="input pl-9 w-full"
                  value={banquetGlobalSearch}
                  onChange={(e) => setBanquetGlobalSearch(e.target.value)}
                  placeholder="Overall search in banquet table..."
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary inline-flex items-center gap-2"
                onClick={() => setShowBanquetFilters(true)}
              >
                <Filter className="w-4 h-4" />
                Filter
                {Object.values(banquetColumnSearch).filter(Boolean).length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center bg-primary-100 text-primary-700 text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full">
                    {Object.values(banquetColumnSearch).filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            <FilterPanel
              open={showBanquetFilters}
              onClose={() => setShowBanquetFilters(false)}
              activeCount={Object.values(banquetColumnSearch).filter(Boolean).length}
              onClearAll={() => setBanquetColumnSearch(initialBanquetColumnSearch)}
            >
              <div className="space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input className="input" placeholder="Search name" value={banquetColumnSearch.name} onChange={(e) => setBanquetColumnSearch(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" placeholder="Search location" value={banquetColumnSearch.location} onChange={(e) => setBanquetColumnSearch(prev => ({ ...prev, location: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Halls</label>
                  <input className="input" placeholder="Search halls" value={banquetColumnSearch.halls} onChange={(e) => setBanquetColumnSearch(prev => ({ ...prev, halls: e.target.value }))} />
                </div>
              </div>
            </FilterPanel>

            {!canViewBanquet ? (
              <p className="text-sm text-amber-700 dark:text-amber-200">No permission to view banquet table.</p>
            ) : loading ? (
              <TableSkeleton rows={5} />
            ) : filteredBanquets.length === 0 ? (
              <EmptyState
                icon={Building2}
                variant="page"
                title="No banquets found"
                description="Create a banquet to start adding halls."
              />
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden">
                <div className="mobile-card-list">
                  {paginatedBanquets.map((banquet) => (
                    <div key={banquet.id} className="mobile-card">
                      <div className="mobile-card-header">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="mobile-card-title">{banquet.name}</div>
                        </div>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Location</span>
                        <span className="mobile-card-value">
                          {[banquet.location, banquet.city, banquet.state].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Halls</span>
                        <span className="mobile-card-value">{banquet.halls?.length || 0}</span>
                      </div>
                      {(canEditBanquet || canDeleteBanquet) && (
                        <div className="mobile-card-actions">
                          {canEditBanquet && (
                            <button
                              type="button"
                              className="mobile-card-action-btn"
                              onClick={() => openEditBanquet(banquet)}
                            >
                              <Edit style={{ width: 14, height: 14 }} aria-hidden="true" />
                              Edit
                            </button>
                          )}
                          {canDeleteBanquet && (
                            <button
                              type="button"
                              className="mobile-card-action-btn text-red-600 dark:text-red-400"
                              onClick={() => deleteBanquet(banquet.id)}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <TablePagination
                  currentPage={banquetPage}
                  totalPages={banquetTotalPages}
                  totalItems={filteredBanquets.length}
                  pageSize={BANQUETS_PAGE_SIZE}
                  itemLabel="banquets"
                  onPageChange={setBanquetPage}
                />
              </div>

              <div className="table-shell hidden md:block">
                <table className="data-table">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <SortableHeader
                        label="Name"
                        sortKey="name"
                        sort={banquetSort}
                        onSort={(key) => setBanquetSort((prev) => getNextSort(prev, key))}
                        className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                      />
                      <SortableHeader
                        label="Location"
                        sortKey="location"
                        sort={banquetSort}
                        onSort={(key) => setBanquetSort((prev) => getNextSort(prev, key))}
                        className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                      />
                      <SortableHeader
                        label="Halls"
                        sortKey="halls"
                        sort={banquetSort}
                        onSort={(key) => setBanquetSort((prev) => getNextSort(prev, key))}
                        className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                      />
                      <th className="text-right py-3 px-2 text-sm font-semibold text-[var(--text-2)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBanquets.map((banquet) => (
                      <tr
                        key={banquet.id}
                        className="ops-click-row border-b border-[var(--border)]"
                        onClick={() => canEditBanquet && openEditBanquet(banquet)}
                        onKeyDown={(event) => {
                          if (!canEditBanquet) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openEditBanquet(banquet);
                          }
                        }}
                        tabIndex={canEditBanquet ? 0 : undefined}
                      >
                        <td className="py-3 px-2 text-sm text-[var(--text-1)] main">{banquet.name}</td>
                        <td className="py-3 px-2 text-sm text-[var(--text-2)]">
                          {[banquet.location, banquet.city, banquet.state]
                            .filter(Boolean)
                            .join(', ')}
                        </td>
                        <td className="py-3 px-2 text-sm text-[var(--text-2)]">
                          {banquet.halls?.length || 0}
                        </td>
                        <td className="ops-secondary-actions py-3 px-2 text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {canEditBanquet && (
                              <button
                                className="p-2 text-[var(--text-4)] hover:text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                                onClick={() => openEditBanquet(banquet)}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteBanquet && (
                              <button
                                className="p-2 text-[var(--text-4)] hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-500/10 rounded-lg"
                                onClick={() => deleteBanquet(banquet.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePagination
                  currentPage={banquetPage}
                  totalPages={banquetTotalPages}
                  totalItems={filteredBanquets.length}
                  pageSize={BANQUETS_PAGE_SIZE}
                  itemLabel="banquets"
                  onPageChange={setBanquetPage}
                />
              </div>
              </>
            )}
          </>
        </TabPanel>
        <TabPanel value="hall">
          <>
            <div className="page-head mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-1)]">Hall table</h2>
              {canAddHall && (
                <button
                  type="button"
                  className="btn btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                  onClick={openCreateHall}
                >
                  <Building2 className="w-4 h-4" />
                  Add
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
                <input
                  className="input pl-9 w-full"
                  value={hallGlobalSearch}
                  onChange={(e) => setHallGlobalSearch(e.target.value)}
                  placeholder="Overall search in hall table..."
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary inline-flex items-center gap-2"
                onClick={() => setShowHallFilters(true)}
              >
                <Filter className="w-4 h-4" />
                Filter
                {Object.values(hallColumnSearch).filter(Boolean).length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center bg-primary-100 text-primary-700 text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full">
                    {Object.values(hallColumnSearch).filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            <FilterPanel
              open={showHallFilters}
              onClose={() => setShowHallFilters(false)}
              activeCount={Object.values(hallColumnSearch).filter(Boolean).length}
              onClearAll={() => setHallColumnSearch(initialHallColumnSearch)}
            >
              <div className="space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input className="input" placeholder="Search name" value={hallColumnSearch.name} onChange={(e) => setHallColumnSearch(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input className="input" placeholder="Search capacity" value={hallColumnSearch.capacity} onChange={(e) => setHallColumnSearch(prev => ({ ...prev, capacity: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Pricing</label>
                  <input className="input" placeholder="Search pricing" value={hallColumnSearch.pricing} onChange={(e) => setHallColumnSearch(prev => ({ ...prev, pricing: e.target.value }))} />
                </div>
              </div>
            </FilterPanel>

            {!canViewHall ? (
              <p className="text-sm text-amber-700 dark:text-amber-200">No permission to view hall table.</p>
            ) : loading ? (
              <TableSkeleton rows={5} />
            ) : filteredHalls.length === 0 ? (
              <EmptyState
                icon={Building2}
                variant="page"
                title="No halls found"
                description="Add a hall to make it available for bookings."
              />
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden">
                <div className="mobile-card-list">
                  {paginatedHalls.map((hall) => (
                    <div key={hall.id} className="mobile-card">
                      <div className="mobile-card-header">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="mobile-card-title">{hall.name}</div>
                        </div>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Banquet</span>
                        <span className="mobile-card-value">{hall.banquet?.name || 'Unassigned'}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Location</span>
                        <span className="mobile-card-value">{hall.location || '—'}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Capacity</span>
                        <span className="mobile-card-value">{hall.capacity || '—'}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Area</span>
                        <span className="mobile-card-value">{hall.area ? `${hall.area} sq ft` : '—'}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Rate</span>
                        <span className="mobile-card-value">{formatHallRateDisplay(hall.rate ?? hall.basePrice)}</span>
                      </div>
                      {(canEditHall || canDeleteHall) && (
                        <div className="mobile-card-actions">
                          {canEditHall && (
                            <button
                              type="button"
                              className="mobile-card-action-btn"
                              onClick={() => openEditHall(hall)}
                            >
                              <Edit style={{ width: 14, height: 14 }} aria-hidden="true" />
                              Edit
                            </button>
                          )}
                          {canDeleteHall && (
                            <button
                              type="button"
                              className="mobile-card-action-btn text-red-600 dark:text-red-400"
                              onClick={() => deleteHall(hall.id)}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <TablePagination
                  currentPage={hallPage}
                  totalPages={hallTotalPages}
                  totalItems={filteredHalls.length}
                  pageSize={HALLS_PAGE_SIZE}
                  itemLabel="halls"
                  onPageChange={setHallPage}
                />
              </div>

              <div className="table-shell hidden md:block">
                <table className="ops-halls-table data-table">
                  <thead>
                    <tr>
                      <th>Hall</th>
                      <th>Banquet</th>
                      <th>Location</th>
                      <th>Capacity</th>
                      <th>Area</th>
                      <th>Rate</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHalls.map((hall) => (
                      <tr
                        key={hall.id}
                        className="ops-click-row"
                        onClick={() => canEditHall && openEditHall(hall)}
                        onKeyDown={(event) => {
                          if (!canEditHall) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openEditHall(hall);
                          }
                        }}
                        tabIndex={canEditHall ? 0 : undefined}
                      >
                        <td className="main">{hall.name}</td>
                        <td>{hall.banquet?.name || 'Unassigned'}</td>
                        <td>{hall.location || '—'}</td>
                        <td className="num">{hall.capacity || '—'}</td>
                        <td className="num">{hall.area ? `${hall.area} sq ft` : '—'}</td>
                        <td className="num">{formatHallRateDisplay(hall.rate ?? hall.basePrice)}</td>
                        <td className="ops-secondary-actions text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {canEditHall && (
                              <button className="p-2" onClick={() => openEditHall(hall)} aria-label={`Edit ${hall.name}`}>
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteHall && (
                              <button className="p-2" onClick={() => deleteHall(hall.id)} aria-label={`Delete ${hall.name}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePagination
                  currentPage={hallPage}
                  totalPages={hallTotalPages}
                  totalItems={filteredHalls.length}
                  pageSize={HALLS_PAGE_SIZE}
                  itemLabel="halls"
                  onPageChange={setHallPage}
                />
              </div>
              </>
            )}
          </>
        </TabPanel>
        </div>
        </Tabs>
      )}
    </div>
  );
}

// Next required Suspense around useSearchParams; TanStack does not suspend.
export default function HallsPage() {
  return <HallsPageContent />;
}
