import { useCallback, useEffect, useRef, useState } from 'react';
import { reportFatal, warnOnce } from '../core/faults';
import { advanceGame, clamp, createGame, normalizeViewport, snapshot, type GameSnapshot, type GameViewport, type Mood, type PauseReason, type SoundCue } from './engine';
import type { Scenario } from './scenarios';

export { MOODS, ROUND_SECONDS } from './engine';
export type { Mood, GameStatus, DreamKind, SoundCue, GameSnapshot } from './engine';

export function useNapGame(onSound: (cue: SoundCue) => void, onFinish?: (game: GameSnapshot) => void) {
  const modelRef = useRef(createGame());
  const viewportRef = useRef<GameViewport>({ catchWidth: 8, edge: 6 });
  const soundRef = useRef(onSound);
  const finishRef = useRef(onFinish);
  const lastRecorded = useRef(0);
  const [game, setGame] = useState(() => snapshot(modelRef.current));
  soundRef.current = onSound;
  finishRef.current = onFinish;

  const start = useCallback((mood: Mood, scenario: Scenario = 'afternoon') => {
    const current = modelRef.current;
    if (current.status === 'playing' || current.status === 'countdown') return;
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const model = createGame(mood, id, scenario);
    model.status = 'countdown';
    model.countdown = 3;
    modelRef.current = model;
    setGame(snapshot(model));
  }, []);

  const pause = useCallback((reason: PauseReason = 'manual') => {
    const model = modelRef.current;
    model.left = false;
    model.right = false;
    if (model.status !== 'playing' && model.status !== 'countdown') return;
    model.status = 'paused';
    model.pauseReason = reason;
    setGame(snapshot(model));
  }, []);

  const resume = useCallback(() => {
    const model = modelRef.current;
    if (model.status !== 'paused') return;
    model.status = 'countdown'; model.countdown = 2; model.resuming = true;
    setGame(snapshot(model));
  }, []);

  const reset = useCallback(() => { modelRef.current = createGame(modelRef.current.mood, 0, modelRef.current.scenario); setGame(snapshot(modelRef.current)); }, []);
  const releaseInput = useCallback(() => { modelRef.current.left = false; modelRef.current.right = false; modelRef.current.targetX = modelRef.current.pillowX; }, []);
  const move = useCallback((x: number) => {
    const model = modelRef.current;
    if ((model.status !== 'playing' && model.status !== 'countdown') || !Number.isFinite(x)) return;
    const edge = viewportRef.current.edge;
    model.targetX = clamp(x, edge, 100 - edge);
  }, []);
  const setDirection = useCallback((direction: 'left' | 'right', pressed: boolean) => {
    const model = modelRef.current;
    model[direction] = pressed && (model.status === 'playing' || model.status === 'countdown');
  }, []);
  const setCatchWidth = useCallback((catchWidth: number, edge: number) => {
    viewportRef.current = normalizeViewport({ catchWidth, edge });
    const model = modelRef.current;
    model.targetX = clamp(model.targetX, viewportRef.current.edge, 100 - viewportRef.current.edge);
    model.pillowX = clamp(model.pillowX, viewportRef.current.edge, 100 - viewportRef.current.edge);
  }, []);

  const active = game.status === 'playing' || game.status === 'countdown';
  useEffect(() => {
    if (!active) return;
    let frameId = 0;
    let previous = 0;
    let lastPaint = 0;
    let disposed = false;
    const frame = (now: number) => {
      if (disposed) return;
      try {
        const model = modelRef.current;
        const before = model.status;
        let pending = previous ? Math.min(Math.max(0, (now - previous) / 1000), 0.25) : 0;
        previous = now;
        while (pending > 0.00001 && (model.status === 'playing' || model.status === 'countdown')) {
          const step = Math.min(pending, 0.05);
          const cues = advanceGame(model, step, viewportRef.current);
          for (const cue of cues) {
            try { soundRef.current(cue); } catch (error) { warnOnce('Audio callback disabled', error); }
          }
          pending -= step;
        }
        if ((model.status === 'won' || model.status === 'lost') && lastRecorded.current !== model.roundId) {
          // Commit terminal progress before exposing a replay button or leaving this frame.
          finishRef.current?.(snapshot(model));
          lastRecorded.current = model.roundId;
        }
        if (now - lastPaint >= 1000 / 30 || before !== model.status) { setGame(snapshot(model)); lastPaint = now; }
        if (model.status === 'playing' || model.status === 'countdown') frameId = requestAnimationFrame(frame);
      } catch (error) { pause('away'); reportFatal(error); }
    };
    frameId = requestAnimationFrame(frame);
    return () => { disposed = true; cancelAnimationFrame(frameId); };
  }, [active, game.roundId, pause]);

  return { game, start, pause, resume, reset, move, setDirection, setCatchWidth, releaseInput };
}