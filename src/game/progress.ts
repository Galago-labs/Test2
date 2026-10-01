// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
// Player progress: what a save slot contains and the rules for changing it.
// Pure domain logic — no storage, no React. Persistence lives in saveSlots.ts,
// and the live in-memory copy in progressSession.ts.
import { MOOD_IDS, isMood, type GameSnapshot, type Mood } from './engine.ts';
import { SCENARIO_IDS, SCENARIO_DREAM_GOAL, isScenario, type Scenario } from './scenarios.ts';
import { DECORATION_IDS, DECORATIONS, decorationProgress, isDecoration, type DecorationId, type EquippedDecor } from './decorations.ts';

export const ACHIEVEMENTS = ['firstNap', 'quietNap', 'dreamWeaver', 'moonCollector', 'perfectNap', 'dreamGuardian'] as const;
export type AchievementId = typeof ACHIEVEMENTS[number];

// Bumped whenever the shape of NapProgress changes incompatibly. A save
// written by a *newer* build (version above this) is never overwritten.
export const SAVE_SCHEMA_VERSION = 1;

// Records are kept per scenario and per pace; "best of a pace" is derived from
// them (see bestScore) rather than stored a second time.
type ScoreBoard = Record<Scenario, Record<Mood, number>>;

export interface NapProgress {
  version: typeof SAVE_SCHEMA_VERSION;
  updatedAt: number;
  unlocked: Partial<Record<AchievementId, number>>;
  rounds: number;
  wins: number;
  dreams: number;
  recordedIds: number[];
  selectedScenario: Scenario;
  scenarioScores: ScoreBoard;
  scenarioWins: Record<Scenario, number>;
  maxCombo: number;
  fireflies: number;
  decorations: Partial<Record<DecorationId, number>>;
  equipped: EquippedDecor;
}

export interface RoundResult {
  progress: NapProgress;
  unlocked: AchievementId[];
  decorations: DecorationId[];
  completedScenario: Scenario | null;
}

const RECORDED_ROUNDS_KEPT = 64;
const COUNTER_LIMIT = 1e9;
const CLOCK_SKEW_ALLOWANCE_MS = 86_400_000;

const zeroByMood = (): Record<Mood, number> => Object.fromEntries(MOOD_IDS.map((mood) => [mood, 0])) as Record<Mood, number>;
const zeroByScenario = (): Record<Scenario, number> => Object.fromEntries(SCENARIO_IDS.map((scenario) => [scenario, 0])) as Record<Scenario, number>;

export function emptyProgress(): NapProgress {
  return {
    version: SAVE_SCHEMA_VERSION,
    updatedAt: 0,
    unlocked: {},
    rounds: 0,
    wins: 0,
    dreams: 0,
    recordedIds: [],
    selectedScenario: SCENARIO_IDS[0],
    scenarioScores: Object.fromEntries(SCENARIO_IDS.map((scenario) => [scenario, zeroByMood()])) as ScoreBoard,
    scenarioWins: zeroByScenario(),
    maxCombo: 0,
    fireflies: 0,
    decorations: {},
    equipped: {},
  };
}

// A slot with no rounds played is a blank slot: it gets "New Game", not
// "Continue". Judged by content, not by whether a record happens to exist.
export function isSlotEmpty(progress: NapProgress): boolean {
  return progress.rounds === 0;
}

export function bestScore(progress: NapProgress, mood: Mood): number {
  return Math.max(...SCENARIO_IDS.map((scenario) => progress.scenarioScores[scenario][mood]));
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
const nonNegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(COUNTER_LIMIT, Math.floor(value))) : 0;
const plausibleDate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= Date.now() + CLOCK_SKEW_ALLOWANCE_MS;

