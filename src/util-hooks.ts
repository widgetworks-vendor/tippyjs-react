import {useLayoutEffect, useEffect, useRef} from 'react';
import {isBrowser} from './utils.js';

export const useIsomorphicLayoutEffect = isBrowser
  ? useLayoutEffect
  : useEffect;

export function useMutableBox<T>(initialValue: T | (() => T)) {
  // Using refs instead of state as it's recommended to not store imperative
  // values in state due to memory problems in React(?)
  const ref = useRef<T>();

  if (!ref.current) {
    ref.current = (typeof initialValue === 'function') ? (initialValue as () => T)() : initialValue;
  }

  return ref.current;
}
