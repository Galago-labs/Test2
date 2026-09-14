import { warnOnce } from '../core/faults.ts';
import type { YandexSDK } from './types';

export function isYandexSDK(value: unknown): value is YandexSDK {
  try {
    const sdk = value as YandexSDK | null;
    return Boolean(sdk && typeof sdk.environment?.i18n?.lang === 'string' &&
      typeof sdk.features?.LoadingAPI?.ready === 'function' &&
      typeof sdk.on === 'function' && typeof sdk.off === 'function');
  } catch { return false; }
}

export class PlatformGate {
  private reasons = new Set<string>();
  private sdk: YandexSDK | null = null;
  private wanted = false;
  private reported: boolean | null = null;
  private reporting = false;
  private onChange: (blocked: boolean) => void;
  private onInterrupt: () => void;

  constructor(onChange: (blocked: boolean) => void, onInterrupt: () => void) {
    this.onChange = onChange;
    this.onInterrupt = onInterrupt;
  }
  get blocked() { return this.reasons.size > 0; }

  attach(sdk: YandexSDK | null) { this.sdk = sdk; this.reported = null; this.sync(); }
  setGameplay(active: boolean) { this.wanted = active; this.sync(); }
  block(reason: string) {
    if (this.reasons.has(reason)) return;
    const wasBlocked = this.blocked;
    this.reasons.add(reason);
    this.wanted = false;
    if (!wasBlocked) {
      this.onChange(true);
      this.onInterrupt();
    }
    this.sync();
  }
  release(reason: string, platformAutoResume = false) {
    const wasBlocked = this.blocked;
    this.reasons.delete(reason);
    if (wasBlocked !== this.blocked) this.onChange(this.blocked);
    this.sync(platformAutoResume);
  }
  dispose() { this.wanted = false; this.sync(); this.sdk = null; this.reported = null; }

  private sync(force = false) {
    if (this.reporting || !this.sdk) return;
    const active = this.wanted && !this.blocked;
    if (!force && this.reported === active) return;
    this.reporting = true;
    this.reported = active;
    try {
      const api = this.sdk.features?.GameplayAPI;
      if (active) api?.start?.(); else api?.stop?.();
    } catch (error) { this.reported = null; warnOnce('Gameplay reporting unavailable', error); }
    finally { this.reporting = false; }
    // A synchronous SDK callback can pause us while start() is still returning.
    if (active && this.blocked) this.sync();
  }
}

export function subscribePlatform(sdk: YandexSDK, pause: () => void, resume: () => void): () => void {
  const subscriptions: Array<['game_api_pause' | 'game_api_resume', () => void]> = [];
  const dispose = () => {
    subscriptions.splice(0).forEach(([event, callback]) => {
      try { sdk.off(event, callback); } catch (error) { warnOnce('SDK unsubscribe failed', error); }
    });
  };
  try {
    sdk.on('game_api_pause', pause); subscriptions.push(['game_api_pause', pause]);
    sdk.on('game_api_resume', resume); subscriptions.push(['game_api_resume', resume]);
    return dispose;
  } catch (error) { dispose(); throw error; }
}