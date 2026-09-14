import { useCallback, useEffect, useRef, useState } from 'react';
import { warnOnce } from '../core/faults';
import { readPreference, writePreference } from '../core/storage';
import { GAME_AUDIO } from '../assets/audio';
import type { SoundCue } from './engine';
import type { Scenario } from './scenarios';

interface AudioEngine { context: AudioContext; master: GainNode; musicGain: GainNode; ambienceGain: GainNode }
const NOTES: Record<SoundCue, number[]> = {
  dream: [659.25, 880], moon: [659.25, 880, 1046.5], alarm: [220, 207.65],
  win: [523.25, 659.25, 783.99, 1046.5], lose: [392, 329.63, 261.63],
  start: [523.25, 659.25, 783.99], combo: [659.25, 783.99, 1046.5, 1318.51],
  firefly: [880, 1174.66, 1396.91],
};

const MUSIC_KEY = 'little-pause.music-enabled.v1';
const AMBIENCE_KEY = 'little-pause.ambience-enabled.v1';
const readFlag = (key: string) => readPreference(key) !== '0';
const writeFlag = (key: string, value: boolean) => writePreference(key, value ? '1' : '0');

// Ambient cycle: a phase of music, gently faded in and out, alternates with a
// phase of nature sounds (birds for day scenarios, frogs for the night one).
// Timings are in seconds.
const MUSIC_HOLD = 46;
const AMBIENCE_HOLD = 32;
const FADE = 4;
const MUSIC_LEVEL = 0.5;
const AMBIENCE_LEVEL = 0.55;

type BufferKey = keyof typeof GAME_AUDIO;
type Phase = 'music' | 'ambience';

async function decode(context: AudioContext, dataUrl: string): Promise<AudioBuffer> {
  const response = await fetch(dataUrl);
  const bytes = await response.arrayBuffer();
  return context.decodeAudioData(bytes);
}

