
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Save, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ConfirmDialog';
import FormPromptModal from '@/components/FormPromptModal';
import { TableSkeleton } from '@/components/Skeletons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';
import { formatINR } from '@/lib/format';
import MenuSectionTabs from '@/components/MenuSectionTabs';

interface Ingredient {
  id: string;
  name: string;
  defaultUnit: string;
  _count?: {
    itemRecipes: number;
    vendorSupplies: number;
  };
  vendorSupplies?: IngredientVendorSupply[];
}

interface Vendor {
  id: string;
  name: string;
}

interface IngredientVendorSupply {
  id: string;
  vendorId: string;
  price: number;
  unit: string;
  vendor?: {
    id: string;
    name: string;
  };
}

interface IngredientVendorDraft {
  vendorId: string;
  price: string;
  unit: string;
}

const UNITS = ['kg', 'g', 'liter', 'ml', 'piece', 'packet', 'dozen', 'box'];

const initialIngredientForm = {
  name: '',
  defaultUnit: 'kg',
};

const initialSupplyForm = {
  vendorId: '',
  price: '',
  unit: 'kg',
};

export default function IngredientsPage() {
  const { user } = useAuthStore();
  const permissionSet = useMemo(() => user?.permissions || [], [user?.permissions]);

  const canView = hasAnyPermission(permissionSet, ['view_item', 'manage_menu']);
  const canAdd = hasAnyPermission(permissionSet, ['add_item', 'manage_menu']);
  const canEdit = hasAnyPermission(permissionSet, ['edit_item', 'manage_menu']);
  const canDelete = hasAnyPermission(permissionSet, ['delete_item', 'manage_menu']);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [showIngredientPrompt, setShowIngredientPrompt] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [ingredientForm, setIngredientForm] = useState(initialIngredientForm);
  const [savingIngredient, setSavingIngredient] = useState(false);
  const [ingredientVendorDrafts, setIngredientVendorDrafts] = useState<IngredientVendorDraft[]>([]);
  const [originalIngredientSupplies, setOriginalIngredientSupplies] = useState<IngredientVendorSupply[]>([]);
  const [ingredientVendorSearch, setIngredientVendorSearch] = useState('');

  const [showSuppliersPrompt, setShowSuppliersPrompt] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [suppliers, setSuppliers] = useState<IngredientVendorSupply[]>([]);
  const [supplyForm, setSupplyForm] = useState(initialSupplyForm);
  const [editingSupplyId, setEditingSupplyId] = useState<string | null>(null);
  const [savingSupply, setSavingSupply] = useState(false);

  const filteredIngredients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return ingredients;
    }
    return ingredients.filter((ingredient) => {
      return (
        ingredient.name.toLowerCase().includes(query) ||
        ingredient.defaultUnit.toLowerCase().includes(query)
      );
    });
  }, [ingredients, search]);

  const filteredPromptVendors = useMemo(() => {
    const query = ingredientVendorSearch.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) => vendor.name.toLowerCase().includes(query));
  }, [vendors, ingredientVendorSearch]);

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
      const [ingredientsRes, vendorsRes] = await Promise.all([
        api.getIngredients({ page: 1, limit: 5000 }),
        api.getVendors({ page: 1, limit: 5000 }),
      ]);

      setIngredients(ingredientsRes.data?.data?.ingredients || []);
      setVendors(vendorsRes.data?.data?.vendors || []);
    } catch (error) {
      toast.error('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };

  const getVendorDraft = (vendorId: string) => {
    return ingredientVendorDrafts.find((draft) => draft.vendorId === vendorId);
  };

  const isVendorSelected = (vendorId: string) => {
    return Boolean(getVendorDraft(vendorId));
  };

  const toggleVendorDraft = (vendorId: string) => {
    setIngredientVendorDrafts((prev) => {
      const exists = prev.some((draft) => draft.vendorId === vendorId);
      if (exists) {
        return prev.filter((draft) => draft.vendorId !== vendorId);
      }
      return [
        ...prev,
        {
          vendorId,
          price: '',
          unit: ingredientForm.defaultUnit || 'kg',
        },
      ];
    });
  };

  const updateVendorDraft = (
    vendorId: string,
    patch: Partial<Pick<IngredientVendorDraft, 'price' | 'unit'>>
  ) => {
    setIngredientVendorDrafts((prev) =>
      prev.map((draft) => {
        if (draft.vendorId !== vendorId) return draft;
        return { ...draft, ...patch };
      })
    );
  };

  const resetIngredientPromptState = () => {
    setShowIngredientPrompt(false);
    setEditingIngredientId(null);
    setIngredientForm(initialIngredientForm);
    setIngredientVendorDrafts([]);
    setOriginalIngredientSupplies([]);
    setIngredientVendorSearch('');
  };

  const openCreateIngredient = () => {
    setEditingIngredientId(null);
    setIngredientForm(initialIngredientForm);
    setIngredientVendorDrafts([]);
    setOriginalIngredientSupplies([]);
    setIngredientVendorSearch('');
    setShowIngredientPrompt(true);
  };

  const openEditIngredient = async (ingredient: Ingredient) => {
    try {
      const response = await api.getIngredient(ingredient.id);
      const fullIngredient = response.data?.data?.ingredient as Ingredient | undefined;
      if (!fullIngredient) {
        toast.error('Ingredient details not found');
        return;
      }

      const existingSupplies = (fullIngredient.vendorSupplies || []) as IngredientVendorSupply[];
      const drafts: IngredientVendorDraft[] = existingSupplies.map((supply) => ({
        vendorId: supply.vendorId,
        price: String(supply.price ?? ''),
        unit: supply.unit || fullIngredient.defaultUnit || 'kg',
      }));

      setEditingIngredientId(fullIngredient.id);
      setIngredientForm({
        name: fullIngredient.name,
        defaultUnit: fullIngredient.defaultUnit || 'kg',
      });
      setOriginalIngredientSupplies(existingSupplies);
      setIngredientVendorDrafts(drafts);
      setIngredientVendorSearch('');
      setShowIngredientPrompt(true);
    } catch (error) {
      toast.error('Failed to load ingredient details');
    }
  };

  const syncIngredientSupplies = async (ingredientId: string) => {
    const existingByVendorId = new Map<string, IngredientVendorSupply>();
    for (const supply of originalIngredientSupplies) {
      existingByVendorId.set(supply.vendorId, supply);
    }

    const desiredVendorIds = new Set<string>();

    for (const draft of ingredientVendorDrafts) {
      desiredVendorIds.add(draft.vendorId);
      const price = Number(draft.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Invalid price in selected vendors');
      }

      const payload = {
        vendorId: draft.vendorId,
        price,
        unit: draft.unit,
      };

      const existing = existingByVendorId.get(draft.vendorId);
      if (existing) {
        await api.updateIngredientVendor(ingredientId, existing.id, payload);
      } else {
        await api.addIngredientVendor(ingredientId, payload);
      }
    }

    const existingEntries = Array.from(existingByVendorId.entries());
    for (const [vendorId, supply] of existingEntries) {
      if (!desiredVendorIds.has(vendorId)) {
        await api.deleteIngredientVendor(ingredientId, supply.id);
      }
    }
  };

  const submitIngredient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ingredientForm.name.trim()) {
      toast.error('Ingredient name is required');
      return;
    }

    for (const draft of ingredientVendorDrafts) {
      if (draft.price === '') {
        toast.error('Please enter price for every selected vendor');
        return;
      }
      const price = Number(draft.price);
      if (!Number.isFinite(price) || price < 0) {
        toast.error('Vendor price must be 0 or greater');
        return;
      }
    }

    try {
      setSavingIngredient(true);
      const payload = {
        name: ingredientForm.name.trim(),
        defaultUnit: ingredientForm.defaultUnit,
      };

      let ingredientId = editingIngredientId;
      if (editingIngredientId) {
        await api.updateIngredient(editingIngredientId, payload);
      } else {
        const response = await api.createIngredient(payload);
        ingredientId = response.data?.data?.ingredient?.id;
      }

      if (!ingredientId) {
        throw new Error('Ingredient ID not available');
      }

      await syncIngredientSupplies(ingredientId);

      toast.success(editingIngredientId ? 'Ingredient updated' : 'Ingredient created');
      resetIngredientPromptState();
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to save ingredient');
    } finally {
      setSavingIngredient(false);
    }
  };

  const removeIngredient = async (ingredientId: string) => {
    if (!(await confirmDialog({ title: 'Delete this ingredient?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;

    try {
      await api.deleteIngredient(ingredientId);
      toast.success('Ingredient deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete ingredient');
    }
  };

  const openSuppliers = async (ingredient: Ingredient) => {
    try {
      const response = await api.getIngredient(ingredient.id);
      const fullIngredient = response.data?.data?.ingredient as Ingredient | undefined;
      if (!fullIngredient) {
        toast.error('Ingredient details not found');
        return;
      }

      setSelectedIngredient(fullIngredient);
      setSuppliers((fullIngredient.vendorSupplies || []) as IngredientVendorSupply[]);
      setSupplyForm({
        vendorId: vendors[0]?.id || '',
        price: '',
        unit: fullIngredient.defaultUnit || 'kg',
      });
      setEditingSupplyId(null);
      setShowSuppliersPrompt(true);
    } catch (error) {
      toast.error('Failed to load ingredient suppliers');
    }
  };

  const refreshSuppliers = async (ingredientId: string) => {
    const response = await api.getIngredient(ingredientId);
    const fullIngredient = response.data?.data?.ingredient as Ingredient | undefined;
    if (!fullIngredient) return;
    setSelectedIngredient(fullIngredient);
    setSuppliers((fullIngredient.vendorSupplies || []) as IngredientVendorSupply[]);
  };

  const submitSupply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedIngredient) return;
    if (!supplyForm.vendorId) {
      toast.error('Vendor is required');
      return;
    }
    if (!supplyForm.price) {
      toast.error('Price is required');
      return;
    }

    try {
      setSavingSupply(true);
      const payload = {
        vendorId: supplyForm.vendorId,
        price: Number(supplyForm.price),
        unit: supplyForm.unit,
      };

      if (editingSupplyId) {
        await api.updateIngredientVendor(selectedIngredient.id, editingSupplyId, payload);
      } else {
        await api.addIngredientVendor(selectedIngredient.id, payload);
      }

      toast.success(editingSupplyId ? 'Supplier updated' : 'Supplier added');
      setEditingSupplyId(null);
      setSupplyForm({
        vendorId: vendors[0]?.id || '',
        price: '',
        unit: selectedIngredient.defaultUnit || 'kg',
      });
      await refreshSuppliers(selectedIngredient.id);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save supplier');
    } finally {
      setSavingSupply(false);
    }
  };

  const editSupply = (supply: IngredientVendorSupply) => {
    setEditingSupplyId(supply.id);
    setSupplyForm({
      vendorId: supply.vendorId,
      price: String(supply.price),
      unit: supply.unit,
    });
  };

  const deleteSupply = async (supplyId: string) => {
    if (!selectedIngredient) return;
    if (!(await confirmDialog({ title: 'Delete this supplier mapping?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;

    try {
      await api.deleteIngredientVendor(selectedIngredient.id, supplyId);
      toast.success('Supplier mapping deleted');
      await refreshSuppliers(selectedIngredient.id);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete supplier mapping');
    }
  };

  return (
    <div className="ops-route ops-catalog-route">
      <div>
        <h1 className="page-title">Ingredients</h1>
      </div>

      <MenuSectionTabs active="ingredients" />

      {!canView && (
        <div className="card border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
          You do not have permission to view ingredients.
        </div>
      )}

      <FormPromptModal
        open={showIngredientPrompt}
        title={editingIngredientId ? 'Edit Ingredient' : 'Add Ingredient'}
        onClose={resetIngredientPromptState}
        widthClass="max-w-5xl"
      >
        <form className="space-y-4" onSubmit={submitIngredient}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Ingredient Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                value={ingredientForm.name}
                onChange={(event) =>
                  setIngredientForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Ingredient name"
                required
              />
            </div>
            <div>
              <label className="label">
                Quantity Measure Unit <span className="text-red-500">*</span>
              </label>
              <select
                className="input"
                value={ingredientForm.defaultUnit}
                onChange={(event) =>
                  setIngredientForm((prev) => ({ ...prev, defaultUnit: event.target.value }))
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
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <p className="text-sm font-semibold text-[var(--text-1)]">Link Vendors While Creating</p>
              <p className="text-xs text-[var(--text-4)] mt-0.5">
                Select vendors and set price/unit now.
              </p>
            </div>
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
                <input
                  className="input h-9 pl-9"
                  placeholder="Search vendors..."
                  value={ingredientVendorSearch}
                  onChange={(event) => setIngredientVendorSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
              {filteredPromptVendors.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 12px' }}>
                  <div className="empty-state-icon">
                    <Users size={20} />
                  </div>
                  <p className="empty-state-title">No vendors available</p>
                  <p className="empty-state-desc">Add vendors to link them to this ingredient.</p>
                </div>
              ) : (
                filteredPromptVendors.map((vendor) => {
                  const selected = isVendorSelected(vendor.id);
                  const draft = getVendorDraft(vendor.id);
                  return (
                    <div
                      key={`ingredient-vendor-draft-${vendor.id}`}
                      className="px-3 py-2 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px] gap-2 items-center"
                    >
                      <label className="inline-flex items-center gap-2 text-sm text-[var(--text-2)]">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleVendorDraft(vendor.id)}
                        />
                        <span>{vendor.name}</span>
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
                              updateVendorDraft(vendor.id, { price: event.target.value })
                            }
                          />
                          <select
                            className="input h-9"
                            value={draft?.unit || ingredientForm.defaultUnit}
                            onChange={(event) =>
                              updateVendorDraft(vendor.id, { unit: event.target.value })
                            }
                          >
                            {UNITS.map((unit) => (
                              <option key={`vendor-unit-${vendor.id}-${unit}`} value={unit}>
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

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={resetIngredientPromptState}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingIngredient}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingIngredient ? 'Saving...' : 'Submit'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      <FormPromptModal
        open={showSuppliersPrompt}
        title={selectedIngredient ? `Supplied By Vendors · ${selectedIngredient.name}` : 'Supplied By Vendors'}
        onClose={() => {
          setShowSuppliersPrompt(false);
          setSelectedIngredient(null);
          setSuppliers([]);
          setEditingSupplyId(null);
          setSupplyForm(initialSupplyForm);
        }}
        widthClass="max-w-5xl"
      >
        {!selectedIngredient ? null : (
          <div className="space-y-4">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Price</th>
                    <th>Unit</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-sm text-[var(--text-4)]">
                        No vendor mapping for this ingredient yet.
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supply) => (
                      <tr key={supply.id}>
                        <td>{supply.vendor?.name || '-'}</td>
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

            <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={submitSupply}>
              <div>
                <label className="label">Vendor</label>
                <select
                  className="input"
                  value={supplyForm.vendorId}
                  onChange={(event) =>
                    setSupplyForm((prev) => ({ ...prev, vendorId: event.target.value }))
                  }
                  required
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
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
                  {savingSupply ? 'Saving...' : editingSupplyId ? 'Update' : 'Add Supplier'}
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
              <p className="panel-title">Manage Ingredients</p>
              <p className="panel-subtitle">Create ingredients and map vendor suppliers.</p>
            </div>
            {canAdd && (
              <button type="button" className="btn btn-primary" onClick={openCreateIngredient}>
                <span className="inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Ingredient
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
                placeholder="Search ingredient or unit..."
              />
            </div>

            {loading ? (
              <TableSkeleton rows={5} />
            ) : (
              <>
                {/* Mobile card view */}
                <div className="md:hidden">
                  {filteredIngredients.length === 0 ? (
                    <p className="text-center py-6 text-sm text-[var(--text-4)]">No ingredients found.</p>
                  ) : (
                    <div className="mobile-card-list">
                      {filteredIngredients.map((ingredient) => (
                        <div key={ingredient.id} className="mobile-card">
                          <div className="mobile-card-header">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="mobile-card-title">{ingredient.name}</div>
                              <div className="mobile-card-subtitle">Unit: {ingredient.defaultUnit}</div>
                            </div>
                          </div>
                          <div className="mobile-card-meta" style={{ marginTop: 6 }}>
                            <span className="mobile-card-meta-item">{ingredient._count?.itemRecipes || 0} recipes</span>
                            <span className="mobile-card-meta-item">{ingredient._count?.vendorSupplies || 0} vendors</span>
                          </div>
                          <div className="mobile-card-actions">
                            <button type="button" className="mobile-card-action-btn" onClick={() => openSuppliers(ingredient)}>
                              <Users style={{ width: 14, height: 14 }} aria-hidden="true" />
                              Suppliers
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                className="mobile-card-action-btn"
                                onClick={() => {
                                  void openEditIngredient(ingredient);
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
                                onClick={() => removeIngredient(ingredient.id)}
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
                      <th>Name</th>
                      <th>Default Unit</th>
                      <th>Used In Recipes</th>
                      <th>Supplied By Vendors</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-sm text-[var(--text-4)]">
                          No ingredients found.
                        </td>
                      </tr>
                    ) : (
                      filteredIngredients.map((ingredient) => (
                        <tr key={ingredient.id}>
                          <td>{ingredient.name}</td>
                          <td>{ingredient.defaultUnit}</td>
                          <td>{ingredient._count?.itemRecipes || 0}</td>
                          <td>{ingredient._count?.vendorSupplies || 0}</td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={() => openSuppliers(ingredient)}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  Suppliers
                                </span>
                              </button>
                              {canEdit && (
                                <button
                                  className="p-2 text-[var(--text-4)] hover:text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                                  onClick={() => {
                                    void openEditIngredient(ingredient);
                                  }}
                                  type="button"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  className="p-2 text-[var(--text-4)] hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-500/10 rounded-lg"
                                  onClick={() => removeIngredient(ingredient.id)}
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
