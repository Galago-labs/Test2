// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
// The live, in-memory copy of the active save slot, plus everything that can
// change it. Framework-free on purpose: React reads it through
// useSyncExternalStore (see useNapProgress.ts), and tests drive it directly.
//
// The session owns two invariants so no caller has to remember them:
//   - every change to progress is persisted to the slot it belongs to;
//   - a slot written by a newer build is displayed but never overwritten.
import type { StoragePort } from '../core/storage.ts';
import type { GameSnapshot } from './engine.ts';
import type { DecorationId } from './decorations.ts';
import { isScenario, type Scenario } from './scenarios.ts';
import { applyRound, emptyProgress, isSlotEmpty, toggleDecoration, type AchievementId, type NapProgress } from './progress.ts';
import {
  deleteSlot as deleteStoredSlot, isSaveSlot, listSlots, loadSlot, readActiveSlot, saveSlot, writeActiveSlot,
  SAVE_SLOTS, type SaveSlot, type SaveStatus, type SlotSummary,
} from './saveSlots.ts';

export interface ProgressState {
  readonly slot: SaveSlot;
  readonly progress: NapProgress;
  readonly status: SaveStatus;
}

export interface RecordedRound { achievements: AchievementId[]; decorations: DecorationId[]; completedScenario: Scenario | null }

export class ProgressSession {
  private state: ProgressState;
  private readonly listeners = new Set<() => void>();
  private readonly storage: StoragePort | null;

  constructor(storage: StoragePort | null) {
    this.storage = storage;
    const slot = readActiveSlot(storage);
    const loaded = loadSlot(storage, slot);
    this.state = { slot, progress: loaded.progress, status: loaded.status };
  }

  // Arrow properties: stable identities, safe to hand straight to React.
  getState = (): ProgressState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(next: ProgressState) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  private commit(progress: NapProgress) {
    const { slot, status } = this.state;
    const nextStatus = status === 'future' ? status : saveSlot(this.storage, slot, progress);
    this.publish({ slot, progress, status: nextStatus });
  }

  // Makes another slot the one being played. Its progress replaces the
  // in-memory copy; nothing from the previous slot leaks into it.
  switchSlot = (slot: SaveSlot): void => {
    if (!isSaveSlot(slot) || slot === this.state.slot) return;
    writeActiveSlot(this.storage, slot);
    const loaded = loadSlot(this.storage, slot);
    this.publish({ slot, progress: loaded.progress, status: loaded.status });
  };

  // Deleting is deleting: nothing is written back. If it was the active slot,
  // the player is immediately looking at a blank one, and the first real
  // change after that creates a fresh record.
  deleteSlot = (slot: SaveSlot): boolean => {
    if (!isSaveSlot(slot) || !deleteStoredSlot(this.storage, slot)) return false;
    if (slot === this.state.slot) this.publish({ slot, progress: emptyProgress(), status: 'ok' });
    return true;
  };

  // Summaries for a load screen: the active slot from memory (so unsaved-to-
  // disk states such as read-only storage still show), the others from storage.
  listSlots = (): SlotSummary[] => {
    const stored = listSlots(this.storage);
    return SAVE_SLOTS.map((slot) => {
      if (slot !== this.state.slot) return stored[slot - 1];
      return { slot, empty: isSlotEmpty(this.state.progress), progress: this.state.progress };
    });
  };

  recordRound = (game: GameSnapshot): RecordedRound => {
    const result = applyRound(this.state.progress, game);
    if (result.progress !== this.state.progress) this.commit(result.progress);
    return { achievements: result.unlocked, decorations: result.decorations, completedScenario: result.completedScenario };
  };

  selectScenario = (scenario: Scenario): void => {
    if (isScenario(scenario) && this.state.progress.selectedScenario !== scenario) this.commit({ ...this.state.progress, selectedScenario: scenario });
  };

  equipDecoration = (id: DecorationId): void => {
    const next = toggleDecoration(this.state.progress, id);
    if (next !== this.state.progress) this.commit(next);
  };
}
