import { useCallback, useEffect, useRef, useState } from 'react';
import { withDeadline } from '../core/async.ts';
import { warnOnce } from '../core/faults.ts';
import { PlatformGate, subscribePlatform } from './bridge.ts';
import { connectPlatform, reportGameReady, standaloneConnection } from './yandex';
import { isCapacitorNative, showNativeInterstitial } from './capacitorBridge';
import type { PlatformConnection, YandexSDK } from './types';

export function usePlatform(onInterrupt: () => void) {
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [suspended, setSuspended] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const mounted = useRef(false);
  const sdkRef = useRef<YandexSDK | null>(null);
  const interruptRef = useRef(onInterrupt);
  const fullscreenPending = useRef(false);
  interruptRef.current = onInterrupt;
  const [gate] = useState(() => new PlatformGate(
    (blocked) => { if (mounted.current) setSuspended(blocked); },
    () => { if (mounted.current) interruptRef.current(); },
  ));

  const setGameplay = useCallback((active: boolean) => gate.setGameplay(active), [gate]);
  const isSuspended = useCallback(() => gate.blocked, [gate]);
  const showInterstitial = useCallback((onOpen?: () => void, onClose?: (wasShown: boolean) => void) => {
    if (isCapacitorNative()) { showNativeInterstitial(onOpen, onClose); return; }
    const adv = sdkRef.current?.adv;
    if (!adv) { onClose?.(false); return; }
    try {
      adv.showFullscreenAdv({ callbacks: {
        onOpen: () => onOpen?.(),
        onClose: (wasShown) => onClose?.(wasShown),
        onError: (error) => { warnOnce('Interstitial ad failed', error); onClose?.(false); },
      } });
    } catch (error) { warnOnce('Interstitial ad call failed', error); onClose?.(false); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; gate.dispose(); };
  }, [gate]);

  useEffect(() => {
    let current = true;
    let unsubscribe = () => {};
    void connectPlatform(attempt > 0).then((result) => {
      if (!current) return;
      let next = result;
      try {
        if (result.sdk) {
          const sdk = result.sdk;
          unsubscribe = subscribePlatform(sdk, () => { if (current) gate.block('platform'); }, () => {
            if (!current) return;
            if (!document.hidden) gate.release('visibility');
            if (document.hasFocus()) gate.release('focus');
            gate.release('platform', true);
          });
          sdkRef.current = sdk;
          gate.attach(sdk);
          setFullscreen(sdk.screen?.fullscreen?.status === 'on');
        }
      } catch (error) {
        unsubscribe();
        sdkRef.current = null;
        gate.attach(null);
        gate.release('platform');
        next = standaloneConnection(true);
        warnOnce('SDK subscriptions unavailable', error);
      }
      if (current) setConnection(next);
    }).catch((error: unknown) => {
      warnOnce('Platform startup failed', error);
      if (current) setConnection(standaloneConnection(true));
    });
    return () => { current = false; unsubscribe(); gate.attach(null); sdkRef.current = null; };
  }, [attempt, gate]);

  useEffect(() => {
    const blur = () => gate.block('focus');
    const focus = () => { if (!document.hidden) { gate.release('visibility'); gate.release('focus'); } };
    const visibility = () => { if (document.hidden) gate.block('visibility'); else { gate.release('visibility'); if (document.hasFocus()) focus(); } };
    const pointer = () => { if (document.hasFocus()) focus(); };
    const pageHide = () => gate.block('visibility');
    const fullscreenChange = () => {
      try { setFullscreen(Boolean(document.fullscreenElement) || sdkRef.current?.screen?.fullscreen?.status === 'on'); }
      catch { setFullscreen(Boolean(document.fullscreenElement)); }
    };
    visibility();
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    window.addEventListener('pointerdown', pointer, true);
    window.addEventListener('pagehide', pageHide);
    window.addEventListener('pageshow', visibility);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('fullscreenchange', fullscreenChange);
    return () => {
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
      window.removeEventListener('pointerdown', pointer, true);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('pageshow', visibility);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('fullscreenchange', fullscreenChange);
    };
  }, [gate]);

  const changeFullscreen = useCallback(async (enter: boolean) => {
    if (fullscreenPending.current) return false;
    fullscreenPending.current = true;
    const sdkAtRequest = sdkRef.current;
    try {
      const api = sdkAtRequest?.screen?.fullscreen;
      let operation: Promise<void> | undefined;
      if (api) {
        if (enter && api.status !== 'on') operation = api.request();
        else if (!enter && api.status === 'on') operation = api.exit();
      } else if (enter && !document.fullscreenElement) {
        if (!document.documentElement.requestFullscreen) return false;
        operation = document.documentElement.requestFullscreen();
      } else if (!enter && document.fullscreenElement) operation = document.exitFullscreen();
      if (operation) await withDeadline(operation, 4000, 'Fullscreen request');
      const actual = api ? api.status === 'on' : Boolean(document.fullscreenElement);
      if (mounted.current && sdkRef.current === sdkAtRequest) setFullscreen(actual);
      return actual === enter;
    } catch { return false; }
    finally { fullscreenPending.current = false; }
  }, []);

  const reconnect = useCallback(() => {
    if (!mounted.current || !connection || gate.blocked) return;
    interruptRef.current();
    setConnection(null);
    setAttempt((value) => value + 1);
  }, [connection, gate]);
  const ready = useCallback(() => reportGameReady(sdkRef.current), []);
  return { connection, suspended, fullscreen, ready, setGameplay, isSuspended, changeFullscreen, reconnect, showInterstitial };
}