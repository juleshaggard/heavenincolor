import { useEffect, useState } from "react";
import { listSkyImages, type SkyImage } from "@/lib/cloudinary";

// Hide any frames captured before Friday, April 24, 2026 (local time).
const MIN_CAPTURED_AT = new Date(2026, 3, 24, 0, 0, 0, 0).getTime();

function filterRecent(imgs: SkyImage[]): SkyImage[] {
  return imgs.filter((i) => i.capturedAt.getTime() >= MIN_CAPTURED_AT);
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