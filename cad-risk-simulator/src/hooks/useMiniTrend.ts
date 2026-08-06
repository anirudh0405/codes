import { useEffect, useRef, useState } from 'react';

/**
 * useMiniTrend — keeps a rolling window of the last `max` distinct values.
 * Used to render tiny sparklines for metrics that don't have a store-level trend.
 */
export function useMiniTrend<T extends number | string>(value: T, max = 30, compare?: (a: T, b: T) => boolean) {
  const [history, setHistory] = useState<T[]>([]);
  const ref = useRef(value);
  const isSame = compare ?? ((a: T, b: T) => String(a) === String(b));

  useEffect(() => {
    if (isSame(ref.current, value)) return;
    ref.current = value;
    setHistory(prev => {
      const next = [...prev, value];
      if (next.length > max) next.shift();
      return next;
    });
  }, [value, max, isSame]);

  return history;
}
