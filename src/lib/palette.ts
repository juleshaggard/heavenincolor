// Tiny client-side palette extractor: downsample 64×64, k-means in RGB, persist in localStorage.
import { cldUrl, demoSkyColor, hexToHsl, isDemo, type SkyImage } from "./cloudinary";

export type Palette = {
  hex: string;          // dominant
  swatches: string[];   // 5 hex
  hsl: [number, number, number]; // dominant in HSL
};

const KEY = "sky:palette:v1";
let memCache: Record<string, Palette> = {};
try {
  memCache = JSON.parse(localStorage.getItem(KEY) ?? "{}");
} catch {
  /* noop */
}
let saveTimer: number | null = null;
function persist() {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(memCache));
    } catch {
      /* quota — drop oldest half */
      const entries = Object.entries(memCache);
      memCache = Object.fromEntries(entries.slice(entries.length / 2));
      try { localStorage.setItem(KEY, JSON.stringify(memCache)); } catch {/*noop*/}
    }
  }, 400);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function kmeans(pixels: number[][], k: number, iters = 8): number[][] {
  // init: pick k pixels spaced through the array
  const centers = Array.from({ length: k }, (_, i) =>
    pixels[Math.floor((i + 0.5) * (pixels.length / k))].slice(),
  );
  for (let it = 0; it < iters; it++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (const p of pixels) {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < k; c++) {
        const dr = p[0] - centers[c][0];
        const dg = p[1] - centers[c][1];
        const db = p[2] - centers[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      sums[best][0] += p[0];
      sums[best][1] += p[1];
      sums[best][2] += p[2];
      sums[best][3]++;
    }
    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) {
        centers[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
      }
    }
  }
  // sort dark→light for a sky-like ribbon
  return centers
    .map((c) => [...c, c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114])
    .sort((a, b) => a[3] - b[3])
    .map((c) => [c[0], c[1], c[2]]);
}

function rgbToHex([r, g, b]: number[]) {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

const queue: Array<() => Promise<void>> = [];
let active = 0;
const MAX = 4;
function pump() {
  while (active < MAX && queue.length) {
    const job = queue.shift()!;
    active++;
    job().finally(() => {
      active--;
      pump();
    });
  }
}
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((res, rej) => {
    queue.push(async () => {
      try {
        res(await fn());
      } catch (e) {
        rej(e);
      }
    });
    pump();
  });
}

export async function getPalette(img: SkyImage): Promise<Palette> {
  const cached = memCache[img.public_id];
  if (cached) return cached;

  if (isDemo(img)) {
    const { hex, palette } = demoSkyColor(img.capturedAt);
    const out: Palette = { hex, swatches: palette, hsl: hexToHsl(hex) };
    memCache[img.public_id] = out;
    persist();
    return out;
  }

  const url = cldUrl(img.public_id, { w: 64, h: 64, q: 60 });
  return enqueue(async () => {
    try {
      const el = await loadImage(url);
      const cv = document.createElement("canvas");
      cv.width = 64;
      cv.height = 64;
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(el, 0, 0, 64, 64);
      const data = ctx.getImageData(0, 0, 64, 64).data;
      const px: number[][] = [];
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        px.push([data[i], data[i + 1], data[i + 2]]);
      }
      const centers = kmeans(px, 5);
      const swatches = centers.map(rgbToHex);
      // dominant = the swatch with highest count proxy → middle-bright cluster
      const hex = swatches[Math.floor(swatches.length / 2)];
      const out: Palette = { hex, swatches, hsl: hexToHsl(hex) };
      memCache[img.public_id] = out;
      persist();
      return out;
    } catch {
      const fallback: Palette = { hex: "#3a3a44", swatches: ["#1a1a22", "#2a2a34", "#3a3a44", "#5a5a68", "#8a8aa0"], hsl: [240, 8, 25] };
      return fallback;
    }
  });
}

export function timeOfDay(d: Date): "dawn" | "day" | "golden" | "dusk" | "night" {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 5.5) return "night";
  if (h < 7.5) return "dawn";
  if (h < 16.5) return "day";
  if (h < 19) return "golden";
  if (h < 21) return "dusk";
  return "night";
}

// CIE76 ΔE in Lab — quick & adequate for our delta strip
function rgbFromHex(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/.{2}/g)!;
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}
function rgbToLab([r, g, b]: number[]): [number, number, number] {
  const f = (v: number) => {
    v /= 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };
  const R = f(r), G = f(g), B = f(b);
  const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const g_ = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = g_(X / Xn), fy = g_(Y / Yn), fz = g_(Z / Zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export function deltaE(hexA: string, hexB: string): number {
  const a = rgbToLab(rgbFromHex(hexA));
  const b = rgbToLab(rgbFromHex(hexB));
  const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}