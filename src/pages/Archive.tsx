import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useSkyImages } from "@/hooks/useSkyImages";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { Swatches } from "@/components/sky/Swatches";
import { getPalette, type Palette } from "@/lib/palette";
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

const ARCHIVE_TIME_ZONE = "America/Los_Angeles";
const ARCHIVE_MIN_DAY_KEY = "2026-04-25";
const ARCHIVE_EMPTY_BACKGROUND = "#e7e7e7";
const ARCHIVE_DATE_GRID_CLASS =
  "grid grid-cols-[2.35rem_minmax(0,1fr)_2.35rem] gap-x-1 sm:grid-cols-[minmax(3rem,4.75rem)_minmax(0,1fr)_minmax(3rem,4.75rem)] sm:gap-x-3";
const DAY_SLOT_COUNT = 48;
const DAY_START_MINUTE = 4 * 60 + 30;
const NIGHT_START_MINUTE = 21 * 60 + 30;

type ArchiveParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type ArchiveDayRow = {
  key: string;
  label: string;
  sortKey: number;
  slots: Array<SkyImage | null>;
  images: SkyImage[];
};

const archivePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ARCHIVE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getArchiveParts(date: Date): ArchiveParts {
  const parts = Object.fromEntries(
    archivePartsFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function archiveDayKey(parts: ArchiveParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function archiveDayLabel(parts: ArchiveParts): string {
  return `${String(parts.month).padStart(2, "0")}/${String(parts.day).padStart(2, "0")}/${String(parts.year).slice(-2)}`;
}

function archiveSortKey(parts: ArchiveParts): number {
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

function archiveSlotIndex(parts: ArchiveParts): number {
  return Math.max(0, Math.min(DAY_SLOT_COUNT - 1, parts.hour * 2 + (parts.minute >= 30 ? 1 : 0)));
}

function archiveSlotStartMinute(slot: number): number {
  return Math.floor(slot / 2) * 60 + (slot % 2) * 30;
}

function archiveSlotMinute(parts: ArchiveParts): number {
  return parts.hour * 60 + parts.minute;
}

function archiveDayKeyForDate(date: Date): string {
  return archiveDayKey(getArchiveParts(date));
}

function archiveIsNight(date: Date): boolean {
  const parts = getArchiveParts(date);
  const minute = archiveSlotMinute(parts);
  return minute < DAY_START_MINUTE || minute >= NIGHT_START_MINUTE;
}

function visibleArchiveSlots(includeNight: boolean): number[] {
  return Array.from({ length: DAY_SLOT_COUNT }, (_, slot) => slot).filter((slot) => {
    if (includeNight) return true;
    const minute = archiveSlotStartMinute(slot);
    return minute >= DAY_START_MINUTE && minute < NIGHT_START_MINUTE;
  });
}

function fillInteriorDaySlots(slots: Array<SkyImage | null>): Array<SkyImage | null> {
  const filled = [...slots];
  const first = filled.findIndex(Boolean);
  if (first < 0) return filled;
  const last = filled.length - 1 - [...filled].reverse().findIndex(Boolean);

  for (let index = first; index <= last; index++) {
    if (filled[index]) continue;
    let previous = index - 1;
    while (previous >= first && !filled[previous]) previous--;
    let next = index + 1;
    while (next <= last && !filled[next]) next++;

    const previousImage = previous >= first ? filled[previous] : null;
    const nextImage = next <= last ? filled[next] : null;
    if (previousImage && nextImage) {
      filled[index] = index - previous <= next - index ? previousImage : nextImage;
    } else {
      filled[index] = previousImage ?? nextImage;
    }
  }

  return filled;
}

function orderImagesByArchiveRows(images: SkyImage[]): SkyImage[] {
  return [...images].sort((a, b) => {
    const aParts = getArchiveParts(a.capturedAt);
    const bParts = getArchiveParts(b.capturedAt);
    const dayDelta = archiveSortKey(bParts) - archiveSortKey(aParts);
    if (dayDelta !== 0) return dayDelta;
    return archiveSlotMinute(aParts) - archiveSlotMinute(bParts);
  });
}

function buildArchiveDayRows(images: SkyImage[], slotIndexes: number[]): ArchiveDayRow[] {
  const rows = new Map<string, ArchiveDayRow>();
  const visibleSlotByArchiveSlot = new Map(slotIndexes.map((slot, index) => [slot, index]));

  for (const img of images) {
    const parts = getArchiveParts(img.capturedAt);
    const key = archiveDayKey(parts);
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        label: archiveDayLabel(parts),
        sortKey: archiveSortKey(parts),
        slots: Array.from({ length: slotIndexes.length }, () => null),
        images: [],
      };
      rows.set(key, row);
    }

    const archiveSlot = archiveSlotIndex(parts);
    const slot = visibleSlotByArchiveSlot.get(archiveSlot);
    if (slot === undefined) continue;

    const existing = row.slots[slot];
    if (!existing) {
      row.slots[slot] = img;
    } else {
      const slotStart = archiveSlotStartMinute(archiveSlot);
      const existingDistance = Math.abs(archiveSlotMinute(getArchiveParts(existing.capturedAt)) - slotStart);
      const nextDistance = Math.abs(archiveSlotMinute(parts) - slotStart);
      if (nextDistance <= existingDistance) row.slots[slot] = img;
    }
    row.images.push(img);
  }

  return [...rows.values()]
    .map((row) => ({ ...row, slots: fillInteriorDaySlots(row.slots) }))
    .sort((a, b) => b.sortKey - a.sortKey);
}

export default function Archive() {
  const { images } = useSkyImages();
  const [includeNight, setIncludeNight] = useState(false);
  const [palettes, setPalettes] = useState<Record<string, Palette>>({});
  const palettesRef = useRef<Record<string, Palette>>({});
  const [open, setOpen] = useState<SkyImage | null>(null);

  useEffect(() => {
    palettesRef.current = palettes;
  }, [palettes]);

  // Progressive reveal: count animates up as the grid populates.
  const [revealCount, setRevealCount] = useState(0);

  const filtered = useMemo(() => {
    if (!images) return [];
    let out = images;
    out = out.filter((i) => archiveDayKeyForDate(i.capturedAt) >= ARCHIVE_MIN_DAY_KEY);
    if (!includeNight) out = out.filter((i) => !archiveIsNight(i.capturedAt));
    return out;
  }, [images, includeNight]);

  // Last-10 cycling sequence for the inline headline swatch
  const recent = useMemo(() => filtered.slice(-10), [filtered]);
  const [seqIdx, setSeqIdx] = useState(0);
  useEffect(() => {
    if (recent.length < 2) return;
    const id = window.setInterval(() => {
      setSeqIdx((i) => (i + 1) % recent.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [recent.length]);

  const ordered = useMemo(() => orderImagesByArchiveRows(filtered), [filtered]);

  // background-fetch palettes for visible-ish chunk
  useEffect(() => {
    let cancel = false;
    (async () => {
      for (const img of ordered.slice(0, 200)) {
        if (palettesRef.current[img.id]) continue;
        const p = await getPalette(img);
        if (cancel) return;
        setPalettes((s) => {
          const next = { ...s, [img.id]: p };
          palettesRef.current = next;
          return next;
        });
      }
    })();
    return () => { cancel = true; };
  }, [ordered]);

  // Animate revealCount from current value up to ordered.length when it changes.
  useEffect(() => {
    const target = ordered.length;
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
  }, [ordered.length]);

  const visible = useMemo(() => ordered.slice(0, revealCount), [ordered, revealCount]);
  const slotIndexes = useMemo(() => visibleArchiveSlots(includeNight), [includeNight]);
  const slotCount = slotIndexes.length;
  const dayRows = useMemo(() => buildArchiveDayRows(visible, slotIndexes), [visible, slotIndexes]);

  const parentRef = useRef<HTMLDivElement>(null);
  const timelineMeasureRef = useRef<HTMLDivElement>(null);
  const [timelineW, setTimelineW] = useState(0);
  useEffect(() => {
    const el = timelineMeasureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setTimelineW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const COL_OVERLAP = 1;
  const rawTileSize = timelineW > 0 ? (timelineW + COL_OVERLAP * (slotCount - 1)) / slotCount : 28;
  const tileSize = Math.max(6, Math.ceil(rawTileSize));
  const rowSize = tileSize;
  // Use the page (window) scroll instead of an inner scroll container.
  const rowVirtualizer = useWindowVirtualizer({
    count: dayRows.length,
    estimateSize: () => rowSize,
    overscan: 4,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });
  // Re-measure when the fixed day strips change size.
  useEffect(() => {
    rowVirtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSize, dayRows.length]);
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalRowsSize = rowVirtualizer.getTotalSize();

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

      {/* Daily archive matrix */}
      <div className="px-0 sm:px-[4vw]">
        <div ref={parentRef} className="relative">
          <div className={ARCHIVE_DATE_GRID_CLASS}>
            <div style={{ height: totalRowsSize }} />
            <div
              ref={timelineMeasureRef}
              className="relative overflow-hidden rounded-[24px]"
              style={{ height: totalRowsSize, background: ARCHIVE_EMPTY_BACKGROUND }}
            >
              {virtualRows.map((vr) => {
                const row = dayRows[vr.index];
                if (!row) return null;
                const top = Math.round(vr.start - rowVirtualizer.options.scrollMargin);
                return (
                  <TimelineStrip
                    key={vr.key}
                    row={row}
                    palettes={palettes}
                    openId={open?.id}
                    tileSize={tileSize}
                    slotCount={slotCount}
                    onOpen={(img, vt) => openWithTransition(img, vt, setOpen)}
                    style={{ position: "absolute", top, left: 0, width: "100%", height: tileSize }}
                  />
                );
              })}
            </div>
            <div style={{ height: totalRowsSize }} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: totalRowsSize }}>
            {virtualRows.map((vr) => {
              const row = dayRows[vr.index];
              if (!row) return null;
              const top = Math.round(vr.start - rowVirtualizer.options.scrollMargin);
              return (
                <DayLabelStrip
                  key={`label-${vr.key}`}
                  row={row}
                  style={{ position: "absolute", top, left: 0, width: "100%", height: tileSize }}
                />
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
      <NightToggle includeNight={includeNight} setIncludeNight={setIncludeNight} />
    </div>
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

function TimelineStrip({
  row,
  palettes,
  openId,
  tileSize,
  slotCount,
  onOpen,
  style,
}: {
  row: ArchiveDayRow;
  palettes: Record<string, Palette>;
  openId?: string;
  tileSize: number;
  slotCount: number;
  onOpen: (img: SkyImage, vt: string) => void;
  style: React.CSSProperties;
}) {
  return (
    <div
      data-archive-day-row={row.key}
      className="grid"
      style={{
        ...style,
        gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))`,
        gap: "0px",
        marginRight: "-1px",
      }}
      aria-label={row.label}
    >
      {row.slots.map((img, slot) => {
        if (!img) {
          return (
            <span
              key={`${row.key}-${slot}`}
              aria-hidden
              className="block"
              style={{ height: tileSize, marginRight: "-1px" }}
            />
          );
        }
        const p = palettes[img.id];
        const vt = `sky-${img.id.replace(/[^a-z0-9_-]/gi, "_")}`;
        return (
          <GridTile
            key={`${row.key}-${slot}-${img.id}`}
            img={img}
            palette={p}
            vt={vt}
            tileSize={tileSize}
            cols={slotCount}
            isOpen={openId === img.id}
            onOpen={() => onOpen(img, vt)}
          />
        );
      })}
    </div>
  );
}

function DayLabelStrip({ row, style }: { row: ArchiveDayRow; style: React.CSSProperties }) {
  return (
    <div
      className={ARCHIVE_DATE_GRID_CLASS}
      style={style}
      aria-hidden
    >
      <DayLabel row={row} side="left" />
      <div />
      <DayLabel row={row} side="right" />
    </div>
  );
}

function DayLabel({ row, side }: { row: ArchiveDayRow; side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-center overflow-hidden font-mono text-[7px] leading-none text-ink-faint tabular-nums sm:text-[9px]",
        side === "left" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <span data-archive-day-label className="max-w-full truncate">{row.label}</span>
    </div>
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
      aria-label={`${fmtDate(img.capturedAt)} ${fmtTime(img.capturedAt)}`}
      className="group relative block overflow-hidden p-0 text-left leading-none align-top transition-shadow duration-300 ease-out hover:z-10 hover:shadow-xl"
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

function NightToggle({
  includeNight,
  setIncludeNight,
}: {
  includeNight: boolean;
  setIncludeNight: (value: boolean) => void;
}) {
  return (
    <div className="pointer-events-none fixed left-4 right-4 top-5 z-50 text-[12px] sm:left-6 sm:right-auto sm:text-[13px]">
      <button
        type="button"
        aria-label={includeNight ? "Night on" : "Night off"}
        aria-pressed={includeNight}
        onClick={() => setIncludeNight(!includeNight)}
        className={cn(
          "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-transparent px-1 py-1 text-ink transition-colors",
          includeNight ? "text-ink" : "text-ink-faint hover:text-ink",
        )}
      >
        <span>{includeNight ? "Night on" : "Night off"}</span>
        <span
          aria-hidden
          className={cn(
            "relative h-4 w-7 rounded-full border transition-colors",
            includeNight ? "border-ink/35 bg-ink" : "border-hairline bg-paper",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-transform",
              includeNight ? "translate-x-[0.875rem] bg-paper" : "translate-x-0.5 bg-ink-faint",
            )}
          />
        </span>
      </button>
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
