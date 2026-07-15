
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  History,
  PencilLine,
  Save,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, fetchAllCustomers } from '@/lib/api';
import FormPromptModal from '@/components/FormPromptModal';
import { confirmDialog } from '@/components/ConfirmDialog';
import { formatDateDDMMYYYY } from '@/lib/date';
import { handleEnterAsTabKeyDown } from '@/lib/focusNextField';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';
import { customerSearchText, matchesCustomerSearch } from '@/lib/customerSearch';
import {
  mapBookingPaymentsFromApi,
  partitionPaymentsForSave,
} from '@/lib/booking-form/payments';
import { sumPaymentsTowardDue } from '@/lib/booking-form/payment-credit';
import {
  CATERING_UNTICK_CONFIRM_MESSAGE,
  HALL_UNTICK_CONFIRM_MESSAGE,
  clearedCateringFieldsPatch,
  clearedHallFieldsPatch,
  packRowHasCateringDataToClear,
  packRowHasHallDataToClear,
  validatePackCateringForSave,
} from '@/lib/booking-form/pack-catering';
import {
  buildItemByIdMap,
  calculateMenuPointsFromMap,
  extractTemplateItemIds,
  getItemPoints,
  templateItemsToMenuItemLikes,
} from '@/lib/booking-form/menu-template';
import type { MenuItemLike, PaymentRow } from '@/lib/booking-form/types';
import type { PackKey } from '@/lib/booking-form/constants';
import type {
  AdditionalRequirementRow,
  BanquetOption,
  BookingFormData,
  BookingPackRow,
  HallOption,
} from '@/lib/booking-form/form-types';
import {
  computeVersionDiff,
  histToSnapshot,
  type DiffSnapshot,
} from '@/lib/booking-form/version-history';
import {
  recalcBillingWhenMealsSubtotalChanges,
  resolveLoadedBillingAmounts,
} from '@/lib/booking-form/billing-recalc';
import { BOOKING_EXTERNAL_UPDATE_EVENT } from '@/lib/booking-form/booking-form-sync';
import {
  clearBookingDraft,
  clearCreateIdempotencyKey,
  newBookingIdemFingerprint,
  pruneStaleBookingDrafts,
  readBookingDraft,
  readCreateIdempotencyKey,
  saveBookingDraft,
  writeCreateIdempotencyKey,
} from '@/lib/booking-form/bookingDraft';
import { packHasHallCharge, readPackHallRate } from '@/lib/booking-form/map-api-pack';
import {
  buildBookingHallRows,
  buildMenuItemsPayload,
  computePackRowAmount,
  computePackRowAmountFromApiPack,
  computeExtrasSubtotal,
  computeMealsSubtotal,
  computePayableGrandTotal,
  formatDiscountPercentDisplay,
  formatPercentFieldOnBlur,
  formatRupeeAmount,
  MENU_ITEM_NOTE_MAX_LENGTH,
  notesMapFromMenuItems,
  pickNotesForSelectedItems,
  resolveDueAmount,
  roundRupee,
  syncBillingAmounts,
  validateBillingCeiling,
  type BillingAmountSyncMode,
} from '@bika/booking-core';
import {
  CASTE_OPTIONS,
  COUNTRY_DIAL_CODE_OPTIONS,
  COUNTRY_OPTIONS,
  DEFAULT_PHONE_COUNTRY_ISO,
  EMAIL_REGEX,
  NAME_REGEX,
  PRIORITY_OPTIONS,
  digitsOnly,
  getDialCodeOption,
  getExpectedPhoneDigits,
  getPhoneCodeByIso,
  sanitizeNameInput,
  validatePhoneNumberForCountry,
} from '@/lib/customerFormOptions';
import BookingPaymentsLedger from '@/components/BookingPaymentsLedger';
import BookingFinancialSummary from '@/components/BookingFinancialSummary';
import FinalizedVersionHistory from '@/components/booking/FinalizedVersionHistory';
import BookingPartyOverForm from '@/components/BookingPartyOverForm';
import { AutoResizeTextarea } from '@/components/AutoResizeTextarea';
import BookingMenuEditorModal from '@/components/booking/BookingMenuEditorModal';
import BookingPackMobileCards from '@/components/booking/BookingPackMobileCards';
import { IndianAmountInput } from '@/components/IndianAmountInput';
import {
  FUNCTION_TYPE_OPTIONS,
  LONGEST_FUNCTION_TYPE_OPTION,
  PACK_LABELS,
  PRIMARY_CUSTOMER_FIELD_CH,
  compareCustomersByName,
  computePencilExpiry,
  formatCustomerLabel,
  formatInrCompact,
  initialFormData,
  initialInlineCustomerFormData,
  pencilExpiryDays,
  type AmountSyncMode,
  type Booking,
  type BookingMenuPackOption,
  type CustomerOption,
  type CustomerSearchField,
  type CustomerSearchInputState,
  type InlineCustomerFormData,
  type ItemOption,
  type TemplateMenuOption,
} from '../_lib/types';

export type BookingLoadState = 'idle' | 'loading' | 'error' | 'ready';

export type SaveBookingResult = {
  bookingId: string;
  paymentFailures: Array<{ row: PaymentRow; kind: 'add' | 'update' }>;
};

export type UseBookingFormOptions = {
  onDataChanged?: () => void | Promise<void>;
  bookingsForMenuPdf?: Booking[];
};

