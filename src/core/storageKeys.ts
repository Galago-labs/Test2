// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
// The one place that names every localStorage key this game touches.
// A key defined anywhere else is a bug: modules import from here, so the
// full list of what the game persists can be read in one screen, and a new
// persisted value cannot be forgotten by tooling that needs to enumerate them.
//
// Two kinds of state, deliberately kept apart:
//   - per-slot save data (progress) — belongs to one of the save slots;
//   - device preferences (language, sound, tutorial, ad bookkeeping) — belong
//     to the player's device and are shared by every slot.
const NAMESPACE = 'little-pause';

export const STORAGE_KEYS = {
  activeSlot: `${NAMESPACE}.active-slot.v1`,
  locale: `${NAMESPACE}.language.v1`,
  music: `${NAMESPACE}.music-enabled.v1`,
  ambience: `${NAMESPACE}.ambience-enabled.v1`,
  tutorialSeen: `${NAMESPACE}.tutorial-seen.v1`,
  storageProbe: `${NAMESPACE}.storage-check`,
} as const;

// Every slot is stored symmetrically — no slot is special. Each has its own
// primary record and its own backup, so damage to one slot can never touch
// another.
export const saveKey = (slot: number) => `${NAMESPACE}.save.${slot}.v1`;
export const saveBackupKey = (slot: number) => `${NAMESPACE}.save.${slot}.backup`;
