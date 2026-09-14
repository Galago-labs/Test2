export type ModalKind = 'guide' | 'story' | 'intro' | 'journal' | 'settings' | 'room' | 'exitConfirm' | null;
export interface DialogState { modal: ModalKind; closing: boolean; startAfterClose: boolean; tutorialStartsNap: boolean; revision: number }
export type DialogAction =
  | { type: 'open'; modal: Exclude<ModalKind, null>; startsNap?: boolean }
  | { type: 'close'; startsNap?: boolean }
  | { type: 'closed'; revision: number }
  | { type: 'consume-start' };
export const initialDialogState: DialogState = { modal: null, closing: false, startAfterClose: false, tutorialStartsNap: false, revision: 0 };

export function reduceDialog(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'open': return state.closing ? state : { modal: action.modal, closing: false, startAfterClose: false, tutorialStartsNap: action.modal === 'intro' && Boolean(action.startsNap), revision: state.revision + 1 };
    case 'close': return !state.modal || state.closing ? state : { ...state, modal: null, closing: true, startAfterClose: Boolean(action.startsNap), revision: state.revision + 1 };
    case 'closed': return state.closing && action.revision === state.revision ? { ...state, closing: false } : state;
    case 'consume-start': return { ...state, startAfterClose: false };
  }
}