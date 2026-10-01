import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { motion, useIsPresent } from 'motion/react';
import { X } from '../Icons.tsx';
import { focusSafely } from '../../core/input.ts';
import type { DialogKind } from '../../game/dialogState.ts';
import { DialogBlockedProvider, useDialog } from './DialogContext.tsx';

const TABBABLE = 'button:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]';

interface DialogFrameProps {
  kind: DialogKind;
  /** Selector of the control to focus first; defaults to the first button. */
  initialFocus?: string;
  /** Where focus goes when the dialog closes. A ref, so it is read when needed, never during render. */
  returnFocusRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

// The shared shell of every dialog: backdrop, close button, focus handling,
// and the Tab trap. Screens supply only their content.
export function DialogFrame({ kind, initialFocus, returnFocusRef, children }: DialogFrameProps) {
  const { t, close, suspended } = useDialog();
  const dialogRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();
  const blocked = suspended || !isPresent;

  useEffect(() => {
    const previous = returnFocusRef.current || document.activeElement as HTMLElement | null;
    focusSafely(dialogRef.current?.querySelector<HTMLElement>(initialFocus ?? 'button') ?? null);
    return () => focusSafely(previous);
  }, [returnFocusRef, initialFocus]);

  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(TABBABLE) ?? []).filter((element) => element.getClientRects().length > 0);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(event) => { if (!blocked && event.target === event.currentTarget) close(); }}>
      <motion.div ref={dialogRef} className={`little-dialog dialog-kind-${kind}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title"
        inert={blocked}
        initial={{ y: 20, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, scale: 0.98 }} transition={{ duration: 0.25 }}
        onKeyDown={trapTab}>
        <button className="icon-button dialog-close" onClick={close} aria-label={t('dialog.close')}><X size={20} /></button>
        <div className="dialog-content">
          <DialogBlockedProvider value={blocked}>{children}</DialogBlockedProvider>
        </div>
      </motion.div>
    </motion.div>
  );
}
