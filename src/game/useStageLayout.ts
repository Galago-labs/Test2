import { useLayoutEffect, useRef, useState } from 'react';
import { calculateViewport, type ViewportLayout } from './viewport';

function equalLayout(previous: ViewportLayout | null, next: ViewportLayout) {
  return previous && previous.width === next.width && previous.height === next.height &&
    previous.profile === next.profile && previous.scale === next.scale &&
    previous.safe.top === next.safe.top && previous.safe.right === next.safe.right &&
    previous.safe.bottom === next.safe.bottom && previous.safe.left === next.safe.left;
}

export function useStageLayout() {
  const rootRef = useRef<HTMLDivElement>(null);
  const safeAreaRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ViewportLayout | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let scheduled = 0;
    let disposed = false;
    const pointer = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : null;
    const measure = () => {
      scheduled = 0;
      if (disposed) return;
      const { width, height } = root.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const safe = safeAreaRef.current ? getComputedStyle(safeAreaRef.current) : null;
      const next = calculateViewport(width, height, pointer?.matches || false, {
        top: parseFloat(safe?.paddingTop || '0'), right: parseFloat(safe?.paddingRight || '0'),
        bottom: parseFloat(safe?.paddingBottom || '0'), left: parseFloat(safe?.paddingLeft || '0'),
      });
      setLayout((previous) => equalLayout(previous, next) ? previous : next);
    };
    const requestMeasure = () => { if (!scheduled) scheduled = requestAnimationFrame(measure); };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(requestMeasure) : null;
    observer?.observe(root);
    window.addEventListener('resize', requestMeasure);
    window.addEventListener('orientationchange', requestMeasure);
    window.visualViewport?.addEventListener('resize', requestMeasure);
    pointer?.addEventListener?.('change', requestMeasure);
    return () => {
      disposed = true;
      cancelAnimationFrame(scheduled);
      observer?.disconnect();
      window.removeEventListener('resize', requestMeasure);
      window.removeEventListener('orientationchange', requestMeasure);
      window.visualViewport?.removeEventListener('resize', requestMeasure);
      pointer?.removeEventListener?.('change', requestMeasure);
    };
  }, []);

  return { rootRef, safeAreaRef, layout };
}