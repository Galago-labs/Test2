// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
//
// When the game shows a full-screen ad: pure rules, no platform calls and no
// numbers of their own. The numbers live in src/config/ads.ts; App.tsx asks
// here and shows the ad if the answer is yes.
//
// The count is per save slot and kept inside the save (`adsShown`): a reload
// changes nothing, a new save starts afresh, and a save can never be shown more
// than `maxPerSave`, however the rules are set.
//
// A rule is a moment ("trigger") plus, where it needs one, a parameter. To add
// a new kind of moment, add a trigger here, a question function for it, and one
// call where it happens; existing rules and saves are untouched.
import type { Scenario } from './scenarios.ts';

export type AdRule = { id: string; enabled: boolean } & (
  | { trigger: 'game-finished'; nth: number }    // after the save's nth finished game
  | { trigger: 'dream-left' }                    // on leaving a finished dream (once per dream)
);

export interface AdConfig { maxPerSave: number; rules: readonly AdRule[] }

/** What a save remembers: how many games it has finished and which ads it has already seen. */
export interface AdLedger { gamesFinished: number; adsShown: readonly string[] }

/** An ad that is due. `key` goes into the save once the ad has actually opened. */
export interface AdDecision { key: string }

const budgetLeft = (config: AdConfig, save: AdLedger) => save.adsShown.length < config.maxPerSave;

/**
 * A game just finished. `finishedDream` is the dream this game completed, if any:
 * then its picture comes next and carries the ad, so nothing is shown now — and
 * nothing is used up either, so a rule still waiting simply fires at the next game.
 */
export function adAfterGame(config: AdConfig, save: AdLedger, finishedDream: Scenario | null): AdDecision | null {
  if (finishedDream || !budgetLeft(config, save)) return null;
  for (const rule of config.rules) {
    if (!rule.enabled || rule.trigger !== 'game-finished') continue;
    if (save.gamesFinished >= rule.nth && !save.adsShown.includes(rule.id)) return { key: rule.id };
  }
  return null;
}

/** The player left a dream they had finished (closed its picture). */
export function adAfterDreamLeft(config: AdConfig, save: AdLedger, dream: Scenario): AdDecision | null {
  if (!budgetLeft(config, save)) return null;
  for (const rule of config.rules) {
    if (!rule.enabled || rule.trigger !== 'dream-left') continue;
    const key = `${rule.id}:${dream}`;
    if (!save.adsShown.includes(key)) return { key };
  }
  return null;
}

/** Problems with a config, in plain words; empty when it is sound. */
export function validateAdConfig(config: AdConfig): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(config.maxPerSave) || config.maxPerSave < 0) problems.push('maxPerSave must be a whole number, 0 or more');
  const seen = new Set<string>();
  for (const rule of config.rules) {
    if (!rule.id || rule.id.includes(':')) problems.push(`rule id "${rule.id}" must be non-empty and contain no ":"`);
    if (seen.has(rule.id)) problems.push(`rule id "${rule.id}" is used twice`);
    seen.add(rule.id);
    if (rule.trigger === 'game-finished' && (!Number.isInteger(rule.nth) || rule.nth < 1)) problems.push(`rule "${rule.id}": nth must be a whole number, 1 or more`);
    // A config can come from outside the type system (a JSON file, a remote setting).
    if (!['game-finished', 'dream-left'].includes((rule as { trigger: string }).trigger)) problems.push(`rule "${rule.id}": unknown trigger`);
  }
  return problems;
}
