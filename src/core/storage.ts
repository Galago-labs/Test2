// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
import { STORAGE_KEYS } from './storageKeys.ts';

export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface StoredValue { value: unknown; present: boolean; invalid: boolean }

export function browserStorage(): StoragePort | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function readStored(storage: StoragePort | null, key: string, maxLength = 100_000): StoredValue {
  try {
    const raw = storage?.getItem(key);
    if (raw == null) return { value: null, present: false, invalid: false };
    if (raw.length > maxLength) return { value: null, present: true, invalid: true };
    return { value: JSON.parse(raw) as unknown, present: true, invalid: false };
  } catch { return { value: null, present: true, invalid: true }; }
}

export function canWrite(storage: StoragePort | null) {
  if (!storage) return false;
  const key = STORAGE_KEYS.storageProbe;
  try { storage.setItem(key, '1'); storage.removeItem(key); return true; } catch { return false; }
}

export function readPreference(key: string) {
  try { return browserStorage()?.getItem(key) || null; } catch { return null; }
}

export function writePreference(key: string, value: string) {
  try { const storage = browserStorage(); if (!storage) return false; storage.setItem(key, value); return true; } catch { return false; }
}

export function removePreference(key: string) {
  try { browserStorage()?.removeItem(key); return true; } catch { return false; }
}