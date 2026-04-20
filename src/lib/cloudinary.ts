// Cloudinary client. Cloud name is public — safe to hardcode.
// Listing strategy:
//   1. Try `https://res.cloudinary.com/<cloud>/image/list/<tag>.json` (works if you've
//      enabled "Resource list" in Cloudinary settings and tagged uploads with `sky`).
//   2. Fall back to a static `/sky-manifest.json` you can host (array of public_ids).
//   3. Fall back to a small built-in demo set so the UI is never empty.

export const CLOUD_NAME = "dc2xbsh7h";
export const SKY_TAG = "sky";

export type SkyImage = {
  public_id: string;
  format: string;
  version?: number;
  capturedAt: Date;
};

const TS_RE = /(\d{4})-(\d{2})-(\d{2})[T_](\d{2})[-:](\d{2})(?:[-:](\d{2}))?/;

export function parseCapturedAt(publicId: string, fallbackIso?: string): Date {
  const m = publicId.match(TS_RE);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0));
  }
  return fallbackIso ? new Date(fallbackIso) : new Date(0);
}

export function cldUrl(
  publicId: string,
  opts: { w?: number; h?: number; q?: string | number; blur?: number; format?: string } = {},
) {
  const t: string[] = ["f_auto", `q_${opts.q ?? "auto"}`];
  if (opts.w) t.push(`w_${opts.w}`);
  if (opts.h) t.push(`h_${opts.h}`);
  if (opts.blur) t.push(`e_blur:${opts.blur}`);
  t.push("c_fill");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${t.join(",")}/${publicId}.${opts.format ?? "jpg"}`;
}

type RawResource = { public_id: string; format: string; version?: number; created_at?: string };

async function fetchTagList(): Promise<RawResource[]> {
  const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${SKY_TAG}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`tag list ${res.status}`);
  const data = await res.json();
  return data.resources ?? [];
}

async function fetchManifest(): Promise<RawResource[]> {
  const res = await fetch("/sky-manifest.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return await res.json();
}

// Demo fallback — synthesises a day-long sequence using the one image you've uploaded
// plus Cloudinary color overlays so the UI is fully populated until the tag list works.
function demoSet(): RawResource[] {
  const base = "sky/2026-04-19T20-30-00"; // adjust to your actual public_id once known
  const out: RawResource[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 48; i++) {
    const d = new Date(start.getTime() + i * 30 * 60_000);
    const stamp = d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    out.push({
      public_id: `__demo__/${stamp}`,
      format: "jpg",
      created_at: d.toISOString(),
    });
  }
  return out;
}

let cache: SkyImage[] | null = null;
let inflight: Promise<SkyImage[]> | null = null;

export async function listSkyImages(force = false): Promise<SkyImage[]> {
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    let raw: RawResource[] = [];
    try {
      raw = await fetchTagList();
    } catch {
      try {
        raw = await fetchManifest();
      } catch {
        raw = demoSet();
      }
    }
    const mapped = raw
      .map((r) => ({
        public_id: r.public_id,
        format: r.format ?? "jpg",
        version: r.version,
        capturedAt: parseCapturedAt(r.public_id, r.created_at),
      }))
      .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
    cache = mapped;
    inflight = null;
    return mapped;
  })();
  return inflight;
}

export function isDemo(img: SkyImage) {
  return img.public_id.startsWith("__demo__/");
}

// Procedural sky color for demo images so the UI is alive without real photos.
export function demoSkyColor(d: Date): { hex: string; palette: string[] } {
  const h = d.getHours() + d.getMinutes() / 60;
  // night → dawn → day → golden → dusk → night
  const stops: [number, [number, number, number]][] = [
    [0, [230, 30, 8]],
    [5, [250, 35, 18]],
    [6.5, [20, 70, 60]],
    [9, [205, 55, 70]],
    [13, [210, 50, 75]],
    [17, [30, 70, 65]],
    [18.5, [12, 80, 55]],
    [19.5, [350, 65, 38]],
    [21, [260, 45, 18]],
    [24, [230, 30, 8]],
  ];
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1][0] < h) i++;
  const [t0, c0] = stops[i];
  const [t1, c1] = stops[Math.min(i + 1, stops.length - 1)];
  const k = (h - t0) / Math.max(0.001, t1 - t0);
  const lerp = (a: number, b: number) => a + (b - a) * k;
  const hsl: [number, number, number] = [lerp(c0[0], c1[0]), lerp(c0[1], c1[1]), lerp(c0[2], c1[2])];
  const hex = hslToHex(hsl[0], hsl[1], hsl[2]);
  const palette = [
    hslToHex(hsl[0] - 20, hsl[1], Math.max(8, hsl[2] - 25)),
    hslToHex(hsl[0] - 10, hsl[1], Math.max(12, hsl[2] - 12)),
    hex,
    hslToHex(hsl[0] + 10, Math.max(20, hsl[1] - 10), Math.min(92, hsl[2] + 12)),
    hslToHex(hsl[0] + 25, Math.max(15, hsl[1] - 20), Math.min(96, hsl[2] + 25)),
  ];
  return { hex, palette };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return [0, 0, 0];
  const [r, g, b] = m.map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return [h, s * 100, l * 100];
}