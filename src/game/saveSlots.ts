// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
// Persistence of save slots. Knows how NapProgress is stored — never what it
// means (that is progress.ts) and never who is looking at it (React).
//
// Three slots, all stored the same way: each has its own primary record and
// its own backup under keys from core/storageKeys.ts, so damage to one slot
// cannot reach another. Which slot is in play is device state, not slot data.
import { canWrite, readStored, type StoragePort } from '../core/storage.ts';
import { STORAGE_KEYS, saveBackupKey, saveKey } from '../core/storageKeys.ts';
import { SAVE_SCHEMA_VERSION, isSlotEmpty, parseProgress, type NapProgress } from './progress.ts';

export type SaveStatus = 'ok' | 'unavailable' | 'recovered' | 'future';

export const SAVE_SLOTS = [1, 2, 3] as const;
export type SaveSlot = typeof SAVE_SLOTS[number];
export const DEFAULT_SLOT: SaveSlot = 1;

export function isSaveSlot(value: unknown): value is SaveSlot {
  return (SAVE_SLOTS as readonly unknown[]).includes(value);
}

export interface SlotSummary { slot: SaveSlot; empty: boolean; progress: NapProgress }

export function readActiveSlot(storage: StoragePort | null): SaveSlot {
  const raw = readStored(storage, STORAGE_KEYS.activeSlot).value;
  return isSaveSlot(raw) ? raw : DEFAULT_SLOT;
}

export function writeActiveSlot(storage: StoragePort | null, slot: SaveSlot): boolean {
  if (!storage) return false;
  try { storage.setItem(STORAGE_KEYS.activeSlot, JSON.stringify(slot)); return true; } catch { return false; }
}

function isFutureVersion(value: unknown): boolean {
  const version = value && typeof value === 'object' ? (value as { version?: unknown }).version : undefined;
  return typeof version === 'number' && version > SAVE_SCHEMA_VERSION;
}

function hasSaveShape(value: unknown): boolean {
  const version = value && typeof value === 'object' && !Array.isArray(value) ? (value as { version?: unknown }).version : undefined;
  return typeof version === 'number' && Number.isSafeInteger(version) && version >= 1;
}

export function loadSlot(storage: StoragePort | null, slot: SaveSlot): { progress: NapProgress; status: SaveStatus } {
  const primary = readStored(storage, saveKey(slot));
  const backup = readStored(storage, saveBackupKey(slot));

  // A record from a newer build is shown but never rewritten.
  if (isFutureVersion(primary.value)) return { progress: parseProgress(primary.value), status: 'future' };
  if ((!primary.present || primary.invalid) && isFutureVersion(backup.value)) return { progress: parseProgress(backup.value), status: 'future' };

  const damaged = primary.invalid || (primary.present && !hasSaveShape(primary.value));
  const backupUsable = !backup.invalid && hasSaveShape(backup.value) && !isFutureVersion(backup.value);
  const backupNewer = backupUsable && parseProgress(backup.value).updatedAt > parseProgress(primary.value).updatedAt;
  const restore = backupUsable && (!primary.present || damaged || backupNewer);

  const value = restore ? backup.value : damaged ? null : primary.value;
  const status: SaveStatus = !canWrite(storage) ? 'unavailable' : damaged || restore ? 'recovered' : 'ok';
  return { progress: parseProgress(value), status };
}

export function saveSlot(storage: StoragePort | null, slot: SaveSlot, progress: NapProgress): SaveStatus {
  if (!storage) return 'unavailable';
  const primaryKey = saveKey(slot);
  const backupKey = saveBackupKey(slot);
  try {
    const current = readStored(storage, primaryKey);
    if (isFutureVersion(current.value) || isFutureVersion(readStored(storage, backupKey).value)) return 'future';
    const updatedAt = Math.max(Date.now(), parseProgress(current.value).updatedAt + 1, progress.updatedAt + 1);
    const serialized = JSON.stringify({ ...progress, updatedAt });
    // A complete backup is written first, so either full record can recover the next launch.
    try { storage.setItem(backupKey, serialized); } catch { /* The primary may still have capacity. */ }
    storage.setItem(primaryKey, serialized);
    return 'ok';
  } catch { return 'unavailable'; }
}

// Removes only this slot's record and backup. Other slots, the active-slot
// pointer, and device preferences are untouched. Returns true only if both
// records are gone.
export function deleteSlot(storage: StoragePort | null, slot: SaveSlot): boolean {
  if (!storage) return false;
  let removed = true;
  for (const key of [saveKey(slot), saveBackupKey(slot)]) {
    try { storage.removeItem(key); } catch { removed = false; }
  }
  return removed;
}

export function listSlots(storage: StoragePort | null): SlotSummary[] {
  return SAVE_SLOTS.map((slot) => {
    const progress = loadSlot(storage, slot).progress;
    return { slot, empty: isSlotEmpty(progress), progress };
  });
}
