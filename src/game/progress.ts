import type { GameSnapshot, Mood } from './engine';
import { readStored, canWrite, type StoragePort } from '../core/storage.ts';
import { SCENARIO_IDS, isScenario, type Scenario } from './scenarios.ts';
import { DECORATION_IDS, DECORATIONS, decorationProgress, isDecoration, type DecorationId, type EquippedDecor } from './decorations.ts';

export const ACHIEVEMENTS = ['firstNap', 'quietNap', 'dreamWeaver', 'moonCollector', 'perfectNap', 'dreamGuardian'] as const;
export type AchievementId = typeof ACHIEVEMENTS[number];
export const PROGRESS_KEY = 'little-pause.progress.v2';
export const BACKUP_KEY = 'little-pause.progress.backup';
export const LEGACY_KEY = 'little-pause.best-naps.v1';
export type SaveStatus = 'ok' | 'unavailable' | 'recovered' | 'future';

export interface NapProgress {
  version: 4;
  updatedAt: number;
  bestScores: Record<Mood, number>;
  unlocked: Partial<Record<AchievementId, number>>;
  tutorialSeen: boolean;
  rounds: number;
  wins: number;
  dreams: number;
  recordedIds: number[];
  selectedScenario: Scenario;
  scenarioScores: Record<Scenario, Record<Mood, number>>;
  scenarioWins: Record<Scenario, number>;
  maxCombo: number;
  fireflies: number;
  decorations: Partial<Record<DecorationId, number>>;
  equipped: EquippedDecor;
}

export function emptyProgress(): NapProgress {
  return {
    version: 4, updatedAt: 0, bestScores: { gentle: 0, cozy: 0, dreamy: 0 }, unlocked: {}, tutorialSeen: false,
    rounds: 0, wins: 0, dreams: 0, recordedIds: [], selectedScenario: 'afternoon',
    scenarioScores: { afternoon: { gentle: 0, cozy: 0, dreamy: 0 }, breeze: { gentle: 0, cozy: 0, dreamy: 0 }, fireflies: { gentle: 0, cozy: 0, dreamy: 0 } },
    scenarioWins: { afternoon: 0, breeze: 0, fireflies: 0 }, maxCombo: 0, fireflies: 0, decorations: {}, equipped: {},
  };
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
const nonNegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1e9, Math.floor(value))) : 0;

export function unlockDecorations(progress: NapProgress, date = Date.now()): DecorationId[] {
  const newlyEarned: DecorationId[] = [];
  for (const id of DECORATION_IDS) {
    const { current, goal } = decorationProgress(id, progress);
    if (!progress.decorations[id] && current >= goal) { progress.decorations[id] = date; newlyEarned.push(id); }
  }
  return newlyEarned;
}

export function toggleDecoration(previous: NapProgress, id: DecorationId): NapProgress {
  if (!isDecoration(id) || !previous.decorations[id]) return previous;
  const slot = DECORATIONS[id].slot;
  const equipped = { ...previous.equipped };
  if (equipped[slot] === id) delete equipped[slot]; else equipped[slot] = id;
  return { ...previous, equipped };
}

export function parseProgress(value: unknown, legacy: unknown = {}): NapProgress {
  const source = object(value);
  const scores = object(source.bestScores);
  const oldScores = object(legacy);
  const unlocked = object(source.unlocked);
  const next = emptyProgress();
  next.updatedAt = typeof source.updatedAt === 'number' && Number.isSafeInteger(source.updatedAt) && source.updatedAt >= 0 ? source.updatedAt : 0;
  for (const mood of Object.keys(next.bestScores) as Mood[]) next.bestScores[mood] = Math.max(nonNegative(scores[mood]), nonNegative(oldScores[mood]));
  for (const id of ACHIEVEMENTS) {
    const date = unlocked[id];
    if (typeof date === 'number' && Number.isFinite(date) && date > 0 && date <= Date.now() + 86400000) next.unlocked[id] = date;
  }
  next.tutorialSeen = source.tutorialSeen === true;
  next.rounds = nonNegative(source.rounds);
  next.wins = Math.min(next.rounds, nonNegative(source.wins));
  next.dreams = nonNegative(source.dreams);
  if (Array.isArray(source.recordedIds)) next.recordedIds = [...new Set(source.recordedIds.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0))].slice(-64);
  next.selectedScenario = isScenario(source.selectedScenario) ? source.selectedScenario : 'afternoon';
  next.maxCombo = Math.max(nonNegative(source.maxCombo), next.unlocked.dreamWeaver ? 10 : 0);
  next.fireflies = nonNegative(source.fireflies);
  const scenarioScores = object(source.scenarioScores);
  const scenarioWins = object(source.scenarioWins);
  const legacyScenarios = Object.keys(scenarioScores).length === 0;
  for (const scenario of SCENARIO_IDS) {
    const scoresForScene = object(scenarioScores[scenario]);
    for (const mood of Object.keys(next.bestScores) as Mood[]) {
      next.scenarioScores[scenario][mood] = nonNegative(scoresForScene[mood]);
      if (scenario === 'afternoon' && legacyScenarios) next.scenarioScores[scenario][mood] = next.bestScores[mood];
    }
    next.scenarioWins[scenario] = Math.min(next.wins, nonNegative(scenarioWins[scenario]));
  }
  if (legacyScenarios) next.scenarioWins.afternoon = next.wins;
  const decorations = object(source.decorations);
  for (const id of DECORATION_IDS) {
    const date = decorations[id];
    if (typeof date === 'number' && Number.isFinite(date) && date > 0 && date <= Date.now() + 86400000) next.decorations[id] = date;
  }
  unlockDecorations(next);
  const equipment = object(source.equipped);
  for (const id of DECORATION_IDS) {
    const slot = DECORATIONS[id].slot;
    if (next.decorations[id] && equipment[slot] === id) next.equipped[slot] = id;
  }
  return next;
}