export function useBookingForm(options: UseBookingFormOptions = {}) {
  const {
    onDataChanged,
    bookingsForMenuPdf,
  } = options;

  const notifyDataChanged = useCallback(async () => {
    await onDataChanged?.();
  }, [onDataChanged]);

  const [menuPdfBooking, setMenuPdfBooking] = useState<Booking | null>(null);

  const { user } = useAuthStore();
  const permissionSet = useMemo(() => user?.permissions || [], [user?.permissions]);
  const canAddBooking = hasAnyPermission(permissionSet, ['add_booking', 'manage_bookings']);
  const canEditBooking = hasAnyPermission(permissionSet, ['edit_booking', 'manage_bookings']);
  const canAddCustomer = hasAnyPermission(permissionSet, ['add_customer', 'manage_customers']);
  const canExportMenuPdf = hasAnyPermission(permissionSet, ['view_booking', 'manage_bookings']);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [banquets, setBanquets] = useState<BanquetOption[]>([]);
  const [halls, setHalls] = useState<HallOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [itemTypes, setItemTypes] = useState<{ id: string; name: string }[]>([]);
  const [templateMenus, setTemplateMenus] = useState<TemplateMenuOption[]>([]);
  const [showQuickAddItem, setShowQuickAddItem] = useState(false);
  const [quickItemForm, setQuickItemForm] = useState({ name: '', itemTypeId: '', points: '' });
  const [savingQuickItem, setSavingQuickItem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [expandedHistoryVersions, setExpandedHistoryVersions] = useState<Record<string, boolean>>(
    {}
  );
  const [activeBookingTab, setActiveBookingTab] = useState<'details' | 'payments'>('details');
  const [isTabLockFollower, setIsTabLockFollower] = useState(false);
  const tabInstanceIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [activeBookingObj, setActiveBookingObj] = useState<any>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editingBookingStatus, setEditingBookingStatus] = useState<string | null>(null);
  const [menuEditorPack, setMenuEditorPack] = useState<PackKey | null>(null);
  const [menuItemSearch, setMenuItemSearch] = useState('');
  const [openHallPickerPack, setOpenHallPickerPack] = useState<PackKey | null>(null);
  const [hallPickerAnchorRect, setHallPickerAnchorRect] = useState<DOMRect | null>(null);
  const [netAmountDraft, setNetAmountDraft] = useState<string | null>(null);
  const [customerSearchInputs, setCustomerSearchInputs] =
    useState<CustomerSearchInputState>({
      primary: '',
      second: '',
      referred: '',
    });
  const [activeCustomerSearchField, setActiveCustomerSearchField] =
    useState<CustomerSearchField | null>(null);
  const hallPickerContainerRef = useRef<HTMLDivElement | null>(null);
  const hallPickerPortalRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Snapshot of formData as last loaded from the server. Reset to this on server rejection.
  const savedFormDataRef = useRef<BookingFormData | null>(null);
  const savingInFlightRef = useRef(false);
  const finalizeInFlightRef = useRef(false);
  const openEditGenerationRef = useRef(0);
  const [bookingLoadState, setBookingLoadState] = useState<BookingLoadState>('idle');
  const [bookingLoadError, setBookingLoadError] = useState<string | null>(null);
  const [importedTemplateExtras, setImportedTemplateExtras] = useState<MenuItemLike[]>([]);
  const [formData, setFormData] = useState<BookingFormData>(initialFormData);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const isFormDirtyRef = useRef(false);
  const [amountSyncMode, setAmountSyncMode] = useState<AmountSyncMode>('discountPercent');
  // When true the user has explicitly typed a discount/final-amount value.
  // The auto-recalc effect will NOT overwrite it when pack rates change.
  const [discountManuallySet, setDiscountManuallySet] = useState(false);
  const prevTotalPackAmountRef = useRef<number | null>(null);
  const refreshOpenBookingFinancialsRef = useRef<(bookingId: string) => void>(() => {});

  useEffect(() => {
    isFormDirtyRef.current = isFormDirty;
  }, [isFormDirty]);

  const syncMealsSubtotalBaseline = useCallback((mealsSubtotal: number) => {
    prevTotalPackAmountRef.current = mealsSubtotal;
  }, []);

  const todayStr = () => new Date().toISOString().split('T')[0];


  // ── Hall clash detection ──────────────────────────────────────────────────
  const [hallClashWarnings, setHallClashWarnings] = useState<Array<{
    bookingId: string;
    functionName: string;
    functionType: string;
    startTime: string | null;
    endTime: string | null;
    functionTime: string | null;
    clashingHalls: Array<{ id: string; name: string }>;
  }>>([]);

  // Collect all selected hallIds across all enabled packs
  const selectedHallIds = useMemo(() => {
    const ids = new Set<string>();
    (Object.keys(formData.packs) as PackKey[]).forEach((k) => {
      const row = formData.packs[k];
      if (row.enabled) row.hallIds.forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [formData.packs]);

  // The check's own state must be visible: a failed check ('error') is
  // rendered distinctly so it can never look like "hall is free".
  const [availabilityCheck, setAvailabilityCheck] = useState<
    'idle' | 'checking' | 'clear' | 'clash' | 'error'
  >('idle');
  const [availabilityRecheckNonce, setAvailabilityRecheckNonce] = useState(0);

  // Debounced availability check — fires when date or halls change
  const availabilityCheckKey = `${formData.functionDate}|${selectedHallIds.sort().join(',')}`;
  const availabilityCheckKeyRef = useRef(availabilityCheckKey);
  availabilityCheckKeyRef.current = availabilityCheckKey;

  useEffect(() => {
    if (!formData.functionDate || selectedHallIds.length === 0) {
      setHallClashWarnings([]);
      setAvailabilityCheck('idle');
      return;
    }
    setAvailabilityCheck('checking');
    const timer = setTimeout(async () => {
      if (availabilityCheckKeyRef.current !== availabilityCheckKey) return;
      try {
        const params = {
          hallIds: selectedHallIds.join(','),
          date: formData.functionDate,
          ...(editingBookingId ? { excludeBookingId: editingBookingId } : {}),
        };
        const res = await api.checkBookingAvailability(params);
        // Stale-response guard: halls/date changed while the request was in flight.
        if (availabilityCheckKeyRef.current !== availabilityCheckKey) return;
        const data = res.data?.data;
        if (data && data.available === false) {
          setHallClashWarnings(data.clashes || []);
          setAvailabilityCheck('clash');
        } else if (data && data.available === true) {
          setHallClashWarnings([]);
          setAvailabilityCheck('clear');
        } else {
          setHallClashWarnings([]);
          setAvailabilityCheck('error');
        }
      } catch {
        if (availabilityCheckKeyRef.current !== availabilityCheckKey) return;
        // Never render "no clashes" on failure — surface the failure instead.
        setHallClashWarnings([]);
        setAvailabilityCheck('error');
      }
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityCheckKey, editingBookingId, availabilityRecheckNonce]);
  // ── End hall clash detection ──────────────────────────────────────────────

  const isReadOnlyBooking = useMemo(
    () => Boolean(editingBookingId && editingBookingStatus === 'completed'),
    [editingBookingId, editingBookingStatus]
  );

  // ── Data-safety state (concurrent edits, stale financials, drafts) ───────
  // Last server `updatedAt` seen for the open booking; compared before save so
  // two people editing the same booking can't silently overwrite each other.
  const bookingBaselineUpdatedAtRef = useRef<string | null>(null);
  // Idempotency key for the pending create. Generated on the first create
  // attempt and reused only while no server response arrives (timeout/network
  // drop), so a retry can't produce a duplicate booking. Cleared as soon as
  // the server answers — success or error — and on form close.
  const createIdemKeyRef = useRef<string | null>(null);
  const [saveConflict, setSaveConflict] = useState<{
    serverUpdatedAt: string | null;
  } | null>(null);
  // Set when the open booking changes on the server while the form has
  // unsaved edits — totals on screen may be stale.
  const [externalUpdateNotice, setExternalUpdateNotice] = useState<{
    at: string;
    confirmingReload: boolean;
  } | null>(null);
  // Offer to resume a locally retained draft after a crash/refresh.
  const [draftOffer, setDraftOffer] = useState<{
    bookingId: string | null;
    savedAt: string;
    stale: boolean;
    formData: BookingFormData;
  } | null>(null);
  // Finalizing is irreversible — show a review of what gets locked in,
  // not a bare browser confirm().
  const [showFinalizeReview, setShowFinalizeReview] = useState(false);
  const [saveBlockedReason, setSaveBlockedReason] = useState<'head-check' | null>(null);
  const [finalizeFailedBookingId, setFinalizeFailedBookingId] = useState<string | null>(null);

  const readDraftOfferFor = (
    bookingId: string | null,
    serverUpdatedAt: string | null
  ) => {
    const draft = readBookingDraft<BookingFormData>(bookingId);
    if (!draft) return null;
    return {
      bookingId,
      savedAt: draft.savedAt,
      stale: Boolean(
        serverUpdatedAt &&
          draft.baselineUpdatedAt &&
          new Date(serverUpdatedAt).getTime() >
            new Date(draft.baselineUpdatedAt).getTime()
      ),
      formData: draft.formData,
    };
  };

  const resumeDraft = () => {
    if (!draftOffer) return;
    setFormData(draftOffer.formData);
    syncMealsSubtotalBaseline(computeMealsSubtotal(draftOffer.formData.packs));
    setIsFormDirty(true);
    setDraftOffer(null);
  };

  const discardDraft = () => {
    if (!draftOffer) return;
    clearBookingDraft(draftOffer.bookingId);
    setDraftOffer(null);
  };

  useEffect(() => {
    pruneStaleBookingDrafts();
  }, []);

  // M-8: only one browser tab may edit an existing booking at a time.
  useEffect(() => {
    if (!editingBookingId || typeof BroadcastChannel === 'undefined') {
      setIsTabLockFollower(false);
      return;
    }

    const channel = new BroadcastChannel(`bika-banquet-booking-edit-${editingBookingId}`);
    const tabId = tabInstanceIdRef.current;
    const peers = new Map<string, number>();

    const electLeader = () => {
      const allIds = [tabId, ...peers.keys()].sort();
      setIsTabLockFollower(allIds[0] !== tabId);
    };

    const onMessage = (event: MessageEvent) => {
      const msg = event.data as { type?: string; tabId?: string } | null;
      if (!msg?.tabId || msg.tabId === tabId) return;

      if (msg.type === 'present' || msg.type === 'heartbeat') {
        peers.set(msg.tabId, Date.now());
        electLeader();
      }
      if (msg.type === 'bye') {
        peers.delete(msg.tabId);
        electLeader();
      }
    };

    const announce = () => {
      channel.postMessage({ type: 'present', tabId });
    };

    channel.addEventListener('message', onMessage);
    announce();

    const heartbeat = window.setInterval(() => {
      channel.postMessage({ type: 'heartbeat', tabId });
      const cutoff = Date.now() - 5000;
      for (const [peerId, lastSeen] of peers) {
        if (lastSeen < cutoff) peers.delete(peerId);
      }
      electLeader();
    }, 2000);

    const initialElect = window.setTimeout(electLeader, 150);

    return () => {
      window.clearInterval(heartbeat);
      window.clearTimeout(initialElect);
      channel.postMessage({ type: 'bye', tabId });
      channel.removeEventListener('message', onMessage);
      channel.close();
      setIsTabLockFollower(false);
    };
  }, [editingBookingId]);

  // Retain unsaved form edits locally (debounced) so a crash/refresh can't
  // destroy work. Cleared on successful save and on explicit discard/close.
  useEffect(() => {
    if (!showCreateForm || !isFormDirty || isReadOnlyBooking) return;
    const timer = setTimeout(() => {
      saveBookingDraft(editingBookingId, {
        savedAt: new Date().toISOString(),
        baselineUpdatedAt: bookingBaselineUpdatedAtRef.current,
        formData,
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [showCreateForm, isFormDirty, isReadOnlyBooking, editingBookingId, formData]);

  const availabilityChip = (() => {
    if (availabilityCheck === 'idle') return null;
    if (availabilityCheck === 'checking') {
      return (
        <span className="fade-in-soft inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-3)]">
          <span
            className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--text-4)] border-t-transparent"
            aria-hidden
          />
          Checking hall availability…
        </span>
      );
    }
    if (availabilityCheck === 'clear') {
      return (
        <span className="fade-in-soft inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-3 w-3 shrink-0" aria-hidden />
          No hall clashes for the selected date
        </span>
      );
    }
    if (availabilityCheck === 'clash') {
      return (
        <span className="fade-in-soft inline-flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
          {hallClashWarnings.length} booking{hallClashWarnings.length === 1 ? '' : 's'} clash with the selected halls
        </span>
      );
    }
    return (
      <span className="fade-in-soft inline-flex items-center gap-1.5 rounded-full border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 text-xs text-red-700 dark:text-red-300">
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
        Couldn’t verify hall availability
        <button
          type="button"
          className="font-semibold underline underline-offset-2"
          onClick={() => setAvailabilityRecheckNonce((n) => n + 1)}
        >
          Retry
        </button>
      </span>
    );
  })();
  const todayIsoDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const historicalVersions = useMemo(
    () =>
      bookingHistory.filter(
        (entry: { id?: string | null }) => Boolean(entry?.id) && entry.id !== editingBookingId
      ),
    [bookingHistory, editingBookingId]
  );

  /** Most-recent finalized version (index 0 since list is newest-first) */
  const lastFinalizedVersion = useMemo(
    () => (historicalVersions.length > 0 ? historicalVersions[0] : null),
    [historicalVersions]
  );

  /** Live diff: current form state vs. the last finalized version */
  const formDiff = useMemo(() => {
    if (!editingBookingId || !lastFinalizedVersion) return null;
    const olderSnap = histToSnapshot(lastFinalizedVersion);
    const newerSnap: DiffSnapshot = {
      functionDate: formData.functionDate,
      functionType: formData.functionType,
      discountAmount: Number(formData.finalDiscountAmount || 0),
      finalAmount: Number(formData.finalAmount || 0),
      advanceRequired: Number(formData.advanceRequired || 0),
      dueAmount: Number(formData.dueAmount || 0),
      packs: (Object.keys(formData.packs) as PackKey[])
        .filter((k) => formData.packs[k].enabled)
        .map((k) => {
          const row = formData.packs[k];
          return {
            packName: PACK_LABELS[k],
            pax: Number(row.pax || 0),
            ratePerPlate: Number(row.ratePerPlate || 0),
            hallRate: Number(row.hallRate || 0),
            menuItemIds: [...row.menuItemIds],
          };
        }),
    };
    return computeVersionDiff(newerSnap, olderSnap);
  }, [editingBookingId, lastFinalizedVersion, formData]);
  const customerReferrerOptions = useMemo(
    () => [...customers].sort(compareCustomersByName),
    [customers]
  );

  const totalPayments = useMemo(
    () => sumPaymentsTowardDue(formData.payments),
    [formData.payments]
  );


  const toNonNegativeNumber = useCallback((value: string): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, parsed);
  }, []);

  const formatComputedAmount = useCallback(
    (amount: number): string => formatRupeeAmount(amount),
    []
  );

  const packRowAmount = useCallback(
    (row: BookingPackRow) => computePackRowAmount(row),
    []
  );

  const billingTotals = useMemo(() => {
    const mealsSubtotal = computeMealsSubtotal(formData.packs);
    const extrasSubtotal = computeExtrasSubtotal(formData.additionalRequirements);
    const preDiscountTotal = roundRupee(mealsSubtotal + extrasSubtotal);
    return {
      mealsSubtotal,
      extrasSubtotal,
      preDiscountTotal,
    };
  }, [formData.packs, formData.additionalRequirements]);

  const mealsBillBase = billingTotals.mealsSubtotal;
  const totalBillBase = billingTotals.preDiscountTotal;
  const payableGrandTotal = useMemo(() => {
    const mealsNet = roundRupee(
      parseFloat(formData.finalAmount || '0') || mealsBillBase
    );
    return computePayableGrandTotal(mealsNet, billingTotals.extrasSubtotal);
  }, [formData.finalAmount, mealsBillBase, billingTotals.extrasSubtotal]);

  // Keep for backward-compat references (same value as totalBillBase)
  const totalBillAmount = totalBillBase;

  // Due = payable grand total (meals net + extras) − payments.
  useEffect(() => {
    if (!showCreateForm) return;
    const due = roundRupee(Math.max(0, payableGrandTotal - totalPayments));
    setFormData((prev) => ({ ...prev, dueAmount: formatRupeeAmount(due) }));
  }, [payableGrandTotal, totalPayments, showCreateForm]);

  const enabledPackAmountRows = useMemo(
    () =>
      (Object.keys(formData.packs) as PackKey[])
        .map((packKey) => {
          const row = formData.packs[packKey];
          return {
            key: packKey,
            label: PACK_LABELS[packKey],
            enabled: row.enabled,
            amount: packRowAmount(row),
          };
        })
        .filter((entry) => entry.enabled),
    [packRowAmount, formData.packs]
  );

  const normalizeAmountSnapshot = useCallback(
    (mode: AmountSyncMode, sourceValue: string, totalAmount: number) =>
      syncBillingAmounts(mode, sourceValue, totalAmount),
    []
  );

  const activeMenuPackRow = menuEditorPack ? formData.packs[menuEditorPack] : null;

  const menuItemById = useMemo(() => {
    const fromTemplates = templateMenus.flatMap((menu) =>
      templateItemsToMenuItemLikes(menu.items as Parameters<typeof templateItemsToMenuItemLikes>[0])
    );
    return buildItemByIdMap(items as MenuItemLike[], [
      ...fromTemplates,
      ...importedTemplateExtras,
    ]);
  }, [items, templateMenus, importedTemplateExtras]);

  const filteredMenuItems = useMemo(() => {
    const query = menuItemSearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const group = item.itemType?.name || '';
      return (
        item.name.toLowerCase().includes(query) || group.toLowerCase().includes(query)
      );
    });
  }, [items, menuItemSearch]);

  const setCustomerIdForField = useCallback(
    (field: CustomerSearchField, customerId: string) => {
      setIsFormDirty(true);
      setFormData((prev) => {
        if (field === 'primary') {
          const selectedCustomer = customers.find((customer) => customer.id === customerId);
          const selectedPriority =
            selectedCustomer?.priority !== null && selectedCustomer?.priority !== undefined
              ? String(selectedCustomer.priority)
              : prev.priority || '3';
          return { ...prev, customerId, priority: selectedPriority };
        }
        if (field === 'second') {
          return { ...prev, secondCustomerId: customerId };
        }
        return { ...prev, referredById: customerId };
      });
    },
    [customers]
  );

  const getSelectedCustomerId = useCallback(
    (field: CustomerSearchField): string => {
      if (field === 'primary') return formData.customerId;
      if (field === 'second') return formData.secondCustomerId;
      return formData.referredById;
    },
    [formData.customerId, formData.secondCustomerId, formData.referredById]
  );

  const getCustomerSuggestions = useCallback(
    (field: CustomerSearchField): CustomerOption[] => {
      const query = (customerSearchInputs[field] || '').trim().toLowerCase();
      let filtered = [...customers];

      if (query) {
        // Only match on name and phone — email/alt-phone matches are confusing
        // in a dropdown that only displays name and phone.
        filtered = filtered.filter((customer) => {
          const name = (customer.name || '').toLowerCase();
          const phone = (customer.phone || '').toLowerCase();
          const queryDigits = query.replace(/\D/g, '');
          if (name.includes(query)) return true;
          if (phone.includes(query)) return true;
          if (queryDigits.length >= 2) {
            const phoneDigits = phone.replace(/\D/g, '');
            if (phoneDigits.includes(queryDigits)) return true;
          }
          return false;
        });

        const score = (c: CustomerOption): number => {
          const name = (c.name || '').toLowerCase();
          const phone = (c.phone || '').toLowerCase();
          if (name.startsWith(query)) return 0;
          if (name.includes(query)) return 1;
          if (phone.startsWith(query)) return 2;
          if (phone.includes(query)) return 3;
          return 4;
        };

        filtered.sort((a, b) => {
          const diff = score(a) - score(b);
          return diff !== 0 ? diff : compareCustomersByName(a, b);
        });
      } else {
        filtered.sort(compareCustomersByName);
      }

      const selectedCustomerId = getSelectedCustomerId(field);
      if (
        selectedCustomerId &&
        !filtered.some((customer) => customer.id === selectedCustomerId)
      ) {
        const selectedCustomer = customers.find(
          (customer) => customer.id === selectedCustomerId
        );
        if (selectedCustomer) {
          filtered = [selectedCustomer, ...filtered];
        }
      }

      return filtered.slice(0, 80);
    },
    [customerSearchInputs, customers, getSelectedCustomerId]
  );

  const handleCustomerInputChange = useCallback(
    (field: CustomerSearchField, rawValue: string) => {
      setCustomerSearchInputs((prev) => ({ ...prev, [field]: rawValue }));
      setActiveCustomerSearchField(field);

      const query = rawValue.trim().toLowerCase();
      if (!query) {
        setCustomerIdForField(field, '');
        return;
      }

      const trimmedValue = rawValue.trim();
      const exactMatch = customers.find((customer) => {
        const name = (customer.name || '').trim().toLowerCase();
        const phone = (customer.phone || '').trim();
        const label = formatCustomerLabel(customer).toLowerCase();
        const queryDigits = trimmedValue.replace(/\D/g, '');
        const phoneDigits = phone.replace(/\D/g, '');
        return (
          name === query ||
          phone === trimmedValue ||
          label === query ||
          (queryDigits.length >= 2 && phoneDigits === queryDigits)
        );
      });

      setCustomerIdForField(field, exactMatch?.id || '');
    },
    [customers, setCustomerIdForField]
  );

  const selectCustomerSuggestion = useCallback(
    (field: CustomerSearchField, customer: CustomerOption) => {
      setCustomerIdForField(field, customer.id);
      setCustomerSearchInputs((prev) => ({
        ...prev,
        [field]: formatCustomerLabel(customer),
      }));
      setActiveCustomerSearchField(null);
    },
    [setCustomerIdForField]
  );

  useEffect(() => {
    if (!showCreateForm) return;
    if (activeCustomerSearchField) return;

    setCustomerSearchInputs((prev) => {
      const primaryCustomer = customers.find(
        (customer) => customer.id === formData.customerId
      );
      const secondCustomer = customers.find(
        (customer) => customer.id === formData.secondCustomerId
      );
      const referredCustomer = customers.find(
        (customer) => customer.id === formData.referredById
      );

      const nextPrimary = formData.customerId
        ? primaryCustomer
          ? formatCustomerLabel(primaryCustomer)
          : prev.primary
        : '';
      const nextSecond = formData.secondCustomerId
        ? secondCustomer
          ? formatCustomerLabel(secondCustomer)
          : prev.second
        : '';
      const nextReferred = formData.referredById
        ? referredCustomer
          ? formatCustomerLabel(referredCustomer)
          : prev.referred
        : '';

      if (
        nextPrimary === prev.primary &&
        nextSecond === prev.second &&
        nextReferred === prev.referred
      ) {
        return prev;
      }

      return {
        primary: nextPrimary,
        second: nextSecond,
        referred: nextReferred,
      };
    });
  }, [
    activeCustomerSearchField,
    customers,
    formData.customerId,
    formData.secondCustomerId,
    formData.referredById,
    showCreateForm,
  ]);

  useEffect(() => {
    if (!openHallPickerPack) {
      return;
    }

    const handleOutsidePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideButton = hallPickerContainerRef.current?.contains(target);
      const insidePortal = hallPickerPortalRef.current?.contains(target);
      if (!insideButton && !insidePortal) {
        setOpenHallPickerPack(null);
      }
    };

    document.addEventListener('mousedown', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown);
    };
  }, [openHallPickerPack]);

  const groupedMenuItems = useMemo(() => {
    // Items arrive pre-sorted by itemType.displayOrder/order from the server.
    // Inserting into a Map preserves that insertion order for groups.
    const map = new Map<string, ItemOption[]>();
    filteredMenuItems.forEach((item) => {
      const group = item.itemType?.name || 'Other';
      const existing = map.get(group) || [];
      existing.push(item);
      map.set(group, existing);
    });
    // Sort items within each group alphabetically
    map.forEach((grouped, groupName) => {
      map.set(groupName, [...grouped].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
    });
    return Array.from(map.entries());
  }, [filteredMenuItems]);

  const selectedMenuItemsByGroup = useMemo(() => {
    if (!activeMenuPackRow) return [] as Array<[string, ItemOption[]]>;
    const selectedIds = new Set(activeMenuPackRow.menuItemIds);
    const selected = activeMenuPackRow.menuItemIds
      .map((id) => menuItemById.get(id))
      .filter((item): item is MenuItemLike => Boolean(item)) as ItemOption[];
    const map = new Map<string, ItemOption[]>();
    selected.forEach((item) => {
      const group = item.itemType?.name || 'Other';
      const bucket = map.get(group) || [];
      bucket.push(item);
      map.set(group, bucket);
    });
    map.forEach((grouped, groupName) => {
      map.set(groupName, [...grouped].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
    });
    return Array.from(map.entries());
  }, [activeMenuPackRow, menuItemById]);

  const calculateMenuPoints = useCallback(
    (menuItemIds: string[]): string => {
      return calculateMenuPointsFromMap(menuItemIds, menuItemById);
    },
    [menuItemById]
  );

  const updatePackRow = (packKey: PackKey, patch: Partial<BookingPackRow>) => {
    setIsFormDirty(true);
    setFormData((prev) => ({
      ...prev,
      packs: {
        ...prev.packs,
        [packKey]: { ...prev.packs[packKey], ...patch },
      },
    }));
  };

  const requestCateringToggle = async (packKey: PackKey, nextWithCatering: boolean) => {
    if (nextWithCatering) {
      updatePackRow(packKey, { withCatering: true });
      return;
    }

    const row = formData.packs[packKey];
    if (!packRowHasCateringDataToClear(row)) {
      updatePackRow(packKey, { withCatering: false });
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Turn off catering for this pack?',
      description: CATERING_UNTICK_CONFIRM_MESSAGE,
      confirmLabel: 'Turn off',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    updatePackRow(packKey, clearedCateringFieldsPatch());
  };

  const requestHallToggle = async (packKey: PackKey, nextWithHall: boolean) => {
    if (nextWithHall) {
      updatePackRow(packKey, { withHall: true });
      return;
    }

    if (openHallPickerPack === packKey) {
      setOpenHallPickerPack(null);
    }

    const row = formData.packs[packKey];
    if (!packRowHasHallDataToClear(row)) {
      updatePackRow(packKey, { withHall: false });
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Turn off hall for this pack?',
      description: HALL_UNTICK_CONFIRM_MESSAGE,
      confirmLabel: 'Turn off',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    updatePackRow(packKey, clearedHallFieldsPatch());
  };

  const togglePackMenuItem = (packKey: PackKey, itemId: string) => {
    setIsFormDirty(true);
    setFormData((prev) => {
      const row = prev.packs[packKey];
      const alreadySelected = row.menuItemIds.includes(itemId);
      const nextIds = alreadySelected
        ? row.menuItemIds.filter((id) => id !== itemId)
        : [...row.menuItemIds, itemId];
      const nextNotes = { ...(row.menuItemNotes || {}) };
      if (alreadySelected) {
        delete nextNotes[itemId];
      }
      const nextMenuPoints = calculateMenuPoints(nextIds);
      return {
        ...prev,
        packs: {
          ...prev.packs,
          [packKey]: {
            ...row,
            menuItemIds: nextIds,
            menuItemNotes: pickNotesForSelectedItems(nextIds, nextNotes),
            menuPoints: nextMenuPoints,
          },
        },
      };
    });
  };

  const setPackMenuItemNote = (packKey: PackKey, itemId: string, note: string) => {
    if (!formData.packs[packKey].menuItemIds.includes(itemId)) return;
    setIsFormDirty(true);
    setFormData((prev) => {
      const row = prev.packs[packKey];
      if (!row.menuItemIds.includes(itemId)) return prev;
      const nextNotes = { ...(row.menuItemNotes || {}) };
      const nextNote = note.slice(0, MENU_ITEM_NOTE_MAX_LENGTH);
      if (nextNote.trim()) {
        nextNotes[itemId] = nextNote;
      } else {
        delete nextNotes[itemId];
      }
      return {
        ...prev,
        packs: {
          ...prev.packs,
          [packKey]: {
            ...row,
            menuItemNotes: pickNotesForSelectedItems(row.menuItemIds, nextNotes),
          },
        },
      };
    });
  };

  const submitQuickAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemForm.itemTypeId || !quickItemForm.name.trim() || !quickItemForm.points) {
      toast.error('Name, type and points are required');
      return;
    }
    try {
      setSavingQuickItem(true);
      const response = await api.createItem({
        itemTypeId: quickItemForm.itemTypeId,
        name: quickItemForm.name.trim(),
        point: Number(quickItemForm.points),
        points: Number(quickItemForm.points),
        isVeg: true,
      });
      const newItemId = response.data?.data?.item?.id;
      const refreshed = await api.getItems({ page: 1, limit: 5000 });
      const refreshedItems = refreshed.data?.data?.items || [];
      setItems(refreshedItems);
      if (newItemId && menuEditorPack) {
        togglePackMenuItem(menuEditorPack, newItemId);
      }
      setShowQuickAddItem(false);
      setQuickItemForm({ name: '', itemTypeId: itemTypes[0]?.id || '', points: '' });
      toast.success('Item created and selected');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create item');
    } finally {
      setSavingQuickItem(false);
    }
  };

  const importTemplateToPack = async (packKey: PackKey, templateMenuId: string) => {
    if (!templateMenuId) {
      updatePackRow(packKey, { templateMenuId: '' });
      return;
    }

    const row = formData.packs[packKey];
    const templateName =
      templateMenus.find((entry) => entry.id === templateMenuId)?.name || 'this template';

    if (row.menuItemIds.length > 0) {
      const confirmed = await confirmDialog({
        title: `Replace ${row.menuItemIds.length} selected item(s) with "${templateName}"?`,
        description: 'Current custom selections will be removed.',
        confirmLabel: 'Replace',
      });
      if (!confirmed) return;
    }

    try {
      const response = await api.getTemplateMenu(templateMenuId);
      const fullTemplate = response.data?.data?.templateMenu;
      if (!fullTemplate) {
        toast.error('Template details not found');
        return;
      }

      const templateItemLikes = templateItemsToMenuItemLikes(fullTemplate.items);
      const templateIds = extractTemplateItemIds(fullTemplate.items);

      setImportedTemplateExtras((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        for (const item of templateItemLikes) map.set(item.id, item);
        return Array.from(map.values());
      });

      updatePackRow(packKey, {
        templateMenuId,
        menuItemIds: templateIds,
        menuItemNotes: {},
        menuPoints: calculateMenuPoints(templateIds),
      });

      toast.success(
        `Imported ${templateIds.length} item${templateIds.length === 1 ? '' : 's'} from ${templateName}`
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to import template menu');
    }
  };

  useEffect(() => {
    if (!showCreateForm || items.length === 0) return;

    setFormData((prev) => {
      let changed = false;
      const nextPacks = { ...prev.packs };
      (Object.keys(nextPacks) as PackKey[]).forEach((packKey) => {
        const row = nextPacks[packKey];
        const computedMenuPoints = calculateMenuPoints(row.menuItemIds);
        if (row.menuPoints !== computedMenuPoints) {
          changed = true;
          nextPacks[packKey] = {
            ...row,
            menuPoints: computedMenuPoints,
          };
        }
      });
      if (!changed) return prev;
      return {
        ...prev,
        packs: nextPacks,
      };
    });
  }, [calculateMenuPoints, items, showCreateForm]);

  useEffect(() => {
    // Skip auto-recalc entirely if the user has manually set a discount/final
    // amount. This prevents pack rate changes from silently overwriting what
    // the user typed.
    if (!showCreateForm || discountManuallySet) return;
    setFormData((prev) => {
      const sourceValue =
        amountSyncMode === 'discountPercent'
          ? prev.finalDiscountPercent
          : amountSyncMode === 'discountAmount'
            ? prev.finalDiscountAmount
            : prev.finalAmount;
      const nextValues = normalizeAmountSnapshot(amountSyncMode, sourceValue, mealsBillBase);
      if (
        prev.finalDiscountAmount === nextValues.finalDiscountAmount &&
        prev.finalDiscountPercent === nextValues.finalDiscountPercent &&
        prev.finalAmount === nextValues.finalAmount
      ) {
        return prev;
      }
      return {
        ...prev,
        ...nextValues,
      };
    });
  }, [amountSyncMode, discountManuallySet, mealsBillBase, normalizeAmountSnapshot, showCreateForm]);

  useEffect(() => {
    if (!showCreateForm) return;
    if (prevTotalPackAmountRef.current === null) {
      prevTotalPackAmountRef.current = mealsBillBase;
      return;
    }
    if (prevTotalPackAmountRef.current === mealsBillBase) return;
    prevTotalPackAmountRef.current = mealsBillBase;
    if (!discountManuallySet) return;
    setFormData((prev) => {
      const nextValues = recalcBillingWhenMealsSubtotalChanges(
        prev,
        mealsBillBase,
        amountSyncMode
      );
      if (
        prev.finalDiscountAmount === nextValues.finalDiscountAmount &&
        prev.finalDiscountPercent === nextValues.finalDiscountPercent &&
        prev.finalAmount === nextValues.finalAmount
      ) {
        return prev;
      }
      return { ...prev, ...nextValues };
    });
  }, [
    amountSyncMode,
    discountManuallySet,
    mealsBillBase,
    showCreateForm,
  ]);
  const loadCustomerOptions = async (): Promise<CustomerOption[]> => {
    const customerRows = (await fetchAllCustomers()) as unknown as CustomerOption[];
    const seen = new Set<string>();
    const unique = customerRows.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    const sortedCustomers = unique.sort(compareCustomersByName);
    setCustomers(sortedCustomers);
    return sortedCustomers;
  };

  const openQuickCustomerForm = () => {
    setShowAddCustomerForm(true);
  };

  const handleQuickCustomerCreated = async (
    createdCustomerId: string | undefined,
    match: { name: string; phone: string }
  ) => {
    const updatedCustomers = await loadCustomerOptions();
    const createdCustomer = createdCustomerId
      ? updatedCustomers.find((customer) => customer.id === createdCustomerId)
      : updatedCustomers.find(
        (customer) =>
          customer.name === match.name &&
          (customer.phone || '') === match.phone
      );

    if (createdCustomer) {
      setCustomerIdForField('primary', createdCustomer.id);
      setCustomerSearchInputs((prev) => ({
        ...prev,
        primary: formatCustomerLabel(createdCustomer),
      }));
      setActiveCustomerSearchField(null);
    }
  };

  const loadLookups = async () => {
    try {
      if (!canAddBooking && !canEditBooking) {
        setCustomers([]);
        setBanquets([]);
        setHalls([]);
        setItems([]);
        setTemplateMenus([]);
        return {
          halls: [] as HallOption[],
          templateMenus: [] as TemplateMenuOption[],
          customers: [] as CustomerOption[],
          banquets: [] as BanquetOption[],
          items: [] as ItemOption[],
          itemTypes: [] as { id: string; name: string }[],
        };
      }
      const [customerRows, banquetRes, hallRes, itemRes, templateRes, itemTypeRes] = await Promise.all([
        loadCustomerOptions(),
        api.getBanquets({ page: 1, limit: 200 }),
        api.getHalls({ page: 1, limit: 200 }),
        api.getItems({ page: 1, limit: 5000 }),
        api.getTemplateMenus({ page: 1, limit: 200, includeItems: true }),
        api.getItemTypes({ page: 1, limit: 500 }),
      ]);
      const banquetRows = banquetRes.data?.data?.banquets || [];
      const hallRows = hallRes.data?.data?.halls || [];
      const itemRows = itemRes.data?.data?.items || [];
      const templateRows = templateRes.data?.data?.templateMenus || [];
      const itemTypeRows = itemTypeRes.data?.data?.itemTypes || [];
      setCustomers(customerRows);
      setBanquets(banquetRows);
      setHalls(hallRows);
      setItems(itemRows);
      setItemTypes(itemTypeRows);
      setTemplateMenus(templateRows);
      return {
        halls: hallRows,
        templateMenus: templateRows,
        customers: customerRows,
        banquets: banquetRows,
        items: itemRows,
        itemTypes: itemTypeRows,
      };
    } catch (error) {
      toast.error('Failed to load booking form options');
      return {
        halls: [] as HallOption[],
        templateMenus: [] as TemplateMenuOption[],
        customers: [] as CustomerOption[],
        banquets: [] as BanquetOption[],
        items: [] as ItemOption[],
        itemTypes: [] as { id: string; name: string }[],
      };
    }
  };
  const closeBookingForm = () => {
    openEditGenerationRef.current += 1;
    const closingId = editingBookingId;
    prevTotalPackAmountRef.current = null;
    setShowCreateForm(false);
    setEditingBookingId(null);
    setEditingBookingStatus(null);
    setBookingHistory([]);
    setExpandedHistoryVersions({});
    setMenuEditorPack(null);
    setOpenHallPickerPack(null);
    setMenuItemSearch('');
    setCustomerSearchInputs({
      primary: '',
      second: '',
      referred: '',
    });
    setActiveCustomerSearchField(null);
    setAmountSyncMode('discountPercent');
    setDiscountManuallySet(false);
    setFormData(initialFormData);
    setIsFormDirty(false);
    setActiveBookingTab('details');
    setActiveBookingObj(null);
    setImportedTemplateExtras([]);
    setShowFinalizeReview(false);
    // Explicit close (incl. "Discard & Close") — the locally retained draft
    // for this form session is no longer wanted.
    clearBookingDraft('new');
    clearBookingDraft(closingId);
    bookingBaselineUpdatedAtRef.current = null;
    createIdemKeyRef.current = null;
    setExternalUpdateNotice(null);
    setSaveConflict(null);
    setDraftOffer(null);
    setSaveBlockedReason(null);
    setFinalizeFailedBookingId(null);
    setIsTabLockFollower(false);
    setBookingLoadState('idle');
    setBookingLoadError(null);
    setSaving(false);
  };

  const SLOT_TO_PACK: Record<string, PackKey> = {
    morning: 'breakfast',
    lunch: 'lunch',
    evening: 'hiTea',
    dinner: 'dinner',
  };

  const openCreateBooking = async (prefill?: {
    date?: string;
    hallId?: string;
    slot?: string;
  }) => {
    openEditGenerationRef.current += 1;
    setSaving(false);
    const lookupsPromise = loadLookups();
    setEditingBookingId(null);
    setEditingBookingStatus(null);
    setBookingHistory([]);
    setExpandedHistoryVersions({});
    setMenuEditorPack(null);
    setOpenHallPickerPack(null);
    setMenuItemSearch('');
    setCustomerSearchInputs({
      primary: '',
      second: '',
      referred: '',
    });
    setActiveCustomerSearchField(null);
    setAmountSyncMode('discountPercent');
    setDiscountManuallySet(false);
    prevTotalPackAmountRef.current = null;

    let nextForm: BookingFormData = {
      ...initialFormData,
      packs: {
        breakfast: { ...initialFormData.packs.breakfast },
        lunch: { ...initialFormData.packs.lunch },
        hiTea: { ...initialFormData.packs.hiTea },
        dinner: { ...initialFormData.packs.dinner },
      },
    };
    if (prefill?.date) {
      nextForm.functionDate = prefill.date;
    }
    const packKey = prefill?.slot ? SLOT_TO_PACK[prefill.slot] : undefined;
    if (packKey) {
      nextForm.packs[packKey] = { ...nextForm.packs[packKey], enabled: true };
      if (prefill?.hallId) {
        const loadedLookups = await lookupsPromise;
        const hall = loadedLookups.halls.find((h) => h.id === prefill.hallId);
        if (hall) {
          nextForm.packs[packKey] = {
            ...nextForm.packs[packKey],
            banquetId: hall.banquet?.id || '',
            hallIds: [hall.id],
          };
        }
      }
    }

    void lookupsPromise;
    setFormData(nextForm);
    setIsFormDirty(false);
    bookingBaselineUpdatedAtRef.current = null;
    createIdemKeyRef.current = null;
    setExternalUpdateNotice(null);
    setSaveConflict(null);
    setDraftOffer(readDraftOfferFor(null, null));
    setShowCreateForm(true);
  };

  const normalizePackKey = (value: string): PackKey | null => {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'breakfast') return 'breakfast';
    if (normalized === 'lunch') return 'lunch';
    if (normalized === 'hi-tea' || normalized === 'hitea' || normalized === 'hi tea') {
      return 'hiTea';
    }
    if (normalized === 'dinner') return 'dinner';
    return null;
  };

  const openEditBooking = async (bookingId: string) => {
    const openEditGeneration = openEditGenerationRef.current + 1;
    openEditGenerationRef.current = openEditGeneration;
    try {
      setEditingBookingId(bookingId);
      setSaving(true);
      setBookingLoadState('loading');
      setBookingLoadError(null);
      const lookups = await loadLookups();
      if (openEditGenerationRef.current !== openEditGeneration) return;
      const hallRows = lookups.halls;
      const templateRows = lookups.templateMenus;
      const customerRows = lookups.customers;
      const [response, historyResponse] = await Promise.all([
        api.getBooking(bookingId),
        api.getBookingHistory(bookingId).catch(() => ({ data: { data: { history: [] } } }))
      ]);
      if (openEditGenerationRef.current !== openEditGeneration) return;
      const booking = response.data?.data?.booking;
      if (!booking) {
        setBookingLoadState('error');
        setBookingLoadError('Booking not found');
        toast.error('Booking not found');
        return;
      }

      const historyRows = historyResponse.data?.data?.history || [];
      setBookingHistory(historyRows);
      const expanded: Record<string, boolean> = {};
      historyRows.forEach((row: { id?: string }) => {
        if (row?.id && row.id !== bookingId) {
          expanded[row.id] = true;
        }
      });
      setExpandedHistoryVersions(expanded);

      const hallIdSet = new Set(hallRows.map((hall) => hall.id));
      const bookingHallIds = Array.from(
        new Set(
          (booking.halls || [])
            .map((row: any) => row?.hallId || row?.hall?.id || '')
            .filter((value: string) => value && hallIdSet.has(value))
        )
      );
      const primaryHallId = bookingHallIds[0] || '';
      const primaryHall = hallRows.find((hall) => hall.id === primaryHallId);
      const menuRows = booking.packs || [];
      const nextPacks = { ...initialFormData.packs };

      menuRows.forEach((pack: any) => {
        const packKey = normalizePackKey(pack?.mealSlot?.name || pack?.packName || '');
        if (!packKey) return;
        const rowMenuItemIds = (pack?.bookingMenu?.items || [])
          .map((entry: any) => entry.itemId || entry.item?.id)
          .filter(Boolean);
        const matchingTemplate = templateRows.find((template) => {
          const templateIds = (template.items || []).map((entry) => entry.item.id);
          if (templateIds.length !== rowMenuItemIds.length) return false;
          const set = new Set(templateIds);
          return rowMenuItemIds.every((id: string) => set.has(id));
        });
        const packHallIds = Array.isArray(pack?.hallIds)
          ? pack.hallIds
            .map((value: unknown) => `${value ?? ''}`.trim())
            .filter((value: string) => value.length > 0 && hallIdSet.has(value))
          : [];
        const resolvedPackHallIds =
          packHallIds.length > 0 ? packHallIds : bookingHallIds;
        const firstPackHall = hallRows.find((hall) => hall.id === resolvedPackHallIds[0]);

        nextPacks[packKey] = {
          bookingPackId: pack.id,
          enabled: true,
          withHall: resolvedPackHallIds.length > 0 || packHasHallCharge(pack),
          withCatering: Number(pack.ratePerPlate ?? 0) > 0 || rowMenuItemIds.length > 0,
          banquetId: firstPackHall?.banquet?.id || primaryHall?.banquet?.id || '',
          hallIds: resolvedPackHallIds,
          templateMenuId: matchingTemplate?.id || '',
          menuItemIds: rowMenuItemIds,
          menuItemNotes: notesMapFromMenuItems(pack?.bookingMenu?.items || []),
          startTime: pack.startTime || nextPacks[packKey].startTime,
          endTime: pack.endTime || nextPacks[packKey].endTime,
          hallRate: readPackHallRate(pack),
          menuPoints:
            pack.menuPoint !== null && pack.menuPoint !== undefined
              ? String(pack.menuPoint)
              : '',
          ratePerPlate:
            pack.ratePerPlate !== null && pack.ratePerPlate !== undefined
              ? String(pack.ratePerPlate)
              : '',
          pax:
            pack.packCount !== null && pack.packCount !== undefined
              ? String(pack.packCount)
              : '',
          amount: '',
          extraPlate: pack.extraPlate,
          extraRateValue: pack.extraRateValue,
          extraRate: pack.extraRate,
          extraAmountValue: pack.extraAmountValue,
          extraAmount: pack.extraAmount,
          extraCharges: pack.extraCharges,
          setupCost:
            pack.setupCost !== null && pack.setupCost !== undefined
              ? String(pack.setupCost)
              : undefined,
        };
      });

      setEditingBookingId(bookingId);
      setEditingBookingStatus(booking.status || null);
      const loadedBilling = resolveLoadedBillingAmounts(
        booking.discountPercentage,
        booking.discountAmount,
        computeMealsSubtotal(nextPacks)
      );
      const loadedFormData: BookingFormData = {
        ...initialFormData,
        customerId: booking.customerId || booking.customer?.id || '',
        includeSecondCustomer: Boolean(booking.secondCustomerId),
        secondCustomerId: booking.secondCustomerId || '',
        referredById: booking.referredById || '',
        priority:
          booking.priority !== null && booking.priority !== undefined
            ? String(booking.priority)
            : '0',
        functionType: booking.functionType || '',
        functionDate: booking.functionDate ? booking.functionDate.slice(0, 10) : '',
        isPencilBooking: booking.isPencilBooking || false,
        pencilDays: (() => {
          if (!booking.pencilExpiresAt) return '3';
          const diffMs = new Date(booking.pencilExpiresAt).getTime() - Date.now();
          return String(Math.max(1, Math.ceil(diffMs / 86400000)));
        })(),
        pencilExpiresAt: booking.pencilExpiresAt ? booking.pencilExpiresAt.slice(0, 10) : '',
        advanceRequired: booking.advanceRequired || '0',
        dueAmount: booking.dueAmount || '0',
        finalDiscountAmount: loadedBilling.finalDiscountAmount,
        finalDiscountPercent: loadedBilling.finalDiscountPercent,
        finalAmount: loadedBilling.finalAmount,
        notes: booking.notes || '',
        additionalRequirements: (booking.additionalItems || [])
          .map((entry: any) => ({
            description: entry.description || '',
            amount:
              entry.charges !== null && entry.charges !== undefined
                ? String(entry.charges)
                : '',
          }))
          .filter((entry: AdditionalRequirementRow) => entry.description || entry.amount),
        payments: mapBookingPaymentsFromApi(booking.payments || []),
        packs: nextPacks,
      };
      setFormData(loadedFormData);
      syncMealsSubtotalBaseline(computeMealsSubtotal(loadedFormData.packs));
      setIsFormDirty(false);
      setActiveBookingObj(booking);
      // Snapshot of server state — used to reset on submission failure.
      savedFormDataRef.current = loadedFormData;
      setCustomerSearchInputs({
        primary:
          formatCustomerLabel(
            customerRows.find(
              (customer) => customer.id === (booking.customerId || booking.customer?.id || '')
            )
          ) || formatCustomerLabel(booking.customer),
        second:
          formatCustomerLabel(
            customerRows.find((customer) => customer.id === (booking.secondCustomerId || ''))
          ) || formatCustomerLabel(booking.secondCustomer),
        referred:
          formatCustomerLabel(
            customerRows.find((customer) => customer.id === (booking.referredById || ''))
          ) || formatCustomerLabel(booking.referredBy),
      });
      setActiveCustomerSearchField(null);
      setOpenHallPickerPack(null);
      setAmountSyncMode('finalAmount');
      setDiscountManuallySet(true); // existing booking already has deliberate amounts
      const serverUpdatedAt = booking.updatedAt ? String(booking.updatedAt) : null;
      bookingBaselineUpdatedAtRef.current = serverUpdatedAt;
      setExternalUpdateNotice(null);
      setSaveConflict(null);
      setDraftOffer(readDraftOfferFor(bookingId, serverUpdatedAt));
      setShowCreateForm(true);
      setBookingLoadState('ready');
    } catch (error: any) {
      if (openEditGenerationRef.current !== openEditGeneration) return;
      const message = error?.response?.data?.error || 'Failed to load booking';
      setBookingLoadState('error');
      setBookingLoadError(message);
      toast.error(message);
    } finally {
      if (openEditGenerationRef.current !== openEditGeneration) return;
      setSaving(false);
    }
  };
  const applyBookingToForm = useCallback((booking: any) => {
    const loadedPayments = mapBookingPaymentsFromApi(booking.payments || []);
    setFormData((prev) => {
      const loadedBilling = resolveLoadedBillingAmounts(
        booking.discountPercentage ?? prev.finalDiscountPercent,
        booking.discountAmount ?? prev.finalDiscountAmount,
        computeMealsSubtotal(prev.packs)
      );
      const next = {
        ...prev,
        payments: loadedPayments,
        finalDiscountAmount: loadedBilling.finalDiscountAmount,
        finalDiscountPercent: loadedBilling.finalDiscountPercent,
        finalAmount: loadedBilling.finalAmount,
        dueAmount:
          booking.dueAmountValue !== undefined && booking.dueAmountValue !== null
            ? String(booking.dueAmountValue)
            : booking.dueAmount !== null && booking.dueAmount !== undefined
              ? String(booking.dueAmount)
              : prev.dueAmount,
      };
      savedFormDataRef.current = next;
      syncMealsSubtotalBaseline(computeMealsSubtotal(next.packs));
      return next;
    });
    setActiveBookingObj(booking);
    // Form now reflects this server state — update the concurrency baseline
    // and clear any stale-data notice.
    if (booking.updatedAt) {
      bookingBaselineUpdatedAtRef.current = String(booking.updatedAt);
    }
    setExternalUpdateNotice(null);
  }, [syncMealsSubtotalBaseline]);

  const refreshOpenBookingFinancials = useCallback(
    async (bookingId: string) => {
      if (!showCreateForm || !editingBookingId || editingBookingId !== bookingId) return;
      // Our own save also emits this event — the post-save refetch already
      // refreshes the form and the baseline, so don't react mid-save.
      if (savingInFlightRef.current) return;
      if (isFormDirtyRef.current) {
        // Unsaved edits — never clobber them. Verify the change is genuinely
        // external (not an echo of our own last save), then surface a notice
        // so stale totals are visible rather than silent.
        try {
          const head = await api.getBooking(bookingId);
          const serverUpdatedAt = head.data?.data?.booking?.updatedAt
            ? String(head.data.data.booking.updatedAt)
            : null;
          if (
            serverUpdatedAt &&
            serverUpdatedAt !== bookingBaselineUpdatedAtRef.current
          ) {
            setExternalUpdateNotice((prev) => ({
              at: new Date().toISOString(),
              confirmingReload: prev?.confirmingReload ?? false,
            }));
          }
        } catch {
          // Can't verify — the pre-save conflict guard still protects the save.
        }
        return;
      }
      try {
        const response = await api.getBooking(bookingId);
        const booking = response.data?.data?.booking;
        if (!booking) return;
        applyBookingToForm(booking);
      } catch {
        // Non-blocking — list/SSE already refreshed; form stays on last known state.
      }
    },
    [applyBookingToForm, editingBookingId, showCreateForm]
  );
  refreshOpenBookingFinancialsRef.current = (bookingId) => {
    void refreshOpenBookingFinancials(bookingId);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onExternalUpdate = (event: Event) => {
      const bookingId = (event as CustomEvent<{ bookingId?: string }>).detail?.bookingId;
      if (!bookingId) return;
      void refreshOpenBookingFinancials(bookingId);
    };
    window.addEventListener(BOOKING_EXTERNAL_UPDATE_EVENT, onExternalUpdate);
    return () => window.removeEventListener(BOOKING_EXTERNAL_UPDATE_EVENT, onExternalUpdate);
  }, [refreshOpenBookingFinancials]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith('bika_booking_draft:')) return;
      const draftId = event.key.slice('bika_booking_draft:'.length);
      const activeId = editingBookingId ?? 'new';
      if (draftId !== activeId || !showCreateForm || !isFormDirtyRef.current) return;
      setExternalUpdateNotice((prev) => ({
        at: new Date().toISOString(),
        confirmingReload: prev?.confirmingReload ?? false,
      }));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [editingBookingId, showCreateForm]);

  const doSaveBooking = async (
    opts?: { keepOpen?: boolean; skipAvailabilityCheck?: boolean }
  ): Promise<SaveBookingResult | null> => {
    if (savingInFlightRef.current) return null;
    if (!formData.customerId || !formData.functionType.trim() || !formData.functionDate) {
      toast.error('Primary customer, function type and date are required');
      return null;
    }
    if (formData.isPencilBooking && !formData.pencilExpiresAt) {
      toast.error('Set an expiry date for the pencil booking');
      return null;
    }
    if (!editingBookingId && formData.functionDate < todayIsoDate) {
      toast.error(
        `Function date cannot be before ${formatDateDDMMYYYY(todayIsoDate)} for new bookings`
      );
      return null;
    }

    if (!opts?.skipAvailabilityCheck) {
      if (availabilityCheck === 'clash') {
        const proceed = await confirmDialog({
          title: 'Hall clash detected',
          description:
            'Selected halls clash with existing bookings on this date. Save anyway?',
          confirmLabel: 'Save anyway',
          cancelLabel: 'Cancel',
        });
        if (!proceed) return null;
      } else if (availabilityCheck === 'checking') {
        toast.error('Hall availability is still being checked. Wait a moment and try again.');
        return null;
      } else if (availabilityCheck === 'error') {
        const proceed = await confirmDialog({
          title: 'Availability not verified',
          description:
            'Hall availability could not be verified. Save anyway without a clash check?',
          confirmLabel: 'Save anyway',
          cancelLabel: 'Cancel',
        });
        if (!proceed) return null;
      }
    }

    const netDraftForSave = netAmountDraft;
    const flushedNetSnapshot =
      netDraftForSave !== null
        ? normalizeAmountSnapshot('finalAmount', netDraftForSave, mealsBillBase)
        : null;

    if (flushedNetSnapshot) {
      setNetAmountDraft(null);
      setAmountSyncMode('finalAmount');
      setFormData((prev) => ({ ...prev, ...flushedNetSnapshot }));
    }

    const mealsNetForCheck = flushedNetSnapshot?.finalAmount ?? formData.finalAmount;
    const billingCheck = validateBillingCeiling({
      mealsSubtotal: mealsBillBase,
      extrasSubtotal: billingTotals.extrasSubtotal,
      discountAmount: flushedNetSnapshot?.finalDiscountAmount ?? formData.finalDiscountAmount,
      discountPercent: flushedNetSnapshot?.finalDiscountPercent ?? formData.finalDiscountPercent,
      finalAmount: mealsNetForCheck,
    });
    if (!billingCheck.ok) {
      toast.error(
        billingCheck.message ||
          'Net amount cannot exceed the bill total. Adjust discount or line items and try again.'
      );
      return null;
    }

    try {
      savingInFlightRef.current = true;
      setSaving(true);

      // Concurrent-edit guard: preflight for a friendlier dialog; the update
      // payload still carries expectedUpdatedAt so the server enforces this.
      if (
        editingBookingId &&
        bookingBaselineUpdatedAtRef.current
      ) {
        try {
          const head = await api.getBooking(editingBookingId);
          const serverUpdatedAt = head.data?.data?.booking?.updatedAt
            ? String(head.data.data.booking.updatedAt)
            : null;
          if (
            serverUpdatedAt &&
            serverUpdatedAt !== bookingBaselineUpdatedAtRef.current
          ) {
            setSaveConflict({ serverUpdatedAt });
            return null;
          }
        } catch {
          setSaveBlockedReason('head-check');
          toast.error(
            "Couldn't verify the latest booking version. Check your connection and retry before saving."
          );
          return null;
        }
      }
      setSaveBlockedReason(null);

      const toNumber = (value: string) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const enabledPackEntries = (Object.keys(formData.packs) as PackKey[])
        .map((key) => ({ key, row: formData.packs[key] }))
        .filter((entry) => entry.row.enabled);
      const missingBanquetSelection = enabledPackEntries.find(
        (entry) => entry.row.withHall && !entry.row.banquetId
      );
      if (missingBanquetSelection) {
        toast.error(
          `Select banquet before halls for ${PACK_LABELS[missingBanquetSelection.key]}`
        );
        return null;
      }
      const getValidHallIdsForPack = (row: BookingPackRow): string[] =>
        row.hallIds.filter((hallId) =>
          halls.some(
            (hall) =>
              hall.id === hallId &&
              (!row.banquetId || hall.banquet?.id === row.banquetId)
          )
        );
      const missingHallSelection = enabledPackEntries.find(
        (entry) => entry.row.withHall && getValidHallIdsForPack(entry.row).length === 0
      );
      if (missingHallSelection) {
        toast.error(
          `Select at least one hall for ${PACK_LABELS[missingHallSelection.key]}`
        );
        return null;
      }

      for (const { key, row } of enabledPackEntries) {
        const cateringError = validatePackCateringForSave({
          withCatering: row.withCatering,
          ratePerPlate: row.ratePerPlate,
          pax: row.pax,
          menuItemIds: row.menuItemIds,
          menuItemNotes: row.menuItemNotes,
        });
        if (cateringError) {
          toast.error(`${PACK_LABELS[key]}: ${cateringError}`);
          return null;
        }
      }

      const expectedGuests = Math.max(
        1,
        ...enabledPackEntries
          .filter((entry) => entry.row.withCatering)
          .map((entry) => Number(entry.row.pax || 0))
          .filter((value) => value > 0)
      );
      const saveSyncMode: AmountSyncMode =
        flushedNetSnapshot ? 'finalAmount' : amountSyncMode;
      const amountSourceValue =
        saveSyncMode === 'discountPercent'
          ? (flushedNetSnapshot?.finalDiscountPercent ?? formData.finalDiscountPercent)
          : saveSyncMode === 'discountAmount'
            ? (flushedNetSnapshot?.finalDiscountAmount ?? formData.finalDiscountAmount)
            : (flushedNetSnapshot?.finalAmount ?? formData.finalAmount);
      const syncedAmounts = syncBillingAmounts(
        saveSyncMode,
        amountSourceValue,
        mealsBillBase
      );
      const normalizedMealsNet = toNumber(syncedAmounts.finalAmount);
      const normalizedPayableGrandTotal = computePayableGrandTotal(
        normalizedMealsNet,
        billingTotals.extrasSubtotal
      );
      const normalizedDiscountAmount = roundRupee(
        totalBillBase - normalizedPayableGrandTotal
      );
      const normalizedDiscountPercent = toNumber(syncedAmounts.finalDiscountPercent);
      const functionTime = enabledPackEntries[0]?.row.startTime || '12:00';
      const functionName = formData.functionType.trim();

      const hallsPayload = buildBookingHallRows(
        enabledPackEntries
          .filter((entry) => entry.row.withHall)
          .map((entry) => ({ validHallIds: getValidHallIdsForPack(entry.row) }))
      );

      const additionalItemsPayload = formData.additionalRequirements
        .map((entry) => ({
          description: entry.description.trim(),
          charges: Math.max(0, toNumber(entry.amount || '0')),
        }))
        .filter((entry) => entry.description || entry.charges > 0)
        .map((entry) => ({
          description: entry.description || 'Additional Requirement',
          charges: entry.charges,
          quantity: 1,
        }));

      const packsPayload = enabledPackEntries.map(({ key, row }) => {
        const matchingTemplate = templateMenus.find(
          (template) => template.id === row.templateMenuId
        );
        const validHallIds = row.withHall ? getValidHallIdsForPack(row) : [];
        const selectedHallNames = halls
          .filter((hall) => validHallIds.includes(hall.id))
          .map((hall) => hall.name);
        return {
          packName: PACK_LABELS[key],
          packCount: row.withCatering ? Math.max(0, toNumber(row.pax)) : 0,
          noOfPack: row.withCatering ? Math.max(0, toNumber(row.pax)) : 0,
          ratePerPlate: row.withCatering ? toNumber(row.ratePerPlate) : 0,
          setupCost: row.setupCost ? toNumber(row.setupCost) : 0,
          extraCharges: row.extraCharges || 0,
          extraPlate: row.extraPlate ?? undefined,
          extraAmount: row.extraAmount ?? undefined,
          extraAmountValue: row.extraAmountValue ?? undefined,
          extraRate: row.extraRate ?? undefined,
          extraRateValue: row.extraRateValue ?? undefined,
          startTime: row.startTime || undefined,
          endTime: row.endTime || undefined,
          hallIds: validHallIds,
          hallRate: row.withHall ? (row.hallRate ?? undefined) || undefined : undefined,
          menuPoint: row.withCatering && row.menuPoints ? toNumber(row.menuPoints) : undefined,
          hallName: row.withHall ? selectedHallNames.join(', ') || undefined : undefined,
          menu: row.withCatering
            ? {
                name: matchingTemplate?.name || `${PACK_LABELS[key]} Menu`,
                templateMenuId: row.templateMenuId || undefined,
                items: buildMenuItemsPayload(row.menuItemIds, row.menuItemNotes),
              }
            : {
                name: `${PACK_LABELS[key]} Menu`,
                items: [],
              },
        };
      });

      // Keep notes to just the user-entered text — pack summaries were bloating
      // this past the server's 2000-char limit on complex bookings.
      const notes = formData.notes.trim() || undefined;

      // Payment entries are now persisted via the /payments endpoint, so we
      // don't need to duplicate them in internalNotes. Just store the financial
      // snapshot which is compact and always useful for debugging.
      const internalNotesParts = [
        `Final Calc: discountAmt=${normalizedDiscountAmount}, discountPct=${normalizedDiscountPercent}, mealsNet=${normalizedMealsNet}, grandTotal=${normalizedPayableGrandTotal}, totalBill=${totalBillAmount.toFixed(2)}, totalPaid=${totalPayments.toFixed(2)}`,
      ].filter(Boolean);
      const internalNotes = internalNotesParts.join('\n').slice(0, 1990) || undefined;

      const payload = {
        customerId: formData.customerId,
        secondCustomerId: formData.secondCustomerId || undefined,
        referredById: formData.referredById || undefined,
        priority: formData.priority ? Number(formData.priority) : undefined,
        functionName,
        functionType: formData.functionType.trim(),
        functionDate: formData.functionDate,
        functionTime,
        isPencilBooking: formData.isPencilBooking,
        pencilExpiresAt: formData.isPencilBooking && formData.pencilExpiresAt
          ? new Date(formData.pencilExpiresAt + 'T23:59:00').toISOString()
          : null,
        startTime: enabledPackEntries[0]?.row.startTime || undefined,
        endTime: enabledPackEntries[0]?.row.endTime || undefined,
        expectedGuests,
        isQuotation: false,
        halls: hallsPayload.length ? hallsPayload : undefined,
        packs: packsPayload.length ? packsPayload : undefined,
        additionalItems: additionalItemsPayload.length
          ? additionalItemsPayload
          : undefined,
        discountAmount: normalizedDiscountAmount,
        discountPercentage: normalizedDiscountPercent,
        payableGrandTotal: normalizedPayableGrandTotal,
        advanceRequired: formData.advanceRequired || undefined,
        expectedUpdatedAt: editingBookingId
          ? bookingBaselineUpdatedAtRef.current || undefined
          : undefined,
        // paymentReceivedAmount is derived server-side from actual payment records.
        notes: notes ? notes.slice(0, 1990) : undefined,
        internalNotes,
      };

      let savedBookingId: string;
      if (editingBookingId) {
        await api.updateBooking(editingBookingId, payload);
        savedBookingId = editingBookingId;
      } else {
        const idemFingerprint = newBookingIdemFingerprint(
          formData.customerId,
          formData.functionDate,
          formData.functionType
        );
        if (!createIdemKeyRef.current) {
          createIdemKeyRef.current =
            readCreateIdempotencyKey(idemFingerprint) || crypto.randomUUID();
          writeCreateIdempotencyKey(idemFingerprint, createIdemKeyRef.current);
        }
        const created = await api.createBooking(payload, createIdemKeyRef.current);
        // Server: { success, data: { booking: { id, ... } } } → axios wraps in .data
        savedBookingId = created?.data?.data?.booking?.id || created?.data?.booking?.id || '';
        if (!savedBookingId) {
          toast.error('Booking was created but the server response was incomplete. Please retry.');
          return null;
        }
        createIdemKeyRef.current = null;
        clearCreateIdempotencyKey(idemFingerprint);
        // Transition the open form to edit mode so a second submit updates rather than creates.
        setEditingBookingId(savedBookingId);
        clearBookingDraft('new');
        saveBookingDraft(savedBookingId, {
          savedAt: new Date().toISOString(),
          baselineUpdatedAt: null,
          formData,
        });
      }

      const failedPayments: Array<{ row: PaymentRow; kind: 'add' | 'update' }> = [];
      if (savedBookingId) {
        const { changedPayments, newPayments } = partitionPaymentsForSave(formData.payments);

        const paymentTasks: Array<{
          row: PaymentRow;
          kind: 'add' | 'update';
          run: () => Promise<unknown>;
        }> = [
          ...changedPayments.map((p) => ({
            row: p,
            kind: 'update' as const,
            run: () =>
              api.updatePayment(savedBookingId, p.id!, {
                amount: parseFloat(p.amount),
                method: p.mode,
                narration: p.narration || undefined,
                paymentDate: p.date,
                reference: p.reference || undefined,
                clearingDate: p.clearingDate || undefined,
              }),
          })),
          ...newPayments.map((p) => ({
            row: p,
            kind: 'add' as const,
            run: () =>
              api.addPayment(savedBookingId, {
                amount: parseFloat(p.amount),
                method: p.mode,
                narration: p.narration || undefined,
                clientMutationId: p.clientMutationId,
                paymentDate: p.date,
                reference: p.reference || undefined,
                clearingDate: p.clearingDate || undefined,
              }),
          })),
        ];

        // Settle every payment mutation so one failure can't mask the others —
        // the user is told exactly which entries did not record.
        const results = await Promise.allSettled(paymentTasks.map((task) => task.run()));
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            failedPayments.push({
              row: paymentTasks[index].row,
              kind: paymentTasks[index].kind,
            });
          }
        });

        const refreshResponse = await api.getBooking(savedBookingId);
        const refreshedBooking = refreshResponse.data?.data?.booking;
        if (refreshedBooking) {
          applyBookingToForm(refreshedBooking);
        }

        if (failedPayments.length > 0) {
          // The refetch reset the form to server state, which doesn't contain
          // the failed entries — re-attach them so nothing typed is lost and
          // submitting again retries exactly these entries.
          const failedNewRows = failedPayments
            .filter((f) => f.kind === 'add')
            .map((f) => f.row);
          const failedUpdates = failedPayments.filter(
            (f) => f.kind === 'update' && f.row.id
          );
          setFormData((prev) => ({
            ...prev,
            payments: [
              ...prev.payments.map((p) => {
                const failedEdit = failedUpdates.find((f) => f.row.id === p.id);
                return failedEdit ? { ...failedEdit.row } : p;
              }),
              ...failedNewRows,
            ],
          }));
        }
      }

      if (failedPayments.length === 0) {
        clearBookingDraft(editingBookingId ?? 'new');
        if (savedBookingId) {
          clearBookingDraft(savedBookingId);
        }
        setDraftOffer(null);
        setFinalizeFailedBookingId(null);

        toast.success(editingBookingId ? 'Booking updated successfully' : 'Booking created successfully');
        if (!opts?.keepOpen) {
          closeBookingForm();
          await notifyDataChanged();
        } else {
          setIsFormDirty(false);
          await notifyDataChanged();
        }
      } else {
        // Partial success: the booking saved but some payment entries didn't.
        // Keep the form open and dirty (draft retention included) so the
        // entries can be retried; report precisely what didn't record.
        const labels = failedPayments
          .map((f) => `₹${Number(f.row.amount || 0).toLocaleString('en-IN')} ${f.row.mode}`)
          .join(', ');
        toast.error(
          `Booking ${editingBookingId ? 'updated' : 'created'}, but ${failedPayments.length} payment ${
            failedPayments.length === 1 ? 'entry' : 'entries'
          } did not record: ${labels}. The ${
            failedPayments.length === 1 ? 'entry is' : 'entries are'
          } still in the Payments tab — submit again to retry.`,
          { duration: 10000 }
        );
        setIsFormDirty(true);
        await notifyDataChanged();
      }
      return { bookingId: savedBookingId, paymentFailures: failedPayments };
    } catch (error: any) {
      // Server answered (validation/permission/etc.) — the request was not
      // lost, so the next attempt is a new intent and needs a fresh key.
      // No response (timeout/offline) — keep the key so a retry is a replay.
      if (error?.response) {
        createIdemKeyRef.current = null;
      }
      console.error('[BookingSubmit] error:', error?.response?.data ?? error);
      if (error?.response?.status === 409 && error?.response?.data?.data?.booking) {
        setSaveConflict({
          serverUpdatedAt: error.response.data.data.booking.updatedAt
            ? String(error.response.data.data.booking.updatedAt)
            : null,
        });
        toast.error(
          error.response.data.message ||
            'Booking was modified by someone else. Reload and try again.'
        );
        return null;
      }
      const validationErrors: Array<{ field: string; message: string }> =
        error?.response?.data?.errors || [];
      const detail = validationErrors.length
        ? validationErrors.map((e) => `${e.field}: ${e.message}`).join('; ')
        : error?.response?.data?.error ||
          (editingBookingId ? 'Failed to update booking' : 'Failed to create booking');
      toast.error(detail);
      // Reset form to the last known server state so partial mutations don't
      // leave the user looking at corrupted local state.
      if (savedFormDataRef.current) {
        setFormData(savedFormDataRef.current);
      }
      return null;
    } finally {
      savingInFlightRef.current = false;
      setSaving(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await doSaveBooking({ keepOpen: true });
  };

  const handleFinalizeBooking = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowFinalizeReview(true);
  };

  const confirmFinalizeBooking = async () => {
    if (finalizeInFlightRef.current) return;
    finalizeInFlightRef.current = true;
    setShowFinalizeReview(false);
    try {
      const saveResult = await doSaveBooking({ keepOpen: true });
      if (!saveResult) return;
      if (saveResult.paymentFailures.length > 0) {
        toast.error(
          'Resolve payment errors on the Payments tab before finalizing this booking.'
        );
        return;
      }

      setSaving(true);
      const res = await api.finalizeBooking(saveResult.bookingId);
      setFinalizeFailedBookingId(null);
      toast.success('Booking finalized successfully.');
      await notifyDataChanged();
      if (res.data?.data?.newBookingId) {
        await openEditBooking(res.data.data.newBookingId);
      } else {
        closeBookingForm();
      }
    } catch (error: any) {
      const failedId = editingBookingId;
      if (failedId) setFinalizeFailedBookingId(failedId);
      toast.error(
        error?.response?.data?.error ||
          'Booking saved but finalize failed. Use Retry finalize when ready.'
      );
    } finally {
      setSaving(false);
      finalizeInFlightRef.current = false;
    }
  };

  const retryFinalizeBooking = async () => {
    if (!finalizeFailedBookingId || finalizeInFlightRef.current) return;
    finalizeInFlightRef.current = true;
    try {
      let bookingIdToFinalize = finalizeFailedBookingId;
      if (isFormDirtyRef.current) {
        const saveResult = await doSaveBooking({ keepOpen: true });
        if (!saveResult) return;
        if (saveResult.paymentFailures.length > 0) {
          toast.error(
            'Resolve payment errors on the Payments tab before finalizing this booking.'
          );
          return;
        }
        bookingIdToFinalize = saveResult.bookingId;
      }

      setSaving(true);
      const res = await api.finalizeBooking(bookingIdToFinalize);
      setFinalizeFailedBookingId(null);
      toast.success('Booking finalized successfully.');
      await notifyDataChanged();
      if (res.data?.data?.newBookingId) {
        await openEditBooking(res.data.data.newBookingId);
      } else {
        closeBookingForm();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to finalize booking');
    } finally {
      setSaving(false);
      finalizeInFlightRef.current = false;
    }
  };

  const renderCustomerTypeahead = ({
    field,
    label,
    required = false,
    placeholder,
    wrapperClassName,
    inputClassName,
  }: {
    field: CustomerSearchField;
    label?: string;
    required?: boolean;
    placeholder: string;
    wrapperClassName?: string;
    inputClassName?: string;
  }) => {
    const suggestions = getCustomerSuggestions(field);
    const isActive = activeCustomerSearchField === field;

    return (
      <div className={['relative', wrapperClassName].filter(Boolean).join(' ')}>
        {label ? (
          <label className="label">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </label>
        ) : null}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-4)]" />
          <input
            className={['input pl-10', inputClassName].filter(Boolean).join(' ')}
            placeholder={placeholder}
            value={customerSearchInputs[field]}
            required={required}
            autoComplete="off"
            title={customerSearchInputs[field] || undefined}
            onFocus={() => setActiveCustomerSearchField(field)}
            onBlur={() => {
              window.setTimeout(() => {
                setActiveCustomerSearchField((current) =>
                  current === field ? null : current
                );
              }, 120);
            }}
            onChange={(e) => handleCustomerInputChange(field, e.target.value)}
          />
        </div>

        {isActive && (
          <div className="absolute z-40 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            {suggestions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--text-4)]">
                No customer found for this search.
              </p>
            ) : (
              suggestions.map((customer) => (
                <button
                  key={`${field}-${customer.id}`}
                  type="button"
                  className="w-full border-b border-[var(--border)] px-3 py-2 text-left hover:bg-[var(--surface-2)] last:border-b-0"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCustomerSuggestion(field, customer)}
                >
                  <p className="text-sm font-medium text-[var(--text-1)]">{customer.name}</p>
                  <p className="text-xs text-[var(--text-2)]">{customer.phone}</p>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  };
  return {
    canAddBooking,
    canEditBooking,
    canAddCustomer,
    canExportMenuPdf,
    showCreateForm,
    setShowCreateForm,
    showAddCustomerForm,
    setShowAddCustomerForm,
    editingBookingId,
    editingBookingStatus,
    menuEditorPack,
    setMenuEditorPack,
    menuItemSearch,
    setMenuItemSearch,
    menuPdfBooking,
    setMenuPdfBooking,
    openHallPickerPack,
    setOpenHallPickerPack,
    hallPickerAnchorRect,
    setHallPickerAnchorRect,
    netAmountDraft,
    setNetAmountDraft,
    customerSearchInputs,
    setCustomerSearchInputs,
    activeCustomerSearchField,
    setActiveCustomerSearchField,
    hallPickerContainerRef,
    hallPickerPortalRef,
    formRef,
    savingInFlightRef,
    finalizeInFlightRef,
    importedTemplateExtras,
    formData,
    setFormData,
    isFormDirty,
    setIsFormDirty,
    amountSyncMode,
    setAmountSyncMode,
    discountManuallySet,
    setDiscountManuallySet,
    hallClashWarnings,
    availabilityCheck,
    availabilityRecheckNonce,
    setAvailabilityRecheckNonce,
    isReadOnlyBooking,
    isTabLockFollower,
    saveConflict,
    setSaveConflict,
    externalUpdateNotice,
    setExternalUpdateNotice,
    bookingLoadState,
    bookingLoadError,
    draftOffer,
    saveBlockedReason,
    setSaveBlockedReason,
    finalizeFailedBookingId,
    retryFinalizeBooking,
    showFinalizeReview,
    setShowFinalizeReview,
    bookingHistory,
    expandedHistoryVersions,
    activeBookingTab,
    setActiveBookingTab,
    activeBookingObj,
    saving,
    setSaving,
    customers,
    banquets,
    halls,
    items,
    itemTypes,
    templateMenus,
    showQuickAddItem,
    setShowQuickAddItem,
    quickItemForm,
    setQuickItemForm,
    savingQuickItem,
    availabilityChip,
    todayIsoDate,
    historicalVersions,
    lastFinalizedVersion,
    formDiff,
    customerReferrerOptions,
    totalPayments,
    packRowAmount,
    formatComputedAmount,
    billingTotals,
    mealsBillBase,
    totalBillBase,
    payableGrandTotal,
    totalBillAmount,
    enabledPackAmountRows,
    normalizeAmountSnapshot,
    activeMenuPackRow,
    menuItemById,
    filteredMenuItems,
    groupedMenuItems,
    selectedMenuItemsByGroup,
    updatePackRow,
    requestCateringToggle,
    requestHallToggle,
    togglePackMenuItem,
    setPackMenuItemNote,
    submitQuickAddItem,
    importTemplateToPack,
    loadLookups,
    openQuickCustomerForm,
    handleQuickCustomerCreated,
    closeBookingForm,
    openCreateBooking,
    openEditBooking,
    handleSubmitBooking,
    handleFinalizeBooking,
    confirmFinalizeBooking,
    doSaveBooking,
    renderCustomerTypeahead,
    resumeDraft,
    discardDraft,
    refreshOpenBookingFinancials,
    refreshOpenBookingFinancialsRef,
    notifyDataChanged,
    bookingsForMenuPdf,
  };
}
