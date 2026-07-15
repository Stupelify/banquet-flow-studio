
import { useRef, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  History,
  Lock,
  PencilLine,
  Plus,
  Printer,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import FormPromptModal from '@/components/FormPromptModal';
import { formatDateDDMMYYYY, formatWeekdayDateIN } from '@/lib/date';
import { handleEnterAsTabKeyDown } from '@/lib/focusNextField';
import { useFocusTrap } from '@/lib/useFocusTrap';
import type { PackKey } from '@/lib/booking-form/constants';
import type { MenuItemLike } from '@/lib/booking-form/types';
import BookingPaymentsLedger from '@/components/BookingPaymentsLedger';
import BookingFinancialSummary from '@/components/BookingFinancialSummary';
import FinalizedVersionHistory from '@/components/booking/FinalizedVersionHistory';
import BookingPartyOverForm from '@/components/BookingPartyOverForm';
import { AutoResizeTextarea } from '@/components/AutoResizeTextarea';
import BookingTermsSection from '@/components/booking/BookingTermsSection';
import BookingMenuEditorModal from '@/components/booking/BookingMenuEditorModal';
import BookingPackTable from '@/components/booking/BookingPackTable';
import BookingPackMobileCards from '@/components/booking/BookingPackMobileCards';
import QuickCustomerModal from './QuickCustomerModal';
import MenuPdfModal from './MenuPdfModal';
import { Field, Input, Select, Tab, TabList, Tabs, Textarea } from '@/components/ui';
import {
  FUNCTION_TYPE_OPTIONS,
  LONGEST_FUNCTION_TYPE_OPTION,
  PACK_LABELS,
  PRIMARY_CUSTOMER_FIELD_CH,
  computePencilExpiry,
  formatCustomerLabel,
  type Booking,
} from '../_lib/types';
import type { useBookingForm } from '../_hooks/useBookingForm';

export type BookingFormBodyProps = ReturnType<typeof useBookingForm> & {
  /** Hide the Payments & Party Over tab (unsaved new booking). Default true. */
  showPaymentsTab?: boolean;
  /**
   * When true, omit the in-body section tabs (modal hosts them in FormPromptModal
   * headerContent — master parity). Document pages keep body tabs.
   */
  hideSectionTabs?: boolean;
  /** Called when the body's Cancel/close action fires. Pages pass router.back; the modal passes closeBookingForm. */
  onRequestClose?: () => void;
  /** Fires after a tab switch so a container can sync the URL. */
  onTabChange?: (tab: 'details' | 'payments') => void;
};

export default function BookingFormBody({
  showPaymentsTab = true,
  hideSectionTabs = false,
  onRequestClose,
  onTabChange,
  ...form
}: BookingFormBodyProps) {
  const {
    canAddCustomer,
    canExportMenuPdf,
    editingBookingId,
    closeBookingForm,
    activeBookingTab,
    setActiveBookingTab,
    formData,
    draftOffer,
    resumeDraft,
    discardDraft,
    externalUpdateNotice,
    setExternalUpdateNotice,
    openEditBooking,
    isReadOnlyBooking,
    isTabLockFollower,
    formRef,
    handleSubmitBooking,
    saving,
    setSaving,
    setMenuPdfBooking,
    bookingsForMenuPdf,
    activeBookingObj,
    availabilityChip,
    openQuickCustomerForm,
    renderCustomerTypeahead,
    setFormData,
    todayIsoDate,
    hallClashWarnings,
    halls,
    banquets,
    formDiff,
    openHallPickerPack,
    setOpenHallPickerPack,
    hallPickerContainerRef,
    hallPickerPortalRef,
    hallPickerAnchorRect,
    setHallPickerAnchorRect,
    updatePackRow,
    requestCateringToggle,
    requestHallToggle,
    setMenuEditorPack,
    setMenuItemSearch,
    formatComputedAmount,
    packRowAmount,
    billingTotals,
    mealsBillBase,
    payableGrandTotal,
    setAmountSyncMode,
    setDiscountManuallySet,
    normalizeAmountSnapshot,
    netAmountDraft,
    setNetAmountDraft,
    setIsFormDirty,
    handleFinalizeBooking,
    enabledPackAmountRows,
    totalBillBase,
    totalBillAmount,
    notifyDataChanged,
    showAddCustomerForm,
    setShowAddCustomerForm,
    customerReferrerOptions,
    handleQuickCustomerCreated,
    menuEditorPack,
    activeMenuPackRow,
    templateMenus,
    menuItemSearch,
    groupedMenuItems,
    selectedMenuItemsByGroup,
    importTemplateToPack,
    togglePackMenuItem,
    setPackMenuItemNote,
    itemTypes,
    setQuickItemForm,
    setShowQuickAddItem,
    menuPdfBooking,
    showFinalizeReview,
    setShowFinalizeReview,
    customers,
    customerSearchInputs,
    confirmFinalizeBooking,
    finalizeInFlightRef,
    saveBlockedReason,
    setSaveBlockedReason,
    finalizeFailedBookingId,
    retryFinalizeBooking,
    saveConflict,
    setSaveConflict,
    showQuickAddItem,
    quickItemForm,
    submitQuickAddItem,
    savingQuickItem,
    historicalVersions,
    items,
  } = form as ReturnType<typeof useBookingForm> & {
    bookingsForMenuPdf?: Booking[];
    notifyDataChanged?: () => Promise<void>;
  };

  const [showTermsModal, setShowTermsModal] = useState(false);
  const finalizeModalRef = useRef<HTMLDivElement>(null);
  const conflictModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(showFinalizeReview, finalizeModalRef);
  useFocusTrap(!!saveConflict, conflictModalRef);

  const showDetailsPanel =
    activeBookingTab === 'details' || (activeBookingTab === 'payments' && !showPaymentsTab);
  const showPaymentsPanel = showPaymentsTab && activeBookingTab === 'payments';

  const formReadOnly = isReadOnlyBooking || isTabLockFollower;

  return (
    <>
      {!hideSectionTabs ? (
        <Tabs
          value={activeBookingTab}
          onValueChange={(tab) => {
            setActiveBookingTab(tab as 'details' | 'payments');
            onTabChange?.(tab as 'details' | 'payments');
          }}
          variant="underline"
          aria-label="Booking form sections"
        >
          <TabList className="mb-4">
            <Tab value="details">Booking Form</Tab>
            {showPaymentsTab && (
              <Tab value="payments">
                Payments &amp; Party Over
                {formData.payments.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary-100 dark:bg-primary-900/40 text-[10px] font-bold text-primary-700 dark:text-primary-300">
                    {formData.payments.length}
                  </span>
                )}
              </Tab>
            )}
          </TabList>
        </Tabs>
      ) : null}

      {isTabLockFollower && editingBookingId && (
        <div
          role="status"
          className="fade-in-soft mb-4 rounded-xl border border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2"
        >
          <Lock className="w-4 h-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            This booking is open in another browser tab. This tab is read-only until you close
            the other tab.
          </span>
        </div>
      )}

      {draftOffer && (
        <div className="fade-in-soft mb-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-500/10 px-3 py-2.5 flex flex-wrap items-center gap-2 text-sm text-sky-900 dark:text-sky-200">
          <History className="w-4 h-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            Unsaved draft from{' '}
            {new Date(draftOffer.savedAt).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            found.
            {draftOffer.stale &&
              ' Note: this booking has changed on the server since the draft was made.'}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs px-2.5 py-1.5"
              onClick={resumeDraft}
            >
              Resume draft
            </button>
            <button
              type="button"
              className="btn btn-secondary text-xs px-2.5 py-1.5"
              onClick={discardDraft}
            >
              Discard
            </button>
          </span>
        </div>
      )}

      {saveBlockedReason === 'head-check' && (
        <div
          role="alert"
          className="fade-in-soft mb-4 rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-sm text-red-800 dark:text-red-200 flex flex-wrap items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            Couldn&apos;t verify the latest booking version. Check your connection before saving.
          </span>
          <button
            type="button"
            className="btn btn-secondary text-xs px-2.5 py-1.5 ml-auto"
            onClick={() => setSaveBlockedReason(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {finalizeFailedBookingId && (
        <div
          role="status"
          className="fade-in-soft mb-4 rounded-xl border border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200 flex flex-wrap items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
          <span className="min-w-0">Booking saved but finalize did not complete.</span>
          <button
            type="button"
            className="btn btn-primary text-xs px-2.5 py-1.5 ml-auto"
            disabled={saving}
            onClick={() => void retryFinalizeBooking()}
          >
            Retry finalize
          </button>
        </div>
      )}

      {externalUpdateNotice && editingBookingId && (
        <div
          role="status"
          className="fade-in-soft mb-4 rounded-xl border border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200"
        >
          {!externalUpdateNotice.confirmingReload ? (
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                This booking was updated outside this form at{' '}
                {new Date(externalUpdateNotice.at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                . Totals and payments shown may be out of date.
              </span>
              <span className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary text-xs px-2.5 py-1.5"
                  onClick={() =>
                    setExternalUpdateNotice({ ...externalUpdateNotice, confirmingReload: true })
                  }
                >
                  Reload latest
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-xs px-2.5 py-1.5"
                  onClick={() => setExternalUpdateNotice(null)}
                >
                  Keep editing
                </button>
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                Reloading replaces your unsaved edits with the latest saved version.
              </span>
              <span className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-danger text-xs px-2.5 py-1.5"
                  onClick={() => {
                    setExternalUpdateNotice(null);
                    void openEditBooking(editingBookingId);
                  }}
                >
                  Reload &amp; discard my edits
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-xs px-2.5 py-1.5"
                  onClick={() =>
                    setExternalUpdateNotice({ ...externalUpdateNotice, confirmingReload: false })
                  }
                >
                  Back
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      <fieldset disabled={formReadOnly || saving}>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          if (!formReadOnly) handleSubmitBooking(e);
        }}
        onChange={() => setIsFormDirty(true)}
        onKeyDown={(e) => {
          if (
            (e.target as HTMLElement).getAttribute('aria-expanded') === 'true'
          ) {
            return;
          }
          handleEnterAsTabKeyDown(e, formRef.current);
        }}
        className="space-y-5"
      >
          {!formReadOnly && availabilityChip && (
            <div className="flex justify-end">{availabilityChip}</div>
          )}

          {isReadOnlyBooking && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              This booking is completed (party over) and is now read-only.
            </div>
          )}

          {showDetailsPanel && (
          <div
            id="booking-panel-details"
            role="tabpanel"
            aria-labelledby="booking-tab-details"
          >
          <section className="rounded-2xl border border-[var(--border-2)] p-4">
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-[var(--text-1)]">Booking Details</h3>
              {/* Row 1 mobile */}
              <div className="space-y-3 md:hidden">
                {canAddCustomer && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="btn btn-secondary text-xs px-2.5 py-1.5"
                      onClick={openQuickCustomerForm}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Customer
                    </button>
                  </div>
                )}
                <div className="space-y-1.5 min-w-0">
                  <span className="label block">
                    Primary Customer <span className="text-red-500">*</span>
                  </span>
                  {renderCustomerTypeahead({
                    field: 'primary',
                    label: '',
                    required: true,
                    placeholder: 'Type customer name or number',
                  })}
                </div>
                <Field
                  label="Priority"
                  hint="Auto-set from customer profile"
                >
                  {(control) => (
                    <Input
                      {...control}
                      className="bg-[var(--surface-2)] dark:bg-slate-800/30 cursor-not-allowed"
                      type="number"
                      readOnly
                      value={formData.priority}
                      title="Priority is set from the selected customer's profile"
                    />
                  )}
                </Field>
                <Field label="Function Date" required>
                  {(control) => (
                    <Input
                      {...control}
                      type="date"
                      value={formData.functionDate}
                      min={!editingBookingId ? todayIsoDate : undefined}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, functionDate: e.target.value }))
                      }
                      required
                    />
                  )}
                </Field>
              </div>

              {/* Row 1 desktop: primary | add customer | priority | date */}
              <div className="hidden md:flex md:flex-wrap md:items-end md:gap-3">
                <div
                  className="min-w-0 shrink-0 space-y-1.5"
                  style={{ width: `calc(${PRIMARY_CUSTOMER_FIELD_CH}ch + 2.5rem)` }}
                >
                  <span className="label block">
                    Primary Customer <span className="text-red-500">*</span>
                  </span>
                  {renderCustomerTypeahead({
                    field: 'primary',
                    label: '',
                    required: true,
                    placeholder: 'Type customer name or number',
                    inputClassName: 'truncate',
                  })}
                </div>
                {canAddCustomer && (
                  <button
                    type="button"
                    className="btn btn-secondary shrink-0 text-xs px-2.5 py-1.5"
                    onClick={openQuickCustomerForm}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Customer
                  </button>
                )}
                <Field label="Priority">
                  {(control) => (
                    <Input
                      {...control}
                      className="bg-[var(--surface-2)] dark:bg-slate-800/30 cursor-not-allowed"
                      type="number"
                      readOnly
                      value={formData.priority}
                      title="Priority is set from the selected customer's profile"
                    />
                  )}
                </Field>
                <Field label="Function Date" required>
                  {(control) => (
                    <Input
                      {...control}
                      type="date"
                      value={formData.functionDate}
                      min={!editingBookingId ? todayIsoDate : undefined}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, functionDate: e.target.value }))
                      }
                      required
                    />
                  )}
                </Field>
              </div>

              {/* Row 2 mobile */}
              <div className="space-y-3 md:hidden">
                <Field label="Function Type" required>
                  {(control) => (
                    <Select
                      {...control}
                      value={formData.functionType}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, functionType: e.target.value }))
                      }
                      placeholder="Select function type"
                      required
                    >
                      {FUNCTION_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                {renderCustomerTypeahead({
                  field: 'referred',
                  label: 'Referred By',
                  placeholder: 'Type customer name or number',
                })}
                {renderCustomerTypeahead({
                  field: 'second',
                  label: 'Second Customer',
                  placeholder: 'Type customer name or number',
                })}
              </div>

              {/* Row 2 desktop: function type (fit longest option) | referred | second */}
              <div className="hidden md:flex md:items-end md:gap-3">
                <div
                  className="shrink-0"
                  style={{ width: `${LONGEST_FUNCTION_TYPE_OPTION.length + 3}ch` }}
                >
                  <Field label="Function Type" required>
                    {(control) => (
                      <Select
                        {...control}
                        className="w-full max-w-full"
                        value={formData.functionType}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, functionType: e.target.value }))
                        }
                        placeholder="Select function type"
                        required
                      >
                        {FUNCTION_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
                <div className="min-w-0 flex-1">
                  {renderCustomerTypeahead({
                    field: 'referred',
                    label: 'Referred By',
                    placeholder: 'Type customer name or number',
                  })}
                </div>
                <div className="min-w-0 flex-1">
                  {renderCustomerTypeahead({
                    field: 'second',
                    label: 'Second Customer',
                    placeholder: 'Type customer name or number',
                  })}
                </div>
              </div>

              {/* Pencil booking toggle */}
              {!formReadOnly && (
                <div className="rounded-xl border border-[var(--border-2)] bg-[var(--surface-2)] dark:bg-slate-800/30 p-3 space-y-3">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-[var(--brand)]"
                      checked={formData.isPencilBooking}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          isPencilBooking: checked,
                          pencilDays: checked ? prev.pencilDays || '3' : '3',
                          pencilExpiresAt: checked
                            ? computePencilExpiry(Number(prev.pencilDays || '3'))
                            : '',
                        }));
                      }}
                    />
                    <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-1)]">
                      <PencilLine className="w-4 h-4 text-[var(--text-3)]" />
                      Pencil Booking
                    </span>
                    <span className="text-xs text-[var(--text-4)]">— temporary hall hold</span>
                  </label>
                  {formData.isPencilBooking && (
                    <div className="space-y-2 pl-6">
                      <div className="flex items-end gap-3">
                        <div className="space-y-1">
                          <label className="label text-xs">Hold duration (days) <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            className="input w-24"
                            min="1"
                            max="365"
                            value={formData.pencilDays}
                            onChange={(e) => {
                              const days = Math.max(1, Number(e.target.value) || 1);
                              setFormData((prev) => ({
                                ...prev,
                                pencilDays: String(days),
                                pencilExpiresAt: computePencilExpiry(days),
                              }));
                            }}
                          />
                        </div>
                        <div className="space-y-1 flex-1">
                          <label className="label text-xs">Or pick date directly</label>
                          <input
                            type="date"
                            className="input"
                            value={formData.pencilExpiresAt}
                            min={todayIsoDate}
                            onChange={(e) => {
                              const dateVal = e.target.value;
                              const diffMs = new Date(dateVal).getTime() - new Date(todayIsoDate).getTime();
                              const diffDays = Math.max(1, Math.round(diffMs / 86400000));
                              setFormData((prev) => ({
                                ...prev,
                                pencilExpiresAt: dateVal,
                                pencilDays: String(diffDays),
                              }));
                            }}
                            required={formData.isPencilBooking}
                          />
                        </div>
                      </div>
                      {formData.pencilExpiresAt && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <PencilLine className="w-3 h-3" />
                          Hall auto-releases at 11:59 PM on {formatWeekdayDateIN(formData.pencilExpiresAt + 'T23:59:00', { weekday: 'short', day: '2-digit', month: 'short', withYear: true })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {formData.isPencilBooking && isReadOnlyBooking && formData.pencilExpiresAt && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <PencilLine className="w-4 h-4 shrink-0" />
                  Pencil hold — auto-releases on {formatWeekdayDateIN(formData.pencilExpiresAt, { day: '2-digit', month: 'short', withYear: true })}
                </div>
              )}

              {/* Availability check status — visible for every state so a
                  failed check can never be mistaken for "hall is free" */}
              {availabilityChip && !formReadOnly && (
                <div className="mt-1">{availabilityChip}</div>
              )}

              {/* Hall clash warning banner */}
              {hallClashWarnings.length > 0 && (
                <div className="col-span-full mt-1 rounded-lg border border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-amber-600 shrink-0" aria-hidden>⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        Hall timing clash detected on this date
                      </p>
                      <ul className="mt-1 space-y-0.5 text-xs text-amber-700 dark:text-amber-200">
                        {hallClashWarnings.map((clash) => (
                          <li key={clash.bookingId}>
                            <span className="font-medium">{clash.functionName}</span>
                            {clash.functionType ? ` (${clash.functionType})` : ''}
                            {(clash.startTime && clash.endTime)
                              ? ` · ${clash.startTime}–${clash.endTime}`
                              : clash.functionTime ? ` · ${clash.functionTime}` : ''}
                            {' — '}
                            {clash.clashingHalls.map((h) => h.name).join(', ')}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-xs text-amber-600">
                        Saving will be blocked if the halls and times overlap.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Pack & Summary Table (desktop) ── */}
          <section className="space-y-3">
            {/* ── Desktop/tablet table (lg+) — scrolls horizontally rather
                  than dropping columns on narrower screens ── */}
            <BookingPackTable
              formData={formData}
              setFormData={setFormData}
              formDiff={formDiff}
              halls={halls}
              banquets={banquets}
              openHallPickerPack={openHallPickerPack}
              setOpenHallPickerPack={setOpenHallPickerPack}
              hallPickerContainerRef={hallPickerContainerRef}
              hallPickerPortalRef={hallPickerPortalRef}
              hallPickerAnchorRect={hallPickerAnchorRect}
              setHallPickerAnchorRect={setHallPickerAnchorRect}
              updatePackRow={updatePackRow}
              requestCateringToggle={requestCateringToggle}
              requestHallToggle={requestHallToggle}
              setMenuEditorPack={setMenuEditorPack}
              setMenuItemSearch={setMenuItemSearch}
              formatComputedAmount={formatComputedAmount}
              packRowAmount={packRowAmount}
              billingTotals={billingTotals}
              mealsBillBase={mealsBillBase}
              payableGrandTotal={payableGrandTotal}
              setAmountSyncMode={setAmountSyncMode}
              setDiscountManuallySet={setDiscountManuallySet}
              normalizeAmountSnapshot={normalizeAmountSnapshot}
              netAmountDraft={netAmountDraft}
              setNetAmountDraft={setNetAmountDraft}
              isReadOnlyBooking={formReadOnly}
              setIsFormDirty={setIsFormDirty}
              saving={saving}
              handleFinalizeBooking={handleFinalizeBooking}
            />

            {/* ── Mobile cards (below lg) ── */}
            <BookingPackMobileCards
              formData={formData}
              setFormData={setFormData}
              formDiff={formDiff}
              halls={halls}
              banquets={banquets}
              openHallPickerPack={openHallPickerPack}
              setOpenHallPickerPack={setOpenHallPickerPack}
              hallPickerContainerRef={hallPickerContainerRef}
              updatePackRow={updatePackRow}
              requestCateringToggle={requestCateringToggle}
              requestHallToggle={requestHallToggle}
              setMenuEditorPack={setMenuEditorPack}
              setMenuItemSearch={setMenuItemSearch}
              formatComputedAmount={formatComputedAmount}
              packRowAmount={packRowAmount}
              enabledPackAmountRows={enabledPackAmountRows}
              billingTotals={billingTotals}
              mealsBillBase={mealsBillBase}
              payableGrandTotal={payableGrandTotal}
              setAmountSyncMode={setAmountSyncMode}
              setDiscountManuallySet={setDiscountManuallySet}
              normalizeAmountSnapshot={normalizeAmountSnapshot}
              isReadOnlyBooking={formReadOnly}
              setIsFormDirty={setIsFormDirty}
            />
          </section>

          <Field label="Notes">
            {(control) => (
              <AutoResizeTextarea
                {...control}
                className="input"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              />
            )}
          </Field>

          </div>
          )}

          {showPaymentsPanel && (
            <div
              id="booking-panel-payments"
              role="tabpanel"
              aria-labelledby="booking-tab-payments"
              className="space-y-6 max-w-full overflow-x-hidden"
            >
              <BookingPaymentsLedger
                payments={formData.payments}
                isReadOnly={formReadOnly || saving}
                onAdd={(payment) =>
                  setFormData((prev) => ({ ...prev, payments: [...prev.payments, payment] }))
                }
                onUpdate={(index, patch) =>
                  setFormData((prev) => ({
                    ...prev,
                    payments: prev.payments.map((p, i) => (i === index ? { ...p, ...patch } : p)),
                  }))
                }
                onRemove={(index) =>
                  setFormData((prev) => ({
                    ...prev,
                    payments: prev.payments.filter((_, i) => i !== index),
                  }))
                }
              />

              <BookingFinancialSummary
                preDiscountTotal={totalBillBase}
                extrasSubtotal={billingTotals.extrasSubtotal}
                payableGrandTotal={payableGrandTotal}
                payments={formData.payments}
                functionDate={formData.functionDate}
                discountPercent={parseFloat(formData.finalDiscountPercent || '0') || 0}
                isPartyOver={activeBookingObj?.status === 'completed'}
                totalBilledAmount={
                  activeBookingObj?.status === 'completed' && activeBookingObj?.packs?.length > 0
                    ? activeBookingObj.packs.reduce((sum: number, pack: any) => {
                        const discPct = activeBookingObj.discountPercentageValue ?? activeBookingObj.discountPercentage ?? 0;
                        const dr = (pack.ratePerPlate ?? 0) * (1 - discPct / 100);
                        const billedP = Math.max(pack.packCount ?? 0, (pack.packCount ?? 0) + (pack.extraPlate ?? 0));
                        return sum + dr * billedP;
                      }, 0)
                    : undefined
                }
                settlementTotalAmount={activeBookingObj?.settlementTotalAmount ?? undefined}
                settlementDiscountAmount={activeBookingObj?.settlementDiscountAmount ?? undefined}
              />

              <BookingPartyOverForm
                booking={activeBookingObj}
                functionDate={formData.functionDate}
                discountPercent={parseFloat(formData.finalDiscountPercent || '0') || 0}
                isPartyOverSubmitted={activeBookingObj?.status === 'completed'}
                saving={saving}
                onSubmit={async (payload) => {
                  if (!editingBookingId || finalizeInFlightRef.current) return;
                  finalizeInFlightRef.current = true;
                  try {
                    setSaving(true);
                    const response = await api.partyOverBooking(editingBookingId, payload);
                    toast.success('Party finalized permanently!');
                    await notifyDataChanged?.();
                    if (response.data?.data?.newBookingId) {
                      await openEditBooking(response.data.data.newBookingId);
                    } else {
                      closeBookingForm();
                    }
                  } catch (error: any) {
                    toast.error(error?.response?.data?.error || 'Failed to submit party over');
                  } finally {
                    setSaving(false);
                    finalizeInFlightRef.current = false;
                  }
                }}
              />
            </div>
          )}

          <div
            className="form-actions"
            style={{
              position: 'sticky',
              bottom: 0,
              background: 'var(--surface)',
              borderTop: '1px solid var(--border)',
              padding: '12px 16px',
              marginTop: 12,
              zIndex: 20,
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowTermsModal(true)}
            >
              Terms &amp; Conditions
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
            >
              <span className="inline-flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print Form
              </span>
            </button>
            {editingBookingId && canExportMenuPdf && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const b =
                    (bookingsForMenuPdf ?? []).find((bk) => bk.id === editingBookingId) ||
                    (activeBookingObj as Booking | null);
                  if (b) setMenuPdfBooking(b);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Menu PDF
                </span>
              </button>
            )}
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => (onRequestClose ?? closeBookingForm)()}
              >
                Cancel
              </button>
              {!formReadOnly && (
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <span className="inline-flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Submit'}
                  </span>
                </button>
              )}
            </span>
          </div>
        </form>
      </fieldset>

      <FinalizedVersionHistory
        historicalVersions={historicalVersions}
        halls={halls}
        items={items as MenuItemLike[]}
        templateMenus={templateMenus}
      />

      <FormPromptModal
        open={showTermsModal}
        title="Terms & Conditions"
        onClose={() => setShowTermsModal(false)}
        widthClass="max-w-lg"
      >
        <BookingTermsSection compact hideTitle />
      </FormPromptModal>

      <QuickCustomerModal
        open={showAddCustomerForm}
        onClose={() => setShowAddCustomerForm(false)}
        canAddCustomer={canAddCustomer}
        referrerOptions={customerReferrerOptions}
        onCreated={handleQuickCustomerCreated}
      />

      <BookingMenuEditorModal
        packKey={menuEditorPack}
        packRow={activeMenuPackRow}
        templateMenus={templateMenus}
        menuItemSearch={menuItemSearch}
        onMenuItemSearchChange={setMenuItemSearch}
        groupedMenuItems={groupedMenuItems}
        selectedMenuItemsByGroup={selectedMenuItemsByGroup}
        menuItemNotes={menuEditorPack ? formData.packs[menuEditorPack]?.menuItemNotes || {} : {}}
        readOnly={formReadOnly}
        formDiff={formDiff}
        onImportTemplate={importTemplateToPack}
        onToggleMenuItem={togglePackMenuItem}
        onSaveMenuItemNote={setPackMenuItemNote}
        onQuickAddItem={() => {
          setQuickItemForm({ name: '', itemTypeId: itemTypes[0]?.id || '', points: '' });
          setShowQuickAddItem(true);
        }}
        onClose={() => {
          setMenuEditorPack(null);
          setMenuItemSearch('');
        }}
      />
      <MenuPdfModal
        booking={menuPdfBooking}
        onClose={() => setMenuPdfBooking(null)}
      />
      {showFinalizeReview &&
        (() => {
          const enabledPacks = (Object.keys(formData.packs) as PackKey[])
            .map((key) => ({ key, row: formData.packs[key] }))
            .filter((entry) => entry.row.enabled);
          const hallNamesFor = (hallIds: string[]) =>
            hallIds
              .map((id) => halls.find((hall) => hall.id === id)?.name)
              .filter(Boolean)
              .join(', ');
          const customerLabel =
            customerSearchInputs.primary ||
            formatCustomerLabel(
              customers.find((customer) => customer.id === formData.customerId)
            ) ||
            '—';
          const paymentsTotal = formData.payments.reduce(
            (sum, p) => sum + (Number(p.amount) || 0),
            0
          );
          return (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-slate-900/45"
                onClick={() => setShowFinalizeReview(false)}
                aria-label="Cancel finalize"
              />
              <div
                ref={finalizeModalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="finalize-review-title"
                className="modal-panel relative bg-surface rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
              >
                <div>
                  <h3
                    id="finalize-review-title"
                    className="text-base font-semibold text-[var(--text-1)] mb-1 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" aria-hidden />
                    Review before finalizing
                  </h3>
                  <p className="text-sm text-[var(--text-3)]">
                    Finalizing saves the booking, locks this version permanently as
                    read-only, and creates a new editable replica.
                  </p>
                </div>

                <dl className="text-sm space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-3)]">Customer</dt>
                    <dd className="font-medium text-[var(--text-1)] text-right">{customerLabel}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-3)]">Function</dt>
                    <dd className="font-medium text-[var(--text-1)] text-right">
                      {formData.functionType || '—'}
                      {formData.functionDate
                        ? ` · ${formatDateDDMMYYYY(formData.functionDate)}`
                        : ''}
                    </dd>
                  </div>
                </dl>

                <div className="rounded-xl border border-[var(--border-2)] divide-y divide-[var(--border)] text-sm">
                  {enabledPacks.length === 0 && (
                    <p className="px-3 py-2.5 text-[var(--text-4)]">No meal packs enabled.</p>
                  )}
                  {enabledPacks.map(({ key, row }) => (
                    <div key={key} className="px-3 py-2.5">
                      <p className="font-medium text-[var(--text-1)]">
                        {PACK_LABELS[key]}
                        {row.startTime && row.endTime ? (
                          <span className="ml-2 text-xs font-normal text-[var(--text-3)]">
                            {row.startTime}–{row.endTime}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[var(--text-3)] mt-0.5">
                        {hallNamesFor(row.hallIds) || 'No hall'}
                        {row.pax ? ` · ${row.pax} PAX` : ''}
                        {row.ratePerPlate
                          ? ` · ₹${Number(row.ratePerPlate).toLocaleString('en-IN')}/plate`
                          : ''}
                      </p>
                    </div>
                  ))}
                </div>

                <dl className="text-sm space-y-1.5 border-t border-[var(--border)] pt-3">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-3)]">Grand total</dt>
                    <dd className="font-semibold text-[var(--text-1)]">
                      ₹{Number(payableGrandTotal || 0).toLocaleString('en-IN')}
                    </dd>
                  </div>
                  {Number(formData.finalDiscountAmount) > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--text-3)]">Discount</dt>
                      <dd className="text-[var(--text-1)]">
                        ₹{Number(formData.finalDiscountAmount).toLocaleString('en-IN')}
                        {Number(formData.finalDiscountPercent) > 0
                          ? ` (${formData.finalDiscountPercent}%)`
                          : ''}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-3)]">
                      Payments recorded (incl. pending cheques)
                    </dt>
                    <dd className="text-[var(--text-1)]">
                      {formData.payments.length} · ₹{paymentsTotal.toLocaleString('en-IN')}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-3 justify-end pt-1">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowFinalizeReview(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() => void confirmFinalizeBooking()}
                  >
                    {saving ? 'Working…' : 'Save & Finalize'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {saveConflict && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/45"
            aria-hidden
          />
          <div
            ref={conflictModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-conflict-title"
            className="modal-panel relative bg-surface rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md p-6 flex flex-col gap-4"
          >
            <div>
              <h3
                id="save-conflict-title"
                className="text-base font-semibold text-[var(--text-1)] mb-1 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" aria-hidden />
                Booking changed by someone else
              </h3>
              <p className="text-sm text-[var(--text-3)]">
                This booking was updated
                {saveConflict.serverUpdatedAt
                  ? ` at ${new Date(saveConflict.serverUpdatedAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''}{' '}
                while you were editing. Reload latest before saving again.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSaveConflict(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSaveConflict(null);
                  if (editingBookingId) void openEditBooking(editingBookingId);
                }}
              >
                Reload latest (discard my edits)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Add Item Modal */}
      <FormPromptModal
        open={showQuickAddItem}
        onClose={() => setShowQuickAddItem(false)}
        title="Create New Item"
      >
        <form onSubmit={submitQuickAddItem} className="space-y-4">
          <Field label="Item Type" required>
            {(control) => (
              <Select
                {...control}
                value={quickItemForm.itemTypeId}
                onChange={(e) =>
                  setQuickItemForm((prev) => ({ ...prev, itemTypeId: e.target.value }))
                }
                placeholder="Select type..."
                required
              >
                {itemTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Item Name" required>
            {(control) => (
              <Input
                {...control}
                placeholder="e.g. Paneer Butter Masala"
                value={quickItemForm.name}
                onChange={(e) => setQuickItemForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            )}
          </Field>
          <Field label="Points" required>
            {(control) => (
              <Input
                {...control}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 1.5"
                value={quickItemForm.points}
                onChange={(e) =>
                  setQuickItemForm((prev) => ({ ...prev, points: e.target.value }))
                }
                required
              />
            )}
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setShowQuickAddItem(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingQuickItem}>
              {savingQuickItem ? 'Creating...' : 'Create & Select'}
            </button>
          </div>
        </form>
      </FormPromptModal>
    </>
  );
}
