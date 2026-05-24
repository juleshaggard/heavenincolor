import { useEffect, useState } from "react";
import { listSkyImages, type SkyImage } from "@/lib/skyImages";

// Hide any frames captured before Friday, April 24, 2026 (local time).
const MIN_CAPTURED_AT = new Date(2026, 3, 24, 0, 0, 0, 0).getTime();

// Specific frames to exclude. Matched by local-time "YYYY-MM-DD HH:MM" key,
// rounded to the nearest minute so capture-time jitter still matches.
const EXCLUDED_LOCAL_MINUTES = new Set<string>([
  "2026-04-24 20:10",
]);

function localMinuteKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function filterRecent(imgs: SkyImage[]): SkyImage[] {
  return imgs.filter((i) => {
    const t = i.capturedAt.getTime();
    if (t < MIN_CAPTURED_AT) return false;
    if (EXCLUDED_LOCAL_MINUTES.has(localMinuteKey(i.capturedAt))) return false;
    return true;
  });
}

export function useSkyImages() {
  const [images, setImages] = useState<SkyImage[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    listSkyImages()
      .then((r) => alive && setImages(filterRecent(r)))
      .catch((e) => alive && setError(e));
    const id = window.setInterval(() => {
      listSkyImages(true).then((r) => alive && setImages(filterRecent(r))).catch(() => {});
    }, 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return { images, error };
}

export function imagesInRange(imgs: SkyImage[], from: Date, to: Date): SkyImage[] {
  const a = from.getTime(), b = to.getTime();
  return imgs.filter((i) => {
    const t = i.capturedAt.getTime();
    return t >= a && t <= b;
  });
}

export function imagesByDay(imgs: SkyImage[]): Map<string, SkyImage[]> {
  const m = new Map<string, SkyImage[]>();
  for (const i of imgs) {
    const k = i.capturedAt.toISOString().slice(0, 10);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(i);
  }
  return m;
}
