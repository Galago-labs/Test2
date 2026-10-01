import { useCallback, useState } from 'react';
import { readPreference, writePreference } from '../core/storage.ts';
import { STORAGE_KEYS } from '../core/storageKeys.ts';

// Whether this device has already seen the tutorial. Device state, not slot
// state: starting a new save slot must not make a returning player sit
// through the basics again.
export function useTutorialSeen() {
  const [tutorialSeen, setTutorialSeen] = useState(() => readPreference(STORAGE_KEYS.tutorialSeen) === '1');
  const markTutorialSeen = useCallback(() => {
    writePreference(STORAGE_KEYS.tutorialSeen, '1');
    setTutorialSeen(true);
  }, []);
  return { tutorialSeen, markTutorialSeen };
}
