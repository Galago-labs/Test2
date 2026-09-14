import { useEffect } from 'react';
import { nextFocusIndex, queryTvFocusable } from '../core/input';

// Moves DOM focus between the currently visible buttons/links using the TV
// remote's arrow keys (which arrive as plain ArrowUp/Down/Left/Right
// KeyboardEvents, same as a keyboard). Nothing here runs unless `active` is
// true, so it has zero effect on desktop or mobile play.
//
// It deliberately does not try to reason about 2D layout — it just cycles
// through whatever is currently focusable, in DOM order, wrapping at the
// ends. `inert` (already used throughout the app for closed dialogs/menus)
// keeps the list scoped to whatever screen is actually showing, for free.
export function useTvNavigation(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const healFocus = () => {
      const items = queryTvFocusable();
      if (items.length && !items.includes(document.activeElement as HTMLElement)) {
        items[0].focus({ preventScroll: true });
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const backward = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
      if (!forward && !backward) return;
      const items = queryTvFocusable();
      if (!items.length) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      const target = items[nextFocusIndex(items.length, current, forward)];
      if (target) { event.preventDefault(); target.focus({ preventScroll: true }); }
    };

    healFocus();
    // Dialogs and the main menu mount/unmount rather than merely hiding, so
    // re-check whenever the DOM changes shape (debounced to one check per frame).
    let pending = 0;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; healFocus(); });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      observer.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
  }, [active]);
}
