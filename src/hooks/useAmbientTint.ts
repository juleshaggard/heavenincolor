import { useEffect } from "react";
import { hexToHsl } from "@/lib/color";

/** Drives --sky-h/s/l on <html> from a hex string. */
export function useAmbientTint(hex: string | null | undefined) {
  useEffect(() => {
    if (!hex) return;
    const [h, s, l] = hexToHsl(hex);
    const root = document.documentElement;
    root.style.setProperty("--sky-h", h.toFixed(1));
    root.style.setProperty("--sky-s", `${s.toFixed(1)}%`);
    root.style.setProperty("--sky-l", `${l.toFixed(1)}%`);
  }, [hex]);
}
