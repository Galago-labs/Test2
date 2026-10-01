import { readPreference, writePreference } from '../core/storage.ts';
import { STORAGE_KEYS } from '../core/storageKeys.ts';
import type { DialogKind } from './dialogState.ts';

// Tracks whether the player's very first game session — however it ended:
// a natural win/loss, or abandoned back to the room mid-round — has already
// shown its one-time "casual visitor" interstitial (see App.tsx's
// maybeShowFirstSessionAd). Deliberately its own tiny flag rather than a
// field on NapProgress (src/game/progress.ts): this is ad-scheduling
// bookkeeping, not something that describes the player's in-game progress,
// and mixing the two would make progress.ts's schema/migrations carry
// something unrelated to what it's actually for.
const FIRST_SESSION_AD_KEY = STORAGE_KEYS.firstSessionAd;

export const hasShownFirstSessionAd = () => readPreference(FIRST_SESSION_AD_KEY) === '1';
export const markFirstSessionAdShown = () => writePreference(FIRST_SESSION_AD_KEY, '1');

// Dialogs whose closing is a natural pause for an interstitial. The dream
// reveal is a reward the player can earn at most once per scenario: it is never
// gated behind an ad or interrupted by one — only once the player has finished
// looking at it and is leaving, by its button, the X, or Escape/back.
const AD_AFTER_CLOSING: readonly DialogKind[] = ['dreamReveal'];
export const isAdMomentOnDialogClose = (kind: DialogKind | null): boolean => kind !== null && AD_AFTER_CLOSING.includes(kind);
