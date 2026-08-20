import { useCallback, useEffect, useRef } from "react";

/** Poll a callback every `ms` ms while the component is mounted. */
export function usePoll(fn: () => void | Promise<void>, ms: number, deps: any[] = []) {
  const saved = useRef(fn);
  saved.current = fn;
  const tick = useCallback(() => {
    Promise.resolve(saved.current()).catch(() => {});
  }, []);
  useEffect(() => {
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, tick, ...deps]);
}
