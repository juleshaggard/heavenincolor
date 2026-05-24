import { useEffect, useMemo, useRef, useState } from "react";
import { useSkyImages, imagesInRange } from "@/hooks/useSkyImages";
import { useAmbientTint } from "@/hooks/useAmbientTint";
import { getPalette, type Palette } from "@/lib/palette";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { Swatches } from "@/components/sky/Swatches";
import { ColorRibbon } from "@/components/sky/ColorRibbon";
import { captionFor, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Range = "day" | "week" | "month";
const SPEEDS = [1, 4, 16, 60] as const;

export default function Timelapse() {
  const { images } = useSkyImages();
  const [range, setRange] = useState<Range>("day");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4);
  const [palette, setPalette] = useState<Palette | null>(null);

  const subset = useMemo(() => {
    if (!images) return [];
    const end = images[images.length - 1]?.capturedAt ?? new Date();
    const start = new Date(end);
    if (range === "day") start.setHours(0, 0, 0, 0);
    if (range === "week") start.setDate(start.getDate() - 7);
    if (range === "month") start.setMonth(start.getMonth() - 1);
    return imagesInRange(images, start, end);
  }, [images, range]);

  useEffect(() => {
    setIdx(Math.max(0, subset.length - 1));
  }, [subset.length]);

  // preload neighbours for buttery scrubbing
  useEffect(() => {
    for (let k = -3; k <= 6; k++) {
      const i = idx + k;
      const img = subset[i];
      if (img) {
        const im = new Image();
        im.src = img.thumbUrl;
      }
    }
  }, [idx, subset]);

  // playback
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);
  useEffect(() => {
    if (!playing) return;
    const tick = (t: number) => {
      if (!last.current) last.current = t;
      const ms = 1000 / (2 * speed); // base 2fps × speed multiplier
      if (t - last.current >= ms) {
        last.current = t;
        setIdx((i) => {
          const next = i + 1;
          if (next >= subset.length) {
            setPlaying(false);
            return i;
          }
          return next;
        });
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing, speed, subset.length]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.code === "ArrowRight") setIdx((i) => Math.min(subset.length - 1, i + 1));
      if (e.code === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [subset.length]);

  const current = subset[idx];
  useEffect(() => {
    if (!current) return;
    getPalette(current).then(setPalette);
  }, [current]);
  useAmbientTint(palette?.hex);

  if (!images) {
    return <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">loading…</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink md:text-5xl">Timelapse</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">
            {subset.length} frames · {range}
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
          {(["day", "week", "month"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-sm border border-hairline px-3 py-1.5 transition-colors",
                range === r ? "bg-secondary text-ink" : "text-ink-dim hover:text-ink",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      <div className="relative overflow-hidden rounded-sm border border-hairline">
        {current && <SkyThumb image={current} width={1600} className="aspect-[16/9] w-full" />}
        {current && (
          <div className="absolute left-6 top-6 font-mono text-[10px] uppercase tracking-[0.22em] text-white/85 mix-blend-difference">
            {current.capturedAt.toDateString()} · {fmtTime(current.capturedAt)} · {captionFor(current.capturedAt)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded-sm border border-hairline bg-secondary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink hover:bg-accent"
        >
          {playing ? "pause" : "play"}
        </button>
        <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em]">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "rounded-sm px-2.5 py-1.5 transition-colors",
                speed === s ? "bg-secondary text-ink" : "text-ink-dim hover:text-ink",
              )}
            >
              {s}×
            </button>
          ))}
        </div>
        <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          ← → frame · space play
        </div>
      </div>

      <ColorRibbon
        images={subset}
        activeIndex={idx}
        onScrub={setIdx}
        height={range === "day" ? 80 : 56}
        showTicks={range === "day"}
      />

      {palette && (
        <div className="space-y-2">
          <Swatches swatches={palette.swatches} size="md" />
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            <span>palette · click to copy</span>
            <span className="text-ink-dim">{palette.hex.toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
