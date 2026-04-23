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

// Evocative color name from a hex. Picks the closest entry in a curated table.
type NamedColor = { name: string; h: number; s: number; l: number };

const COLOR_NAMES: NamedColor[] = [
  // neutrals (saturation < ~12)
  { name: "obsidian", h: 230, s: 8, l: 6 },
  { name: "ink", h: 220, s: 10, l: 12 },
  { name: "graphite", h: 220, s: 6, l: 22 },
  { name: "charcoal", h: 0, s: 0, l: 18 },
  { name: "gunmetal", h: 210, s: 8, l: 30 },
  { name: "slate", h: 215, s: 10, l: 40 },
  { name: "pewter", h: 220, s: 5, l: 55 },
  { name: "stone", h: 30, s: 6, l: 55 },
  { name: "ash", h: 0, s: 0, l: 65 },
  { name: "fog", h: 210, s: 8, l: 78 },
  { name: "linen", h: 35, s: 15, l: 88 },
  { name: "bone", h: 40, s: 12, l: 92 },
  { name: "snow", h: 0, s: 0, l: 97 },

  // blues
  { name: "midnight", h: 230, s: 60, l: 10 },
  { name: "navy", h: 220, s: 70, l: 18 },
  { name: "indigo", h: 245, s: 55, l: 30 },
  { name: "denim", h: 215, s: 45, l: 40 },
  { name: "steel blue", h: 210, s: 35, l: 45 },
  { name: "cobalt", h: 220, s: 75, l: 40 },
  { name: "azure", h: 210, s: 80, l: 55 },
  { name: "cornflower", h: 220, s: 60, l: 65 },
  { name: "powder blue", h: 205, s: 45, l: 78 },
  { name: "ice", h: 200, s: 30, l: 88 },

  // teals / cyans
  { name: "deep teal", h: 185, s: 60, l: 22 },
  { name: "teal", h: 180, s: 50, l: 38 },
  { name: "seafoam", h: 165, s: 45, l: 70 },
  { name: "aqua", h: 180, s: 70, l: 60 },
  { name: "turquoise", h: 175, s: 65, l: 50 },

  // greens
  { name: "forest", h: 130, s: 50, l: 22 },
  { name: "moss", h: 90, s: 30, l: 35 },
  { name: "olive", h: 70, s: 35, l: 38 },
  { name: "sage", h: 110, s: 20, l: 65 },
  { name: "jade", h: 150, s: 50, l: 45 },
  { name: "mint", h: 145, s: 45, l: 80 },

  // yellows / ambers
  { name: "mustard", h: 45, s: 70, l: 45 },
  { name: "gold", h: 45, s: 80, l: 55 },
  { name: "amber", h: 38, s: 85, l: 55 },
  { name: "honey", h: 40, s: 70, l: 60 },
  { name: "butter", h: 50, s: 60, l: 80 },
  { name: "cream", h: 45, s: 40, l: 90 },

  // oranges
  { name: "rust", h: 18, s: 70, l: 35 },
  { name: "copper", h: 22, s: 60, l: 45 },
  { name: "tangerine", h: 25, s: 90, l: 55 },
  { name: "ember", h: 15, s: 85, l: 50 },
  { name: "apricot", h: 25, s: 75, l: 75 },
  { name: "peach", h: 20, s: 70, l: 82 },

  // reds / pinks
  { name: "oxblood", h: 355, s: 60, l: 22 },
  { name: "crimson", h: 350, s: 75, l: 38 },
  { name: "scarlet", h: 5, s: 85, l: 50 },
  { name: "coral", h: 10, s: 80, l: 65 },
  { name: "rose", h: 345, s: 60, l: 65 },
  { name: "blush", h: 350, s: 55, l: 82 },

  // purples / magentas
  { name: "plum", h: 290, s: 40, l: 30 },
  { name: "aubergine", h: 295, s: 35, l: 22 },
  { name: "violet", h: 270, s: 55, l: 50 },
  { name: "lilac", h: 280, s: 45, l: 78 },
  { name: "mauve", h: 320, s: 25, l: 60 },
  { name: "magenta", h: 320, s: 75, l: 50 },

  // browns / earth
  { name: "espresso", h: 25, s: 30, l: 15 },
  { name: "umber", h: 25, s: 40, l: 25 },
  { name: "walnut", h: 28, s: 35, l: 32 },
  { name: "sienna", h: 18, s: 55, l: 38 },
  { name: "tan", h: 32, s: 40, l: 60 },
  { name: "sand", h: 38, s: 35, l: 75 },
];

// Distance in HSL with hue weighted heavier; cyclic hue handled.
function colorDistance(a: NamedColor, h: number, s: number, l: number): number {
  const dh = Math.min(Math.abs(a.h - h), 360 - Math.abs(a.h - h));
  const hueWeight = a.s < 15 || s < 15 ? 0.2 : 1.2; // hue matters less for grays
  const ds = a.s - s;
  const dl = a.l - l;
  return (dh * hueWeight) ** 2 + ds * ds + (dl * dl) * 1.4;
}

export function nameColor(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  let best = COLOR_NAMES[0];
  let bestD = Infinity;
  for (const c of COLOR_NAMES) {
    const d = colorDistance(c, h, s, l);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}