export function earnedAchievements(game: GameSnapshot): AchievementId[] {
  if (game.status !== 'won' && game.status !== 'lost') return [];
  const won = game.status === 'won';
  const conditions: Record<AchievementId, boolean> = {
    firstNap: won, quietNap: won && game.alarmHits === 0, dreamWeaver: game.maxCombo >= 10,
    moonCollector: game.moons >= 3, perfectNap: won && game.comfort >= 90, dreamGuardian: won && game.mood === 'dreamy',
  };
  return ACHIEVEMENTS.filter((id) => conditions[id]);
}

export function applyRound(previous: NapProgress, game: GameSnapshot, date = Date.now()) {
  if (!Number.isSafeInteger(game.roundId) || game.roundId <= 0 || previous.recordedIds.includes(game.roundId) ||
      (game.status !== 'won' && game.status !== 'lost') || !Object.prototype.hasOwnProperty.call(previous.bestScores, game.mood) || !isScenario(game.scenario)) return { progress: previous, unlocked: [] as AchievementId[], decorations: [] as DecorationId[] };
  const fresh = earnedAchievements(game).filter((id) => !previous.unlocked[id]);
  const unlocked = { ...previous.unlocked };
  for (const id of fresh) unlocked[id] = date;
  const progress: NapProgress = {
    ...previous, unlocked,
    decorations: { ...previous.decorations }, equipped: { ...previous.equipped },
    bestScores: { ...previous.bestScores, [game.mood]: Math.max(previous.bestScores[game.mood], nonNegative(game.score)) },
    rounds: nonNegative(previous.rounds + 1), wins: nonNegative(previous.wins + Number(game.status === 'won')),
    dreams: nonNegative(previous.dreams + nonNegative(game.caught)), recordedIds: [...previous.recordedIds, game.roundId].slice(-64),
    maxCombo: Math.max(previous.maxCombo, nonNegative(game.maxCombo)), fireflies: nonNegative(previous.fireflies + nonNegative(game.fireflies)),
    scenarioWins: { ...previous.scenarioWins, [game.scenario]: nonNegative(previous.scenarioWins[game.scenario] + Number(game.status === 'won')) },
    scenarioScores: { ...previous.scenarioScores, [game.scenario]: { ...previous.scenarioScores[game.scenario], [game.mood]: Math.max(previous.scenarioScores[game.scenario][game.mood], nonNegative(game.score)) } },
  };
  return { progress, unlocked: fresh, decorations: unlockDecorations(progress, date) };
}

function validShape(value: unknown) { const source = object(value); return typeof source.bestScores === 'object' && source.bestScores !== null && !Array.isArray(source.bestScores); }
function futureVersion(value: unknown) { const version = object(value).version; return typeof version === 'number' && version > 4; }

export function loadProgress(storage: StoragePort | null): { progress: NapProgress; status: SaveStatus } {
  const primary = readStored(storage, PROGRESS_KEY);
  const backup = readStored(storage, BACKUP_KEY);
  const legacy = readStored(storage, LEGACY_KEY, 4096).value;
  if (futureVersion(primary.value)) return { progress: parseProgress(primary.value, legacy), status: 'future' };
  if ((!primary.present || primary.invalid) && futureVersion(backup.value)) return { progress: parseProgress(backup.value, legacy), status: 'future' };
  const damaged = primary.invalid || (primary.present && !validShape(primary.value));
  const backupUsable = !backup.invalid && validShape(backup.value) && !futureVersion(backup.value);
  const backupNewer = backupUsable && parseProgress(backup.value).updatedAt > parseProgress(primary.value).updatedAt;
  const restore = backupUsable && (!primary.present || damaged || backupNewer);
  const value = restore ? backup.value : damaged ? null : primary.value;
  return { progress: parseProgress(value, legacy), status: !canWrite(storage) ? 'unavailable' : damaged || restore ? 'recovered' : 'ok' };
}

export function persistProgress(storage: StoragePort | null, progress: NapProgress): SaveStatus {
  if (!storage) return 'unavailable';
  try {
    const current = readStored(storage, PROGRESS_KEY);
    if (futureVersion(current.value) || futureVersion(readStored(storage, BACKUP_KEY).value)) return 'future';
    const updatedAt = Math.max(Date.now(), parseProgress(current.value).updatedAt + 1, progress.updatedAt + 1);
    const serialized = JSON.stringify({ ...progress, updatedAt });
    // A complete backup is written first; either full record can recover the next launch.
    try { storage.setItem(BACKUP_KEY, serialized); } catch { /* The primary may still have capacity. */ }
    storage.setItem(PROGRESS_KEY, serialized);
    return 'ok';
  } catch { return 'unavailable'; }
}