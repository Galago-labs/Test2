import { createContext, useContext } from 'react';
import type { DecorationId } from '../../game/decorations.ts';
import type { Mood } from '../../game/engine.ts';
import type { DialogKind } from '../../game/dialogState.ts';
import type { NapProgress } from '../../game/progress.ts';
import type { Scenario } from '../../game/scenarios.ts';
import type { SaveSlot, SaveStatus, SlotSummary } from '../../game/saveSlots.ts';
import type { Locale, Translator } from '../../i18n.ts';

// Everything a dialog screen may need from the rest of the game, provided once
// by the app. Screens read only the parts they use, so adding a screen (or a
// dependency of one) never touches a shared props list.
export interface DialogServices {
  t: Translator;
  locale: Locale;
  selectLocale: (locale: Locale) => void;
  /** True while the platform has the game suspended (ad on screen, tab hidden). */
  suspended: boolean;
  close: () => void;
  open: (kind: DialogKind) => void;
  progress: NapProgress;
  save: { status: SaveStatus; available: boolean };
  audio: {
    enabled: boolean; available: boolean; toggle: () => void;
    musicEnabled: boolean; toggleMusic: () => void;
    ambienceEnabled: boolean; toggleAmbience: () => void;
  };
  display: {
    fullscreen: boolean; changeFullscreen: (enter: boolean) => Promise<boolean>;
    platformUnavailable: boolean; reconnect: () => void;
  };
  pace: { mood: Mood; select: (mood: Mood) => void; /** A round is in progress, so the pace cannot change. */ locked: boolean };
  equipDecoration: (id: DecorationId) => void;
  tutorial: { returning: boolean; finish: () => void; onActivityChange: (active: boolean) => void };
  saves: {
    active: SaveSlot;
    /** A round is in progress: saves cannot be switched until it ends, or the result would land in the wrong save. */
    locked: boolean;
    list: () => SlotSummary[];
    /** Makes this save the one being played, and returns to the room. Closes the dialog. */
    select: (slot: SaveSlot) => void;
    /** Deletes one save. Returns false if storage refused, in which case nothing changed. */
    remove: (slot: SaveSlot) => boolean;
  };
  completedScenario: Scenario | null;
  /** Whether the game can actually leave itself: only the native app can. A web page, or a game inside a portal (TV included), cannot close its host, so an Exit button there would do nothing. */
  canExit: boolean;
  confirmExit: () => void;
}

const ServicesContext = createContext<DialogServices | null>(null);
export const DialogServicesProvider = ServicesContext.Provider;

export function useDialog(): DialogServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useDialog must be used inside a dialog');
  return services;
}

// True while the dialog cannot be interacted with: the game is suspended, or
// the dialog is animating out. Provided by the frame, not by the app.
const BlockedContext = createContext(false);
export const DialogBlockedProvider = BlockedContext.Provider;
export const useDialogBlocked = () => useContext(BlockedContext);
