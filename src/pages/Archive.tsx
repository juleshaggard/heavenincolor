import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useSkyImages } from "@/hooks/useSkyImages";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { Swatches } from "@/components/sky/Swatches";
import { getPalette, timeOfDay, type Palette } from "@/lib/palette";
import { fmtDate, fmtTime, captionFor, nameColor } from "@/lib/format";
import { cldUrl, isDemo, type SkyImage } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { LOCATION } from "@/hooks/useWeather";

// View Transitions API (Chromium). Falls back gracefully.
function openWithTransition(
  img: SkyImage,
  _vt: string,
  setOpen: (i: SkyImage) => void,
) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => setOpen(img));
  } else {
    setOpen(img);
  }
}

// Pick black or white text for max contrast against a hex bg.
function readableInk(hex: string): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return "#000";
  const [r, g, b] = m.map((h) => parseInt(h, 16));
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#0a0a0a" : "#ffffff";
}

const TODS = ["all", "dawn", "day", "golden", "dusk", "night"] as const;
const SORTS = ["chronological", "saturation", "warmth", "unusual"] as const;

export default function Archive() {
  const { images } = useSkyImages();
  const [tod, setTod] = useState<(typeof TODS)[number]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("chronological");
  const [palettes, setPalettes] = useState<Record<string, Palette>>({});
  const [open, setOpen] = useState<SkyImage | null>(null);
  // 2 (zoomed out) ↔ 10 (zoomed in)
  const [zoom, setZoom] = useState(6);
  const cols = Math.max(2, Math.min(10, 12 - zoom));

  const filtered = useMemo(() => {
    if (!images) return [];
    let out = images;
    if (tod !== "all") out = out.filter((i) => timeOfDay(i.capturedAt) === tod);
    if (sort === "chronological") out = [...out].reverse();
    return out;
  }, [images, tod, sort]);

  // background-fetch palettes for visible-ish chunk
  useEffect(() => {
    let cancel = false;
    (async () => {
      for (const img of filtered.slice(0, 200)) {
        if (palettes[img.public_id]) continue;
        const p = await getPalette(img);
        if (cancel) return;
        setPalettes((s) => ({ ...s, [img.public_id]: p }));
      }
    })();
    return () => { cancel = true; };
  }, [filtered]);

  // sort post-palette
  const sorted = useMemo(() => {
    if (sort === "chronological") return filtered;
    const score = (img: SkyImage) => {
      const p = palettes[img.public_id];
      if (!p) return 0;
      if (sort === "saturation") return p.hsl[1];
      if (sort === "warmth") {
        const h = p.hsl[0];
        return Math.cos(((h - 30) * Math.PI) / 180);
      }
      // unusual: distance from neutral grey
      return Math.abs(p.hsl[1] - 30) + Math.abs(p.hsl[2] - 50);
    };
    return [...filtered].sort((a, b) => score(b) - score(a));
  }, [filtered, sort, palettes]);

  const parentRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tileSize = containerW > 0 ? containerW / cols : 200;
  const rows = Math.ceil(sorted.length / cols);
  // Use the page (window) scroll instead of an inner scroll container.
  const rowVirtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => tileSize,
    overscan: 4,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });
  // re-measure when cols/width changes
  useEffect(() => {
    rowVirtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileSize, cols]);

  return (
    <div className="space-y-8 pb-32">
      <header className="border-b border-hairline pb-8">
        <h1 className="font-display text-4xl leading-tight text-ink md:text-6xl">
          {sorted.length.toLocaleString()} skies captured over {LOCATION.name}, every 30 minutes.
        </h1>
      </header>

      {/* Grid with comfortable side breathing room */}
      <div
        ref={parentRef}
        className="relative"
      >
        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((vr) => {
            const start = vr.index * cols;
            const slice = sorted.slice(start, start + cols);
            const top = vr.start - rowVirtualizer.options.scrollMargin;
            return (
              <div
                key={vr.key}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${top}px)`, height: vr.size }}
              >
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {slice.map((img) => {
                    const p = palettes[img.public_id];
                    const vt = `sky-${img.public_id.replace(/[^a-z0-9_-]/gi, "_")}`;
                    return (
                      <button
                        key={img.public_id}
                        onClick={() => openWithTransition(img, vt, setOpen)}
                        className="group relative block overflow-hidden bg-background p-0 text-left leading-none align-top"
                        style={{
                          height: tileSize,
                          viewTransitionName: open?.public_id === img.public_id ? vt : undefined,
                        }}
                      >
                        <SkyThumb image={img} width={400} className="block h-full w-full" />
                        {p && (
                          <div
                            className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            style={{ background: p.hex }}
                          >
                            <div
                              className="font-mono text-[10px] uppercase tracking-[0.22em]"
                              style={{ color: readableInk(p.hex) }}
                            >
                              {fmtTime(img.capturedAt)}
                              <span className="mx-1.5 opacity-60">·</span>
                              {img.capturedAt.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                            </div>
                            <div style={{ color: readableInk(p.hex) }}>
                              <div className="font-display italic text-2xl leading-none">
                                {nameColor(p.hex)}
                              </div>
                              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] opacity-80">
                                {p.hex.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {open && <Lightbox image={open} palette={palettes[open.public_id]} onClose={() => setOpen(null)} />}

      {/* Fixed bottom controls */}
      <section className="fixed bottom-0 left-0 right-0 z-40 border-t border-hairline bg-paper">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em]">
          <div className="flex flex-wrap items-center gap-2">
            <Group>
              {TODS.map((t) => (
                <Chip key={t} active={tod === t} onClick={() => setTod(t)}>{t}</Chip>
              ))}
            </Group>
            <Group>
              {SORTS.map((s) => (
                <Chip key={s} active={sort === s} onClick={() => setSort(s)}>{s}</Chip>
              ))}
            </Group>
          </div>
          <div className="flex items-center gap-2 border border-hairline px-3 py-1.5">
            <span className="text-ink-faint">zoom</span>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1 w-28 cursor-ew-resize accent-ink"
              aria-label="Grid zoom"
            />
            <span className="tabular-nums text-ink-dim">{cols}×</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center border border-hairline">{children}</div>;
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 transition-colors border-r border-hairline last:border-r-0",
        active ? "bg-ink text-paper" : "text-ink-dim hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Lightbox({ image, palette, onClose }: { image: SkyImage; palette?: Palette; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const close = () => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (typeof doc.startViewTransition === "function") {
      doc.startViewTransition(() => onClose());
    } else {
      onClose();
    }
  };
  const vt = `sky-${image.public_id.replace(/[^a-z0-9_-]/gi, "_")}`;
  return (
    <div
      className="fixed inset-0 z-[60] flex h-screen w-screen items-stretch bg-background/98 backdrop-blur-md animate-fade-in"
      onClick={close}
    >
      {/* close button — fixed top-right, above everything */}
      <button
        onClick={(e) => { e.stopPropagation(); close(); }}
        aria-label="Close"
        className="fixed right-5 top-5 z-[70] grid h-11 w-11 place-items-center rounded-full bg-paper/90 text-ink shadow-neu backdrop-blur-md transition-all hover:scale-105 hover:bg-paper active:shadow-neu-pressed"
      >
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <div
        className="relative grid h-full w-full gap-0 md:grid-cols-[3fr_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-full w-full overflow-hidden bg-background">
          <div className="absolute inset-0" style={{ viewTransitionName: vt }}>
            <SkyThumb image={image} width={1800} className="h-full w-full" />
          </div>
        </div>
        <aside className="flex h-full flex-col gap-4 overflow-y-auto border-l border-hairline bg-paper p-6 font-mono text-[11px]">
          <div>
            <div className="text-ink-faint uppercase tracking-[0.22em]">date</div>
            <div className="font-display text-2xl text-ink">{fmtDate(image.capturedAt)}</div>
          </div>
          <div className="flex justify-between text-ink-dim">
            <span>{fmtTime(image.capturedAt)}</span>
            <span>{captionFor(image.capturedAt)}</span>
          </div>
          {palette && (
            <div className="space-y-2">
              <Swatches swatches={palette.swatches} size="lg" />
              <div className="space-y-1 text-ink-dim">
                {palette.swatches.map((c) => (
                  <button
                    key={c}
                    onClick={() => navigator.clipboard?.writeText(c)}
                    className="flex w-full items-center justify-between rounded-sm px-1 py-0.5 text-[10px] uppercase tracking-[0.2em] hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-sm" style={{ background: c }} />
                      {c.toUpperCase()}
                    </span>
                    <span className="text-ink-faint">copy</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isDemo(image) && (
            <a
              href={cldUrl(image.public_id, { w: 2400 })}
              target="_blank"
              rel="noreferrer"
              className="block rounded-sm border border-hairline bg-secondary px-3 py-2 text-center text-[10px] uppercase tracking-[0.22em] text-ink hover:bg-accent"
            >
              open original ↗
            </a>
          )}
          <div className="mt-auto pt-4 text-center text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            press esc or click ✕ to close
          </div>
        </aside>
      </div>
    </div>
  );
}