// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
// Which dialog is open, and the small state machine around opening and closing
// it. Pure logic, no React: the reducer is what guarantees that two dialogs are
// never active at once and that a dropped animation event cannot lock the game.

// Every dialog the game has. Adding one means adding it here and to the screen
// registry (components/dialogs/registry.ts) — the compiler enforces the second.
export const DIALOG_KINDS = ['menu', 'saves', 'guide', 'story', 'intro', 'journal', 'settings', 'room', 'exitConfirm', 'dreamReveal'] as const;
export type DialogKind = typeof DIALOG_KINDS[number];

// What a dialog was opened in order to lead to. It is only handed on when the
// dialog is *completed* (finishing the tutorial), never when it is merely
// dismissed (closing it with the X).
export type DialogIntent = 'start-nap';

export interface DialogState {
  kind: DialogKind | null;
  closing: boolean;
  intent: DialogIntent | null;
  pendingIntent: DialogIntent | null;
  revision: number;
}

export type DialogAction =
  | { type: 'open'; kind: DialogKind; intent?: DialogIntent }
  | { type: 'close'; fulfil?: boolean }
  | { type: 'closed'; revision: number }
  | { type: 'intent-handled' };

export const initialDialogState: DialogState = { kind: null, closing: false, intent: null, pendingIntent: null, revision: 0 };

export function reduceDialog(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'open':
      // Opening during a close animation is ignored: it would create two active dialogs.
      return state.closing ? state : { kind: action.kind, closing: false, intent: action.intent ?? null, pendingIntent: null, revision: state.revision + 1 };
    case 'close':
      if (!state.kind || state.closing) return state;
      return { kind: null, closing: true, intent: null, pendingIntent: action.fulfil ? state.intent : null, revision: state.revision + 1 };
    case 'closed':
      // A late exit callback from an older dialog must not end a newer transition.
      return state.closing && action.revision === state.revision ? { ...state, closing: false } : state;
    case 'intent-handled':
      return state.pendingIntent ? { ...state, pendingIntent: null } : state;
  }
}
