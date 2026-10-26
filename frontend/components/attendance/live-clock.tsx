'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, ticking every second. Kept in its own component so the tick
 * re-renders only this text, not the page around it. Empty until mounted, so the
 * server-rendered HTML doesn't disagree with the browser's clock.
 */
export function LiveClock({ className, format = 'time' }: { className?: string; format?: 'time' | 'date' }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const text = !now
    ? ' '
    : format === 'time'
      ? now.toLocaleTimeString()
      : now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return <p className={className}>{text}</p>;
}
