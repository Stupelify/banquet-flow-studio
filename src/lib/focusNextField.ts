import type { KeyboardEvent } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isVisible(el: HTMLElement): boolean {
  if (el.closest('[hidden], [aria-hidden="true"]')) return false;
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/** Move focus to the next tabbable element inside container (document order). */
export function focusNextField(container: HTMLElement, current: HTMLElement): boolean {
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => isVisible(el) && !el.hasAttribute('disabled'));

  const index = focusable.indexOf(current);
  if (index < 0 || index >= focusable.length - 1) return false;

  const next = focusable[index + 1];
  next.focus();
  if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
    next.select();
  }
  return true;
}

/**
 * In data-entry forms: Enter moves to the next field (like Tab), without submitting.
 * Textareas and buttons keep normal Enter behavior.
 */
export function handleEnterAsTabKeyDown(
  e: KeyboardEvent<HTMLElement>,
  container?: HTMLElement | null
): void {
  if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;

  const target = e.target as HTMLElement;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;

  e.preventDefault();
  const root =
    container ??
    (target.closest('form, fieldset') as HTMLElement | null) ??
    target;
  focusNextField(root, target);
}
