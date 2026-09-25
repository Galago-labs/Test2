type FaultListener = (error: unknown) => void;
const listeners = new Set<FaultListener>();
const reported = new Set<string>();

export function warnOnce(scope: string, error: unknown) {
  if (reported.has(scope)) return;
  reported.add(scope);
  console.warn(`[little pause] ${scope}`, error);
}

export function reportFatal(error: unknown) {
  console.error('[little pause] Recoverable game failure', error);
  listeners.forEach((listener) => listener(error));
}

export function subscribeFaults(listener: FaultListener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}