import { useEffect, useMemo, useRef, useState } from "react";
import { useSkyImages, imagesInRange } from "@/hooks/useSkyImages";
import { useAmbientTint } from "@/hooks/useAmbientTint";
import { getPalette, type Palette } from "@/lib/palette";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { TiltPill } from "@/components/sky/TiltPill";
import { captionFor, fmtTime } from "@/lib/format";
import { cldUrl, isDemo } from "@/lib/cloudinary";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { cn } from "@/lib/utils";
const PILL_HEIGHT_FULL = 384; // px, hero (80% of 480)
const PILL_HEIGHT_SHRUNK = 74; // px, sticky bar (80% of 92)

export default function Now() {
  const { images } = useSkyImages();
  const [range, setRange] = useState<"today" | "week" | "month">("week");
  const [idx, setIdx] = useState(0);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const { hour12 } = useTimeFormat();
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
  const handlePlayToggle = () => {
    setPlaying((p) => {
      const next = !p;
      if (next && idx >= subset.length - 1) {
        setIdx(0);
      }
      return next;
    });
  };
  useEffect(() => {
    if (!playing) return;
    const step = (t: number) => {
      if (!last.current) last.current = t;
      const ms = 1000 / 8; // fixed, simple playback
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
  }, [playing, subset.length]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); handlePlayToggle(); }
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
    <div className="pb-40">
      {/* === Sticky shrinking hero === */}
      <section
        className={cn(
          "sticky z-30 transition-all duration-500 ease-out",
          // sit just under the h-14 nav so it never overlaps
          "top-[4.5rem]",
          shrunk
            ? "mx-auto max-w-2xl"
            : "mx-auto max-w-5xl flex min-h-[calc(100vh-4.5rem-8rem)] flex-col items-center justify-center",
        )}
      >
        <div className={cn("relative w-full transition-all duration-500", shrunk ? "" : "mx-auto")} style={!shrunk ? { width: "70%" } : undefined}>
        {/* Type laid out around the rectangle */}
        {!shrunk && (
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="text-[13px] text-ink-dim">
              {captionFor(current.capturedAt, palette?.hex)}
            </div>
            <h1 className="font-display italic leading-[0.9] text-[clamp(3rem,9vw,7rem)] text-ink">
              {fmtTime(current.capturedAt, hour12)}
            </h1>
            <div className="text-[13px] text-ink-dim">
              {current.capturedAt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        )}
        <TiltPill height={shrunk ? PILL_HEIGHT_SHRUNK : PILL_HEIGHT_FULL}>
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
          {shrunk && (
            <div className="absolute inset-0 flex items-center justify-between px-6 text-paper">
              <div className="font-display italic text-2xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
                {fmtTime(current.capturedAt, hour12)}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-80">
                {current.capturedAt.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
              </div>
            </div>
          )}
        </TiltPill>
        </div>

        {/* show-original toggle */}
        <div className={cn("mt-6 flex justify-center transition-all", shrunk && "hidden")}>
          <button
            onClick={() => setShowOriginal((v) => !v)}
            className="text-[13px] text-ink-dim underline-offset-4 hover:text-ink hover:underline"
          >
            {showOriginal ? "Show overall color" : "Show original photo"}
          </button>
        </div>
      </section>

      {/* === Simplified bottom timeline === */}
      <section className="fixed bottom-0 left-0 right-0 z-40 bg-paper">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-4 text-[13px]">
          {/* play */}
          <button
            onClick={handlePlayToggle}
            aria-label={playing ? "Pause" : "Play"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-paper transition-colors hover:bg-ink-dim"
          >
            <span className="text-[11px] leading-none">{playing ? "❚❚" : "▶"}</span>
          </button>

          {/* slim slider */}
          <input
            type="range"
            min={0}
            max={Math.max(0, subset.length - 1)}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            className="h-1 flex-1 cursor-ew-resize accent-ink"
            aria-label="Scrub timeline"
          />

          {/* range segmented (text only, no chrome) */}
          <div className="flex items-center gap-5">
            {(["today", "week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "transition-colors",
                  range === r ? "text-ink underline underline-offset-4" : "text-ink-dim hover:text-ink",
                )}
              >
                {r === "today" ? "Today" : r === "week" ? "7d" : "30d"}
              </button>
            ))}
          </div>

          {/* counter */}
          <div className="hidden shrink-0 tabular-nums text-ink-dim sm:block">
            <span className="text-ink">{String(idx + 1).padStart(3, "0")}</span>
            <span> / {String(subset.length).padStart(3, "0")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}