import { SCENARIOS, isScenario, windAt, type Scenario, type WindState } from './scenarios.ts';

export type Mood = 'gentle' | 'cozy' | 'dreamy';
export type GameStatus = 'ready' | 'countdown' | 'playing' | 'paused' | 'won' | 'lost';
export type DreamKind = 'cloud' | 'moon' | 'alarm' | 'firefly';
export type SoundCue = 'dream' | 'moon' | 'alarm' | 'win' | 'lose' | 'start' | 'combo' | 'firefly';
export type PauseReason = 'manual' | 'away';

export const ROUND_SECONDS = 60;
// Single source of truth for the comfort thresholds that both the HUD and the
// character's face expression react to — was previously copy-pasted in three
// places across App.tsx and GameScene.tsx.
export const LOW_COMFORT_THRESHOLD = 30;
export const HIGH_COMFORT_THRESHOLD = 65;

export type Expression = 'content' | 'anxious' | null;
export function faceExpression(status: GameStatus, comfort: number): Expression {
  if (status === 'lost') return 'anxious';
  if (status === 'won') return comfort >= HIGH_COMFORT_THRESHOLD ? 'content' : null;
  if (status === 'playing' || status === 'paused' || status === 'countdown') {
    if (comfort < LOW_COMFORT_THRESHOLD) return 'anxious';
    if (comfort >= HIGH_COMFORT_THRESHOLD) return 'content';
  }
  return null;
}
export const MOODS: Record<Mood, { interval: number; speed: number; decay: number; alarmChance: number }> = {
  gentle: { interval: 1.35, speed: 15, decay: 0.55, alarmChance: 0.16 },
  cozy: { interval: 1.05, speed: 19, decay: 0.8, alarmChance: 0.23 },
  dreamy: { interval: 0.78, speed: 24, decay: 1.05, alarmChance: 0.3 },
};

export interface DreamItem {
  id: number;
  kind: DreamKind;
  x: number;
  baseX: number;
  y: number;
  speed: number;
  phase: number;
  rotation: number;
}

export interface CatchPop {
  id: number;
  x: number;
  y: number;
  age: number;
  points: number;
  multiplier: number;
  kind: 'good' | 'bad' | 'protected';
}

export interface GameSnapshot {
  status: GameStatus;
  roundId: number;
  mood: Mood;
  scenario: Scenario;
  wind: WindState;
  items: DreamItem[];
  pops: CatchPop[];
  pillowX: number;
  comfort: number;
  remaining: number;
  countdown: number;
  resuming: boolean;
  pauseReason: PauseReason;
  score: number;
  bonusScore: number;
  caught: number;
  moons: number;
  fireflies: number;
  missed: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  alarmHits: number;
  hitFlash: number;
  grace: number;
}

export interface GameModel extends GameSnapshot {
  elapsed: number;
  targetX: number;
  left: boolean;
  right: boolean;
  nextSpawn: number;
  nextId: number;
  spawned: number;
  lastKind: DreamKind | null;
}

export interface GameViewport { catchWidth: number; edge: number }
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const comboMultiplier = (combo: number) => combo >= 10 ? 3 : combo >= 5 ? 2 : 1;

export function normalizeViewport(viewport: GameViewport): GameViewport {
  return {
    catchWidth: Number.isFinite(viewport.catchWidth) ? clamp(viewport.catchWidth, 1, 35) : 8,
    edge: Number.isFinite(viewport.edge) ? clamp(viewport.edge, 1, 40) : 6,
  };
}

export function createGame(mood: Mood = 'cozy', roundId = 0, scenario: Scenario = 'afternoon'): GameModel {
  return {
    status: 'ready', mood, roundId, elapsed: 0, remaining: ROUND_SECONDS,
    scenario: isScenario(scenario) ? scenario : 'afternoon', wind: windAt(0),
    items: [], pops: [], pillowX: 50, targetX: 50, left: false, right: false,
    comfort: 70, score: 0, bonusScore: 0, caught: 0, moons: 0, fireflies: 0, missed: 0,
    combo: 0, maxCombo: 0, multiplier: 1, alarmHits: 0,
    nextSpawn: 0.4, nextId: 1, spawned: 0, lastKind: null,
    hitFlash: 0, grace: 0, countdown: 0, resuming: false, pauseReason: 'manual',
  };
}

