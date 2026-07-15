/**
 * Shared Radix Dialog primitives styled for Bika ops surfaces.
 * Prefer ConfirmDialog / Sheet / CommandPalette here; booking and ops forms
 * use FormPromptModal (custom portal) for master-parity nesting behavior.
 */
import * as RadixDialog from '@radix-ui/react-dialog';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogPortal = RadixDialog.Portal;
export const DialogTitle = RadixDialog.Title;
export const DialogDescription = RadixDialog.Description;

type OverlayProps = ComponentPropsWithoutRef<typeof RadixDialog.Overlay>;

export function DialogOverlay({ className = '', ...props }: OverlayProps) {
  return (
    <RadixDialog.Overlay
      className={`ui-dialog-overlay ${className}`.trim()}
      data-capacitor-overlay="open"
      {...props}
    />
  );
}

type ContentProps = ComponentPropsWithoutRef<typeof RadixDialog.Content> & {
  /** Extra classes for the panel (width, sheet slide, etc.). */
  panelClassName?: string;
  children: ReactNode;
};

export function DialogContent({
  className = '',
  panelClassName = '',
  children,
  ...props
}: ContentProps) {
  return (
    <RadixDialog.Content
      className={`ui-dialog-content ${panelClassName} ${className}`.trim()}
      data-ops-form-surface="true"
      {...props}
    >
      {children}
    </RadixDialog.Content>
  );
}
