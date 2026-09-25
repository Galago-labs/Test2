import { withDeadline } from '../core/async.ts';
import { warnOnce } from '../core/faults.ts';
import { isYandexSDK } from './bridge.ts';
import { isCapacitorNative } from './capacitorBridge';
import type { PlatformConnection, YandexSDK } from './types';

let connectionPromise: Promise<PlatformConnection> | undefined;
let initialization: Promise<YandexSDK> | undefined;
const reportedReady = new WeakSet<YandexSDK>();

async function loadSDK(): Promise<void> {
  if (typeof window.YaGames?.init === 'function') return;
  const script = document.createElement('script');
  script.src = '/sdk.js';
  script.async = true;
  script.dataset.napSdk = 'true';
  let loaded = false;
  const load = new Promise<void>((resolve, reject) => {
    script.onload = () => {
      loaded = typeof window.YaGames?.init === 'function';
      if (loaded) resolve(); else reject(new Error('SDK entry point unavailable'));
    };
    script.onerror = () => reject(new Error('SDK script unavailable'));
    document.head.append(script);
  });
  try { await withDeadline(load, 8000, 'SDK script'); }
  finally { script.onload = null; script.onerror = null; if (!loaded) script.remove(); }
}

async function initialize() {
  if (!initialization) {
    const attempt = Promise.resolve().then(() => window.YaGames!.init()).then((sdk) => {
      if (!isYandexSDK(sdk)) throw new Error('Unsupported SDK response');
      return sdk;
    });
    initialization = attempt;
    void attempt.catch(() => { if (initialization === attempt) initialization = undefined; });
  }
  // Do not create a second live init() while an earlier timed-out call is still pending.
  return withDeadline(initialization, 12000, 'SDK initialization');
}

export const standaloneConnection = (failed = false): PlatformConnection => ({ mode: 'standalone', sdk: null, initializationFailed: failed });

export function connectPlatform(retry = false): Promise<PlatformConnection> {
  if (retry) connectionPromise = undefined;
  if (connectionPromise) return connectionPromise;
  connectionPromise = (async () => {
    try {
      const override = new URLSearchParams(location.search).get('platform');
      const development = Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
      // Production initializes Yandex by default. Local artwork does not change SDK policy.
      // Inside the native (Capacitor) wrapper there is no Yandex SDK to load at
      // all — that's expected, not a failure, so it must not surface the "can't
      // reach Yandex, try reconnecting" message meant for the web build.
      if (!retry && (isCapacitorNative() || !window.YaGames) && (override === 'standalone' || isCapacitorNative() || (development && override !== 'yandex'))) return standaloneConnection();
      await loadSDK();
      const sdk = await initialize();
      return { mode: 'yandex', sdk, language: sdk.environment.i18n.lang, initializationFailed: false } as PlatformConnection;
    } catch (error) { warnOnce('Platform unavailable; using standalone mode', error); return standaloneConnection(true); }
  })();
  return connectionPromise;
}

export function reportGameReady(sdk: YandexSDK | null) {
  if (!sdk || reportedReady.has(sdk)) return;
  try { sdk.features.LoadingAPI?.ready(); reportedReady.add(sdk); }
  catch (error) { warnOnce('Game Ready reporting failed', error); }
}