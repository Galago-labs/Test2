// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
//
// Every achievement the game has, and exactly what earns it. Pure rules — no
// storage, no React. progress.ts applies them after each round.
//
// Two kinds, kept apart on purpose:
//   - round achievements: judged from how one nap went (skill and daring);
//   - milestones: judged from the save as a whole (persistence and completion),
//     and therefore able to show a progress bar while they are still locked.
//
// The game's main path is 15 naps (three dreams, five wins each). Rewards are
// there to carry a player through those 15 and are all within reach of an
// ordinary player by about the 18th, on the default pace, without touching any
// setting; only the secret one waits for the 20th. The skill trophies sit where
// an ordinary player earns them within a handful of naps; the later ones are
// counters (wins, dreams caught, dreams finished), which arrive on schedule at
// any skill level. Thresholds were set by simulating players on the real engine
// (tests/achievementPacing.test.ts keeps both ends honest). A phone's catch zone
// is over three times wider than a desktop's, so the numbers are tuned against
// the more forgiving case.
import type { GameSnapshot } from './engine.ts';
import { SCENARIO_DREAM_GOAL, SCENARIO_IDS } from './scenarios.ts';
import type { NapProgress } from './progress.ts';

export const ACHIEVEMENTS = [
  'firstNap', 'quietNap', 'dreamWeaver', 'dreamMaster', 'moonCollector', 'perfectNap', 'dreamGuardian',
  'cloudBasket', 'skyOfDreams', 'alwaysAnotherNap',
  'afternoonDreamed', 'breezeDreamed', 'firefliesDreamed', 'allDreamed',
] as const;
export type AchievementId = typeof ACHIEVEMENTS[number];

export const WEAVER_COMBO = 20;
export const MASTER_COMBO = 30;
export const MOON_POCKET = 8;
export const PERFECT_MAX_MISSED = 2;
export const GUARDIAN_NAPS = 10;
export const BASKET_DREAMS = 300;
export const SKY_DREAMS = 600;
export const SECRET_NAPS = 20;

type Round = { kind: 'round'; earned: (game: GameSnapshot) => boolean };
type Milestone = { kind: 'milestone'; current: (progress: NapProgress) => number; goal: number };

const won = (game: GameSnapshot) => game.status === 'won';
const dreamsCompleted = (progress: NapProgress) => SCENARIO_IDS.filter((id) => progress.scenarioWins[id] >= SCENARIO_DREAM_GOAL).length;
const dreamed = (scenario: typeof SCENARIO_IDS[number]): Milestone => ({
  kind: 'milestone', goal: SCENARIO_DREAM_GOAL, current: (progress) => progress.scenarioWins[scenario],
});

const RULES: Record<AchievementId, Round | Milestone> = {
  firstNap: { kind: 'round', earned: won },
  quietNap: { kind: 'round', earned: (g) => won(g) && g.alarmHits === 0 },
  dreamWeaver: { kind: 'round', earned: (g) => g.maxCombo >= WEAVER_COMBO },
  dreamMaster: { kind: 'round', earned: (g) => g.maxCombo >= MASTER_COMBO },
  moonCollector: { kind: 'round', earned: (g) => g.moons >= MOON_POCKET },
  // Hardly anything went wrong: no alarm caught, at most two dreams slipped past.
  perfectNap: { kind: 'round', earned: (g) => won(g) && g.alarmHits === 0 && g.missed <= PERFECT_MAX_MISSED },
  dreamGuardian: { kind: 'milestone', goal: GUARDIAN_NAPS, current: (p) => p.wins },
  cloudBasket: { kind: 'milestone', goal: BASKET_DREAMS, current: (p) => p.dreams },
  skyOfDreams: { kind: 'milestone', goal: SKY_DREAMS, current: (p) => p.dreams },
  alwaysAnotherNap: { kind: 'milestone', goal: SECRET_NAPS, current: (p) => p.wins },
  afternoonDreamed: dreamed('afternoon'),
  breezeDreamed: dreamed('breeze'),
  firefliesDreamed: dreamed('fireflies'),
  allDreamed: { kind: 'milestone', goal: SCENARIO_IDS.length, current: dreamsCompleted },
};

// Shown as "???" until earned, so a long-time player finds one reward they did
// not know to look for. Its goal sits just past the main path of the game.
const SECRET: ReadonlySet<AchievementId> = new Set(['alwaysAnotherNap']);
export const isSecretAchievement = (id: AchievementId) => SECRET.has(id);

/** Achievements earned by how this one nap went. Nothing for a round still in progress. */
export function achievementsEarnedInRound(game: GameSnapshot): AchievementId[] {
  if (game.status !== 'won' && game.status !== 'lost') return [];
  return ACHIEVEMENTS.filter((id) => { const rule = RULES[id]; return rule.kind === 'round' && rule.earned(game); });
}

/** Achievements the save as a whole has reached. */
export function achievementsEarnedByProgress(progress: NapProgress): AchievementId[] {
  return ACHIEVEMENTS.filter((id) => { const rule = RULES[id]; return rule.kind === 'milestone' && rule.current(progress) >= rule.goal; });
}

/** How far along a milestone is (for a progress bar); null for achievements judged from a single nap. */
export function achievementProgress(id: AchievementId, progress: NapProgress): { current: number; goal: number } | null {
  const rule = RULES[id];
  return rule.kind === 'milestone' ? { current: Math.min(rule.goal, Math.max(0, rule.current(progress))), goal: rule.goal } : null;
}
