import { useEffect, useMemo, useRef, useState } from "react";
import { useSkyImages, imagesInRange } from "@/hooks/useSkyImages";
import { useAmbientTint } from "@/hooks/useAmbientTint";
import { getPalette, type Palette } from "@/lib/palette";
import { SkyThumb } from "@/components/sky/SkyThumb";
import skyOriginal from "@/assets/sky-original.jpg";
import { Swatches } from "@/components/sky/Swatches";
import { ColorRibbon } from "@/components/sky/ColorRibbon";
import { TiltPill } from "@/components/sky/TiltPill";
import { captionFor, fmtTime } from "@/lib/format";
import { cldUrl, isDemo } from "@/lib/cloudinary";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { cn } from "@/lib/utils";
import { Widgets } from "@/components/sky/Widgets";

const SPEEDS = [1, 4, 16, 60] as const;

export default function Now() {
  const { images } = useSkyImages();
  const [range, setRange] = useState<"today" | "week" | "month">("week");
  const [idx, setIdx] = useState(0);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4);
  const [showOriginal, setShowOriginal] = useState(false);
  const { mode, setMode, hour12 } = useTimeFormat();

  const subset = useMemo(() => {
    if (!images) return [];
    const end = images[images.length - 1]?.capturedAt ?? new Date();
    const start = new Date(end);
    if (range === "today") {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - (range === "week" ? 7 : 30));
    }
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
        {/* pill-shaped cinematic frame with Apple TV-style tilt + glare */}
        <TiltPill aspectRatio="21 / 9">
          {/* halo glow behind */}
          <div
            aria-hidden
            className="absolute -inset-10 -z-10 blur-3xl opacity-50"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 50%, hsl(var(--sky-h) var(--sky-s) var(--sky-l) / 0.55), transparent 70%)",
            }}
          />
          {showOriginal ? (
            <img
              src={cldUrl(current.public_id, { w: 1800 })}
              alt="Original sky photograph"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <SkyThumb
              image={current}
              width={1800}
              className="absolute inset-0 h-full w-full"
              alt="Latest sky"
              flatColor={palette?.hex}
            />
          )}

          {/* date info inside the pill */}
          <div className="absolute inset-0 flex items-center justify-between px-[6%] md:px-[8%] text-paper">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-80">
                {captionFor(current.capturedAt, palette?.hex)}
              </div>
              <h1 className="font-display italic leading-[0.9] text-[clamp(3rem,11vw,9rem)] drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
                {fmtTime(current.capturedAt, hour12)}
              </h1>
              <div className="mt-1 font-display italic text-[clamp(0.9rem,1.6vw,1.25rem)] opacity-90">
                {current.capturedAt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </div>
            </div>
            <div className="hidden sm:block text-right font-mono text-[10px] uppercase tracking-[0.3em] opacity-80">
              <div>{current.capturedAt.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}</div>
              <div>{current.capturedAt.getFullYear()}</div>
            </div>
          </div>
        </TiltPill>

        {/* original-photo toggle */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowOriginal((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-full px-5 py-2 font-mono text-[10px] uppercase tracking-[0.25em] transition-all",
              showOriginal
                ? "bg-ink text-paper shadow-neu-pressed"
                : "bg-paper text-ink-dim shadow-neu-sm hover:text-ink active:shadow-neu-pressed",
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: showOriginal ? "currentColor" : "hsl(var(--ink-faint))" }} />
            {showOriginal ? "showing original photo" : "show original photo"}
          </button>
        </div>

        {/* centered palette */}
        {palette && (
          <div className="mt-8 mx-auto max-w-md space-y-3 rounded-2xl bg-paper p-4 shadow-neu">
            <div className="flex items-baseline justify-between px-1 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-faint">
              <span>palette</span>
              <span className="text-ink-dim">{palette.hex.toUpperCase()}</span>
            </div>
            <Swatches swatches={palette.swatches} size="md" />
            <div className="px-1 font-mono text-[9px] uppercase tracking-[0.25em] text-ink-faint">
              click a swatch to copy
            </div>
          </div>
        )}
      </section>

      {/* === Single timeline === */}
      <section className="space-y-4 rounded-2xl bg-paper p-5 shadow-neu">
        {/* 3-col grid keeps the range pill perfectly centered */}
        <div className="grid grid-cols-3 items-center gap-3">
          <div className="flex items-center gap-2 justify-self-start">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex h-9 items-center gap-2 rounded-full bg-paper px-4 font-mono text-[10px] uppercase tracking-[0.25em] text-ink shadow-neu-sm transition-all active:shadow-neu-pressed"
            >
              <span className="text-sm leading-none">{playing ? "❚❚" : "▶"}</span>
              {playing ? "pause" : "play"}
            </button>
            <div className="flex items-center gap-0.5 rounded-full bg-paper px-1 py-0.5 shadow-neu-inset font-mono text-[10px] uppercase tracking-[0.22em]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "rounded-full px-2 py-1 transition-colors",
                    speed === s ? "bg-ink text-paper" : "text-ink-faint hover:text-ink",
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-self-center rounded-full bg-paper p-1 shadow-neu-inset">
            {(["today", "week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-all",
                  range === r ? "bg-ink text-paper shadow-sm" : "text-ink-dim hover:text-ink",
                )}
              >
                {r === "today" ? "today" : r === "week" ? "7 days" : "30 days"}
              </button>
            ))}
          </div>

          <div className="flex justify-self-end rounded-full bg-paper p-1 shadow-neu-inset">
            {(["12", "24"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-all",
                  mode === m ? "bg-ink text-paper" : "text-ink-dim hover:text-ink",
                )}
              >
                {m === "12" ? "12h" : "24h"}
              </button>
            ))}
          </div>
        </div>

        <ColorRibbon
          images={subset}
          activeIndex={idx}
          onScrub={setIdx}
          height={32}
          showTicks={range === "week"}
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