'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 600; // --dur-feature

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts from the last shown value up (or down) to `target` over 600ms, so a stat
 * lands rather than pops in. With reduced motion, or for a non-number, it jumps.
 */
export function useCountUp(target: number | undefined) {
  const [value, setValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (target === undefined) return;
    const from = shown.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min((now - start) / DURATION_MS, 1);
      shown.current = Math.round(from + (target - from) * easeOut(t));
      setValue(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}
