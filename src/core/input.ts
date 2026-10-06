export function eventElement(target: EventTarget | null): Element | null { return target instanceof Element ? target : null; }
export function isInteractive(target: EventTarget | null) {
  return Boolean(eventElement(target)?.closest('button, a, input, select, textarea, summary, [contenteditable="true"]'));
}
export function capturePointer(element: HTMLElement, pointerId: number) {
  try { element.setPointerCapture?.(pointerId); } catch { /* Pointer cancellation is normal on mobile. */ }
}
export function releasePointer(element: HTMLElement, pointerId: number) {
  try { if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId); } catch { /* Capture may already be released. */ }
}
export function focusSafely(element: HTMLElement | null) {
  if (!element?.isConnected || element.closest('[inert]')) return;
  try { element.focus({ preventScroll: true }); } catch { /* A detached iframe can reject focus. */ }
}

// Pure, DOM-free: given how many focusable items exist and which one (if any)
// currently has focus, returns the index to move to next. Used by TV remote
// arrow-key navigation — kept separate from the DOM query so it's unit-testable.
export function nextFocusIndex(count: number, current: number, forward: boolean): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return forward ? 0 : count - 1;
  return (current + (forward ? 1 : -1) + count) % count;
}

const TV_FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], [tabindex="0"]';
export function queryTvFocusable(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(TV_FOCUSABLE_SELECTOR))
    .filter((element) => !element.closest('[inert]') && element.getClientRects().length > 0);
}