export function unlockDecorations(progress: NapProgress, date = Date.now()): DecorationId[] {
  const newlyEarned: DecorationId[] = [];
  for (const id of DECORATION_IDS) {
    const { current, goal } = decorationProgress(id, progress);
    if (!progress.decorations[id] && current >= goal) {
      progress.decorations[id] = date;
      newlyEarned.push(id);
    }
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

// Accepts anything a storage backend might hand back — including damaged or
// hand-edited data — and always returns a fully valid NapProgress.
export function parseProgress(value: unknown): NapProgress {
  const source = object(value);
  const next = emptyProgress();

  next.updatedAt = typeof source.updatedAt === 'number' && Number.isSafeInteger(source.updatedAt) && source.updatedAt >= 0 ? source.updatedAt : 0;

  const unlocked = object(source.unlocked);
  for (const id of ACHIEVEMENTS) if (plausibleDate(unlocked[id])) next.unlocked[id] = unlocked[id];

  next.rounds = nonNegative(source.rounds);
  next.wins = Math.min(next.rounds, nonNegative(source.wins));
  next.dreams = nonNegative(source.dreams);
  next.fireflies = nonNegative(source.fireflies);
  next.maxCombo = Math.max(nonNegative(source.maxCombo), next.unlocked.dreamWeaver ? 10 : 0);
  next.selectedScenario = isScenario(source.selectedScenario) ? source.selectedScenario : next.selectedScenario;
  if (Array.isArray(source.recordedIds)) {
    const ids = source.recordedIds.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0);
    next.recordedIds = [...new Set(ids)].slice(-RECORDED_ROUNDS_KEPT);
  }

  const scores = object(source.scenarioScores);
  const wins = object(source.scenarioWins);
  for (const scenario of SCENARIO_IDS) {
    const scenarioScores = object(scores[scenario]);
    for (const mood of MOOD_IDS) next.scenarioScores[scenario][mood] = nonNegative(scenarioScores[mood]);
    next.scenarioWins[scenario] = Math.min(next.wins, nonNegative(wins[scenario]));
  }

  const decorations = object(source.decorations);
  for (const id of DECORATION_IDS) if (plausibleDate(decorations[id])) next.decorations[id] = decorations[id];
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
    firstNap: won,
    quietNap: won && game.alarmHits === 0,
    dreamWeaver: game.maxCombo >= 10,
    moonCollector: game.moons >= 3,
    perfectNap: won && game.comfort >= 90,
    dreamGuardian: won && game.mood === 'dreamy',
  };
  return ACHIEVEMENTS.filter((id) => conditions[id]);
}

function isRecordableRound(previous: NapProgress, game: GameSnapshot): boolean {
  return Number.isSafeInteger(game.roundId) && game.roundId > 0
    && !previous.recordedIds.includes(game.roundId)
    && (game.status === 'won' || game.status === 'lost')
    && isMood(game.mood)
    && isScenario(game.scenario);
}

export function applyRound(previous: NapProgress, game: GameSnapshot, date = Date.now()): RoundResult {
  if (!isRecordableRound(previous, game)) return { progress: previous, unlocked: [], decorations: [], completedScenario: null };

  const won = game.status === 'won';
  const fresh = earnedAchievements(game).filter((id) => !previous.unlocked[id]);
  const unlocked = { ...previous.unlocked };
  for (const id of fresh) unlocked[id] = date;

  const scenarioWinsBefore = previous.scenarioWins[game.scenario];
  const scenarioWinsAfter = nonNegative(scenarioWinsBefore + Number(won));
  const score = nonNegative(game.score);

  const progress: NapProgress = {
    ...previous,
    unlocked,
    decorations: { ...previous.decorations },
    equipped: { ...previous.equipped },
    rounds: nonNegative(previous.rounds + 1),
    wins: nonNegative(previous.wins + Number(won)),
    dreams: nonNegative(previous.dreams + nonNegative(game.caught)),
    recordedIds: [...previous.recordedIds, game.roundId].slice(-RECORDED_ROUNDS_KEPT),
    maxCombo: Math.max(previous.maxCombo, nonNegative(game.maxCombo)),
    fireflies: nonNegative(previous.fireflies + nonNegative(game.fireflies)),
    scenarioWins: { ...previous.scenarioWins, [game.scenario]: scenarioWinsAfter },
    scenarioScores: {
      ...previous.scenarioScores,
      [game.scenario]: { ...previous.scenarioScores[game.scenario], [game.mood]: Math.max(previous.scenarioScores[game.scenario][game.mood], score) },
    },
  };

  // Crossing the goal for the first time, this round specifically — not just
  // "already past it" on a later replay of the same scenario.
  const crossedGoal = scenarioWinsBefore < SCENARIO_DREAM_GOAL && scenarioWinsAfter >= SCENARIO_DREAM_GOAL;
  return { progress, unlocked: fresh, decorations: unlockDecorations(progress, date), completedScenario: crossedGoal ? game.scenario : null };
}
