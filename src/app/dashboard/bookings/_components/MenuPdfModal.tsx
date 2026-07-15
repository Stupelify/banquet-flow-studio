
import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import FormPromptModal from '@/components/FormPromptModal';
import type { Booking, BookingMenuPackOption } from '../_lib/types';

/**
 * Menu PDF preview/download modal. Owns its setup/preview state; the page just
 * passes the booking to show (or null). Logic moved verbatim from page.tsx.
 */
export default function MenuPdfModal({
  booking,
  onClose,
}: {
  booking: Booking | null;
  onClose: () => void;
}) {
  const [packOptions, setPackOptions] = useState<BookingMenuPackOption[]>([]);
  const [packId, setPackId] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const bookingId = booking?.id ?? null;
  const bookingName =
    booking?.functionName || booking?.functionType || booking?.customer?.name || 'booking';

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearPreview = useCallback(() => {
    setPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  }, []);

  const handleClose = useCallback(() => {
    setPackOptions([]);
    setPackId('');
    setPdfLoading(false);
    setSetupLoading(false);
    clearPreview();
    onClose();
  }, [clearPreview, onClose]);

  const loadPreview = useCallback(async (id: string, pack: string) => {
    try {
      setPdfLoading(true);
      const response = await api.getBookingMenuPdf(id, pack);
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/pdf' });
      const nextUrl = URL.createObjectURL(blob);
      setPreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return nextUrl;
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to generate menu PDF');
    } finally {
      setPdfLoading(false);
    }
  }, []);

  // Setup when a booking is supplied: fetch its packs and pick the first menu.
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;

    const setup = async () => {
      try {
        setPackOptions([]);
        setPackId('');
        clearPreview();
        setSetupLoading(true);

        const response = await api.getBooking(bookingId);
        const bookingDetails = response.data?.data?.booking;
        const options: BookingMenuPackOption[] = ((bookingDetails?.packs ||
          []) as any[])
          .map((pack: any) => {
            const itemCount = (pack?.bookingMenu?.items || []).length;
            const packName =
              (pack?.packName || '').trim() ||
              (pack?.mealSlot?.name || '').trim() ||
              (pack?.bookingMenu?.name || '').trim() ||
              'Menu';
            return {
              id: pack.id,
              name: packName,
              itemCount,
            };
          })
          .filter((pack: BookingMenuPackOption) => pack.itemCount > 0);

        if (cancelled) return;

        if (options.length === 0) {
          toast.error('No menu items found for this booking');
          handleClose();
          return;
        }

        setPackOptions(options);
        setPackId(options[0].id);
      } catch (error: any) {
        if (cancelled) return;
        toast.error(error?.response?.data?.error || 'Failed to load menu PDF options');
        handleClose();
      } finally {
        if (!cancelled) setSetupLoading(false);
      }
    };

    void setup();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Auto-preview whenever the selected pack changes.
  useEffect(() => {
    if (!bookingId || !packId) return;
    void loadPreview(bookingId, packId);
  }, [loadPreview, bookingId, packId]);

  const handleDownload = () => {
    if (!previewUrl) return;
    const selectedPack = packOptions.find((pack) => pack.id === packId);
    const normalize = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'menu';
    const bookingToken = normalize(bookingName || 'booking');
    const packToken = normalize(selectedPack?.name || 'menu');
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `${bookingToken}-${packToken}-menu.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <FormPromptModal
      open={Boolean(bookingId)}
      title="Booking Menu PDF"
      onClose={handleClose}
      widthClass="max-w-6xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),auto,auto] gap-3 items-end">
          <div>
            <label className="label">Menu Pack</label>
            <select
              className="input"
              value={packId}
              disabled={setupLoading || packOptions.length === 0}
              onChange={(e) => setPackId(e.target.value)}
            >
              {packOptions.length === 0 ? (
                <option value="">No menu available</option>
              ) : (
                packOptions.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name} ({pack.itemCount} items)
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={setupLoading || pdfLoading || !bookingId || !packId}
            onClick={() => {
              if (!bookingId || !packId) return;
              void loadPreview(bookingId, packId);
            }}
          >
            Preview
          </button>
          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-2"
            disabled={!previewUrl || pdfLoading}
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden min-h-[500px]">
          {setupLoading ? (
            <div className="h-[500px] grid place-items-center text-sm text-[var(--text-2)]">
              Loading menu options...
            </div>
          ) : pdfLoading ? (
            <div className="h-[500px] grid place-items-center">
              <div className="skeleton" style={{ width: 120, height: 120, borderRadius: 16 }} />
            </div>
          ) : previewUrl ? (
            <iframe
              title="Booking menu PDF preview"
              src={previewUrl}
              className="w-full h-[70vh]"
            />
          ) : (
            <div className="h-[500px] grid place-items-center text-sm text-[var(--text-4)]">
              Select a menu pack to generate preview.
            </div>
          )}
        </div>
      </div>
    </FormPromptModal>
  );
}
