export class TimeoutError extends Error {
  constructor(label: string) { super(`${label} timed out`); this.name = 'TimeoutError'; }
}

export function withDeadline<T>(promise: Promise<T>, milliseconds: number, label: string, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };
    const abort = () => finish(() => reject(new DOMException('Operation cancelled', 'AbortError')));
    const timer = setTimeout(() => finish(() => reject(new TimeoutError(label))), milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    promise.then((value) => finish(() => resolve(value)), (error: unknown) => finish(() => reject(error)));
  });
}

export function isAbort(error: unknown) { return error instanceof Error && error.name === 'AbortError'; }