export function snapshot(model: GameModel): GameSnapshot {
  return {
    status: model.status, roundId: model.roundId, mood: model.mood,
    scenario: model.scenario, wind: { ...model.wind },
    pillowX: model.pillowX, comfort: model.comfort,
    remaining: Math.max(0, Math.ceil(ROUND_SECONDS - model.elapsed)),
    countdown: Math.max(0, Math.ceil(model.countdown)), resuming: model.resuming,
    pauseReason: model.pauseReason, score: model.score, bonusScore: model.bonusScore,
    caught: model.caught, moons: model.moons, fireflies: model.fireflies, missed: model.missed,
    combo: model.combo, maxCombo: model.maxCombo, multiplier: model.multiplier,
    alarmHits: model.alarmHits, hitFlash: model.hitFlash, grace: model.grace,
    items: model.items.map((item) => ({ ...item })),
    pops: model.pops.map((pop) => ({ ...pop })),
  };
}

export function isSpawnFair(candidate: DreamItem, items: DreamItem[], catchWidth: number) {
  const arrival = (84 - candidate.y) / candidate.speed;
  return items.every((item) => {
    if (item.y > 93) return true;
    const gap = Math.abs(arrival - (84 - item.y) / item.speed);
    const distance = Math.abs(candidate.baseX - item.baseX);
    // Dreams and alarms must never share the pillow's arrival window.
    if ((candidate.kind === 'alarm') !== (item.kind === 'alarm')) {
      return gap >= 0.85 || distance >= Math.max(16, catchWidth * 2 + 4);
    }
    // Nearby friendly arrivals stay reachable with the slower keyboard controls.
    if (candidate.kind !== 'alarm' && gap < 1.2) return distance <= gap * 65 + catchWidth;
    return true;
  });
}

// A pillow that never moves should never "accidentally" catch a good dream —
// only alarms are allowed to spawn right on top of it, so standing still stays
// risky without ever being quietly rewarded. Deliberately narrow: it only
// nudges spawns away from wherever the pillow happens to be *right now*, so an
// actively-moving player is barely affected (by the time an item falls, an
// active pillow has usually moved anyway).
function isFreeRideForFriendlies(kind: DreamKind, x: number, pillowX: number, catchWidth: number) {
  return kind !== 'alarm' && Math.abs(x - pillowX) < catchWidth + 6;
}

function spawnDream(model: GameModel, viewport: GameViewport, random: () => number) {
  const settings = MOODS[model.mood];
  const scene = SCENARIOS[model.scenario];
  const roll = random();
  const friendlyOpening = model.spawned < 3 || model.elapsed < 8;
  const kind: DreamKind = friendlyOpening ? 'cloud'
    : roll < settings.alarmChance && model.lastKind !== 'alarm' ? 'alarm'
    : roll > 0.86 ? 'moon' : model.scenario === 'fireflies' && roll > 0.57 ? 'firefly' : 'cloud';
  const speed = (settings.speed + random() * 3) * (0.93 + model.elapsed / ROUND_SECONDS * 0.14) * scene.speedScale * (kind === 'firefly' ? 0.9 : 1);
  const spawnEdge = Math.max(10, viewport.edge);
  const candidate: DreamItem = {
    id: model.nextId, kind, x: 50, baseX: 50, y: model.spawned === 0 ? 31 : -10, speed,
    phase: random() * Math.PI * 2, rotation: (random() - 0.5) * 16,
  };
  if (model.elapsed + (94 - candidate.y) / speed >= ROUND_SECONDS) return false;

  for (let attempt = 0; attempt < 18; attempt++) {
    const x = model.spawned === 0 ? 50 : spawnEdge + random() * (100 - spawnEdge * 2);
    candidate.x = x;
    candidate.baseX = x;
    if (model.spawned > 0 && isFreeRideForFriendlies(kind, x, model.pillowX, viewport.catchWidth)) continue;
    if (!isSpawnFair(candidate, model.items, viewport.catchWidth + (model.scenario === 'breeze' ? 6 : 0))) continue;
    model.items.push(candidate);
    model.nextId++;
    model.spawned++;
    model.lastKind = kind;
    return true;
  }
  return false;
}

function clearCombo(model: GameModel) {
  model.combo = 0;
  model.multiplier = 1;
}

function finish(model: GameModel, status: 'won' | 'lost', cues: SoundCue[]) {
  model.status = status;
  model.left = false;
  model.right = false;
  cues.push(status === 'won' ? 'win' : 'lose');
}

