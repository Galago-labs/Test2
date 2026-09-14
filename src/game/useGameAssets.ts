import { useCallback, useEffect, useState } from 'react';
import { isAbort, withDeadline } from '../core/async.ts';
import { warnOnce } from '../core/faults.ts';
import { ORIGINAL_ROOM_IMAGE } from './artwork';
import { GAME_IMAGES } from '../assets/images';

function preload(src: string, signal: AbortSignal): Promise<void> {
  const image = new Image();
  const done = new Promise<void>((resolve, reject) => {
    image.onload = () => {
      if (!image.naturalWidth) { reject(new Error('Empty image: ' + src.slice(0, 24))); return; }
      if (image.decode) void image.decode().then(resolve, () => image.naturalWidth ? resolve() : reject(new Error('Image decode failed')));
      else resolve();
    };
    image.onerror = () => reject(new Error('Image unavailable'));
    image.src = src;
  });
  signal.addEventListener('abort', () => { image.onload = null; image.onerror = null; image.removeAttribute('src'); }, { once: true });
  return done;
}

export function useGameAssets() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const roomUrl = ORIGINAL_ROOM_IMAGE;
  const momoContentUrl = GAME_IMAGES.momoContent;
  const momoAnxiousUrl = GAME_IMAGES.momoAnxious;

  useEffect(() => {
    const cancellation = new AbortController();
    const { signal } = cancellation;
    const pictures = Promise.all([
      preload(roomUrl, signal),
      preload(momoContentUrl, signal),
      preload(momoAnxiousUrl, signal),
    ]);
    const fonts = Promise.resolve().then(() => document.fonts ? Promise.all([
      document.fonts.load('400 16px "Manrope"', 'Hello Привет'),
      document.fonts.load('500 16px "Manrope"', 'Hello Привет'),
      document.fonts.load('600 16px "Manrope"', 'Hello Привет'),
      document.fonts.load('400 40px "Lora"', 'Hello Привет'),
      document.fonts.load('italic 400 40px "Lora"', 'Hello Привет'),
      document.fonts.load('400 40px "Fraunces"'),
      document.fonts.load('italic 400 40px "Fraunces"'),
      document.fonts.load('400 16px "Noto Sans JP"', '日本語'),
      document.fonts.load('400 16px "Noto Sans KR"', '한국어'),
    ]) : undefined);
    const optionalFonts = withDeadline(fonts, 3500, 'Fonts', signal).catch((error: unknown) => {
      if (!isAbort(error)) warnOnce('Using fallback fonts', error);
    });
    void Promise.all([withDeadline(pictures, 15000, 'Room image', signal), optionalFonts]).then(() => {
      if (!signal.aborted) setStatus('ready');
    }, (error: unknown) => { if (!signal.aborted && !isAbort(error)) setStatus('error'); });
    return () => { cancellation.abort(); };
  // Retry creates a fresh decoder; adding a query string would corrupt a data URL.
  }, [roomUrl, momoContentUrl, momoAnxiousUrl, attempt]);

  const retry = useCallback(() => { setStatus('loading'); setAttempt((value) => value + 1); }, []);
  return { status, roomUrl, momoContentUrl, momoAnxiousUrl, retry };
}