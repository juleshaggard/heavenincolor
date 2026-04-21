import { useEffect, useMemo, useRef, useState } from "react";
import { useSkyImages, imagesInRange } from "@/hooks/useSkyImages";
import { useAmbientTint } from "@/hooks/useAmbientTint";
import { getPalette, type Palette } from "@/lib/palette";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { Swatches } from "@/components/sky/Swatches";
import { Filmstrip } from "@/components/sky/Filmstrip";
import { captionFor, fmtTime } from "@/lib/format";
import { cldUrl, isDemo } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 4, 16, 60] as const;

export default function Now() {
  const { images } = useSkyImages();
  const [range, setRange] = useState<"week" | "month">("week");
  const [idx, setIdx] = useState(0);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4);

  const subset = useMemo(() => {
    if (!images) return [];
    const end = images[images.length - 1]?.capturedAt ?? new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (range === "week" ? 7 : 30));
    return imagesInRange(images, start, end);
  }, [images, range]);

  // snap to latest whenever range or dataset changes
  useEffect(() => {
    setIdx(Math.max(0, subset.length - 1));
  }, [subset.length, range]);

  const current = subset[idx];
  useEffect(() => {
    if (!current) return;
    getPalette(current).then(setPalette);
  }, [current]);
  useAmbientTint(palette?.hex);

  // preload neighbours for smooth scrub
  useEffect(() => {
    for (let k = -2; k <= 4; k++) {
      const img = subset[idx + k];
      if (img && !isDemo(img)) {
        const im = new Image();
        im.src = cldUrl(img.public_id, { w: 1200 });
      }
    }
  }, [idx, subset]);

  // playback
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  useEffect(() => {
    if (!playing) return;
    const step = (t: number) => {
      if (!last.current) last.current = t;
      const ms = 1000 / (4 * speed);
      if (t - last.current >= ms) {
        last.current = t;
        setIdx((i) => {
          if (i >= subset.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
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

  if (!images || !current) {
    return (
      <div className="grid h-[70vh] place-items-center font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">
        listening to the sky…
      </div>
    );
  }

  const isLatest = idx === subset.length - 1;

  return (
    <div className="space-y-8">
      {/* === Soft horizontal hero === */}
      <section className="relative">
        {/* tiny meta strip */}
        <div className="mb-5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-ink-faint">
          <span>{isLatest ? "live · latest" : "scrubbing"}</span>
          <span>№ {String(idx + 1).padStart(4, "0")} / {subset.length}</span>
        </div>

        {/* wide cinematic frame, feathered into the paper */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "21 / 9" }}>
          {/* halo glow behind */}
          <div
            aria-hidden
            className="absolute -inset-10 -z-10 blur-3xl opacity-50"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 50%, hsl(var(--sky-h) var(--sky-s) var(--sky-l) / 0.55), transparent 70%)",
            }}
          />
          <div className="feather-mask h-full w-full">
            <SkyThumb
              image={current}
              width={1800}
              hero={isLatest}
              className="h-full w-full dream-blur"
              alt="Latest sky"
            />
          </div>
        </div>

        {/* caption beneath, airy and serif */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-faint">
              {captionFor(current.capturedAt)}
            </div>
            <h1 className="font-display italic leading-[0.95] text-ink text-[clamp(3.5rem,10vw,8rem)]">
              {fmtTime(current.capturedAt)}
            </h1>
            <div className="mt-1 font-display italic text-ink-dim text-[clamp(1rem,2vw,1.5rem)]">
              {current.capturedAt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>

          {palette && (
            <div className="min-w-[14rem] max-w-xs space-y-2">
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-ink-faint">
                <span>palette</span>
                <span className="text-ink-dim">{palette.hex.toUpperCase()}</span>
              </div>
              <Swatches swatches={palette.swatches} size="md" />
            </div>
          )}
        </div>
      </section>

      {/* === Single timeline === */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex h-9 items-center gap-2 rounded-full bg-ink px-4 font-mono text-[10px] uppercase tracking-[0.25em] text-paper hover:opacity-90"
            >
              <span className="text-sm leading-none">{playing ? "❚❚" : "▶"}</span>
              {playing ? "pause" : "play"}
            </button>
            <div className="flex items-center gap-0.5 font-mono text-[10px] uppercase tracking-[0.22em]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "rounded-full px-2 py-1 transition-colors",
                    speed === s ? "text-ink" : "text-ink-faint hover:text-ink",
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          <div className="flex overflow-hidden rounded-full border border-hairline/30">
            {(["week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors",
                  range === r ? "bg-ink text-paper" : "text-ink-dim hover:text-ink",
                )}
              >
                {r === "week" ? "7 days" : "30 days"}
              </button>
            ))}
          </div>
        </div>

        <Filmstrip
          images={subset}
          index={idx}
          onScrub={setIdx}
          thumbWidth={range === "week" ? 56 : 28}
          height={88}
        />

        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
          <span>{subset[0]?.capturedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          <span>{subset.length} frames · drag · ←/→ · space</span>
          <span>{subset[subset.length - 1]?.capturedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
      </section>
    </div>
  );
}