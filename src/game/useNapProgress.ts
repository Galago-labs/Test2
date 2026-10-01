import { useState, useSyncExternalStore } from 'react';
import { browserStorage } from '../core/storage.ts';
import { ProgressSession } from './progressSession.ts';

// Thin React binding over ProgressSession: all rules live there, none here.
export function useNapProgress() {
  const [session] = useState(() => new ProgressSession(browserStorage()));
  const { slot, progress, status } = useSyncExternalStore(session.subscribe, session.getState);
  return {
    progress,
    activeSlot: slot,
    saveStatus: status,
    storageAvailable: status === 'ok' || status === 'recovered',
    recordRound: session.recordRound,
    selectScenario: session.selectScenario,
    equipDecoration: session.equipDecoration,
    switchSlot: session.switchSlot,
    deleteSlot: session.deleteSlot,
    listSlots: session.listSlots,
  };
}
