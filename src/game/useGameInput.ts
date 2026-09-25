import { useEffect, useRef, type PointerEvent, type RefObject } from 'react';
import { capturePointer, focusSafely, isInteractive, releasePointer } from '../core/input';
import { pointerToGameX } from './viewport';

interface Options {
  surface: RefObject<HTMLDivElement | null>;
  blocked: boolean;
  movable: boolean;
  inNap: boolean;
  onEscape: () => void;
  onPause: () => void;
  move: (x: number) => void;
  setDirection: (direction: 'left' | 'right', pressed: boolean) => void;
  release: () => void;
}

export function useGameInput(options: Options) {
  const latest = useRef(options);
  const keys = useRef(new Set<string>());
  const pointer = useRef<number | null>(null);
  latest.current = options;

  useEffect(() => {
    if (options.blocked || !options.movable) {
      keys.current.clear(); options.release();
      if (pointer.current !== null && options.surface.current) releasePointer(options.surface.current, pointer.current);
      pointer.current = null;
    }
  }, [options.blocked, options.movable, options.release, options.surface]);

  useEffect(() => {
    const directions = () => {
      const state = latest.current;
      state.setDirection('left', keys.current.has('ArrowLeft') || keys.current.has('KeyA'));
      state.setDirection('right', keys.current.has('ArrowRight') || keys.current.has('KeyD'));
    };
    const down = (event: KeyboardEvent) => {
      const state = latest.current;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Escape') { if (!event.repeat) state.onEscape(); return; }
      if (state.blocked || isInteractive(event.target)) return;
      if (event.code === 'Space' && state.inNap) { event.preventDefault(); if (!event.repeat) state.onPause(); return; }
      if (!state.movable || !['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) return;
      event.preventDefault(); keys.current.add(event.code); directions();
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code); directions(); };
    const blur = () => { keys.current.clear(); latest.current.release(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); blur(); };
  }, []);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const state = latest.current;
    if (state.blocked || !state.movable || !event.isPrimary || isInteractive(event.target)) return;
    if (event.pointerType !== 'mouse' && pointer.current !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = pointerToGameX(event.clientX, bounds);
    if (x !== null) state.move(x);
  };
  return {
    onPointerMove: move,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const state = latest.current;
      if (state.blocked || !state.movable || !event.isPrimary || event.button !== 0 || isInteractive(event.target)) return;
      pointer.current = event.pointerId; capturePointer(event.currentTarget, event.pointerId); focusSafely(event.currentTarget); move(event);
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => { releasePointer(event.currentTarget, event.pointerId); if (pointer.current === event.pointerId) pointer.current = null; },
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => { releasePointer(event.currentTarget, event.pointerId); pointer.current = null; latest.current.release(); },
  };
}