export function useCozyAudio(suspended = false, scenario: Scenario = 'afternoon') {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(() => readFlag(MUSIC_KEY));
  const [ambienceEnabled, setAmbienceEnabled] = useState(() => readFlag(AMBIENCE_KEY));
  const enabledRef = useRef(false);
  const musicEnabledRef = useRef(musicEnabled);
  const ambienceEnabledRef = useRef(ambienceEnabled);
  const scenarioRef = useRef(scenario);
  const engineRef = useRef<AudioEngine | null>(null);
  const buffersRef = useRef<Partial<Record<BufferKey, AudioBuffer>>>({});
  const decodingRef = useRef<Promise<void> | null>(null);
  const suspendedRef = useRef(suspended);
  const interruptedRef = useRef(false);
  const disposed = useRef(false);
  const cycleToken = useRef(0);
  const birdTurn = useRef(0);
  suspendedRef.current = suspended;
  musicEnabledRef.current = musicEnabled;
  ambienceEnabledRef.current = ambienceEnabled;
  scenarioRef.current = scenario;

  const disable = useCallback((error: unknown) => {
    warnOnce('Audio unavailable; gameplay remains enabled', error);
    cycleToken.current += 1;
    const engine = engineRef.current;
    engineRef.current = null;
    enabledRef.current = false;
    if (engine && engine.context.state !== 'closed') void engine.context.close().catch(() => undefined);
    if (!disposed.current) { setEnabled(false); setAvailable(false); }
  }, []);

  const syncVolume = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.context.state === 'closed') return;
    try {
      const audible = enabledRef.current && !suspendedRef.current && !interruptedRef.current && !document.hidden && document.hasFocus();
      engine.master.gain.cancelScheduledValues(engine.context.currentTime);
      engine.master.gain.setValueAtTime(audible ? 0.65 : 0, engine.context.currentTime);
      if (audible) void engine.context.resume().catch(disable);
      else void engine.context.suspend().catch(() => undefined);
    } catch (error) { disable(error); }
  }, [disable]);

  const muteImmediately = useCallback(() => {
    interruptedRef.current = true;
    syncVolume();
  }, [syncVolume]);

  const getEngine = useCallback(() => {
    if (engineRef.current?.context.state !== 'closed' && engineRef.current) return engineRef.current;
    let context: AudioContext | undefined;
    try {
      const AudioClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioClass) throw new Error('Web Audio not supported');
      context = new AudioClass();
      const master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
      const musicGain = context.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
      const ambienceGain = context.createGain(); ambienceGain.gain.value = 0; ambienceGain.connect(master);
      engineRef.current = { context, master, musicGain, ambienceGain };
      return engineRef.current;
    } catch (error) {
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
      disable(error); return null;
    }
  }, [disable]);

  // Decode all four clips once, lazily, the first time audio actually turns on.
  const ensureBuffers = useCallback((context: AudioContext) => {
    if (decodingRef.current) return decodingRef.current;
    const entries = Object.entries(GAME_AUDIO) as [BufferKey, string][];
    decodingRef.current = Promise.all(entries.map(async ([key, url]) => {
      try { buffersRef.current[key] = await decode(context, url); }
      catch (error) { warnOnce(`Ambient clip decode failed: ${key}`, error); }
    })).then(() => undefined);
    return decodingRef.current;
  }, []);

  const ambienceBufferForScenario = useCallback((): BufferKey => {
    if (scenarioRef.current === 'fireflies') return 'frogs';
    birdTurn.current += 1;
    return birdTurn.current % 2 === 0 ? 'birds2' : 'birds1';
  }, []);

  // Fades a buffer in, holds it, fades it out, resolves once it's silent again.
  const runPhase = useCallback((engine: AudioEngine, phase: Phase): Promise<void> => {
    const key: BufferKey = phase === 'music' ? 'music' : ambienceBufferForScenario();
    const buffer = buffersRef.current[key];
    const gainNode = phase === 'music' ? engine.musicGain : engine.ambienceGain;
    const hold = phase === 'music' ? MUSIC_HOLD : AMBIENCE_HOLD;
    const level = phase === 'music' ? MUSIC_LEVEL : AMBIENCE_LEVEL;
    const totalDuration = FADE * 2 + hold;
    if (!buffer) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const willLoop = buffer.duration < totalDuration;
      try {
        const { context } = engine;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = willLoop;
        const maxOffset = Math.max(0, buffer.duration - (willLoop ? 0 : totalDuration));
        const offset = maxOffset > 0 ? Math.random() * maxOffset : 0;
        source.connect(gainNode);
        const now = context.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(level, now + FADE);
        gainNode.gain.setValueAtTime(level, now + FADE + hold);
        gainNode.gain.linearRampToValueAtTime(0, now + totalDuration);
        source.start(now, offset);
        source.stop(now + totalDuration + 0.05);
        source.onended = () => { try { source.disconnect(); } catch { /* already disposed */ } };
      } catch (error) { warnOnce('Ambient phase playback failed', error); }
      setTimeout(resolve, totalDuration * 1000);
    });
  }, [ambienceBufferForScenario]);

  // The cycle: music, then nature sounds, forever, skipping whichever layer
  // the player has turned off. If both are off, it just waits and re-checks.
  const runCycle = useCallback(async (token: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    await ensureBuffers(engine.context);
    while (cycleToken.current === token && !disposed.current) {
      const wantsMusic = musicEnabledRef.current;
      const wantsAmbience = ambienceEnabledRef.current;
      if (wantsMusic) await runPhase(engine, 'music');
      if (cycleToken.current !== token || disposed.current) return;
      if (wantsAmbience) await runPhase(engine, 'ambience');
      if (cycleToken.current !== token || disposed.current) return;
      if (!wantsMusic && !wantsAmbience) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }, [ensureBuffers, runPhase]);

  const play = useCallback((cue: SoundCue) => {
    if (!enabledRef.current || suspendedRef.current || interruptedRef.current || document.hidden || !document.hasFocus()) return;
    try {
      const engine = getEngine();
      if (!engine) return;
      const { context, master } = engine;
      for (const [i, frequency] of NOTES[cue].entries()) {
        const time = context.currentTime + i * (cue === 'win' ? 0.19 : 0.11);
        const oscillator = context.createOscillator(); const gain = context.createGain();
        oscillator.frequency.setValueAtTime(frequency, time);
        gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(cue === 'alarm' ? 0.085 : 0.11, time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);
        oscillator.connect(gain).connect(master);
        oscillator.onended = () => { try { oscillator.disconnect(); gain.disconnect(); } catch { /* Already disposed. */ } };
        oscillator.start(time); oscillator.stop(time + 0.7);
      }
    } catch (error) { disable(error); }
  }, [getEngine, disable]);

  const toggle = useCallback(() => {
    const engine = getEngine();
    if (!engine) return;
    interruptedRef.current = suspendedRef.current;
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current); syncVolume();
    if (enabledRef.current) {
      play('start');
      cycleToken.current += 1;
      void runCycle(cycleToken.current);
    } else {
      cycleToken.current += 1;
    }
  }, [getEngine, play, syncVolume, runCycle]);

  const toggleMusic = useCallback(() => {
    const next = !musicEnabledRef.current;
    musicEnabledRef.current = next;
    setMusicEnabled(next);
    writeFlag(MUSIC_KEY, next);
  }, []);

  const toggleAmbience = useCallback(() => {
    const next = !ambienceEnabledRef.current;
    ambienceEnabledRef.current = next;
    setAmbienceEnabled(next);
    writeFlag(AMBIENCE_KEY, next);
  }, []);

  const resumeFromInterrupt = useCallback(() => {
    interruptedRef.current = suspendedRef.current || document.hidden || !document.hasFocus();
    syncVolume();
  }, [syncVolume]);

  useEffect(() => { interruptedRef.current = suspended; syncVolume(); }, [suspended, syncVolume]);
  useEffect(() => {
    disposed.current = false;
    document.addEventListener('visibilitychange', resumeFromInterrupt);
    window.addEventListener('blur', muteImmediately); window.addEventListener('focus', resumeFromInterrupt);
    return () => {
      disposed.current = true;
      cycleToken.current += 1;
      document.removeEventListener('visibilitychange', resumeFromInterrupt);
      window.removeEventListener('blur', muteImmediately); window.removeEventListener('focus', resumeFromInterrupt);
      const engine = engineRef.current; engineRef.current = null;
      if (engine && engine.context.state !== 'closed') void engine.context.close().catch(() => undefined);
    };
  }, [syncVolume, muteImmediately, resumeFromInterrupt]);

  return { enabled, available, musicEnabled, ambienceEnabled, toggle, toggleMusic, toggleAmbience, play, muteImmediately, resumeFromInterrupt };
}
