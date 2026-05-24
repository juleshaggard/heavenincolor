import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useSkyImages } from "@/hooks/useSkyImages";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { Swatches } from "@/components/sky/Swatches";
import { getPalette, timeOfDay, type Palette } from "@/lib/palette";
import { fmtDate, fmtTime, captionFor, nameColor } from "@/lib/format";
import type { SkyImage } from "@/lib/skyImages";
import { cn } from "@/lib/utils";
import { X, ArrowUpRight } from "lucide-react";
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

const TODS = ["All", "Dawn", "Day", "Golden", "Dusk", "Night"] as const;
const SORTS = ["Chronological", "Saturation", "Warmth", "Unusual"] as const;

export default function Archive() {
  const { images } = useSkyImages();
  const [tod, setTod] = useState<(typeof TODS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Chronological");
  const [palettes, setPalettes] = useState<Record<string, Palette>>({});
  const [open, setOpen] = useState<SkyImage | null>(null);
  // cols == zoom level. 6 = max zoom in (largest tiles). 100 = max zoom out.
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      return 48;
    }
    return 13;
  });
  const cols = Math.max(6, Math.min(100, zoom));

  // Progressive reveal: count animates up as the grid populates.
  const [revealCount, setRevealCount] = useState(0);

  // Last-10 cycling sequence for the inline headline swatch
  const recent = useMemo(() => {
    if (!images) return [];
    return images.slice(-10);
  }, [images]);
  const [seqIdx, setSeqIdx] = useState(0);
  useEffect(() => {
    if (recent.length < 2) return;
    const id = window.setInterval(() => {
      setSeqIdx((i) => (i + 1) % recent.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [recent.length]);
  const seqImg = recent[seqIdx];

  const filtered = useMemo(() => {
    if (!images) return [];
    let out = images;
    if (tod !== "All") out = out.filter((i) => timeOfDay(i.capturedAt) === tod.toLowerCase());
    if (sort === "Chronological") out = [...out].reverse();
    return out;
  }, [images, tod, sort]);

  // background-fetch palettes for visible-ish chunk
  useEffect(() => {
    let cancel = false;
    (async () => {
      for (const img of filtered.slice(0, 200)) {
        if (palettes[img.id]) continue;
        const p = await getPalette(img);
        if (cancel) return;
        setPalettes((s) => ({ ...s, [img.id]: p }));
      }
    })();
    return () => { cancel = true; };
  }, [filtered]);

  // sort post-palette
  const sorted = useMemo(() => {
    if (sort === "Chronological") return filtered;
    const score = (img: SkyImage) => {
      const p = palettes[img.id];
      if (!p) return 0;
      if (sort === "Saturation") return p.hsl[1];
      if (sort === "Warmth") {
        const h = p.hsl[0];
        return Math.cos(((h - 30) * Math.PI) / 180);
      }
      // unusual: distance from neutral grey
      return Math.abs(p.hsl[1] - 30) + Math.abs(p.hsl[2] - 50);
    };
    return [...filtered].sort((a, b) => score(b) - score(a));
  }, [filtered, sort, palettes]);

  // Animate revealCount from current value up to sorted.length when it changes.
  useEffect(() => {
    const target = sorted.length;
    if (target === 0) {
      setRevealCount(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    let from = 0;
    setRevealCount((c) => {
      from = c > target ? 0 : c;
      return from;
    });
    const duration = Math.min(2400, 700 + target * 1.4);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setRevealCount(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sorted.length]);

  const visible = useMemo(() => sorted.slice(0, revealCount), [sorted, revealCount]);

  const parentRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const COL_OVERLAP = 1;
  const ROW_OVERLAP = 2;
  const rawTileSize = containerW > 0 ? (containerW + COL_OVERLAP * (cols - 1)) / cols : 200;
  const tileSize = Math.ceil(rawTileSize);
  const rowSize = tileSize - ROW_OVERLAP;
  const rows = Math.ceil(visible.length / cols);
  // Use the page (window) scroll instead of an inner scroll container.
  const rowVirtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => rowSize,
    overscan: 4,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });
  // re-measure when cols/width changes
  useEffect(() => {
    rowVirtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSize, cols]);

  return (
    <div>
      <header className="px-[4vw] pt-[6vh] pb-[6vh] text-center">
        <BlurFollowText>
          <h1 className="font-display leading-[0.95] tracking-[-0.02em] text-[clamp(3rem,9vw,9rem)]">
            <span className="tabular-nums">{revealCount.toLocaleString()}</span>
            <span
              aria-hidden
              className="mx-5 inline-block overflow-hidden align-middle"
              style={{
                width: "0.62em",
                height: "0.62em",
                verticalAlign: "0.08em",
                borderRadius: "6px",
                transform: "translateY(2px)",
              }}
            >
              <CircleRevealSequence images={recent} index={seqIdx} />
            </span>
            <span>skies</span>
            <br />
            <span>captured over </span>
            <em className="italic">{LOCATION.name}</em>
            <br />
            <span>every 30 minutes</span>
          </h1>
        </BlurFollowText>
      </header>

      {/* Grid with comfortable side breathing room */}
      <div className="px-[4vw]">
        <div
          ref={parentRef}
          className="relative overflow-hidden rounded-[24px] bg-black"
        >
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((vr) => {
            const start = vr.index * cols;
            const slice = visible.slice(start, start + cols);
            const top = Math.round(vr.start - rowVirtualizer.options.scrollMargin);
            return (
              <div
                key={vr.key}
                style={{ position: "absolute", top, left: 0, width: "100%", height: tileSize }}
              >
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: "0px", marginRight: "-1px" }}
                >
                  {slice.map((img) => {
                    const p = palettes[img.id];
                    const vt = `sky-${img.id.replace(/[^a-z0-9_-]/gi, "_")}`;
                    return (
                      <GridTile
                        key={img.id}
                        img={img}
                        palette={p}
                        vt={vt}
                        tileSize={tileSize}
                        cols={cols}
                        isOpen={open?.id === img.id}
                        onOpen={() => openWithTransition(img, vt, setOpen)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {open && <Lightbox image={open} palette={palettes[open.id]} onClose={() => setOpen(null)} />}

      <footer className="px-[4vw] pt-[6vh] pb-[6vh] text-center">
        <BlurFollowText>
          <h2 className="font-display leading-[0.95] tracking-[-0.02em] text-[clamp(3rem,9vw,9rem)]">
            Heaven in Color
          </h2>
        </BlurFollowText>
      </footer>

      {/* Corner controls — editorial style */}
      <FilterCorner tod={tod} setTod={setTod} sort={sort} setSort={setSort} />
      <ZoomCorner zoom={zoom} setZoom={setZoom} cols={cols} />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "transition-colors",
        active ? "text-ink underline underline-offset-4" : "text-ink-faint hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function CircleRevealSequence({ images, index }: { images: SkyImage[]; index: number }) {
  // Track previous image so we can keep it underneath while the new one reveals.
  const [prev, setPrev] = useState<SkyImage | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const current = images[index];
  const lastIdxRef = useRef(index);

  useEffect(() => {
    if (lastIdxRef.current !== index) {
      setPrev(images[lastIdxRef.current] ?? null);
      setRevealKey((k) => k + 1);
      lastIdxRef.current = index;
    }
  }, [index, images]);

  if (!current) return <span className="block h-full w-full bg-secondary" />;

  return (
    <span className="relative block h-full w-full">
      {prev && (
        <span className="absolute inset-0 block">
          <SkyThumb image={prev} width={200} className="h-full w-full" />
        </span>
      )}
      <span
        key={revealKey}
        className="absolute inset-0 block animate-circle-reveal"
        style={{
          willChange: "mask-size",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, #000 45%, transparent 55%)",
          maskImage:
            "radial-gradient(circle at 50% 50%, #000 45%, transparent 55%)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      >
        <SkyThumb image={current} width={200} className="h-full w-full" />
      </span>
    </span>
  );
}

function GridTile({
  img, palette: p, vt, tileSize, cols, isOpen, onOpen,
}: {
  img: SkyImage;
  palette?: Palette;
  vt: string;
  tileSize: number;
  cols: number;
  isOpen: boolean;
  onOpen: () => void;
}) {
  const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 100 });
  const [hovered, setHovered] = useState(false);

  const handleEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    setHovered(true);
  };
  const handleLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    setHovered(false);
  };

  return (
    <button
      onClick={onOpen}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      className="group relative block overflow-hidden bg-black p-0 text-left leading-none align-top transition-shadow duration-300 ease-out hover:z-10 hover:shadow-xl"
      style={{
        height: tileSize,
        marginRight: "-1px",
        viewTransitionName: isOpen ? vt : undefined,
      }}
    >
      <SkyThumb
        image={img}
        width={Math.ceil(tileSize * (typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1))}
        className="block h-full w-full"
      />
      {p && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 transition-[clip-path,opacity] ease-out"
          style={{
            background: p.hex,
            opacity: hovered ? 1 : 0,
            clipPath: hovered
              ? `circle(160% at ${origin.x}% ${origin.y}%)`
              : `circle(0% at ${origin.x}% ${origin.y}%)`,
            transitionDuration: hovered ? "500ms" : "2000ms",
          }}
        >
          {cols <= 11 && (
            <>
              <div className="text-[12px]" style={{ color: readableInk(p.hex) }}>
                {fmtTime(img.capturedAt)}
                <span className="mx-1.5 opacity-60">·</span>
                {img.capturedAt.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
              </div>
              <div style={{ color: readableInk(p.hex) }}>
                <div className="font-display italic text-2xl leading-none">
                  {nameColor(p.hex)}
                </div>
                <div className="mt-1 text-[11px] opacity-80">
                  {p.hex.toUpperCase()}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </button>
  );
}

function FilterCorner({
  tod, setTod, sort, setSort,
}: {
  tod: (typeof TODS)[number];
  setTod: (t: (typeof TODS)[number]) => void;
  sort: (typeof SORTS)[number];
  setSort: (s: (typeof SORTS)[number]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed top-5 left-6 z-40 text-[13px]">
      {open ? (
        <div className="flex items-center gap-6 rounded-full border border-hairline bg-paper px-4 py-2 shadow-sm">
          <button onClick={() => setOpen(false)} className="font-medium text-ink underline underline-offset-4">
            Filter
          </button>
          <div className="flex items-center gap-3 text-ink-dim">
            {TODS.map((t) => (
              <Chip key={t} active={tod === t} onClick={() => setTod(t)}>{t}</Chip>
            ))}
          </div>
          <span className="text-ink-faint">·</span>
          <div className="flex items-center gap-3 text-ink-dim">
            {SORTS.map((s) => (
              <Chip key={s} active={sort === s} onClick={() => setSort(s)}>{s}</Chip>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="text-ink hover:underline underline-offset-4">
          Filter
        </button>
      )}
    </div>
  );
}

function ZoomCorner({
  zoom, setZoom, cols,
}: { zoom: number; setZoom: (n: number) => void; cols: number }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-40 flex items-center justify-center gap-3 text-[13px]">
      <span className="text-ink-dim">Zoom</span>
      <input
        type="range"
        min={6}
        max={100}
        step={1}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="pointer-events-auto h-1 w-32 cursor-ew-resize accent-ink"
        aria-label="Grid zoom"
      />
      <span className="tabular-nums text-ink-faint">{cols}×</span>
    </div>
  );
}

function BlurFollowText({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const target = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const PROX = 260;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < Math.max(r.width, r.height) / 2 + PROX) {
        target.current = {
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
        };
      } else {
        target.current = { x: 50, y: 50 };
      }
    };
    window.addEventListener("mousemove", onMove);
    let raf = 0;
    const tick = () => {
      setPos((p) => ({
        x: p.x + (target.current.x - p.x) * 0.06,
        y: p.y + (target.current.y - p.y) * 0.06,
      }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span ref={ref} className="relative inline-block">
      {/* base: light blue text */}
      <span style={{ color: "hsl(0 0% 92%)" }}>{children}</span>
      {/* yellow blur masked inside the text, trailing the cursor */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-clip-text text-transparent"
        style={{
          backgroundImage: `radial-gradient(ellipse 60% 200% at ${pos.x}% ${pos.y}%, hsl(210 60% 80%) 0%, hsl(210 55% 85%) 35%, hsl(210 60% 85% / 0) 75%)`,
        }}
      >
        {children}
      </span>
    </span>
  );
}

function Lightbox({ image, palette, onClose }: { image: SkyImage; palette?: Palette; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  const close = () => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (typeof doc.startViewTransition === "function") {
      doc.startViewTransition(() => onClose());
    } else {
      onClose();
    }
  };
  const vt = `sky-${image.id.replace(/[^a-z0-9_-]/gi, "_")}`;
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
        className="relative grid h-full w-full gap-0 grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[1fr_3fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto border-b border-hairline bg-paper p-8 text-[13px] md:border-b-0 md:border-r">
          <div>
            <div className="text-ink-dim">Date</div>
            <div className="font-display text-3xl leading-tight text-ink">{fmtDate(image.capturedAt)}</div>
          </div>
          <div className="flex justify-between text-ink-dim">
            <span>{fmtTime(image.capturedAt)}</span>
            <span>{captionFor(image.capturedAt)}</span>
          </div>
          {palette && (
            <div className="space-y-3">
              <Swatches swatches={palette.swatches} size="lg" />
              <div className="space-y-1">
                {palette.swatches.map((c) => (
                  <button
                    key={c}
                    onClick={() => navigator.clipboard?.writeText(c)}
                    className="flex w-full items-center justify-between rounded-sm px-1 py-1 text-[13px] text-ink-dim hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                      {c.toUpperCase()}
                    </span>
                    <span className="text-ink-faint">Copy</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <a
            href={image.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper transition-colors hover:bg-ink-dim"
          >
            Open hosted image
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </a>
        </aside>
        <div className="relative h-full w-full overflow-hidden bg-background">
          <div className="absolute inset-0" style={{ viewTransitionName: vt }}>
            <SkyThumb image={image} width={320} className="h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
