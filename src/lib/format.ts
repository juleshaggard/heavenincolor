export function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d2 = Math.floor(h / 24);
  return `${d2} day${d2 === 1 ? "" : "s"} ago`;
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
export function fmtDate(d: Date): string {
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
export function fmtShort(d: Date): string {
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

import { timeOfDay } from "./palette";
export function captionFor(d: Date): string {
  return { dawn: "first light", day: "midday", golden: "golden hour", dusk: "blue hour", night: "night" }[
    timeOfDay(d)
  ];
}