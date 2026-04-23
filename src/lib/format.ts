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

export function fmtTime(d: Date, hour12 = true): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12 });
}
export function fmtDate(d: Date): string {
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
export function fmtShort(d: Date): string {
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

import { timeOfDay } from "./palette";
import { hexToHsl } from "./cloudinary";

export function captionFor(d: Date, hex?: string): string {
  if (hex) return nameColor(hex);
  return { dawn: "first light", day: "midday", golden: "golden hour", dusk: "blue hour", night: "night" }[
    timeOfDay(d)
  ];
}

// Human-friendly name for a hex sky color (hue + lightness/saturation modifiers).
export function nameColor(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  if (l < 8) return "near black";
  if (l > 94) return "near white";
  if (s < 8) {
    if (l < 25) return "charcoal";
    if (l < 45) return "slate gray";
    if (l < 65) return "ash gray";
    if (l < 82) return "silver";
    return "pale gray";
  }
  const hueName = (() => {
    const x = ((h % 360) + 360) % 360;
    if (x < 15) return "red";
    if (x < 35) return "orange";
    if (x < 50) return "amber";
    if (x < 65) return "yellow";
    if (x < 90) return "chartreuse";
    if (x < 150) return "green";
    if (x < 175) return "teal";
    if (x < 195) return "cyan";
    if (x < 220) return "sky blue";
    if (x < 245) return "blue";
    if (x < 275) return "indigo";
    if (x < 295) return "violet";
    if (x < 320) return "magenta";
    if (x < 345) return "pink";
    return "red";
  })();
  const lightMod = l < 25 ? "deep " : l < 42 ? "dark " : l < 60 ? "" : l < 78 ? "light " : "pale ";
  const satMod = s < 25 ? "muted " : s < 55 ? "soft " : "";
  return `${lightMod}${satMod}${hueName}`.trim().replace(/\s+/g, " ");
}