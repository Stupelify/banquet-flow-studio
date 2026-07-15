
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Edit, Layers, ListChecks, Plus, Save, Search, Soup, Trash2, Filter } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from '@/lib/router-compat';
import FormPromptModal from '@/components/FormPromptModal';
import FilterPanel from '@/components/FilterPanel';
import EmptyState from '@/components/EmptyState';
import SortableHeader from '@/components/SortableHeader';
import TablePagination from '@/components/TablePagination';
import { TableSkeleton } from '@/components/Skeletons';
import Toolbar from '@/components/Toolbar';
import {
  SortState,
  TableColumnConfig,
  filterAndSortRows,
  getNextSort,
} from '@/lib/tableUtils';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';
import { formatINR } from '@/lib/format';

interface ItemType {
  id: string;
  name: string;
  order?: number | null;
  displayOrder?: number | null;
  description?: string | null;
  _count?: {
    items: number;
  };
}

interface Item {
  id: string;
  name: string;
  itemTypeId: string;
  setupCost?: string | null;
  itemCost?: string | null;
  point?: number | null;
  photo?: string | null;
  description?: string | null;
  cost?: number | null;
  points?: number | null;
  isVeg: boolean;
  itemType?: {
    id: string;
    name: string;
  };
  _count?: {
    itemRecipes: number;
    vendorSupplies: number;
  };
}

interface IngredientOption {
  id: string;
  name: string;
  defaultUnit: string;
}

interface VendorOption {
  id: string;
  name: string;
}

interface ItemRecipeRow {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  ingredient?: {
    id: string;
    name: string;
    defaultUnit?: string;
  };
}

interface ItemVendorSupplyRow {
  id: string;
  vendorId: string;
  price: number;
  unit: string;
  vendor?: {
    id: string;
    name: string;
  };
}

interface ItemVendorDraft {
  vendorId: string;
  price: string;
  unit: string;
}

interface TemplateMenu {
  id: string;
  name: string;
  category?: string | null;
  setupCost?: number | null;
  ratePerPlate?: number | null;
  itemCount?: number | null;
  items?: Array<{
    id: string;
    item: {
      id: string;
      name: string;
      points?: number | null;
      point?: number | null;
      itemType?: {
        name: string;
      };
    };
  }>;
}

const NO_ITEM_TYPES: ItemType[] = [];
const NO_ITEMS: Item[] = [];
const NO_TEMPLATE_MENUS: TemplateMenu[] = [];
const NO_INGREDIENT_OPTIONS: IngredientOption[] = [];
const NO_VENDOR_OPTIONS: VendorOption[] = [];

const initialTypeForm = {
  name: '',
  order: '0',
};

const initialItemForm = {
  itemTypeId: '',
  name: '',
  setupCost: '',
  itemCost: '',
  points: '',
  description: '',
  photo: '',
  photoFileName: '',
};

const initialTemplateForm = {
  name: '',
  setupCost: '',
  ratePerPlate: '',
  itemIds: [] as string[],
};

const recipeUnits = ['kg', 'g', 'liter', 'ml', 'piece', 'packet', 'dozen', 'box'];

const initialTypeColumnSearch = {
  name: '',
  order: '',
  itemCount: '',
};

const initialItemColumnSearch = {
  name: '',
  type: '',
  cost: '',
};

const initialTemplateColumnSearch = {
  name: '',
  category: '',
  ratePerPlate: '',
  totalPoints: '',
};

const ITEM_TYPES_PAGE_SIZE = 75;
const ITEMS_PAGE_SIZE = 75;
const TEMPLATE_MENUS_PAGE_SIZE = 75;
type MenuSection = 'itemType' | 'item' | 'template';

function isMenuSection(value: string | null): value is MenuSection {
  return value === 'itemType' || value === 'item' || value === 'template';
}

function MenuPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const permissionSet = useMemo(() => user?.permissions || [], [user?.permissions]);
  const canViewItemType = hasAnyPermission(permissionSet, ['view_itemtype', 'manage_menu']);
  const canAddItemType = hasAnyPermission(permissionSet, ['add_itemtype', 'manage_menu']);
  const canEditItemType = hasAnyPermission(permissionSet, ['edit_itemtype', 'manage_menu']);
  const canDeleteItemType = hasAnyPermission(permissionSet, ['delete_itemtype', 'manage_menu']);
  const canViewItem = hasAnyPermission(permissionSet, ['view_item', 'manage_menu']);
  const canAddItem = hasAnyPermission(permissionSet, ['add_item', 'manage_menu']);
  const canEditItem = hasAnyPermission(permissionSet, ['edit_item', 'manage_menu']);
  const canDeleteItem = hasAnyPermission(permissionSet, ['delete_item', 'manage_menu']);
  const canViewTemplate = hasAnyPermission(permissionSet, ['view_templatemenu', 'manage_menu']);
  const canAddTemplate = hasAnyPermission(permissionSet, ['add_templatemenu', 'manage_menu']);
  const canEditTemplate = hasAnyPermission(permissionSet, ['edit_templatemenu', 'manage_menu']);
  const canDeleteTemplate = hasAnyPermission(permissionSet, ['delete_templatemenu', 'manage_menu']);

  // React Query owns fetching; saves/deletes invalidate instead of flashing
  // the whole menu page back to a loading state.
  const canFetchItemType = hasAnyPermission(permissionSet, ['view_itemtype', 'add_itemtype', 'edit_itemtype', 'manage_menu']);
  const canFetchItem = hasAnyPermission(permissionSet, ['view_item', 'add_item', 'edit_item', 'manage_menu']);
  const canFetchTemplate = hasAnyPermission(permissionSet, ['view_templatemenu', 'add_templatemenu', 'edit_templatemenu', 'manage_menu']);
  const queryClient = useQueryClient();
  const menuDataQuery = useQuery({
    queryKey: ['menu-data', { canFetchItemType, canFetchItem, canFetchTemplate }],
    queryFn: async () => {
      const [typesRes, itemsRes, templatesRes, ingredientsRes, vendorsRes] =
        await Promise.all([
          canFetchItemType ? api.getItemTypes({ page: 1, limit: 5000 }) : Promise.resolve(null),
          canFetchItem ? api.getItems({ page: 1, limit: 5000 }) : Promise.resolve(null),
          canFetchTemplate
            ? api.getTemplateMenus({ page: 1, limit: 5000, includeItems: true })
            : Promise.resolve(null),
          canFetchItem ? api.getIngredients({ page: 1, limit: 5000 }) : Promise.resolve(null),
          canFetchItem ? api.getVendors({ page: 1, limit: 5000 }) : Promise.resolve(null),
        ]);
      return {
        itemTypes: (typesRes?.data?.data?.itemTypes || []) as ItemType[],
        items: (itemsRes?.data?.data?.items || []) as Item[],
        templateMenus: (templatesRes?.data?.data?.templateMenus || []) as TemplateMenu[],
        ingredientOptions: (ingredientsRes?.data?.data?.ingredients || []) as IngredientOption[],
        vendorOptions: (vendorsRes?.data?.data?.vendors || []) as VendorOption[],
      };
    },
    enabled: canFetchItemType || canFetchItem || canFetchTemplate,
    placeholderData: keepPreviousData,
  });
  const itemTypes = menuDataQuery.data?.itemTypes ?? NO_ITEM_TYPES;
  const items = menuDataQuery.data?.items ?? NO_ITEMS;
  const templateMenus = menuDataQuery.data?.templateMenus ?? NO_TEMPLATE_MENUS;
  const ingredientOptions = menuDataQuery.data?.ingredientOptions ?? NO_INGREDIENT_OPTIONS;
  const vendorOptions = menuDataQuery.data?.vendorOptions ?? NO_VENDOR_OPTIONS;
  const loading =
    menuDataQuery.isLoading && (canFetchItemType || canFetchItem || canFetchTemplate);

  useEffect(() => {
    if (menuDataQuery.isError) toast.error('Failed to load menu data');
  }, [menuDataQuery.isError]);

  const [savingType, setSavingType] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showTypePrompt, setShowTypePrompt] = useState(false);
  const [showItemPrompt, setShowItemPrompt] = useState(false);
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const [typeForm, setTypeForm] = useState(initialTypeForm);
  const [itemForm, setItemForm] = useState(initialItemForm);
  const [templateForm, setTemplateForm] = useState(initialTemplateForm);
  const [itemVendorDrafts, setItemVendorDrafts] = useState<ItemVendorDraft[]>([]);
  const [originalItemVendorSupplies, setOriginalItemVendorSupplies] = useState<
    ItemVendorSupplyRow[]
  >([]);
  const [itemVendorSearch, setItemVendorSearch] = useState('');

  const [itemTypeGlobalSearch, setItemTypeGlobalSearch] = useState('');
  const [itemTypeColumnSearch, setItemTypeColumnSearch] = useState(
    initialTypeColumnSearch
  );
  const [itemsGlobalSearch, setItemsGlobalSearch] = useState('');
  const [itemsColumnSearch, setItemsColumnSearch] = useState(initialItemColumnSearch);
  const [templateGlobalSearch, setTemplateGlobalSearch] = useState('');
  const [templateColumnSearch, setTemplateColumnSearch] = useState(
    initialTemplateColumnSearch
  );
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const [showItemFilters, setShowItemFilters] = useState(false);
  const [showTemplateFilters, setShowTemplateFilters] = useState(false);
  const [templateItemSearch, setTemplateItemSearch] = useState('');

  const [showRecipePrompt, setShowRecipePrompt] = useState(false);
  const [recipeItem, setRecipeItem] = useState<Item | null>(null);
  const [itemRecipes, setItemRecipes] = useState<ItemRecipeRow[]>([]);
  const [recipeForm, setRecipeForm] = useState({
    ingredientId: '',
    quantity: '',
    unit: 'g',
  });
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const [showItemVendorsPrompt, setShowItemVendorsPrompt] = useState(false);
  const [vendorItem, setVendorItem] = useState<Item | null>(null);
  const [itemVendors, setItemVendors] = useState<ItemVendorSupplyRow[]>([]);
  const [itemVendorForm, setItemVendorForm] = useState({
    vendorId: '',
    price: '',
    unit: 'piece',
  });
  const [editingItemVendorId, setEditingItemVendorId] = useState<string | null>(null);
  const [savingItemVendor, setSavingItemVendor] = useState(false);

  const [itemTypeSort, setItemTypeSort] = useState<SortState>({
    key: 'order',
    direction: 'asc',
  });
  const [itemSort, setItemSort] = useState<SortState>({ key: 'name', direction: 'asc' });
  const [templateSort, setTemplateSort] = useState<SortState>({
    key: 'name',
    direction: 'asc',
  });
  const [itemTypePage, setItemTypePage] = useState(1);
  const [itemPage, setItemPage] = useState(1);
  const [templatePage, setTemplatePage] = useState(1);
  const [activeMenuSection, setActiveMenuSection] = useState<MenuSection>('itemType');
  const sectionParam = searchParams.get('section');
  const isIngredientsPage = pathname === '/dashboard/menu/ingredients';
  const isVendorsPage = pathname === '/dashboard/menu/vendors';

  const itemTypeColumns = useMemo<TableColumnConfig<ItemType>[]>(
    () => [
      { key: 'name', accessor: (itemType) => itemType.name },
      {
        key: 'order',
        accessor: (itemType) => itemType.order ?? itemType.displayOrder ?? 0,
      },
      { key: 'itemCount', accessor: (itemType) => itemType._count?.items || 0 },
    ],
    []
  );

  const itemColumns = useMemo<TableColumnConfig<Item>[]>(
    () => [
      {
        key: 'name',
        accessor: (item) => `${item.name} ${item.isVeg ? 'Veg' : 'Non-veg'}`,
      },
      { key: 'type', accessor: (item) => item.itemType?.name || '' },
      { key: 'points', accessor: (item) => item.points ?? item.point ?? 0 },
    ],
    []
  );

  const templateColumns = useMemo<TableColumnConfig<TemplateMenu>[]>(
    () => [
      { key: 'name', accessor: (menu) => menu.name },
      { key: 'category', accessor: (menu) => menu.category || 'General' },
      { key: 'ratePerPlate', accessor: (menu) => menu.ratePerPlate ?? 0 },
      {
        key: 'totalPoints',
        accessor: (menu) => {
          if (!menu.items || menu.items.length === 0) return 0;
          return menu.items.reduce((sum, i) => {
            const pts = i.item.points ?? i.item.point ?? 0;
            return sum + (Number.isFinite(Number(pts)) ? Number(pts) : 0);
          }, 0);
        },
      },
    ],
    []
  );
  const filteredItemTypes = useMemo(
    () =>
      filterAndSortRows(
        itemTypes,
        itemTypeColumns,
        itemTypeGlobalSearch,
        itemTypeColumnSearch,
        itemTypeSort
      ),
    [
      itemTypes,
      itemTypeColumns,
      itemTypeGlobalSearch,
      itemTypeColumnSearch,
      itemTypeSort,
    ]
  );

  const filteredItems = useMemo(
    () =>
      filterAndSortRows(
        items,
        itemColumns,
        itemsGlobalSearch,
        itemsColumnSearch,
        itemSort
      ),
    [items, itemColumns, itemsGlobalSearch, itemsColumnSearch, itemSort]
  );

  const filteredTemplateMenus = useMemo(
    () =>
      filterAndSortRows(
        templateMenus,
        templateColumns,
        templateGlobalSearch,
        templateColumnSearch,
        templateSort
      ),
    [
      templateMenus,
      templateColumns,
      templateGlobalSearch,
      templateColumnSearch,
      templateSort,
    ]
  );

  const itemTypeTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItemTypes.length / ITEM_TYPES_PAGE_SIZE)),
    [filteredItemTypes.length]
  );

  const itemTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / ITEMS_PAGE_SIZE)),
    [filteredItems.length]
  );

  const templateTotalPages = useMemo(
    () =>
      Math.max(1, Math.ceil(filteredTemplateMenus.length / TEMPLATE_MENUS_PAGE_SIZE)),
    [filteredTemplateMenus.length]
  );

  const paginatedItemTypes = useMemo(() => {
    const safePage = Math.min(Math.max(itemTypePage, 1), itemTypeTotalPages);
    const startIndex = (safePage - 1) * ITEM_TYPES_PAGE_SIZE;
    return filteredItemTypes.slice(startIndex, startIndex + ITEM_TYPES_PAGE_SIZE);
  }, [filteredItemTypes, itemTypePage, itemTypeTotalPages]);

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(Math.max(itemPage, 1), itemTotalPages);
    const startIndex = (safePage - 1) * ITEMS_PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PAGE_SIZE);
  }, [filteredItems, itemPage, itemTotalPages]);


  const paginatedTemplateMenus = useMemo(() => {
    const safePage = Math.min(Math.max(templatePage, 1), templateTotalPages);
    const startIndex = (safePage - 1) * TEMPLATE_MENUS_PAGE_SIZE;
    return filteredTemplateMenus.slice(
      startIndex,
      startIndex + TEMPLATE_MENUS_PAGE_SIZE
    );
  }, [filteredTemplateMenus, templatePage, templateTotalPages]);

  const firstAllowedMenuSection = useMemo<MenuSection | null>(() => {
    if (canViewItemType) return 'itemType';
    if (canViewItem) return 'item';
    if (canViewTemplate) return 'template';
    return null;
  }, [canViewItemType, canViewItem, canViewTemplate]);

  useEffect(() => {
    if (!firstAllowedMenuSection) return;

    const requestedSection = isMenuSection(sectionParam) ? sectionParam : null;
    const requestedSectionAllowed =
      requestedSection === 'itemType'
        ? canViewItemType
        : requestedSection === 'item'
          ? canViewItem
          : requestedSection === 'template'
            ? canViewTemplate
            : false;

    const nextSection =
      requestedSection && requestedSectionAllowed
        ? requestedSection
        : firstAllowedMenuSection;

    if (activeMenuSection !== nextSection) {
      setActiveMenuSection(nextSection);
    }

    if (sectionParam !== nextSection) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', nextSection);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [
    activeMenuSection,
    canViewItem,
    canViewItemType,
    canViewTemplate,
    firstAllowedMenuSection,
    pathname,
    router,
    searchParams,
    sectionParam,
  ]);

  const navigateToMenuSection = (section: MenuSection) => {
    const allowed =
      section === 'itemType'
        ? canViewItemType
        : section === 'item'
          ? canViewItem
          : canViewTemplate;
    if (!allowed) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setItemTypePage(1);
  }, [itemTypeGlobalSearch, itemTypeColumnSearch, itemTypeSort]);

  useEffect(() => {
    setItemPage(1);
  }, [itemsGlobalSearch, itemsColumnSearch, itemSort]);

  useEffect(() => {
    setTemplatePage(1);
  }, [templateGlobalSearch, templateColumnSearch, templateSort]);

  useEffect(() => {
    if (itemTypePage <= itemTypeTotalPages) return;
    setItemTypePage(itemTypeTotalPages);
  }, [itemTypePage, itemTypeTotalPages]);

  useEffect(() => {
    if (itemPage <= itemTotalPages) return;
    setItemPage(itemTotalPages);
  }, [itemPage, itemTotalPages]);

  useEffect(() => {
    if (templatePage <= templateTotalPages) return;
    setTemplatePage(templateTotalPages);
  }, [templatePage, templateTotalPages]);

  // Mutation call sites still `await loadData()` — now a cache invalidation.
  const loadData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['menu-data'] });
  };

  // Default the item form's type to the first item type once loaded.
  useEffect(() => {
    if (itemTypes.length > 0) {
      setItemForm((prev) => ({ ...prev, itemTypeId: prev.itemTypeId || itemTypes[0].id }));
    }
  }, [itemTypes]);

  const openCreateType = () => {
    setEditingTypeId(null);
    setTypeForm(initialTypeForm);
    setShowTypePrompt(true);
  };

  const openEditType = (itemType: ItemType) => {
    setEditingTypeId(itemType.id);
    setTypeForm({
      name: itemType.name || '',
      order: String(itemType.order ?? itemType.displayOrder ?? 0),
    });
    setShowTypePrompt(true);
  };

  const submitType = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!typeForm.name.trim()) {
      toast.error('Item type name is required');
      return;
    }
    try {
      setSavingType(true);
      const payload = {
        name: typeForm.name.trim(),
        order: Number(typeForm.order || 0),
        displayOrder: Number(typeForm.order || 0),
      };
      let newTypeId: string | undefined;
      if (editingTypeId) {
        await api.updateItemType(editingTypeId, payload);
      } else {
        const res = await api.createItemType(payload);
        newTypeId = res.data?.data?.itemType?.id;
      }
      toast.success(editingTypeId ? 'Item type updated' : 'Item type created');
      setShowTypePrompt(false);
      setEditingTypeId(null);
      setTypeForm(initialTypeForm);
      await loadData();
      if (newTypeId && showItemPrompt) {
        setItemForm((prev) => ({ ...prev, itemTypeId: newTypeId! }));
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          (editingTypeId ? 'Failed to update item type' : 'Failed to create item type')
      );
    } finally {
      setSavingType(false);
    }
  };

  const openCreateItem = () => {
    setEditingItemId(null);
    setItemForm((prev) => ({
      ...initialItemForm,
      itemTypeId: prev.itemTypeId || itemTypes[0]?.id || '',
    }));
    setItemVendorDrafts([]);
    setOriginalItemVendorSupplies([]);
    setItemVendorSearch('');
    setShowItemPrompt(true);
  };

  const openEditItem = async (item: Item) => {
    setEditingItemId(item.id);
    setItemForm({
      itemTypeId: item.itemTypeId || '',
      name: item.name || '',
      setupCost: item.setupCost || '',
      itemCost:
        item.itemCost ||
        (item.cost !== null && item.cost !== undefined ? String(item.cost) : ''),
      points:
        item.points !== null && item.points !== undefined
          ? String(item.points)
          : item.point !== null && item.point !== undefined
          ? String(item.point)
          : '',
      description: item.description || '',
      photo: item.photo || '',
      photoFileName: item.photo ? 'Existing image' : '',
    });
    try {
      const response = await api.getItemVendors(item.id);
      const linkedSupplies = (response.data?.data?.supplies || []) as ItemVendorSupplyRow[];
      const draftMap = new Map<string, ItemVendorDraft>();
      linkedSupplies.forEach((supply) => {
        if (!draftMap.has(supply.vendorId)) {
          draftMap.set(supply.vendorId, {
            vendorId: supply.vendorId,
            price: String(supply.price ?? ''),
            unit: supply.unit || 'piece',
          });
        }
      });
      setOriginalItemVendorSupplies(linkedSupplies);
      setItemVendorDrafts(Array.from(draftMap.values()));
    } catch (error) {
      setOriginalItemVendorSupplies([]);
      setItemVendorDrafts([]);
      toast.error('Unable to load item vendor mappings');
    }
    setItemVendorSearch('');
    setShowItemPrompt(true);
  };

  const getItemVendorDraft = (vendorId: string) =>
    itemVendorDrafts.find((draft) => draft.vendorId === vendorId);

  const isItemVendorSelected = (vendorId: string) => Boolean(getItemVendorDraft(vendorId));

  const toggleItemVendorDraft = (vendorId: string) => {
    setItemVendorDrafts((prev) => {
      const exists = prev.some((draft) => draft.vendorId === vendorId);
      if (exists) {
        return prev.filter((draft) => draft.vendorId !== vendorId);
      }
      return [...prev, { vendorId, price: '', unit: 'piece' }];
    });
  };

  const updateItemVendorDraft = (
    vendorId: string,
    patch: Partial<Pick<ItemVendorDraft, 'price' | 'unit'>>
  ) => {
    setItemVendorDrafts((prev) =>
      prev.map((draft) => {
        if (draft.vendorId !== vendorId) return draft;
        return { ...draft, ...patch };
      })
    );
  };

  const syncItemVendors = async (itemId: string) => {
    const existingByVendorId = new Map<string, ItemVendorSupplyRow[]>();
    originalItemVendorSupplies.forEach((supply) => {
      const bucket = existingByVendorId.get(supply.vendorId) || [];
      bucket.push(supply);
      existingByVendorId.set(supply.vendorId, bucket);
    });

    const desiredVendorIds = new Set<string>();

    for (const draft of itemVendorDrafts) {
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

      const existingSuppliesForVendor = existingByVendorId.get(draft.vendorId) || [];
      const matchingUnitSupply = existingSuppliesForVendor.find(
        (supply) => supply.unit === draft.unit
      );

      if (matchingUnitSupply) {
        await api.updateItemVendor(itemId, matchingUnitSupply.id, payload);
      } else {
        await api.addItemVendor(itemId, payload);
      }

      for (const staleSupply of existingSuppliesForVendor) {
        if (!matchingUnitSupply || staleSupply.id !== matchingUnitSupply.id) {
          await api.deleteItemVendor(itemId, staleSupply.id);
        }
      }
    }

    for (const [vendorId, existingSuppliesForVendor] of Array.from(existingByVendorId.entries())) {
      if (!desiredVendorIds.has(vendorId)) {
        for (const staleSupply of existingSuppliesForVendor) {
          await api.deleteItemVendor(itemId, staleSupply.id);
        }
      }
    }
  };

  const submitItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!itemForm.itemTypeId || !itemForm.name.trim() || !itemForm.points) {
      toast.error('Item type, item name and points are required');
      return;
    }

    for (const draft of itemVendorDrafts) {
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
      setSavingItem(true);
      const payload = {
        itemTypeId: itemForm.itemTypeId,
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        setupCost: itemForm.setupCost || undefined,
        itemCost: itemForm.itemCost || undefined,
        point: Number(itemForm.points),
        points: Number(itemForm.points),
        cost: itemForm.itemCost ? Number(itemForm.itemCost) : undefined,
        photo: itemForm.photo || undefined,
        isVeg: true,
      };
      let itemId = editingItemId;
      if (editingItemId) {
        await api.updateItem(editingItemId, payload);
      } else {
        const response = await api.createItem(payload);
        itemId = response.data?.data?.item?.id;
      }

      if (!itemId) {
        throw new Error('Item ID not available');
      }

      await syncItemVendors(itemId);

      toast.success(editingItemId ? 'Item updated' : 'Item created');
      if (!editingItemId && itemId && showTemplatePrompt) {
        setTemplateForm((prev) => ({
          ...prev,
          itemIds: [...prev.itemIds, itemId],
        }));
      }
      setShowItemPrompt(false);
      setEditingItemId(null);
      setItemForm((prev) => ({
        ...initialItemForm,
        itemTypeId: prev.itemTypeId,
      }));
      setItemVendorDrafts([]);
      setOriginalItemVendorSupplies([]);
      setItemVendorSearch('');
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          (editingItemId ? 'Failed to update item' : 'Failed to create item')
      );
    } finally {
      setSavingItem(false);
    }
  };

  const openCreateTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm(initialTemplateForm);
    setTemplateItemSearch('');
    setShowTemplatePrompt(true);
  };

  const openEditTemplate = async (template: TemplateMenu) => {
    try {
      const response = await api.getTemplateMenu(template.id);
      const fullTemplate = response.data?.data?.templateMenu;
      if (!fullTemplate) {
        toast.error('Template details not found');
        return;
      }

      setEditingTemplateId(fullTemplate.id);
      setTemplateForm({
        name: fullTemplate.name || '',
        setupCost:
          fullTemplate.setupCost !== null && fullTemplate.setupCost !== undefined
            ? String(fullTemplate.setupCost)
            : '',
        ratePerPlate:
          fullTemplate.ratePerPlate !== null && fullTemplate.ratePerPlate !== undefined
            ? String(fullTemplate.ratePerPlate)
            : '',
        itemIds: fullTemplate.items?.map((entry: any) => entry.item?.id).filter(Boolean) || [],
      });
      setTemplateItemSearch('');
      setShowTemplatePrompt(true);
    } catch (error) {
      toast.error('Failed to load template menu details');
    }
  };

  const submitTemplate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!templateForm.name.trim() || templateForm.itemIds.length === 0) {
      toast.error('Template menu name and selected items are required');
      return;
    }
    try {
      setSavingTemplate(true);
      const payload = {
        name: templateForm.name.trim(),
        setupCost: templateForm.setupCost ? Number(templateForm.setupCost) : undefined,
        ratePerPlate: templateForm.ratePerPlate ? Number(templateForm.ratePerPlate) : undefined,
        itemIds: templateForm.itemIds,
      };
      if (editingTemplateId) {
        await api.updateTemplateMenu(editingTemplateId, payload);
      } else {
        await api.createTemplateMenu(payload);
      }
      toast.success(editingTemplateId ? 'Template menu updated' : 'Template menu created');
      setShowTemplatePrompt(false);
      setEditingTemplateId(null);
      setTemplateForm(initialTemplateForm);
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          (editingTemplateId
            ? 'Failed to update template menu'
            : 'Failed to create template menu')
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const toggleTemplateItem = (itemId: string) => {
    setTemplateForm((prev) => {
      const exists = prev.itemIds.includes(itemId);
      return {
        ...prev,
        itemIds: exists
          ? prev.itemIds.filter((id) => id !== itemId)
          : [...prev.itemIds, itemId],
      };
    });
  };

  const handleItemImageUpload = (file: File | undefined) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('Image must be 5 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setItemForm((prev) => ({
        ...prev,
        photo: typeof reader.result === 'string' ? reader.result : '',
        photoFileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const filteredTemplateSourceItems = useMemo(() => {
    const query = templateItemSearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const itemTypeName = item.itemType?.name || '';
      return (
        item.name.toLowerCase().includes(query) ||
        itemTypeName.toLowerCase().includes(query)
      );
    });
  }, [items, templateItemSearch]);

  const filteredItemVendorOptions = useMemo(() => {
    const query = itemVendorSearch.trim().toLowerCase();
    if (!query) return vendorOptions;
    return vendorOptions.filter((vendor) => vendor.name.toLowerCase().includes(query));
  }, [vendorOptions, itemVendorSearch]);

  const groupedTemplateItems = useMemo(() => {
    const map = new Map<string, Item[]>();
    filteredTemplateSourceItems.forEach((item) => {
      const group = item.itemType?.name || 'Other';
      const bucket = map.get(group) || [];
      bucket.push(item);
      map.set(group, bucket);
    });
    return Array.from(map.entries());
  }, [filteredTemplateSourceItems]);

  const selectedTemplateItemsByGroup = useMemo(() => {
    const selectedIds = new Set(templateForm.itemIds);
    const selected = items.filter((item) => selectedIds.has(item.id));
    const map = new Map<string, Item[]>();
    selected.forEach((item) => {
      const group = item.itemType?.name || 'Other';
      const bucket = map.get(group) || [];
      bucket.push(item);
      map.set(group, bucket);
    });
    return Array.from(map.entries());
  }, [items, templateForm.itemIds]);

  const removeItemType = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete this item type?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.deleteItemType(id);
      toast.success('Item type deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete item type');
    }
  };

  const removeItem = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete this item?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.deleteItem(id);
      toast.success('Item deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete item');
    }
  };

  const removeTemplateMenu = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete this template menu?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.deleteTemplateMenu(id);
      toast.success('Template menu deleted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete template menu');
    }
  };

  const openItemRecipeManager = async (item: Item) => {
    try {
      const response = await api.getItemRecipes(item.id);
      setRecipeItem(item);
      setItemRecipes(response.data?.data?.recipes || []);
      setRecipeForm({
        ingredientId: ingredientOptions[0]?.id || '',
        quantity: '',
        unit: 'g',
      });
      setEditingRecipeId(null);
      setShowRecipePrompt(true);
    } catch (error) {
      toast.error('Failed to load recipe details');
    }
  };

  const editRecipe = (recipe: ItemRecipeRow) => {
    setEditingRecipeId(recipe.id);
    setRecipeForm({
      ingredientId: recipe.ingredientId,
      quantity: String(recipe.quantity),
      unit: recipe.unit,
    });
  };

  const submitRecipe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipeItem) return;
    if (!recipeForm.ingredientId || !recipeForm.quantity) {
      toast.error('Ingredient and quantity are required');
      return;
    }

    try {
      setSavingRecipe(true);
      const payload = {
        ingredientId: recipeForm.ingredientId,
        quantity: Number(recipeForm.quantity),
        unit: recipeForm.unit,
      };
      if (editingRecipeId) {
        await api.updateItemRecipe(recipeItem.id, editingRecipeId, payload);
      } else {
        await api.addItemRecipe(recipeItem.id, payload);
      }
      const refreshed = await api.getItemRecipes(recipeItem.id);
      setItemRecipes(refreshed.data?.data?.recipes || []);
      setRecipeForm({
        ingredientId: ingredientOptions[0]?.id || '',
        quantity: '',
        unit: 'g',
      });
      setEditingRecipeId(null);
      await loadData();
      toast.success(editingRecipeId ? 'Recipe updated' : 'Recipe ingredient added');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save recipe');
    } finally {
      setSavingRecipe(false);
    }
  };

  const removeRecipe = async (recipeId: string) => {
    if (!recipeItem) return;
    if (!(await confirmDialog({ title: 'Delete this recipe ingredient?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.deleteItemRecipe(recipeItem.id, recipeId);
      const refreshed = await api.getItemRecipes(recipeItem.id);
      setItemRecipes(refreshed.data?.data?.recipes || []);
      await loadData();
      toast.success('Recipe ingredient deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete recipe ingredient');
    }
  };

  const openItemVendorsManager = async (item: Item) => {
    try {
      const response = await api.getItemVendors(item.id);
      setVendorItem(item);
      setItemVendors(response.data?.data?.supplies || []);
      setItemVendorForm({
        vendorId: vendorOptions[0]?.id || '',
        price: '',
        unit: 'piece',
      });
      setEditingItemVendorId(null);
      setShowItemVendorsPrompt(true);
    } catch (error) {
      toast.error('Failed to load item vendors');
    }
  };

  const editItemVendor = (supply: ItemVendorSupplyRow) => {
    setEditingItemVendorId(supply.id);
    setItemVendorForm({
      vendorId: supply.vendorId,
      price: String(supply.price),
      unit: supply.unit,
    });
  };

  const submitItemVendor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendorItem) return;
    if (!itemVendorForm.vendorId || !itemVendorForm.price) {
      toast.error('Vendor and price are required');
      return;
    }
    try {
      setSavingItemVendor(true);
      const payload = {
        vendorId: itemVendorForm.vendorId,
        price: Number(itemVendorForm.price),
        unit: itemVendorForm.unit,
      };
      if (editingItemVendorId) {
        await api.updateItemVendor(vendorItem.id, editingItemVendorId, payload);
      } else {
        await api.addItemVendor(vendorItem.id, payload);
      }
      const refreshed = await api.getItemVendors(vendorItem.id);
      setItemVendors(refreshed.data?.data?.supplies || []);
      setItemVendorForm({
        vendorId: vendorOptions[0]?.id || '',
        price: '',
        unit: 'piece',
      });
      setEditingItemVendorId(null);
      await loadData();
      toast.success(editingItemVendorId ? 'Item vendor updated' : 'Item vendor added');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save item vendor');
    } finally {
      setSavingItemVendor(false);
    }
  };

  const removeItemVendor = async (supplyId: string) => {
    if (!vendorItem) return;
    if (!(await confirmDialog({ title: 'Delete this item vendor mapping?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.deleteItemVendor(vendorItem.id, supplyId);
      const refreshed = await api.getItemVendors(vendorItem.id);
      setItemVendors(refreshed.data?.data?.supplies || []);
      await loadData();
      toast.success('Item vendor mapping deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete item vendor mapping');
    }
  };

  return (
    <>
    <div className="ops-route ops-catalog-route">
      <Toolbar
        title="Menu & Items"
        stats={[
          { label: 'Item types', value: itemTypes.length },
          { label: 'Items', value: items.length },
          { label: 'Menu templates', value: templateMenus.length },
        ]}
      />

      {!canViewItemType && !canViewItem && !canViewTemplate && (
        <div className="card border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
          You do not have permission to view menu tables.
        </div>
      )}

      <FormPromptModal
        open={showTypePrompt}
        title={editingTypeId ? 'Edit Item Type' : 'Item Types'}
        onClose={() => {
          setShowTypePrompt(false);
          setEditingTypeId(null);
          setTypeForm(initialTypeForm);
        }}
        widthClass="max-w-2xl"
      >
        <form className="space-y-4" onSubmit={submitType}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">
                Item Type Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="Item Type Name"
                value={typeForm.name}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">
                Order <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                type="number"
                min={0}
                value={typeForm.order}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, order: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowTypePrompt(false);
                setEditingTypeId(null);
                setTypeForm(initialTypeForm);
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={savingType}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingType ? 'Saving...' : 'Submit'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      <FormPromptModal
        open={showItemPrompt}
        title={editingItemId ? 'Edit Item' : 'Items'}
        onClose={() => {
          setShowItemPrompt(false);
          setEditingItemId(null);
          setItemVendorDrafts([]);
          setOriginalItemVendorSupplies([]);
          setItemVendorSearch('');
        }}
        widthClass="max-w-5xl"
      >
        <form className="space-y-4" onSubmit={submitItem}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="Item Name"
                value={itemForm.name}
                onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">
                  Select Item Type <span className="text-red-500">*</span>
                </label>
                {canAddItemType && (
                  <button
                    type="button"
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                    onClick={openCreateType}
                  >
                    <Plus size={12} />
                    Add Type
                  </button>
                )}
              </div>
              <select
                className="input"
                value={itemForm.itemTypeId}
                onChange={(e) => setItemForm((prev) => ({ ...prev, itemTypeId: e.target.value }))}
                required
              >
                <option value="">Select item type</option>
                {itemTypes.map((itemType) => (
                  <option key={itemType.id} value={itemType.id}>
                    {itemType.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Setup Cost</label>
              <input
                className="input"
                placeholder="Setup Cost"
                value={itemForm.setupCost}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, setupCost: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">Item Cost</label>
              <input
                className="input"
                placeholder="Item Cost"
                value={itemForm.itemCost}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, itemCost: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">
                Points <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 1.5"
                value={itemForm.points}
                onChange={(e) => setItemForm((prev) => ({ ...prev, points: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input min-h-[90px]"
                placeholder="Description"
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Image</label>
              <label className="block rounded-2xl border-2 border-dashed border-[var(--border-2)] bg-[var(--surface-2)] p-4 hover:border-primary-300 transition cursor-pointer">
                <div className="text-sm text-[var(--text-2)]">
                  {itemForm.photoFileName
                    ? `Selected: ${itemForm.photoFileName}`
                    : 'Drag and drop or select image file'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleItemImageUpload(e.target.files?.[0])}
                />
              </label>
            </div>
            <div className="md:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <p className="text-sm font-semibold text-[var(--text-1)]">Link Vendors</p>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  Search, select multiple vendors and set per-unit rates.
                </p>
              </div>
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
                  <input
                    className="input h-9 pl-9"
                    placeholder="Search vendors..."
                    value={itemVendorSearch}
                    onChange={(event) => setItemVendorSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
                {filteredItemVendorOptions.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 12px' }}>
                    <div className="empty-state-icon">
                      <ListChecks size={20} />
                    </div>
                    <p className="empty-state-title">No vendors available</p>
                    <p className="empty-state-desc">Add vendors to link them to this item.</p>
                  </div>
                ) : (
                  filteredItemVendorOptions.map((vendor) => {
                    const selected = isItemVendorSelected(vendor.id);
                    const draft = getItemVendorDraft(vendor.id);
                    return (
                      <div
                        key={`item-vendor-draft-${vendor.id}`}
                        className="px-3 py-2 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px] gap-2 items-center"
                      >
                        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-2)]">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleItemVendorDraft(vendor.id)}
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
                                updateItemVendorDraft(vendor.id, {
                                  price: event.target.value,
                                })
                              }
                            />
                            <select
                              className="input h-9"
                              value={draft?.unit || 'piece'}
                              onChange={(event) =>
                                updateItemVendorDraft(vendor.id, {
                                  unit: event.target.value,
                                })
                              }
                            >
                              {recipeUnits.map((unit) => (
                                <option key={`item-vendor-unit-${vendor.id}-${unit}`} value={unit}>
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
                setShowItemPrompt(false);
                setEditingItemId(null);
                setItemVendorDrafts([]);
                setOriginalItemVendorSupplies([]);
                setItemVendorSearch('');
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={savingItem}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingItem ? 'Saving...' : 'Submit'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      <FormPromptModal
        open={showTemplatePrompt}
        title={editingTemplateId ? 'Edit Menu Template' : 'Menu Template'}
        onClose={() => {
          setShowTemplatePrompt(false);
          setEditingTemplateId(null);
          setTemplateForm(initialTemplateForm);
          setTemplateItemSearch('');
        }}
        widthClass="max-w-6xl"
      >
        <form className="space-y-4" onSubmit={submitTemplate}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">
                Menu Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="Menu Name"
                value={templateForm.name}
                onChange={(e) =>
                  setTemplateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="label">
                Setup Cost (Auto: ₹0) <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                type="number"
                min={0}
                value={templateForm.setupCost}
                onChange={(e) =>
                  setTemplateForm((prev) => ({ ...prev, setupCost: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">
                Rate Per Plate (Auto: ₹0) <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                type="number"
                min={0}
                value={templateForm.ratePerPlate}
                onChange={(e) =>
                  setTemplateForm((prev) => ({ ...prev, ratePerPlate: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">
                Select Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm flex items-center gap-1"
                onClick={openCreateItem}
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>
            <p className="text-sm text-primary-700 mb-2">
              {templateForm.itemIds.length} items
              {templateForm.itemIds.length > 0 && (() => {
                const totalPts = templateForm.itemIds.reduce((sum, id) => {
                  const item = items.find((i) => i.id === id);
                  const pts = item?.points ?? item?.point ?? 0;
                  return sum + (Number.isFinite(Number(pts)) ? Number(pts) : 0);
                }, 0);
                const roundedPts = Math.round(totalPts * 100) / 100;
                return <span className="ml-1 font-semibold text-teal-700 dark:text-teal-200">· {roundedPts} pts</span>;
              })()}
            </p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="border border-[var(--border)] rounded-xl p-3">
                <input
                  className="input mb-3"
                  placeholder="Search..."
                  value={templateItemSearch}
                  onChange={(e) => setTemplateItemSearch(e.target.value)}
                />
                <div className="max-h-[340px] overflow-y-auto rounded-lg border border-[var(--border)]">
                  {groupedTemplateItems.length === 0 ? (
                    <div className="empty-state" style={{ padding: '20px 12px' }}>
                      <div className="empty-state-icon">
                        <Search size={20} />
                      </div>
                      <p className="empty-state-title">No matching items</p>
                      <p className="empty-state-desc">Try another keyword.</p>
                    </div>
                  ) : (
                    groupedTemplateItems.map(([group, grouped]) => (
                      <div key={group}>
                        <div className="px-3 py-2 text-sm font-semibold text-[var(--text-1)] bg-primary-50 dark:bg-primary-900/40 border-b border-[var(--border)]">
                          {group}
                        </div>
                        {grouped.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-2)] border-b border-[var(--border)] last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={templateForm.itemIds.includes(item.id)}
                              onChange={() => toggleTemplateItem(item.id)}
                            />
                            <span>{item.name}</span>
                          </label>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-[var(--border)] rounded-xl p-3">
                <div className="max-h-[340px] overflow-y-auto space-y-3">
                  {selectedTemplateItemsByGroup.length === 0 ? (
                    <div className="empty-state" style={{ padding: '20px 12px' }}>
                      <div className="empty-state-icon">
                        <Soup size={20} />
                      </div>
                      <p className="empty-state-title">No items selected</p>
                      <p className="empty-state-desc">Choose items to build this template.</p>
                    </div>
                  ) : (
                    selectedTemplateItemsByGroup.map(([group, grouped]) => (
                      <div key={`selected-${group}`} className="space-y-2">
                        <p className="text-sm font-semibold text-[var(--text-1)]">{group.toUpperCase()}</p>
                        <div className="flex flex-wrap gap-2">
                          {grouped.map((item) => (
                            <span
                              key={`chip-${item.id}`}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-2)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                            >
                              {item.name}
                              <button
                                type="button"
                                className="text-red-600"
                                onClick={() => toggleTemplateItem(item.id)}
                                aria-label={`Remove ${item.name}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowTemplatePrompt(false);
                setEditingTemplateId(null);
                setTemplateForm(initialTemplateForm);
                setTemplateItemSearch('');
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={savingTemplate}>
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savingTemplate ? 'Saving...' : 'Submit'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      <FormPromptModal
        open={showRecipePrompt}
        title={recipeItem ? `Recipe · ${recipeItem.name}` : 'Item Recipe'}
        onClose={() => {
          setShowRecipePrompt(false);
          setRecipeItem(null);
          setItemRecipes([]);
          setEditingRecipeId(null);
          setRecipeForm({
            ingredientId: ingredientOptions[0]?.id || '',
            quantity: '',
            unit: 'g',
          });
        }}
        widthClass="max-w-5xl"
      >
        {!recipeItem ? null : (
          <div className="space-y-4">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {itemRecipes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-sm text-[var(--text-3)]">
                        No ingredients mapped in this recipe.
                      </td>
                    </tr>
                  ) : (
                    itemRecipes.map((recipe) => (
                      <tr key={recipe.id}>
                        <td>{recipe.ingredient?.name || '-'}</td>
                        <td>{recipe.quantity}</td>
                        <td>{recipe.unit}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="p-2 text-[var(--text-3)] hover:text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                              onClick={() => editRecipe(recipe)}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-2 text-[var(--text-3)] hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-500/10 rounded-lg"
                              onClick={() => removeRecipe(recipe.id)}
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

            <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={submitRecipe}>
              <div>
                <label className="label">Ingredient</label>
                <select
                  className="input"
                  value={recipeForm.ingredientId}
                  onChange={(e) =>
                    setRecipeForm((prev) => ({ ...prev, ingredientId: e.target.value }))
                  }
                  required
                >
                  <option value="">Select ingredient</option>
                  {ingredientOptions.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={recipeForm.quantity}
                  onChange={(e) =>
                    setRecipeForm((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  className="input"
                  value={recipeForm.unit}
                  onChange={(e) =>
                    setRecipeForm((prev) => ({ ...prev, unit: e.target.value }))
                  }
                >
                  {recipeUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn btn-primary w-full" disabled={savingRecipe}>
                  {savingRecipe ? 'Saving...' : editingRecipeId ? 'Update' : 'Add Ingredient'}
                </button>
              </div>
            </form>
          </div>
        )}
      </FormPromptModal>

      <FormPromptModal
        open={showItemVendorsPrompt}
        title={vendorItem ? `Vendors · ${vendorItem.name}` : 'Item Vendors'}
        onClose={() => {
          setShowItemVendorsPrompt(false);
          setVendorItem(null);
          setItemVendors([]);
          setEditingItemVendorId(null);
          setItemVendorForm({
            vendorId: vendorOptions[0]?.id || '',
            price: '',
            unit: 'piece',
          });
        }}
        widthClass="max-w-5xl"
      >
        {!vendorItem ? null : (
          <div className="space-y-4">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Price</th>
                    <th>Unit</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {itemVendors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-sm text-[var(--text-3)]">
                        No vendors linked to this item.
                      </td>
                    </tr>
                  ) : (
                    itemVendors.map((supply) => (
                      <tr key={supply.id}>
                        <td>{supply.vendor?.name || '-'}</td>
                        <td>{formatINR(Number(supply.price || 0))}</td>
                        <td>{supply.unit}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="p-2 text-[var(--text-3)] hover:text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                              onClick={() => editItemVendor(supply)}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-2 text-[var(--text-3)] hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-500/10 rounded-lg"
                              onClick={() => removeItemVendor(supply.id)}
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

            <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={submitItemVendor}>
              <div>
                <label className="label">Vendor</label>
                <select
                  className="input"
                  value={itemVendorForm.vendorId}
                  onChange={(e) =>
                    setItemVendorForm((prev) => ({ ...prev, vendorId: e.target.value }))
                  }
                  required
                >
                  <option value="">Select vendor</option>
                  {vendorOptions.map((vendor) => (
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
                  value={itemVendorForm.price}
                  onChange={(e) =>
                    setItemVendorForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  className="input"
                  value={itemVendorForm.unit}
                  onChange={(e) =>
                    setItemVendorForm((prev) => ({ ...prev, unit: e.target.value }))
                  }
                >
                  {recipeUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={savingItemVendor}
                >
                  {savingItemVendor ? 'Saving...' : editingItemVendorId ? 'Update' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        )}
      </FormPromptModal>

      {(canViewItemType || canViewItem || canViewTemplate) && (
        <div className="ops-section-tabs" role="tablist" aria-label="Menu sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeMenuSection === 'itemType' && !isIngredientsPage && !isVendorsPage}
              onClick={() => navigateToMenuSection('itemType')}
              disabled={!canViewItemType}
              className={`ops-section-tab ${activeMenuSection === 'itemType' && canViewItemType && !isIngredientsPage && !isVendorsPage ? 'active' : ''}`}
            >
              Item Types
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMenuSection === 'item' && !isIngredientsPage && !isVendorsPage}
              onClick={() => navigateToMenuSection('item')}
              disabled={!canViewItem}
              className={`ops-section-tab ${activeMenuSection === 'item' && canViewItem && !isIngredientsPage && !isVendorsPage ? 'active' : ''}`}
            >
              Items
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMenuSection === 'template' && !isIngredientsPage && !isVendorsPage}
              onClick={() => navigateToMenuSection('template')}
              disabled={!canViewTemplate}
              className={`ops-section-tab ${activeMenuSection === 'template' && canViewTemplate && !isIngredientsPage && !isVendorsPage ? 'active' : ''}`}
            >
              Menu templates
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isIngredientsPage}
              onClick={() => router.push('/dashboard/menu/ingredients')}
              disabled={!canViewItem}
              className={`ops-section-tab ${isIngredientsPage && canViewItem ? 'active' : ''}`}
            >
              Ingredients
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isVendorsPage}
              onClick={() => router.push('/dashboard/menu/vendors')}
              disabled={!canViewItem}
              className={`ops-section-tab ${isVendorsPage && canViewItem ? 'active' : ''}`}
            >
              Vendors
            </button>
        </div>
      )}

      <div className="ops-catalog-panels grid grid-cols-1">
        <div
          className={`card ${
            activeMenuSection === 'itemType' && canViewItemType ? '' : 'hidden'
          }`}
        >
          <div className="page-head mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-1)]">Item types</h2>
            {canAddItemType && (
              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                onClick={openCreateType}
              >
                <Layers className="w-4 h-4" />
                Add
              </button>
            )}
          </div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
              <input
                className="input pl-9"
                value={itemTypeGlobalSearch}
                onChange={(e) => setItemTypeGlobalSearch(e.target.value)}
                placeholder="Overall search in item types..."
              />
            </div>
            <button type="button" className="btn btn-secondary flex items-center justify-center h-[42px] px-3 md:px-4" onClick={() => setShowTypeFilters(true)}>
              <Filter className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline">Filters</span>
              {Object.values(itemTypeColumnSearch).filter(Boolean).length > 0 && (
                 <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                   {Object.values(itemTypeColumnSearch).filter(Boolean).length}
                 </span>
              )}
            </button>
          </div>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : filteredItemTypes.length === 0 ? (
            <EmptyState
              icon={itemTypeGlobalSearch ? Search : Layers}
              variant={
                itemTypeGlobalSearch
                  ? 'search'
                  : Object.values(itemTypeColumnSearch).some(Boolean)
                    ? 'filter'
                    : 'page'
              }
              title={
                itemTypeGlobalSearch
                  ? 'No types match your search'
                  : Object.values(itemTypeColumnSearch).some(Boolean)
                    ? 'No matches'
                    : 'No item types found'
              }
              description={
                itemTypeGlobalSearch || Object.values(itemTypeColumnSearch).some(Boolean)
                  ? `"${itemTypeGlobalSearch || Object.values(itemTypeColumnSearch).find(Boolean)}" returned no results.`
                  : 'Start by creating categories for your menu items.'
              }
              action={
                itemTypeGlobalSearch
                  ? { label: 'Clear search', onClick: () => setItemTypeGlobalSearch('') }
                  : Object.values(itemTypeColumnSearch).some(Boolean)
                    ? { label: 'Clear filters', onClick: () => setItemTypeColumnSearch(initialTypeColumnSearch) }
                    : canAddItemType
                      ? { label: 'Add Type', onClick: openCreateType }
                      : undefined
              }
            />
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden mobile-card-list">
                {paginatedItemTypes.map((itemType) => (
                  <div key={itemType.id} className="mobile-card">
                    <div className="mobile-card-header">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="mobile-card-title">{itemType.name}</div>
                      </div>
                    </div>
                    <div className="mobile-card-meta" style={{ marginTop: 6 }}>
                      <span className="mobile-card-meta-item">Order: {itemType.order ?? itemType.displayOrder ?? 0}</span>
                      <span className="mobile-card-meta-item">{itemType._count?.items || 0} items</span>
                    </div>
                    {(canEditItemType || canDeleteItemType) && (
                      <div className="mobile-card-actions">
                        {canEditItemType && (
                          <button type="button" className="mobile-card-action-btn" onClick={() => openEditType(itemType)}>
                            <Edit style={{ width: 14, height: 14 }} aria-hidden="true" />
                            Edit
                          </button>
                        )}
                        {canDeleteItemType && (
                          <button type="button" className="mobile-card-action-btn text-red-600 dark:text-red-400" onClick={() => removeItemType(itemType.id)}>
                            <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block table-shell">
              <table className="data-table">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <SortableHeader
                      label="Type"
                      sortKey="name"
                      sort={itemTypeSort}
                      onSort={(key) => setItemTypeSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Order"
                      sortKey="order"
                      sort={itemTypeSort}
                      onSort={(key) => setItemTypeSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Items"
                      sortKey="itemCount"
                      sort={itemTypeSort}
                      onSort={(key) => setItemTypeSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <th className="text-right py-3 px-2 text-sm font-semibold text-[var(--text-2)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItemTypes.map((itemType) => (
                    <tr
                      key={itemType.id}
                      className="ops-click-row border-b border-[var(--border)]"
                      onClick={() => canEditItemType && openEditType(itemType)}
                      onKeyDown={(event) => {
                        if (!canEditItemType) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openEditType(itemType);
                        }
                      }}
                      tabIndex={canEditItemType ? 0 : undefined}
                    >
                      <td className="py-3 px-2 main">
                        <p className="text-sm text-[var(--text-1)]">{itemType.name}</p>
                      </td>
                      <td className="py-3 px-2 text-sm text-[var(--text-2)]">
                        {itemType.order ?? itemType.displayOrder ?? 0}
                      </td>
                      <td className="py-3 px-2 text-sm text-[var(--text-2)]">{itemType._count?.items || 0}</td>
                      <td className="ops-secondary-actions py-3 px-2 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {canEditItemType && (
                            <button
                              className="p-2 text-[var(--text-3)] hover:text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                              onClick={() => openEditType(itemType)}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteItemType && (
                            <button
                              className="p-2 text-[var(--text-3)] hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-500/10 rounded-lg"
                              onClick={() => removeItemType(itemType.id)}
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
              </div>
              <TablePagination
                currentPage={itemTypePage}
                totalPages={itemTypeTotalPages}
                totalItems={filteredItemTypes.length}
                pageSize={ITEM_TYPES_PAGE_SIZE}
                itemLabel="item types"
                onPageChange={setItemTypePage}
              />
            </>
          )}
        </div>

        <div
          className={`card ${
            activeMenuSection === 'item' && canViewItem ? '' : 'hidden'
          }`}
        >
          <div className="page-head mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-1)]">Items</h2>
            {canAddItem && (
              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                onClick={openCreateItem}
              >
                <Soup className="w-4 h-4" />
                Add
              </button>
            )}
          </div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
              <input
                className="input pl-9"
                value={itemsGlobalSearch}
                onChange={(e) => setItemsGlobalSearch(e.target.value)}
                placeholder="Overall search in items..."
              />
            </div>
            <button type="button" className="btn btn-secondary flex items-center justify-center h-[42px] px-3 md:px-4" onClick={() => setShowItemFilters(true)}>
              <Filter className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline">Filters</span>
              {Object.values(itemsColumnSearch).filter(Boolean).length > 0 && (
                 <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                   {Object.values(itemsColumnSearch).filter(Boolean).length}
                 </span>
              )}
            </button>
          </div>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={itemsGlobalSearch ? Search : Soup}
              variant={
                itemsGlobalSearch
                  ? 'search'
                  : Object.values(itemsColumnSearch).some(Boolean)
                    ? 'filter'
                    : 'page'
              }
              title={
                itemsGlobalSearch
                  ? 'No items match your search'
                  : Object.values(itemsColumnSearch).some(Boolean)
                    ? 'No matches'
                    : 'No items found'
              }
              description={
                itemsGlobalSearch || Object.values(itemsColumnSearch).some(Boolean)
                  ? `"${itemsGlobalSearch || Object.values(itemsColumnSearch).find(Boolean)}" returned no results.`
                  : 'Add dishes to build your menu database.'
              }
              action={
                itemsGlobalSearch
                  ? { label: 'Clear search', onClick: () => setItemsGlobalSearch('') }
                  : Object.values(itemsColumnSearch).some(Boolean)
                    ? { label: 'Clear filters', onClick: () => setItemsColumnSearch(initialItemColumnSearch) }
                    : canAddItem
                      ? { label: 'Add Item', onClick: openCreateItem }
                      : undefined
              }
            />
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden mobile-card-list">
                {paginatedItems.map((item) => (
                  <div key={item.id} className="mobile-card">
                    <div className="mobile-card-header">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="mobile-card-title">{item.name}</div>
                        <div className="mobile-card-subtitle">{item.itemType?.name || '—'}</div>
                      </div>
                      <span className="mobile-card-meta-item">{item.points ?? item.point ?? '-'} pts</span>
                    </div>
                    <div className="mobile-card-meta" style={{ marginTop: 6 }}>
                      <span className="mobile-card-meta-item">{item.isVeg ? 'Veg' : 'Non-veg'}</span>
                      <span className="mobile-card-meta-item">Recipe: {item._count?.itemRecipes || 0}</span>
                      <span className="mobile-card-meta-item">Vendors: {item._count?.vendorSupplies || 0}</span>
                    </div>
                    {(canEditItem || canDeleteItem) && (
                      <div className="mobile-card-actions">
                        {canEditItem && (
                          <button type="button" className="mobile-card-action-btn" onClick={() => openItemRecipeManager(item)}>
                            Recipe
                          </button>
                        )}
                        {canEditItem && (
                          <button type="button" className="mobile-card-action-btn" onClick={() => openItemVendorsManager(item)}>
                            Vendors
                          </button>
                        )}
                        {canEditItem && (
                          <button type="button" className="mobile-card-action-btn" onClick={() => { void openEditItem(item); }}>
                            <Edit style={{ width: 14, height: 14 }} aria-hidden="true" />
                            Edit
                          </button>
                        )}
                        {canDeleteItem && (
                          <button type="button" className="mobile-card-action-btn text-red-600 dark:text-red-400" onClick={() => removeItem(item.id)}>
                            <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block table-shell">
              <table className="data-table">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <SortableHeader
                      label="Item"
                      sortKey="name"
                      sort={itemSort}
                      onSort={(key) => setItemSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Type"
                      sortKey="type"
                      sort={itemSort}
                      onSort={(key) => setItemSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Points"
                      sortKey="points"
                      sort={itemSort}
                      onSort={(key) => setItemSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <th className="text-right py-3 px-2 text-sm font-semibold text-[var(--text-2)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="ops-click-row border-b border-[var(--border)]"
                      onClick={() => {
                        if (canEditItem) void openEditItem(item);
                      }}
                      onKeyDown={(event) => {
                        if (!canEditItem) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          void openEditItem(item);
                        }
                      }}
                      tabIndex={canEditItem ? 0 : undefined}
                    >
                      <td className="py-3 px-2 main">
                        <p className="text-sm text-[var(--text-1)]">{item.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)]">
                          <span>{item.isVeg ? 'Veg' : 'Non-veg'}</span>
                          <span className="inline-flex items-center rounded-full bg-[var(--surface-3)] px-2 py-0.5">
                            Recipe: {item._count?.itemRecipes || 0}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-[var(--surface-3)] px-2 py-0.5">
                            Vendors: {item._count?.vendorSupplies || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm text-[var(--text-2)]">
                        {item.itemType?.name || '-'}
                      </td>
                      <td className="py-3 px-2 text-sm text-[var(--text-2)]">
                        {item.points ?? item.point ?? '-'}
                      </td>
                      <td className="ops-secondary-actions py-3 px-2 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {canEditItem && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => openItemRecipeManager(item)}
                            >
                              Recipe
                            </button>
                          )}
                          {canEditItem && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => openItemVendorsManager(item)}
                            >
                              Vendors
                            </button>
                          )}
                          {canEditItem && (
                            <button
                              className="p-2 text-[var(--text-3)] hover:text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                              onClick={() => { void openEditItem(item); }}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteItem && (
                            <button
                              className="p-2 text-[var(--text-3)] hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-500/10 rounded-lg"
                              onClick={() => removeItem(item.id)}
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
              </div>
              <TablePagination
                currentPage={itemPage}
                totalPages={itemTotalPages}
                totalItems={filteredItems.length}
                pageSize={ITEMS_PAGE_SIZE}
                itemLabel="items"
                onPageChange={setItemPage}
              />
            </>
          )}
        </div>

        <div
          className={`card ${
            activeMenuSection === 'template' && canViewTemplate ? '' : 'hidden'
          }`}
        >
          <div className="page-head mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-1)]">Menu templates</h2>
            {canAddTemplate && (
              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                onClick={openCreateTemplate}
              >
                <ListChecks className="w-4 h-4" />
                Add
              </button>
            )}
          </div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
              <input
                className="input pl-9"
                value={templateGlobalSearch}
                onChange={(e) => setTemplateGlobalSearch(e.target.value)}
                placeholder="Overall search in menu templates..."
              />
            </div>
            <button type="button" className="btn btn-secondary flex items-center justify-center h-[42px] px-3 md:px-4" onClick={() => setShowTemplateFilters(true)}>
              <Filter className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline">Filters</span>
              {Object.values(templateColumnSearch).filter(Boolean).length > 0 && (
                 <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                   {Object.values(templateColumnSearch).filter(Boolean).length}
                 </span>
              )}
            </button>
          </div>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : filteredTemplateMenus.length === 0 ? (
            <EmptyState
              icon={templateGlobalSearch ? Search : ListChecks}
              variant={
                templateGlobalSearch
                  ? 'search'
                  : Object.values(templateColumnSearch).some(Boolean)
                    ? 'filter'
                    : 'page'
              }
              title={
                templateGlobalSearch
                  ? 'No menu templates match your search'
                  : Object.values(templateColumnSearch).some(Boolean)
                    ? 'No matches'
                    : 'No menu templates found'
              }
              description={
                templateGlobalSearch || Object.values(templateColumnSearch).some(Boolean)
                  ? `"${templateGlobalSearch || Object.values(templateColumnSearch).find(Boolean)}" returned no results.`
                  : 'Create predefined menu templates for quick booking.'
              }
              action={
                templateGlobalSearch
                  ? { label: 'Clear search', onClick: () => setTemplateGlobalSearch('') }
                  : Object.values(templateColumnSearch).some(Boolean)
                    ? { label: 'Clear filters', onClick: () => setTemplateColumnSearch(initialTemplateColumnSearch) }
                    : canAddTemplate
                      ? { label: 'Add menu template', onClick: openCreateTemplate }
                      : undefined
              }
            />
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden mobile-card-list">
                {paginatedTemplateMenus.map((template) => {
                  const totalPoints = (template.items || []).reduce((sum, i) => {
                    const pts = i.item.points ?? i.item.point ?? 0;
                    return sum + (Number.isFinite(Number(pts)) ? Number(pts) : 0);
                  }, 0);
                  const roundedPoints = Math.round(totalPoints * 100) / 100;
                  return (
                    <div key={template.id} className="mobile-card">
                      <div className="mobile-card-header">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="mobile-card-title">{template.name}</div>
                          <div className="mobile-card-subtitle">{template.category || 'General'}</div>
                        </div>
                        <span className="mobile-card-meta-item" style={{ color: 'var(--teal-700)', fontWeight: 600 }}>
                          {roundedPoints} pts
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Rate / Plate</span>
                        <span className="mobile-card-value">{formatINR(template.ratePerPlate || 0)}</span>
                      </div>
                      {(canEditTemplate || canDeleteTemplate) && (
                        <div className="mobile-card-actions">
                          {canEditTemplate && (
                            <button type="button" className="mobile-card-action-btn" onClick={() => { void openEditTemplate(template); }}>
                              <Edit style={{ width: 14, height: 14 }} aria-hidden="true" />
                              Edit
                            </button>
                          )}
                          {canDeleteTemplate && (
                            <button type="button" className="mobile-card-action-btn text-red-600 dark:text-red-400" onClick={() => removeTemplateMenu(template.id)}>
                              <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block table-shell">
              <table className="data-table">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <SortableHeader
                      label="Name"
                      sortKey="name"
                      sort={templateSort}
                      onSort={(key) => setTemplateSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Category"
                      sortKey="category"
                      sort={templateSort}
                      onSort={(key) => setTemplateSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Rate / Plate"
                      sortKey="ratePerPlate"
                      sort={templateSort}
                      onSort={(key) => setTemplateSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Total Points"
                      sortKey="totalPoints"
                      sort={templateSort}
                      onSort={(key) => setTemplateSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-2 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <th className="text-right py-3 px-2 text-sm font-semibold text-[var(--text-2)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTemplateMenus.map((template) => {
                    const totalPoints = (template.items || []).reduce((sum, i) => {
                      const pts = i.item.points ?? i.item.point ?? 0;
                      return sum + (Number.isFinite(Number(pts)) ? Number(pts) : 0);
                    }, 0);
                    const roundedPoints = Math.round(totalPoints * 100) / 100;

                    return (
                      <tr
                        key={template.id}
                        className="ops-click-row border-b border-[var(--border)]"
                        onClick={() => {
                          if (canEditTemplate) void openEditTemplate(template);
                        }}
                        onKeyDown={(event) => {
                          if (!canEditTemplate) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            void openEditTemplate(template);
                          }
                        }}
                        tabIndex={canEditTemplate ? 0 : undefined}
                      >
                        <td className="py-3 px-2 text-sm text-[var(--text-1)] main">{template.name}</td>
                        <td className="py-3 px-2 text-sm text-[var(--text-2)]">{template.category || 'General'}</td>
                        <td className="py-3 px-2 text-sm text-[var(--text-2)] num">
                          {formatINR(template.ratePerPlate || 0)}
                        </td>
                        <td className="py-3 px-2 text-sm font-medium text-teal-700 dark:text-teal-200">
                          {roundedPoints} pts
                        </td>
                        <td className="ops-secondary-actions py-3 px-2 text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {canEditTemplate && (
                              <button
                                className="p-2 text-[var(--text-3)] hover:text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                                onClick={() => {
                                  void openEditTemplate(template);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteTemplate && (
                              <button
                                className="p-2 text-[var(--text-3)] hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-500/10 rounded-lg"
                                onClick={() => removeTemplateMenu(template.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <TablePagination
                currentPage={templatePage}
                totalPages={templateTotalPages}
                totalItems={filteredTemplateMenus.length}
                pageSize={TEMPLATE_MENUS_PAGE_SIZE}
                itemLabel="menu templates"
                onPageChange={setTemplatePage}
              />
            </>
          )}
        </div>
      </div>

      {activeMenuSection === 'itemType' && (
        <FilterPanel
          open={showTypeFilters}
          onClose={() => setShowTypeFilters(false)}
          activeCount={Object.values(itemTypeColumnSearch).filter(Boolean).length}
          onClearAll={() => setItemTypeColumnSearch(initialTypeColumnSearch)}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Type</label>
              <input className="input" placeholder="Search type" value={itemTypeColumnSearch.name} onChange={(e) => setItemTypeColumnSearch(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Order</label>
              <input className="input" placeholder="Search order" value={itemTypeColumnSearch.order} onChange={(e) => setItemTypeColumnSearch(prev => ({ ...prev, order: e.target.value }))} />
            </div>
            <div>
              <label className="label">Item Count</label>
              <input className="input" placeholder="Search item count" value={itemTypeColumnSearch.itemCount} onChange={(e) => setItemTypeColumnSearch(prev => ({ ...prev, itemCount: e.target.value }))} />
            </div>
          </div>
        </FilterPanel>
      )}

      {activeMenuSection === 'item' && (
        <FilterPanel
          open={showItemFilters}
          onClose={() => setShowItemFilters(false)}
          activeCount={Object.values(itemsColumnSearch).filter(Boolean).length}
          onClearAll={() => setItemsColumnSearch(initialItemColumnSearch)}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder="Search item name" value={itemsColumnSearch.name} onChange={(e) => setItemsColumnSearch(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <input className="input" placeholder="Search type" value={itemsColumnSearch.type} onChange={(e) => setItemsColumnSearch(prev => ({ ...prev, type: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cost</label>
              <input className="input" placeholder="Search cost" value={itemsColumnSearch.cost} onChange={(e) => setItemsColumnSearch(prev => ({ ...prev, cost: e.target.value }))} />
            </div>
          </div>
        </FilterPanel>
      )}

      {activeMenuSection === 'template' && (
        <FilterPanel
          open={showTemplateFilters}
          onClose={() => setShowTemplateFilters(false)}
          activeCount={Object.values(templateColumnSearch).filter(Boolean).length}
          onClearAll={() => setTemplateColumnSearch(initialTemplateColumnSearch)}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder="Search name" value={templateColumnSearch.name} onChange={(e) => setTemplateColumnSearch(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" placeholder="Search category" value={templateColumnSearch.category} onChange={(e) => setTemplateColumnSearch(prev => ({ ...prev, category: e.target.value }))} />
            </div>
            <div>
              <label className="label">Rate Per Plate</label>
              <input className="input" placeholder="Search rate" value={templateColumnSearch.ratePerPlate} onChange={(e) => setTemplateColumnSearch(prev => ({ ...prev, ratePerPlate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Total Points</label>
              <input className="input" placeholder="Search points" value={templateColumnSearch.totalPoints} onChange={(e) => setTemplateColumnSearch(prev => ({ ...prev, totalPoints: e.target.value }))} />
            </div>          </div>
        </FilterPanel>
      )}
    </div>
    </>
  );
}

// Next required Suspense around useSearchParams; TanStack does not suspend.
export default function MenuPage() {
  return <MenuPageContent />;
}
