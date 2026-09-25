import { readPreference, writePreference } from '../core/storage.ts';

// Tracks whether the player's very first game session — however it ended:
// a natural win/loss, or abandoned back to the room mid-round — has already
// shown its one-time "casual visitor" interstitial (see App.tsx's
// maybeShowFirstSessionAd). Deliberately its own tiny flag rather than a
// field on NapProgress (src/game/progress.ts): this is ad-scheduling
// bookkeeping, not something that describes the player's in-game progress,
// and mixing the two would make progress.ts's schema/migrations carry
// something unrelated to what it's actually for.
const FIRST_SESSION_AD_KEY = 'little-pause.first-session-ad-shown.v1';

export const hasShownFirstSessionAd = () => readPreference(FIRST_SESSION_AD_KEY) === '1';
export const markFirstSessionAdShown = () => writePreference(FIRST_SESSION_AD_KEY, '1');
