import type { Scenario } from './scenarios';

export const DECORATION_IDS = ['sageQuilt', 'moonPillow', 'maplePlant', 'paperLantern', 'foxPlush', 'windChime'] as const;
export type DecorationId = typeof DECORATION_IDS[number];
export type DecorSlot = 'quilt' | 'pillow' | 'plant' | 'light' | 'friend' | 'window';
export type EquippedDecor = Partial<Record<DecorSlot, DecorationId>>;
export const DECORATIONS: Record<DecorationId, { slot: DecorSlot; goal: number }> = {
  sageQuilt: { slot: 'quilt', goal: 2 },
  moonPillow: { slot: 'pillow', goal: 60 },
  maplePlant: { slot: 'plant', goal: 5 },
  paperLantern: { slot: 'light', goal: 1 },
  foxPlush: { slot: 'friend', goal: 10 },
  windChime: { slot: 'window', goal: 3 },
};

export interface DecorMilestones { rounds: number; dreams: number; maxCombo: number; scenarioWins: Record<Scenario, number> }
export function isDecoration(value: unknown): value is DecorationId { return typeof value === 'string' && (DECORATION_IDS as readonly string[]).includes(value); }

export function decorationProgress(id: DecorationId, progress: DecorMilestones) {
  const values: Record<DecorationId, number> = {
    sageQuilt: progress.rounds, moonPillow: progress.dreams, maplePlant: progress.rounds,
    paperLantern: progress.scenarioWins.fireflies, foxPlush: progress.maxCombo,
    windChime: Object.values(progress.scenarioWins).filter((wins) => wins > 0).length,
  };
  const goal = DECORATIONS[id].goal;
  const current = Math.min(goal, Math.max(0, values[id] || 0));
  return { current, goal, remaining: Math.max(0, goal - current) };
}

export function nextDecoration(unlocked: Partial<Record<DecorationId, number>>) {
  return DECORATION_IDS.find((id) => !unlocked[id]) || null;
}