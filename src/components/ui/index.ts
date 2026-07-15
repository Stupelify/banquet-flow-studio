/**
 * UI primitive kit. Pages import from '@/components/ui' instead of hand-building
 * buttons/inputs/modals. Styling comes from the design-system classes in
 * src/styles (btn, input, card, status-pill, …) — keep markup and look in sync
 * by changing the CSS, not by forking components.
 *
 * Overlays: Dialog / Sheet / confirmDialog are Radix-backed; FormPromptModal
 * is the master-parity custom portal used by ops booking forms.
 */
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Select } from './Select';
export { default as Textarea } from './Textarea';
export { default as Field } from './Field';
export { default as Badge } from './Badge';
export { default as Switch } from './Switch';
export { default as Spinner } from './Spinner';
export { default as ConfirmDialog } from './ConfirmDialog';
export { Tabs, TabList, Tab, TabPanel, useTabList, type TabsVariant } from './Tabs';
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './Dialog';

// Established primitives that already lived in components/ — re-exported so
// new code has one import path.
export { default as Modal } from '@/components/FormPromptModal';
export { default as Sheet } from '@/components/Sheet';
export { confirmDialog, ConfirmDialogHost } from '@/components/ConfirmDialog';
export { default as EmptyState } from '@/components/EmptyState';
export { default as StatusBadge } from '@/components/StatusBadge';
export { default as Combobox } from '@/components/Combobox';
export { default as TablePagination } from '@/components/TablePagination';
export { default as SortableHeader } from '@/components/SortableHeader';
export { default as Toolbar } from '@/components/Toolbar';
export { KpiCardSkeleton, TableSkeleton } from '@/components/Skeletons';
