import { useEffect } from 'react';

// Deliberately not importing @capacitor/core here: the web/Yandex build has no
// reason to carry that dependency, and reading window.Capacitor directly means
// this file is a complete no-op — not just inactive, but literally nothing to
// load — on every platform except the native wrapper app.
interface CapacitorBackButtonHandle { remove: () => void }
interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    App?: { addListener: (event: 'backButton', callback: () => void) => CapacitorBackButtonHandle | Promise<CapacitorBackButtonHandle> };
    // Custom native plugin (native/android) bridging to Yandex Mobile Ads SDK —
    // this is a project-specific plugin, not part of Capacitor itself.
    YandexAds?: { showInterstitial: () => Promise<{ shown: boolean }> };
  };
}

function capacitor(): CapacitorGlobal | undefined {
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function isCapacitorNative(): boolean {
  try { return Boolean(capacitor()?.isNativePlatform?.()); } catch { return false; }
}

// Wires the Android hardware/gesture back button to the same `onBack` callback
// used for the TV remote's Back button — same convention, different device.
export function useCapacitorBackButton(active: boolean, onBack: () => void) {
  useEffect(() => {
    if (!active) return;
    const app = capacitor()?.Plugins?.App;
    if (!app) return;
    let handle: CapacitorBackButtonHandle | undefined;
    let cancelled = false;
    Promise.resolve(app.addListener('backButton', onBack)).then((result) => {
      if (cancelled) result.remove(); else handle = result;
    }).catch(() => undefined);
    return () => { cancelled = true; handle?.remove(); };
  }, [active, onBack]);
}

// Mirrors platform/usePlatform.ts's showInterstitial signature so App.tsx can
// call whichever one applies without knowing which platform it's running on.
export function showNativeInterstitial(onOpen?: () => void, onClose?: (wasShown: boolean) => void) {
  const plugin = capacitor()?.Plugins?.YandexAds;
  if (!plugin) { onClose?.(false); return; }
  onOpen?.();
  plugin.showInterstitial()
    .then((result) => onClose?.(Boolean(result?.shown)))
    .catch(() => onClose?.(false));
}
