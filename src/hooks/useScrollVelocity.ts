import { useEffect, useState } from "react";

// Shared scroll velocity (0..1+) updated globally so all subscribers stay in sync.
let listeners = new Set<(v: number) => void>();
let current = 0;
let lastY = typeof window !== "undefined" ? window.scrollY : 0;
let lastT = typeof performance !== "undefined" ? performance.now() : 0;
let raf = 0;
let started = false;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const onScroll = () => {
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    const dy = window.scrollY - lastY;
    // px/ms → normalized intensity. ~3 px/ms = full effect.
    const v = Math.min(1.5, Math.abs(dy) / dt / 3);
    current = Math.max(current, v);
    lastY = window.scrollY;
    lastT = now;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  const tick = () => {
    // decay
    current *= 0.92;
    if (current < 0.001) current = 0;
    listeners.forEach((fn) => fn(current));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

export function useScrollVelocity() {
  const [v, setV] = useState(0);
  useEffect(() => {
    start();
    listeners.add(setV);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}

export function getScrollVelocity() {
  return current;
}

export function ensureScrollVelocity() {
  start();
}