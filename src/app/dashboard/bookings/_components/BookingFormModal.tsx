import FormPromptModal from '@/components/FormPromptModal';
import type { useBookingForm } from '../_hooks/useBookingForm';
import BookingFormBody from './BookingFormBody';

export type BookingFormModalProps = ReturnType<typeof useBookingForm>;

export default function BookingFormModal(props: BookingFormModalProps) {
  const {
    showCreateForm,
    closeBookingForm,
    isFormDirty,
    editingBookingId,
    bookingLoadState,
    bookingLoadError,
    openEditBooking,
    activeBookingTab,
    setActiveBookingTab,
    formData,
  } = props;

  // Keep modal open while a deep-link edit is still loading / failed retry,
  // matching redesign navigation without changing master chrome once loaded.
  const modalOpen =
    showCreateForm ||
    bookingLoadState === 'loading' ||
    (bookingLoadState === 'error' && Boolean(editingBookingId));

  return (
    <FormPromptModal
      open={modalOpen}
      title={editingBookingId ? 'Edit Booking' : 'Booking Form'}
      onClose={closeBookingForm}
      widthClass="max-w-[1400px]"
      isDirty={isFormDirty}
      headerContent={
        <div
          className="flex min-w-0 flex-1 items-end gap-1"
          role="tablist"
          aria-label="Booking form sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeBookingTab === 'details'}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeBookingTab === 'details'
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`}
            onClick={() => setActiveBookingTab('details')}
          >
            Booking Form
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeBookingTab === 'payments'}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeBookingTab === 'payments'
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`}
            onClick={() => setActiveBookingTab('payments')}
          >
            Payments &amp; Party Over
            {formData.payments.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary-100 dark:bg-primary-900/40 text-[10px] font-bold text-primary-700 dark:text-primary-300">
                {formData.payments.length}
              </span>
            )}
          </button>
        </div>
      }
    >
      {bookingLoadState === 'loading' && !showCreateForm ? (
        <div className="skeleton" style={{ height: 360, borderRadius: 12 }} aria-busy="true" />
      ) : bookingLoadState === 'error' && !showCreateForm ? (
        <div className="space-y-4 p-6 text-center">
          <p className="text-sm text-[var(--text-2)]">
            {bookingLoadError || 'Failed to load booking'}
          </p>
          {editingBookingId ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void openEditBooking(editingBookingId)}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : (
        <BookingFormBody
          {...props}
          showPaymentsTab
          hideSectionTabs
          onRequestClose={closeBookingForm}
        />
      )}
    </FormPromptModal>
  );
}
