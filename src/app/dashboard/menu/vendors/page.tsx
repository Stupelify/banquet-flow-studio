
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Save, Search, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ConfirmDialog';
import FormPromptModal from '@/components/FormPromptModal';
import { TableSkeleton } from '@/components/Skeletons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';
import { formatINR } from '@/lib/format';
import MenuSectionTabs from '@/components/MenuSectionTabs';

interface Vendor {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  _count?: {
    supplies: number;
  };
  supplies?: VendorSupply[];
}

interface VendorSupply {
  id: string;
  productType: 'ingredient' | 'item';
  ingredientId?: string | null;
  itemId?: string | null;
  price: number;
  unit: string;
  ingredient?: {
    id: string;
    name: string;
    defaultUnit?: string;
  } | null;
  item?: {
    id: string;
    name: string;
  } | null;
}

interface IngredientOption {
  id: string;
  name: string;
  defaultUnit: string;
}

interface ItemOption {
  id: string;
  name: string;
}

interface VendorSupplyDraft {
  productType: 'ingredient' | 'item';
  productId: string;
  price: string;
  unit: string;
}

const UNITS = ['kg', 'g', 'liter', 'ml', 'piece', 'packet', 'dozen', 'box'];

const initialVendorForm = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
};

const initialSupplyForm = {
  productType: 'ingredient' as 'ingredient' | 'item',
  ingredientId: '',
  itemId: '',
  price: '',
  unit: 'kg',
};

function getSupplyKey(productType: 'ingredient' | 'item', productId: string): string {
  return `${productType}:${productId}`;
}

