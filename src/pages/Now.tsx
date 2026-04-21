import { useEffect, useMemo, useRef, useState } from "react";
import { useSkyImages, imagesInRange } from "@/hooks/useSkyImages";
import { useAmbientTint } from "@/hooks/useAmbientTint";
import { getPalette, type Palette } from "@/lib/palette";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { Swatches } from "@/components/sky/Swatches";
import { ColorRibbon } from "@/components/sky/ColorRibbon";
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
    <div className="space-y-10">
      {/* === POSTER HERO === */}
      <section className="relative">
        {/* meta strip — Halo poster style */}
        <div className="mb-4 flex items-end justify-between gap-6 border-b border-hairline/30 pb-3">
          <div className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-dim">
            <span className="text-ink">№ {String(idx + 1).padStart(4, "0")}</span>
            <span className="text-ink-faint">/ {subset.length}</span>
            <span className="hidden md:inline text-ink-faint">·</span>
            <span className="hidden md:inline">{current.capturedAt.toDateString()}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-dim">
            {isLatest ? "live · latest frame" : "scrubbing"}
          </div>
        </div>

        <div className="relative grid grid-cols-12 gap-x-4">
          {/* big rose poster panel */}
          <div
            className="col-span-12 md:col-span-11 md:col-start-2 relative"
            style={{ aspectRatio: "3 / 4" }}
          >
            <div className="absolute inset-0 bg-rose" />

            {/* oval-masked hero image, slightly tilted */}
            <div className="absolute inset-[6%] overflow-hidden">
              <div className="oval-mask h-full w-full">
                <SkyThumb
                  image={current}
                  width={1600}
                  hero={isLatest}
                  className="h-full w-full"
                  alt="Latest sky"
                />
              </div>
            </div>

            {/* OVERSIZED OVERLAPPING DISPLAY TYPE */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-6 md:p-10">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/80">
                {captionFor(current.capturedAt)}
              </div>
              <h1 className="font-display italic leading-[0.82] text-ink mix-blend-multiply text-[clamp(4rem,16vw,11rem)] -mt-2">
                {fmtTime(current.capturedAt)}
              </h1>
              <div className="mt-2 font-condensed uppercase tracking-tight text-ink/90 text-[clamp(1.2rem,3vw,2rem)] leading-none">
                a sky, observed
              </div>
            </div>

            {/* corner mono date stamp */}
            <div className="absolute right-4 top-4 text-right font-mono text-[10px] uppercase tracking-[0.25em] text-ink/70">
              <div>{current.capturedAt.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}</div>
              <div>{current.capturedAt.getFullYear()}</div>
            </div>
          </div>

          {/* right rail — palette + dominant */}
          <aside className="col-span-12 md:col-span-3 md:col-start-10 mt-4 md:mt-0 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 md:max-w-[18ch] space-y-3 bg-paper/70 backdrop-blur p-3 md:p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-dim">palette</div>
            {palette && <Swatches swatches={palette.swatches} size="md" />}
            <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              <span>dominant</span>
              <span className="text-ink">{palette?.hex.toUpperCase() ?? "—"}</span>
            </div>
          </aside>
        </div>
      </section>

      {/* === SCRUBBER === */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-faint">timeline</div>
            <div className="mt-1 font-display text-3xl italic text-ink">
              the last {range === "week" ? "seven days" : "thirty days"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* week/month toggle */}
            <div className="flex overflow-hidden rounded-full border border-hairline/40">
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

            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex h-10 items-center gap-2 rounded-full bg-ink px-5 font-mono text-[10px] uppercase tracking-[0.25em] text-paper hover:opacity-90"
            >
              <span className="text-base leading-none">{playing ? "❚❚" : "▶"}</span>
              {playing ? "pause" : "play"}
            </button>

            <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 transition-colors",
                    speed === s ? "bg-secondary text-ink" : "text-ink-faint hover:text-ink",
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* filmstrip */}
        <div className="rounded-sm border border-hairline/30 bg-paper-soft p-2">
          <Filmstrip images={subset} index={idx} onScrub={setIdx} thumbWidth={range === "week" ? 64 : 36} height={104} />
        </div>

        {/* chromatic ribbon overview + ticks */}
        <div className="space-y-1.5">
          <ColorRibbon
            images={subset}
            activeIndex={idx}
            onScrub={setIdx}
            height={28}
            className="opacity-90"
          />
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            <span>{subset[0]?.capturedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            <span className="text-ink-dim">{subset.length} frames · drag · ←/→ · space</span>
            <span>{subset[subset.length - 1]?.capturedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          </div>
        </div>
      </section>
    </div>
  );
}