import { useEffect, useState } from "react";

const KEY = "sky:timeFormat";
type Mode = "12" | "24";

const listeners = new Set<(m: Mode) => void>();
let current: Mode = (localStorage.getItem(KEY) as Mode) ?? "12";

export function useTimeFormat() {
  const [mode, setModeState] = useState<Mode>(current);
  useEffect(() => {
    const fn = (m: Mode) => setModeState(m);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  const setMode = (m: Mode) => {
    current = m;
    localStorage.setItem(KEY, m);
    listeners.forEach((l) => l(m));
  };
  return { mode, setMode, hour12: mode === "12" };
}
