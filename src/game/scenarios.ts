export const SCENARIO_IDS = ['afternoon', 'breeze', 'fireflies'] as const;
export type Scenario = typeof SCENARIO_IDS[number];
export const SCENARIOS: Record<Scenario, { intervalScale: number; speedScale: number; decayScale: number }> = {
  afternoon: { intervalScale: 1, speedScale: 1, decayScale: 1 },
  breeze: { intervalScale: 1.06, speedScale: 0.96, decayScale: 0.94 },
  fireflies: { intervalScale: 1.28, speedScale: 0.88, decayScale: 0.8 },
};
// Wins needed in one dream (scenario) before it counts as "explored". Purely
// a sense-of-progress milestone — nothing about gameplay changes at 5 wins.
export const SCENARIO_DREAM_GOAL = 5;

export function isScenario(value: unknown): value is Scenario { return typeof value === 'string' && (SCENARIO_IDS as readonly string[]).includes(value); }
export interface WindState { phase: 'calm' | 'warning' | 'gust'; direction: -1 | 1; offset: number }

// A warning always precedes a smooth, bounded gust. It never changes while paused.
export function windAt(elapsed: number): WindState {
  if (!Number.isFinite(elapsed) || elapsed < 8) return { phase: 'calm', direction: 1, offset: 0 };
  const cycle = (elapsed - 8) % 12;
  const direction = Math.floor((elapsed - 8) / 12) % 2 === 0 ? 1 : -1;
  if (cycle < 1.8) return { phase: 'warning', direction, offset: 0 };
  if (cycle < 7.8) return { phase: 'gust', direction, offset: direction * Math.sin((cycle - 1.8) / 6 * Math.PI) * 8 };
  return { phase: 'calm', direction, offset: 0 };
}