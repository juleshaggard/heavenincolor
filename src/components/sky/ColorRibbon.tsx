import { useEffect, useMemo, useRef, useState } from "react";
import type { SkyImage } from "@/lib/skyImages";
import { getPalette } from "@/lib/palette";
import { cn } from "@/lib/utils";

type Props = {
  images: SkyImage[];
  height?: number;
  className?: string;
  onScrub?: (index: number) => void;
  activeIndex?: number;
  showTicks?: boolean;
};

export function ColorRibbon({ images, height = 80, className, onScrub, activeIndex, showTicks }: Props) {
  const [colors, setColors] = useState<string[]>(() => images.map(() => "#1a1a1d"));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setColors(images.map(() => "#1a1a1d"));
    (async () => {
      // batch in chunks for perf
      const next = new Array(images.length).fill("#1a1a1d");
      for (let i = 0; i < images.length; i++) {
        try {
          const p = await getPalette(images[i]);
          next[i] = p.hex;
          if (i % 12 === 0 && alive) setColors([...next]);
        } catch {/*noop*/}
      }
      if (alive) setColors(next);
    })();
    return () => { alive = false; };
  }, [images]);

  const gradient = useMemo(() => {
    if (!colors.length) return "transparent";
    return `linear-gradient(90deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}%`).join(", ")})`;
  }, [colors]);

  const hourTicks = useMemo(() => {
    if (!showTicks || images.length < 2) return [];
    const t0 = images[0].capturedAt.getTime();
    const t1 = images[images.length - 1].capturedAt.getTime();
    const span = t1 - t0;
    const out: { left: number; label: string }[] = [];
    for (let h = 0; h <= 24; h += 3) {
      const d = new Date(images[0].capturedAt);
      d.setHours(h, 0, 0, 0);
      const t = d.getTime();
      if (t >= t0 && t <= t1) out.push({ left: ((t - t0) / span) * 100, label: `${h}`.padStart(2, "0") });
    }
    return out;
  }, [images, showTicks]);

  return (
    <div className={cn("relative w-full select-none", className)}>
      <div
        ref={ref}
        role={onScrub ? "slider" : undefined}
        onClick={(e) => {
          if (!onScrub || !ref.current) return;
          const r = ref.current.getBoundingClientRect();
          const k = (e.clientX - r.left) / r.width;
          onScrub(Math.max(0, Math.min(images.length - 1, Math.round(k * (images.length - 1)))));
        }}
        onPointerMove={(e) => {
          if (!onScrub || !ref.current || e.buttons !== 1) return;
          const r = ref.current.getBoundingClientRect();
          const k = (e.clientX - r.left) / r.width;
          onScrub(Math.max(0, Math.min(images.length - 1, Math.round(k * (images.length - 1)))));
        }}
        className={cn("relative w-full overflow-hidden rounded-sm", onScrub && "cursor-ew-resize")}
        style={{ height, background: gradient }}
      >
        {activeIndex != null && images.length > 1 && (
          <>
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-ink"
              style={{ left: `${(activeIndex / (images.length - 1)) * 100}%` }}
            />
            <div
              className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-paper shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
              style={{ left: `${(activeIndex / (images.length - 1)) * 100}%` }}
            />
          </>
        )}
      </div>
      {showTicks && hourTicks.length > 0 && (
        <div className="relative mt-1.5 h-3 text-ink-faint">
          {hourTicks.map((t) => (
            <span
              key={t.left}
              className="absolute -translate-x-1/2 font-mono text-[10px]"
              style={{ left: `${t.left}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
