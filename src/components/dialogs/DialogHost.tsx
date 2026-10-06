// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
import type { RefObject } from 'react';
import type { DialogKind } from '../../game/dialogState.ts';
import { DialogServicesProvider, type DialogServices } from './DialogContext.tsx';
import { DialogFrame } from './DialogFrame.tsx';
import { DIALOGS } from './registry.ts';

interface DialogHostProps {
  kind: DialogKind;
  services: DialogServices;
  returnFocusRef: RefObject<HTMLElement | null>;
}

// Renders whichever dialog is open: the shared frame around the screen the
// registry names. This is the only thing the app mounts.
export function DialogHost({ kind, services, returnFocusRef }: DialogHostProps) {
  const { Screen, initialFocus } = DIALOGS[kind];
  return <DialogServicesProvider value={services}>
    <DialogFrame kind={kind} initialFocus={initialFocus} returnFocusRef={returnFocusRef}><Screen /></DialogFrame>
  </DialogServicesProvider>;
}
