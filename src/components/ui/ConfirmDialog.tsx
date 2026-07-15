
import FormPromptModal from '@/components/FormPromptModal';
import Button from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger styles the confirm button red (deletes, cancellations). */
  tone?: 'default' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Standard confirm prompt so pages stop hand-rolling one-off modals. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <FormPromptModal open={open} title={title} onClose={onClose} widthClass="max-w-md">
      <p className="text-sm text-text-2 leading-relaxed">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </FormPromptModal>
  );
}