// The simulation has no React, DOM, audio, or storage dependencies.
export function advanceGame(model: GameModel, seconds: number, viewport: GameViewport, random = Math.random): SoundCue[] {
  const cues: SoundCue[] = [];
  if (model.status !== 'playing' && model.status !== 'countdown') return cues;
  if (!Number.isFinite(seconds) || seconds < 0) return cues;
  const frameSeconds = clamp(seconds, 0, 0.05);
  // The last frame must not apply movement or penalties beyond the nap's deadline.
  const dt = model.status === 'playing'
    ? Math.min(frameSeconds, Math.max(0, ROUND_SECONDS - model.elapsed))
    : frameSeconds;
  const { edge, catchWidth } = normalizeViewport(viewport);
  const direction = Number(model.right) - Number(model.left);
  model.targetX = clamp(model.targetX + direction * dt * 75, edge, 100 - edge);
  model.pillowX += (model.targetX - model.pillowX) * Math.min(1, dt * 16);

  if (model.status === 'countdown') {
    model.countdown = Math.max(0, model.countdown - dt);
    if (model.countdown < 0.000001) { model.countdown = 0; model.status = 'playing'; cues.push('start'); }
    return cues;
  }

  model.elapsed = Math.min(ROUND_SECONDS, model.elapsed + dt);
  model.wind = model.scenario === 'breeze' ? windAt(model.elapsed) : windAt(0);
  model.remaining = Math.max(0, Math.ceil(ROUND_SECONDS - model.elapsed));
  model.hitFlash = Math.max(0, model.hitFlash - dt * 2);
  model.grace = Math.max(0, model.grace - dt);
  model.comfort = Math.max(0, model.comfort - MOODS[model.mood].decay * SCENARIOS[model.scenario].decayScale * dt);
  if (model.comfort <= 0) { finish(model, 'lost', cues); return cues; }

  model.nextSpawn -= dt;
  if (model.nextSpawn <= 0) {
    const spawned = spawnDream(model, { edge, catchWidth }, random);
    model.nextSpawn = spawned ? MOODS[model.mood].interval * SCENARIOS[model.scenario].intervalScale * (0.9 + random() * 0.2) : 0.25;
  }

  const remainingItems: DreamItem[] = [];
  for (const item of model.items) {
    if (model.status !== 'playing') break;
    item.y += item.speed * dt;
    item.x = clamp(item.baseX + Math.sin(model.elapsed * 1.5 + item.phase) * (item.kind === 'firefly' ? 2.8 : 1.4) + model.wind.offset, 8, 92);
    const hit = item.y >= 84 && item.y <= 93 && Math.abs(item.x - model.pillowX) < catchWidth;

    if (hit) {
      let points = 0;
      let popKind: CatchPop['kind'] = 'good';
      if (item.kind === 'alarm') {
        if (model.grace > 0) popKind = 'protected';
        else {
          model.comfort = Math.max(0, model.comfort - 24);
          model.alarmHits++;
          model.hitFlash = 1;
          model.grace = 1.25;
          popKind = 'bad';
          clearCombo(model);
          cues.push('alarm');
        }
      } else {
        const basePoints = item.kind === 'firefly' ? 40 : item.kind === 'moon' ? 25 : 10;
        model.combo++;
        model.multiplier = comboMultiplier(model.combo);
        points = basePoints * model.multiplier;
        model.score += points;
        model.bonusScore += points - basePoints;
        model.caught++;
        if (item.kind === 'moon') model.moons++;
        if (item.kind === 'firefly') model.fireflies++;
        model.maxCombo = Math.max(model.maxCombo, model.combo);
        model.comfort = Math.min(100, model.comfort + (item.kind === 'firefly' ? 12 : item.kind === 'moon' ? 13 : 7));
        cues.push(model.combo === 5 || model.combo === 10 ? 'combo' : item.kind === 'firefly' ? 'firefly' : item.kind === 'moon' ? 'moon' : 'dream');
      }
      model.pops.push({ id: model.nextId++, x: item.x, y: 79, age: 0, points, multiplier: model.multiplier, kind: popKind });
    } else if (item.y > 104) {
      if (item.kind !== 'alarm') {
        model.comfort = Math.max(0, model.comfort - 3);
        model.missed++;
        clearCombo(model);
      }
    } else remainingItems.push(item);

    if (model.comfort <= 0) finish(model, 'lost', cues);
  }
  model.items = remainingItems;
  model.pops = model.pops.filter((pop) => { pop.age += dt; return pop.age < 1.25; });
  if (model.status === 'playing' && model.elapsed >= ROUND_SECONDS) finish(model, 'won', cues);
  return cues;
}