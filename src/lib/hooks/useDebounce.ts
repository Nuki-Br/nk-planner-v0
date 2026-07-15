"use client";

import { useEffect, useState } from "react";

/**
 * Ecoa `value` só depois de `delay` ms sem mudança.
 * Usado na busca do media center para não disparar uma query por tecla.
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