export default function VendorsPage() {
  const { user } = useAuthStore();
  const permissionSet = useMemo(() => user?.permissions || [], [user?.permissions]);

  const canView = hasAnyPermission(permissionSet, ['view_item', 'manage_menu']);
  const canAdd = hasAnyPermission(permissionSet, ['add_item', 'manage_menu']);
  const canEdit = hasAnyPermission(permissionSet, ['edit_item', 'manage_menu']);
  const canDelete = hasAnyPermission(permissionSet, ['delete_item', 'manage_menu']);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  const [showVendorPrompt, setShowVendorPrompt] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState(initialVendorForm);
  const [savingVendor, setSavingVendor] = useState(false);
  const [vendorSupplyDrafts, setVendorSupplyDrafts] = useState<VendorSupplyDraft[]>([]);
  const [originalVendorSupplies, setOriginalVendorSupplies] = useState<VendorSupply[]>([]);
  const [ingredientSupplySearch, setIngredientSupplySearch] = useState('');
  const [itemSupplySearch, setItemSupplySearch] = useState('');

  const [showSuppliesPrompt, setShowSuppliesPrompt] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [supplies, setSupplies] = useState<VendorSupply[]>([]);
  const [supplyForm, setSupplyForm] = useState(initialSupplyForm);
  const [editingSupplyId, setEditingSupplyId] = useState<string | null>(null);
  const [savingSupply, setSavingSupply] = useState(false);

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) => vendor.name.toLowerCase().includes(query));
  }, [vendors, search]);

  const filteredIngredientsForPrompt = useMemo(() => {
    const query = ingredientSupplySearch.trim().toLowerCase();
    if (!query) return ingredients;
    return ingredients.filter((ingredient) =>
      ingredient.name.toLowerCase().includes(query)
    );
  }, [ingredients, ingredientSupplySearch]);

  const filteredItemsForPrompt = useMemo(() => {
    const query = itemSupplySearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, itemSupplySearch]);

  useEffect(() => {
    if (!canView && !canAdd && !canEdit) {
      setLoading(false);
      return;
    }
    void loadData();
  }, [canView, canAdd, canEdit]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vendorsRes, ingredientsRes, itemsRes] = await Promise.all([
        api.getVendors({ page: 1, limit: 5000 }),
        api.getIngredients({ page: 1, limit: 5000 }),
        api.getItems({ page: 1, limit: 5000 }),
      ]);

      setVendors(vendorsRes.data?.data?.vendors || []);
      setIngredients(ingredientsRes.data?.data?.ingredients || []);
      setItems(itemsRes.data?.data?.items || []);
    } catch (error) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const getDraft = (productType: 'ingredient' | 'item', productId: string) => {
    return vendorSupplyDrafts.find(
      (draft) => draft.productType === productType && draft.productId === productId
    );
  };

  const isDraftSelected = (productType: 'ingredient' | 'item', productId: string) => {
    return Boolean(getDraft(productType, productId));
  };

  const toggleVendorSupplyDraft = (
    productType: 'ingredient' | 'item',
    productId: string,
    defaultUnit: string
  ) => {
    setVendorSupplyDrafts((prev) => {
      const exists = prev.some(
        (draft) => draft.productType === productType && draft.productId === productId
      );
      if (exists) {
        return prev.filter(
          (draft) => !(draft.productType === productType && draft.productId === productId)
        );
      }
      return [
        ...prev,
        {
          productType,
          productId,
          price: '',
          unit: defaultUnit,
        },
      ];
    });
  };

  const updateVendorSupplyDraft = (
    productType: 'ingredient' | 'item',
    productId: string,
    patch: Partial<Pick<VendorSupplyDraft, 'price' | 'unit'>>
  ) => {
    setVendorSupplyDrafts((prev) =>
      prev.map((draft) => {
        if (draft.productType !== productType || draft.productId !== productId) {
          return draft;
        }
        return { ...draft, ...patch };
      })
    );
  };

  const openCreateVendor = () => {
    setEditingVendorId(null);
    setVendorForm(initialVendorForm);
    setVendorSupplyDrafts([]);
    setOriginalVendorSupplies([]);
    setIngredientSupplySearch('');
    setItemSupplySearch('');
    setShowVendorPrompt(true);
  };

  const openEditVendor = async (vendor: Vendor) => {
    try {
      const response = await api.getVendor(vendor.id);
      const fullVendor = response.data?.data?.vendor as Vendor | undefined;
      if (!fullVendor) {
        toast.error('Vendor details not found');
        return;
      }

      const existingSupplies = (fullVendor.supplies || []) as VendorSupply[];
      const drafts: VendorSupplyDraft[] = existingSupplies
        .map((supply) => {
          const productId =
            supply.productType === 'ingredient' ? supply.ingredientId : supply.itemId;
          if (!productId) return null;
          return {
            productType: supply.productType,
            productId,
            price: String(supply.price ?? ''),
            unit:
              supply.unit ||
              (supply.productType === 'ingredient'
                ? supply.ingredient?.defaultUnit || 'kg'
                : 'piece'),
          };
        })
        .filter((entry): entry is VendorSupplyDraft => Boolean(entry));

      setEditingVendorId(fullVendor.id);
      setVendorForm({
        name: fullVendor.name || '',
        contactPerson: fullVendor.contactPerson || '',
        phone: fullVendor.phone || '',
        email: fullVendor.email || '',
        address: fullVendor.address || '',
        gstNumber: fullVendor.gstNumber || '',
      });
      setOriginalVendorSupplies(existingSupplies);
      setVendorSupplyDrafts(drafts);
      setIngredientSupplySearch('');
      setItemSupplySearch('');
      setShowVendorPrompt(true);
    } catch (error) {
      toast.error('Failed to load vendor details');
    }
  };

  const syncVendorSupplies = async (vendorId: string) => {
    const existingByKey = new Map<string, VendorSupply>();
    for (const supply of originalVendorSupplies) {
      const productId = supply.productType === 'ingredient' ? supply.ingredientId : supply.itemId;
      if (!productId) continue;
      existingByKey.set(getSupplyKey(supply.productType, productId), supply);
    }

    const desiredKeySet = new Set<string>();

    for (const draft of vendorSupplyDrafts) {
      const key = getSupplyKey(draft.productType, draft.productId);
      desiredKeySet.add(key);

      const price = Number(draft.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Invalid price in selected supplies');
      }

      const payload = {
        productType: draft.productType,
        ingredientId: draft.productType === 'ingredient' ? draft.productId : undefined,
        itemId: draft.productType === 'item' ? draft.productId : undefined,
        price,
        unit: draft.unit,
      };

      const existing = existingByKey.get(key);
      if (existing) {
        await api.updateVendorSupply(vendorId, existing.id, payload);
      } else {
        await api.addVendorSupply(vendorId, payload);
      }
    }

    const existingEntries = Array.from(existingByKey.entries());
    for (const [key, supply] of existingEntries) {
      if (!desiredKeySet.has(key)) {
        await api.deleteVendorSupply(vendorId, supply.id);
      }
    }
  };

  const submitVendor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!vendorForm.name.trim()) {
      toast.error('Vendor name is required');
      return;
    }

    for (const draft of vendorSupplyDrafts) {
      if (draft.price === '') {
        toast.error('Please enter price for every selected supply');
        return;
      }
      const price = Number(draft.price);
      if (!Number.isFinite(price) || price < 0) {
        toast.error('Supply price must be 0 or greater');
        return;
      }
    }

    try {
      setSavingVendor(true);
      const payload = {
        name: vendorForm.name.trim(),
        contactPerson: vendorForm.contactPerson.trim() || undefined,
        phone: vendorForm.phone.trim() || undefined,
        email: vendorForm.email.trim() || undefined,
        address: vendorForm.address.trim() || undefined,
        gstNumber: vendorForm.gstNumber.trim() || undefined,
      };

      let vendorId = editingVendorId;
      if (editingVendorId) {
        await api.updateVendor(editingVendorId, payload);
      } else {
        const response = await api.createVendor(payload);
        vendorId = response.data?.data?.vendor?.id;
      }

      if (!vendorId) {
        throw new Error('Vendor ID not available');
      }

      await syncVendorSupplies(vendorId);

      toast.success(editingVendorId ? 'Vendor updated' : 'Vendor created');
      setShowVendorPrompt(false);
      setEditingVendorId(null);
      setVendorForm(initialVendorForm);
      setVendorSupplyDrafts([]);
      setOriginalVendorSupplies([]);
      setIngredientSupplySearch('');
      setItemSupplySearch('');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to save vendor');
    } finally {
      setSavingVendor(false);
    }
  };

  const removeVendor = async (vendorId: string) => {
    if (!(await confirmDialog({ title: 'Delete this vendor?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;

    try {
      await api.deleteVendor(vendorId);
      toast.success('Vendor deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete vendor');
    }
  };

  const openSupplies = async (vendor: Vendor) => {
    try {
      const response = await api.getVendor(vendor.id);
      const fullVendor = response.data?.data?.vendor as Vendor | undefined;
      if (!fullVendor) {
        toast.error('Vendor details not found');
        return;
      }

      setSelectedVendor(fullVendor);
      setSupplies((fullVendor.supplies || []) as VendorSupply[]);
      setEditingSupplyId(null);
      setSupplyForm({
        ...initialSupplyForm,
        ingredientId: ingredients[0]?.id || '',
      });
      setShowSuppliesPrompt(true);
    } catch (error) {
      toast.error('Failed to load vendor supplies');
    }
  };

  const refreshSupplies = async (vendorId: string) => {
    const response = await api.getVendor(vendorId);
    const fullVendor = response.data?.data?.vendor as Vendor | undefined;
    if (!fullVendor) return;
    setSelectedVendor(fullVendor);
    setSupplies((fullVendor.supplies || []) as VendorSupply[]);
  };

  const submitSupply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedVendor) return;

    if (supplyForm.productType === 'ingredient' && !supplyForm.ingredientId) {
      toast.error('Ingredient is required');
      return;
    }

    if (supplyForm.productType === 'item' && !supplyForm.itemId) {
      toast.error('Item is required');
      return;
    }

    if (!supplyForm.price) {
      toast.error('Price is required');
      return;
    }

    try {
      setSavingSupply(true);
      const payload = {
        productType: supplyForm.productType,
        ingredientId: supplyForm.productType === 'ingredient' ? supplyForm.ingredientId : undefined,
        itemId: supplyForm.productType === 'item' ? supplyForm.itemId : undefined,
        price: Number(supplyForm.price),
        unit: supplyForm.unit,
      };

      if (editingSupplyId) {
        await api.updateVendorSupply(selectedVendor.id, editingSupplyId, payload);
      } else {
        await api.addVendorSupply(selectedVendor.id, payload);
      }

      toast.success(editingSupplyId ? 'Supply updated' : 'Supply added');
      setEditingSupplyId(null);
      setSupplyForm({
        ...initialSupplyForm,
        ingredientId: ingredients[0]?.id || '',
      });
      await refreshSupplies(selectedVendor.id);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save supply');
    } finally {
      setSavingSupply(false);
    }
  };

  const editSupply = (supply: VendorSupply) => {
    setEditingSupplyId(supply.id);
    setSupplyForm({
      productType: supply.productType,
      ingredientId: supply.ingredientId || '',
      itemId: supply.itemId || '',
      price: String(supply.price),
      unit: supply.unit,
    });
  };

  const deleteSupply = async (supplyId: string) => {
    if (!selectedVendor) return;
    if (!(await confirmDialog({ title: 'Delete this supply mapping?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;

    try {
      await api.deleteVendorSupply(selectedVendor.id, supplyId);
      toast.success('Supply mapping deleted');
      await refreshSupplies(selectedVendor.id);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete supply mapping');
    }
  };

  const ingredientSupplyCount = (vendor: Vendor) =>
    (vendor.supplies || []).filter((supply) => supply.productType === 'ingredient').length;
  const itemSupplyCount = (vendor: Vendor) =>
    (vendor.supplies || []).filter((supply) => supply.productType === 'item').length;

  return (
    <div className="ops-route ops-catalog-route">
      <div>
        <h1 className="page-title">Vendors</h1>
      </div>

      <MenuSectionTabs active="vendors" />

      {!canView && (
        <div className="card border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
          You do not have permission to view vendors.
        </div>
      )}

      <FormPromptModal
        open={showVendorPrompt}
        title={editingVendorId ? 'Edit Vendor' : 'Add Vendor'}
        onClose={() => {
          setShowVendorPrompt(false);
          setEditingVendorId(null);
          setVendorForm(initialVendorForm);
          setVendorSupplyDrafts([]);
          setOriginalVendorSupplies([]);
          setIngredientSupplySearch('');
          setItemSupplySearch('');
        }}
        widthClass="max-w-6xl"
      >
        <form className="space-y-5" onSubmit={submitVendor}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                value={vendorForm.name}
                onChange={(event) =>
                  setVendorForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Vendor name"
                required
              />
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input
                className="input"
                value={vendorForm.contactPerson}
                onChange={(event) =>
                  setVendorForm((prev) => ({ ...prev, contactPerson: event.target.value }))
                }
                placeholder="Contact person"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={vendorForm.phone}
                onChange={(event) =>
                  setVendorForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={vendorForm.email}
                onChange={(event) =>
                  setVendorForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="Email"
              />
            </div>
            <div>
              <label className="label">GST Number</label>
              <input
                className="input"
                value={vendorForm.gstNumber}
                onChange={(event) =>
                  setVendorForm((prev) => ({ ...prev, gstNumber: event.target.value }))
                }
                placeholder="GST number"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input
                className="input"
                value={vendorForm.address}
                onChange={(event) =>
                  setVendorForm((prev) => ({ ...prev, address: event.target.value }))
                }
                placeholder="Address"
              />
            </div>
          </div>

          <div>
            <label className="label">
              Supply Mapping
            </label>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <p className="text-sm font-semibold text-[var(--text-1)]">Ingredients Supplied</p>
              </div>
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
                  <input
                    className="input h-9 pl-9"
                    placeholder="Search ingredients..."
                    value={ingredientSupplySearch}
                    onChange={(event) => setIngredientSupplySearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
                {filteredIngredientsForPrompt.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 12px' }}>
                    <div className="empty-state-icon">
                      <Truck size={20} />
                    </div>
                    <p className="empty-state-title">No ingredients available</p>
                    <p className="empty-state-desc">Create ingredients to add vendor pricing.</p>
                  </div>
                ) : (
                  filteredIngredientsForPrompt.map((ingredient) => {
                    const selected = isDraftSelected('ingredient', ingredient.id);
                    const draft = getDraft('ingredient', ingredient.id);
                    return (
                      <div
                        key={`ingredient-draft-${ingredient.id}`}
                        className="px-3 py-2 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_110px_110px] gap-2 items-center"
                      >
                        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-2)]">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleVendorSupplyDraft(
                                'ingredient',
                                ingredient.id,
                                ingredient.defaultUnit || 'kg'
                              )
                            }
                          />
                          <span>{ingredient.name}</span>
                        </label>
                        {selected ? (
                          <>
                            <input
                              className="input h-9"
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Price"
                              value={draft?.price || ''}
                              onChange={(event) =>
                                updateVendorSupplyDraft('ingredient', ingredient.id, {
                                  price: event.target.value,
                                })
                              }
                            />
                            <select
                              className="input h-9"
                              value={draft?.unit || ingredient.defaultUnit || 'kg'}
                              onChange={(event) =>
                                updateVendorSupplyDraft('ingredient', ingredient.id, {
                                  unit: event.target.value,
                                })
                              }
                            >
                              {UNITS.map((unit) => (
                                <option key={`ingredient-unit-${ingredient.id}-${unit}`} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-[var(--text-4)]">Not selected</span>
                            <span />
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <p className="text-sm font-semibold text-[var(--text-1)]">Items Supplied</p>
              </div>
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
                  <input
                    className="input h-9 pl-9"
                    placeholder="Search items..."
                    value={itemSupplySearch}
                    onChange={(event) => setItemSupplySearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
                {filteredItemsForPrompt.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 12px' }}>
                    <div className="empty-state-icon">
                      <Truck size={20} />
                    </div>
                    <p className="empty-state-title">No items available</p>
                    <p className="empty-state-desc">Create items to add vendor pricing.</p>
                  </div>
                ) : (
                  filteredItemsForPrompt.map((item) => {
                    const selected = isDraftSelected('item', item.id);
                    const draft = getDraft('item', item.id);
                    return (
                      <div
                        key={`item-draft-${item.id}`}
                        className="px-3 py-2 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_110px_110px] gap-2 items-center"
                      >
                        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-2)]">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleVendorSupplyDraft('item', item.id, 'piece')}
                          />
                          <span>{item.name}</span>
                        </label>
                        {selected ? (
                          <>
                            <input
                              className="input h-9"
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Price"
                              value={draft?.price || ''}
                              onChange={(event) =>
                                updateVendorSupplyDraft('item', item.id, {
                                  price: event.target.value,
                                })
                              }
                            />
                            <select
                              className="input h-9"
                              value={draft?.unit || 'piece'}
                              onChange={(event) =>
                                updateVendorSupplyDraft('item', item.id, {
                                  unit: event.target.value,
                                })
                              }
                            >
                              {UNITS.map((unit) => (
                                <option key={`item-unit-${item.id}-${unit}`} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-[var(--text-4)]">Not selected</span>
                            <span />
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowVendorPrompt(false);
                setEditingVendorId(null);
                setVendorForm(initialVendorForm);
                setVendorSupplyDrafts([]);
                setOriginalVendorSupplies([]);
                setIngredientSupplySearch('');
                setItemSupplySearch('');
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingVendor}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingVendor ? 'Saving...' : 'Submit'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      <FormPromptModal
        open={showSuppliesPrompt}
        title={selectedVendor ? `Manage Supplies · ${selectedVendor.name}` : 'Manage Supplies'}
        onClose={() => {
          setShowSuppliesPrompt(false);
          setSelectedVendor(null);
          setSupplies([]);
          setEditingSupplyId(null);
          setSupplyForm(initialSupplyForm);
        }}
        widthClass="max-w-6xl"
      >
        {!selectedVendor ? null : (
          <div className="space-y-4">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Unit</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supplies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-sm text-[var(--text-4)]">
                        No supplies mapped yet.
                      </td>
                    </tr>
                  ) : (
                    supplies.map((supply) => (
                      <tr key={supply.id}>
                        <td className="capitalize">{supply.productType}</td>
                        <td>{supply.productType === 'ingredient' ? supply.ingredient?.name : supply.item?.name}</td>
                        <td>{formatINR(Number(supply.price || 0))}</td>
                        <td>{supply.unit}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="p-2 text-[var(--text-4)] hover:text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                              onClick={() => editSupply(supply)}
                              type="button"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-[var(--text-4)] hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-500/10 rounded-lg"
                              onClick={() => deleteSupply(supply.id)}
                              type="button"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={submitSupply}>
              <div>
                <label className="label">Product Type</label>
                <select
                  className="input"
                  value={supplyForm.productType}
                  onChange={(event) =>
                    setSupplyForm((prev) => ({
                      ...prev,
                      productType: event.target.value as 'ingredient' | 'item',
                    }))
                  }
                  required
                >
                  <option value="ingredient">Ingredient</option>
                  <option value="item">Item</option>
                </select>
              </div>
              <div>
                <label className="label">Product</label>
                {supplyForm.productType === 'ingredient' ? (
                  <select
                    className="input"
                    value={supplyForm.ingredientId}
                    onChange={(event) =>
                      setSupplyForm((prev) => ({ ...prev, ingredientId: event.target.value }))
                    }
                    required
                  >
                    <option value="">Select ingredient</option>
                    {ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="input"
                    value={supplyForm.itemId}
                    onChange={(event) =>
                      setSupplyForm((prev) => ({ ...prev, itemId: event.target.value }))
                    }
                    required
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Price</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={supplyForm.price}
                  onChange={(event) =>
                    setSupplyForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                  placeholder="Price"
                  required
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  className="input"
                  value={supplyForm.unit}
                  onChange={(event) =>
                    setSupplyForm((prev) => ({ ...prev, unit: event.target.value }))
                  }
                  required
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn btn-primary w-full" disabled={savingSupply}>
                  {savingSupply ? 'Saving...' : editingSupplyId ? 'Update' : 'Add Supply'}
                </button>
              </div>
            </form>
          </div>
        )}
      </FormPromptModal>

      {canView && (
        <div className="card">
          <div className="panel-header">
            <div>
              <p className="panel-title">Manage Vendors</p>
              <p className="panel-subtitle">Map ingredients and items supplied with per-unit pricing.</p>
            </div>
            {canAdd && (
              <button type="button" className="btn btn-primary" onClick={openCreateVendor}>
                <span className="inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Vendor
                </span>
              </button>
            )}
          </div>
          <div className="panel-body space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
              <input
                className="input pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search vendor..."
              />
            </div>

            {loading ? (
              <TableSkeleton rows={5} />
            ) : (
              <>
                {/* Mobile card view */}
                <div className="md:hidden">
                  {filteredVendors.length === 0 ? (
                    <p className="text-center py-6 text-sm text-[var(--text-4)]">No vendors found.</p>
                  ) : (
                    <div className="mobile-card-list">
                      {filteredVendors.map((vendor) => (
                        <div key={vendor.id} className="mobile-card">
                          <div className="mobile-card-header">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="mobile-card-title">{vendor.name}</div>
                              {vendor.contactPerson && (
                                <div className="mobile-card-subtitle">{vendor.contactPerson}</div>
                              )}
                            </div>
                          </div>
                          {vendor.phone && (
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">Phone</span>
                              <span className="mobile-card-value">{vendor.phone}</span>
                            </div>
                          )}
                          <div className="mobile-card-meta" style={{ marginTop: 6 }}>
                            <span className="mobile-card-meta-item">{ingredientSupplyCount(vendor)} ingredient</span>
                            <span className="mobile-card-meta-item">{itemSupplyCount(vendor)} item</span>
                            <span className="mobile-card-meta-item">
                              {vendor._count?.supplies || (vendor.supplies || []).length} total
                            </span>
                          </div>
                          <div className="mobile-card-actions">
                            <button type="button" className="mobile-card-action-btn" onClick={() => openSupplies(vendor)}>
                              <Truck style={{ width: 14, height: 14 }} aria-hidden="true" />
                              Supplies
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                className="mobile-card-action-btn"
                                onClick={() => {
                                  void openEditVendor(vendor);
                                }}
                              >
                                <Edit style={{ width: 14, height: 14 }} aria-hidden="true" />
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="mobile-card-action-btn"
                                style={{ color: '#dc2626' }}
                                onClick={() => removeVendor(vendor.id)}
                              >
                                <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vendor Name</th>
                      <th>Contact</th>
                      <th>Ingredient Supplies</th>
                      <th>Item Supplies</th>
                      <th>Total Mappings</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-sm text-[var(--text-4)]">
                          No vendors found.
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <tr key={vendor.id}>
                          <td>{vendor.name}</td>
                          <td>
                            <div className="text-xs text-[var(--text-2)] space-y-0.5">
                              <p>{vendor.contactPerson || '-'}</p>
                              <p>{vendor.phone || '-'}</p>
                            </div>
                          </td>
                          <td>{ingredientSupplyCount(vendor)}</td>
                          <td>{itemSupplyCount(vendor)}</td>
                          <td>{vendor._count?.supplies || (vendor.supplies || []).length}</td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button className="btn btn-secondary" type="button" onClick={() => openSupplies(vendor)}>
                                <span className="inline-flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  Supplies
                                </span>
                              </button>
                              {canEdit && (
                                <button
                                  className="p-2 text-[var(--text-4)] hover:text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                                  onClick={() => {
                                    void openEditVendor(vendor);
                                  }}
                                  type="button"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  className="p-2 text-[var(--text-4)] hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-500/10 rounded-lg"
                                  onClick={() => removeVendor(vendor.id)}
                                  type="button"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
