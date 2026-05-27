import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useSkyImages } from "@/hooks/useSkyImages";
import { useArchiveViewMode } from "@/components/sky/ArchiveViewMode";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { getManifestPalette, getPalette, type Palette } from "@/lib/palette";
import { fmtDate, fmtTime, nameColor } from "@/lib/format";
import { curveSwipePath } from "@/lib/modalMotion";
import type { SkyImage } from "@/lib/skyImages";
import { cn } from "@/lib/utils";
import { X, Check, Copy } from "lucide-react";
import { LOCATION } from "@/hooks/useWeather";

gsap.registerPlugin(useGSAP);

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

const FALLBACK_IMMERSION_COLORS = ["#202734", "#536577", "#8ea1b1", "#d7d6cc", "#f1ebe0"];
const MESH_POINTS = [
  { x: 16, y: 20 },
  { x: 81, y: 17 },
  { x: 66, y: 51 },
  { x: 21, y: 78 },
  { x: 84, y: 77 },
];

function normalizeHex(color?: string): string | null {
  const clean = color?.replace("#", "").trim();
  if (!clean || !/^[0-9a-f]{6}$/i.test(clean)) return null;
  return `#${clean.toLowerCase()}`;
}

function hexWithAlpha(color: string, alpha: number): string {
  const clean = (normalizeHex(color) ?? "#000000").slice(1);
  const value = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, "0");
  return `#${clean}${value}`;
}

function hexLuminance(color: string): number {
  const clean = normalizeHex(color);
  if (!clean) return -1;
  const [r, g, b] = clean
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => parseInt(channel, 16));
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function secondBrightestPaletteColor(palette: Palette): string {
  const colors = [...palette.swatches, palette.hex]
    .flatMap((color) => {
      const normalized = normalizeHex(color);
      return normalized ? [normalized] : [];
    })
    .sort((a, b) => hexLuminance(b) - hexLuminance(a));
  return colors[1] ?? colors[0] ?? palette.hex;
}

function immersionColorsFor(image: SkyImage, palette?: Palette): string[] {
  const seen = new Set<string>();
  const manifestSwatches = palette?.swatches ?? [];
  const raw = manifestSwatches.length >= 5
    ? manifestSwatches
    : [...manifestSwatches, palette?.hex, image.cropAverageHex, image.averageHex];
  const colors = raw.flatMap((color) => {
    const normalized = normalizeHex(color);
    if (!normalized || seen.has(normalized)) return [];
    seen.add(normalized);
    return [normalized];
  });
  return colors.length ? colors.slice(0, 5) : FALLBACK_IMMERSION_COLORS;
}

function meshColorsFor(colors: string[]): string[] {
  const source = colors.length ? colors : FALLBACK_IMMERSION_COLORS;
  return MESH_POINTS.map((_, index) => source[index % source.length]);
}

function meshGradientFor(colors: string[]): string {
  const [a, b, c, d, e] = meshColorsFor(colors);
  return [
    `radial-gradient(circle at 16% 20%, ${hexWithAlpha(a, 0.96)} 0%, ${hexWithAlpha(a, 0.74)} 15%, transparent 40%)`,
    `radial-gradient(circle at 81% 17%, ${hexWithAlpha(b, 0.92)} 0%, ${hexWithAlpha(b, 0.7)} 14%, transparent 39%)`,
    `radial-gradient(circle at 66% 51%, ${hexWithAlpha(c, 0.96)} 0%, ${hexWithAlpha(c, 0.7)} 18%, transparent 46%)`,
    `radial-gradient(circle at 21% 78%, ${hexWithAlpha(d, 0.95)} 0%, ${hexWithAlpha(d, 0.68)} 15%, transparent 42%)`,
    `radial-gradient(circle at 84% 77%, ${hexWithAlpha(e, 0.95)} 0%, ${hexWithAlpha(e, 0.68)} 14%, transparent 39%)`,
    `linear-gradient(135deg, ${hexWithAlpha(a, 0.92)}, ${hexWithAlpha(c, 0.8)} 48%, ${hexWithAlpha(e, 0.9)})`,
  ].join(", ");
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through for browsers that expose clipboard but reject the write.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("Clipboard copy failed");
}

const ARCHIVE_TIME_ZONE = "America/Los_Angeles";
const ARCHIVE_MIN_DAY_KEY = "2026-04-25";
const ARCHIVE_EMPTY_BACKGROUND = "linear-gradient(90deg, #D9D9D9 0%, #f4f4f4 100%)";
const ARCHIVE_GAP_BACKGROUND = ARCHIVE_EMPTY_BACKGROUND;
const ARCHIVE_DATE_GRID_CLASS =
  "grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(3rem,4.75rem)_minmax(0,1fr)_minmax(3rem,4.75rem)] sm:gap-x-3";
const ARCHIVE_LABEL_GRID_CLASS =
  "hidden sm:grid sm:grid-cols-[minmax(3rem,4.75rem)_minmax(0,1fr)_minmax(3rem,4.75rem)] sm:gap-x-3";
const DAY_SLOT_COUNT = 48;
const DAY_START_MINUTE = 6 * 60;
const NIGHT_START_MINUTE = 19 * 60 + 30;
const MOBILE_DAY_START_MINUTE = 10 * 60 + 30;
const MOBILE_DAY_END_MINUTE = 15 * 60 + 30;

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

function archiveTimeLabel(parts: ArchiveParts): string {
  const hour = parts.hour % 12 || 12;
  const period = parts.hour >= 12 ? "PM" : "AM";
  return `${String(hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} ${period}`;
}

function archiveSlotTimeLabel(slot: number): string {
  const minute = archiveSlotStartMinute(slot);
  const hour24 = Math.floor(minute / 60);
  const hour = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "PM" : "AM";
  return `${hour}:${String(minute % 60).padStart(2, "0")} ${period}`;
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

function archiveMinuteIsVisible(minute: number, includeNight: boolean, useMobileDayWindow: boolean): boolean {
  if (includeNight) return true;
  if (useMobileDayWindow) {
    return minute >= MOBILE_DAY_START_MINUTE && minute < MOBILE_DAY_END_MINUTE;
  }
  return minute >= DAY_START_MINUTE && minute < NIGHT_START_MINUTE;
}

function archiveImageIsVisible(date: Date, includeNight: boolean, useMobileDayWindow: boolean): boolean {
  const parts = getArchiveParts(date);
  return archiveMinuteIsVisible(archiveSlotMinute(parts), includeNight, useMobileDayWindow);
}

function visibleArchiveSlots(includeNight: boolean, useMobileDayWindow: boolean): number[] {
  return Array.from({ length: DAY_SLOT_COUNT }, (_, slot) => slot).filter((slot) => {
    const minute = archiveSlotStartMinute(slot);
    return archiveMinuteIsVisible(minute, includeNight, useMobileDayWindow);
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
  const { archiveViewMode } = useArchiveViewMode();
  const paletteMode = archiveViewMode === "palette";
  const [includeNight, setIncludeNight] = useState(false);
  const [useMobileDayWindow, setUseMobileDayWindow] = useState(false);
  const [palettes, setPalettes] = useState<Record<string, Palette>>({});
  const palettesRef = useRef<Record<string, Palette>>({});
  const [open, setOpen] = useState<SkyImage | null>(null);
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    palettesRef.current = palettes;
  }, [palettes]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setUseMobileDayWindow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Progressive reveal: count animates up as the grid populates.
  const [revealCount, setRevealCount] = useState(0);
  const hasRunInitialReveal = useRef(false);

  const filtered = useMemo(() => {
    if (!images) return [];
    let out = images;
    out = out.filter((i) => archiveDayKeyForDate(i.capturedAt) >= ARCHIVE_MIN_DAY_KEY);
    out = out.filter((i) => archiveImageIsVisible(i.capturedAt, includeNight, useMobileDayWindow));
    return out;
  }, [images, includeNight, useMobileDayWindow]);

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
  const manifestPalettes = useMemo(() => {
    const next: Record<string, Palette> = {};
    for (const img of ordered) {
      const palette = getManifestPalette(img, { crop: true });
      if (palette) next[img.id] = palette;
    }
    return next;
  }, [ordered]);
  const displayPalettes = useMemo(
    () => ({ ...manifestPalettes, ...palettes }),
    [manifestPalettes, palettes],
  );

  // Fall back to extraction only for images without manifest-provided colors.
  useEffect(() => {
    let cancel = false;
    (async () => {
      for (const img of ordered.slice(0, 200)) {
        if (manifestPalettes[img.id]) continue;
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
  }, [ordered, manifestPalettes]);

  // Animate the first archive load only. Filter toggles should resize the matrix immediately.
  useEffect(() => {
    const target = ordered.length;
    if (target === 0) {
      setRevealCount(0);
      return;
    }

    if (hasRunInitialReveal.current) {
      setRevealCount(target);
      return;
    }

    hasRunInitialReveal.current = true;
    let raf = 0;
    const start = performance.now();
    let from = 0;
    setRevealCount((c) => {
      from = Math.min(c, target);
      return from;
    });
    const duration = Math.min(2400, 700 + target * 1.4);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setRevealCount(Math.round(from + (target - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setRevealCount(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ordered.length]);

  const visible = useMemo(
    () => (revealCount >= ordered.length ? ordered : ordered.slice(0, revealCount)),
    [ordered, revealCount],
  );
  const slotIndexes = useMemo(
    () => visibleArchiveSlots(includeNight, useMobileDayWindow),
    [includeNight, useMobileDayWindow],
  );
  const slotCount = slotIndexes.length;
  const dayRows = useMemo(() => buildArchiveDayRows(visible, slotIndexes), [visible, slotIndexes]);
  useEffect(() => setHoveredSlotIndex(null), [slotCount]);

  const parentRef = useRef<HTMLDivElement>(null);
  const timelineMeasureRef = useRef<HTMLDivElement>(null);
  const [isTimeBarStuck, setIsTimeBarStuck] = useState(false);
  const [timelineW, setTimelineW] = useState(0);
  useEffect(() => {
    const el = timelineMeasureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setTimelineW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const update = () => {
      const top = parentRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const stickyTop = window.matchMedia("(min-width: 640px)").matches ? 20 : 48;
      setIsTimeBarStuck(top <= stickyTop);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
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
          <h1 className="font-display leading-[1.02] tracking-[-0.02em] text-[clamp(3rem,9vw,9rem)]">
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
      <div className="px-2 sm:px-[4vw]">
        <div ref={parentRef} className="relative">
          <div className="pointer-events-none sticky top-12 z-40 hidden h-0 sm:block sm:top-5">
            <TimeLabelStrip
              slotIndexes={slotIndexes}
              activeSlotIndex={hoveredSlotIndex}
              slotCount={slotCount}
              isStuck={isTimeBarStuck}
            />
          </div>
          <div className={ARCHIVE_DATE_GRID_CLASS}>
            <div className="hidden sm:block" style={{ height: totalRowsSize }} />
            <div
              ref={timelineMeasureRef}
              className="relative overflow-hidden rounded-[24px]"
              style={{
                height: totalRowsSize,
                background: "transparent",
              }}
            >
              {virtualRows.map((vr) => {
                const row = dayRows[vr.index];
                if (!row) return null;
                const top = Math.round(vr.start - rowVirtualizer.options.scrollMargin);
                return (
                  <TimelineStrip
                    key={vr.key}
                    row={row}
                    palettes={displayPalettes}
                    openId={open?.id}
                    tileSize={tileSize}
                    slotCount={slotCount}
                    slotIndexes={slotIndexes}
                    onOpen={(img, vt) => openWithTransition(img, vt, setOpen)}
                    onHoverChange={setHoveredDayKey}
                    onSlotHoverChange={setHoveredSlotIndex}
                    paletteMode={paletteMode}
                    style={{ position: "absolute", top, left: 0, width: "100%", height: tileSize }}
                  />
                );
              })}
            </div>
            <div className="hidden sm:block" style={{ height: totalRowsSize }} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden sm:block" style={{ height: totalRowsSize }}>
            {virtualRows.map((vr) => {
              const row = dayRows[vr.index];
              if (!row) return null;
              const top = Math.round(vr.start - rowVirtualizer.options.scrollMargin);
              return (
                <DayLabelStrip
                  key={`label-${vr.key}`}
                  row={row}
                  visible={hoveredDayKey === row.key}
                  style={{ position: "absolute", top, left: 0, width: "100%", height: tileSize }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {open && <Lightbox image={open} palette={displayPalettes[open.id]} onClose={() => setOpen(null)} />}

      <footer className="px-[4vw] pt-[6vh] pb-[6vh] text-center">
        <BlurFollowText>
          <h2 className="font-display leading-[1.02] tracking-[-0.02em] text-[clamp(3rem,9vw,9rem)]">
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
  slotIndexes,
  onOpen,
  onHoverChange,
  onSlotHoverChange,
  paletteMode,
  style,
}: {
  row: ArchiveDayRow;
  palettes: Record<string, Palette>;
  openId?: string;
  tileSize: number;
  slotCount: number;
  slotIndexes: number[];
  onOpen: (img: SkyImage, vt: string) => void;
  onHoverChange: (key: string | null) => void;
  onSlotHoverChange: (slot: number | null) => void;
  paletteMode: boolean;
  style: React.CSSProperties;
}) {
  let lastFilledSlot = -1;
  for (let index = row.slots.length - 1; index >= 0; index--) {
    if (row.slots[index]) {
      lastFilledSlot = index;
      break;
    }
  }
  const hasTrailingFade = lastFilledSlot >= 0 && lastFilledSlot < row.slots.length - 1;
  const fadeSlots = Math.min(7, Math.max(4, Math.round(slotCount * 0.14)));
  const fadeStartPct = hasTrailingFade ? Math.max(0, ((lastFilledSlot + 1 - fadeSlots) / slotCount) * 100) : 0;
  const fadeEndPct = hasTrailingFade ? ((lastFilledSlot + 1) / slotCount) * 100 : 100;
  const trailingFadeMask = hasTrailingFade
    ? `linear-gradient(90deg, #000 0%, #000 ${fadeStartPct}%, rgba(0,0,0,0) ${fadeEndPct}%, rgba(0,0,0,0) 100%)`
    : undefined;

  const updateHoveredSlot = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 0.01, event.clientX - rect.left));
    onSlotHoverChange(Math.floor((x / rect.width) * slotCount));
  };

  return (
    <div
      data-archive-day-row={row.key}
      className="grid"
      onPointerEnter={(event) => {
        onHoverChange(row.key);
        updateHoveredSlot(event);
      }}
      onPointerMove={updateHoveredSlot}
      onPointerLeave={() => {
        onHoverChange(null);
        onSlotHoverChange(null);
      }}
      onFocus={() => onHoverChange(row.key)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onHoverChange(null);
          onSlotHoverChange(null);
        }
      }}
      style={{
        ...style,
        gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))`,
        gap: "0px",
        marginRight: "-1px",
        WebkitMaskImage: trailingFadeMask,
        maskImage: trailingFadeMask,
      }}
      aria-label={row.label}
    >
      {row.slots.map((img, slot) => {
        const archiveSlot = slotIndexes[slot] ?? slot;
        if (!img) {
          if (slot > 0 && !row.slots[slot - 1]) return null;
          let runLength = 1;
          while (slot + runLength < row.slots.length && !row.slots[slot + runLength]) {
            runLength++;
          }
          const previousImage = slot > 0 ? row.slots[slot - 1] : null;
          const nextImage = slot + runLength < row.slots.length ? row.slots[slot + runLength] : null;
          if (!previousImage || !nextImage) {
            if (!nextImage) return null;
            return (
              <span
                key={`${row.key}-edge-empty-${archiveSlot}`}
                aria-hidden
                className="block"
                style={{ gridColumn: `span ${runLength}`, height: tileSize, marginRight: "-1px" }}
              />
            );
          }
          return (
            <span
              key={`${row.key}-empty-${archiveSlot}`}
              data-archive-gap
              aria-hidden
              className="block"
              style={{
                gridColumn: `span ${runLength}`,
                height: tileSize,
                marginRight: "-1px",
                background: ARCHIVE_GAP_BACKGROUND,
              }}
            />
          );
        }
        const p = palettes[img.id];
        const vt = `sky-${img.id.replace(/[^a-z0-9_-]/gi, "_")}`;
        return (
          <GridTile
            key={`${row.key}-${archiveSlot}-${img.id}`}
            img={img}
            palette={p}
            vt={vt}
            tileSize={tileSize}
            cols={slotCount}
            isOpen={openId === img.id}
            paletteMode={paletteMode}
            onOpen={() => onOpen(img, vt)}
          />
        );
      })}
    </div>
  );
}

function TimeLabelStrip({
  slotIndexes,
  activeSlotIndex,
  slotCount,
  isStuck,
}: {
  slotIndexes: number[];
  activeSlotIndex: number | null;
  slotCount: number;
  isStuck: boolean;
}) {
  return (
    <div
      className={cn(
        ARCHIVE_LABEL_GRID_CLASS,
        isStuck ? "-translate-y-5" : "-translate-y-8 sm:-translate-y-9",
      )}
      aria-hidden
    >
      <div />
      <div
        data-archive-time-bar
        className="relative py-2 sm:py-2.5"
      >
        <div
          className={cn(
            "absolute inset-0 bg-paper",
            activeSlotIndex === null ? "opacity-0 transition-opacity ease-out" : "opacity-100 transition-none",
          )}
          style={{ transitionDuration: activeSlotIndex === null ? "2000ms" : undefined }}
        />
        <div
          className="relative grid overflow-visible"
          style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))` }}
        >
          {slotIndexes.map((slot, index) => (
            <TimeLabel key={slot} slot={slot} visible={activeSlotIndex === index} />
          ))}
        </div>
      </div>
      <div />
    </div>
  );
}

function TimeLabel({ slot, visible }: { slot: number; visible: boolean }) {
  return (
    <div
      className={cn(
        "relative h-4 overflow-visible",
        visible ? "opacity-100 transition-none" : "opacity-0 transition-opacity ease-out",
      )}
      style={{ transitionDuration: visible ? undefined : "2000ms" }}
    >
      <span
        data-archive-time-label
        className={cn(
          "absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap font-mono text-[6.5px] leading-none tabular-nums sm:text-[7.5px] md:text-[8.25px] lg:text-[8.5px]",
          visible ? "archive-date-visible-color" : "archive-date-fade-color",
        )}
      >
        {archiveSlotTimeLabel(slot)}
      </span>
    </div>
  );
}

function DayLabelStrip({
  row,
  visible,
  style,
}: {
  row: ArchiveDayRow;
  visible: boolean;
  style: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        ARCHIVE_LABEL_GRID_CLASS,
        visible ? "opacity-100 transition-none" : "opacity-0 transition-opacity ease-out",
      )}
      style={{ ...style, transitionDuration: visible ? undefined : "2000ms" }}
      aria-hidden
    >
      <DayLabel row={row} side="left" visible={visible} />
      <div />
      <DayLabel row={row} side="right" visible={visible} />
    </div>
  );
}

function DayLabel({ row, side, visible }: { row: ArchiveDayRow; side: "left" | "right"; visible: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-center overflow-hidden font-mono text-[6.5px] leading-none tabular-nums sm:text-[7.5px] md:text-[8.25px] lg:text-[8.5px]",
        visible ? "archive-date-visible-color" : "archive-date-fade-color",
        side === "left" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <span data-archive-day-label className="max-w-full truncate">{row.label}</span>
    </div>
  );
}

function GridTile({
  img, palette: p, vt, tileSize, cols, isOpen, paletteMode, onOpen,
}: {
  img: SkyImage;
  palette?: Palette;
  vt: string;
  tileSize: number;
  cols: number;
  isOpen: boolean;
  paletteMode: boolean;
  onOpen: () => void;
}) {
  const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 100 });
  const [hovered, setHovered] = useState(false);
  const hoverColor = p ? secondBrightestPaletteColor(p) : undefined;

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
        background: paletteMode ? hoverColor : undefined,
        viewTransitionName: isOpen ? vt : undefined,
      }}
    >
      {(!paletteMode || !p) && (
        <SkyThumb
          image={img}
          width={Math.ceil(tileSize * (typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1))}
          className="block h-full w-full"
          preferSprite
        />
      )}
      {p && !paletteMode && (
        <div
          className="pointer-events-none absolute inset-0 hidden flex-col justify-between p-3 transition-[clip-path,opacity] ease-out sm:flex"
          style={{
            background: hoverColor,
            opacity: hovered ? 1 : 0,
            clipPath: hovered
              ? `circle(160% at ${origin.x}% ${origin.y}%)`
              : `circle(0% at ${origin.x}% ${origin.y}%)`,
            transitionDuration: hovered ? "500ms" : "2000ms",
          }}
        >
          {cols <= 11 && (
            <>
              <div className="text-[12px]" style={{ color: readableInk(hoverColor ?? p.hex) }}>
                {fmtTime(img.capturedAt)}
                <span className="mx-1.5 opacity-60">·</span>
                {img.capturedAt.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
              </div>
              <div style={{ color: readableInk(hoverColor ?? p.hex) }}>
                <div className="font-display italic text-2xl leading-none">
                  {nameColor(hoverColor ?? p.hex)}
                </div>
                <div className="mt-1 text-[11px] opacity-80">
                  {(hoverColor ?? p.hex).toUpperCase()}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {p && paletteMode && (
        <div
          className="pointer-events-none absolute inset-0 hidden transition-[clip-path,opacity] ease-out sm:block"
          style={{
            opacity: hovered ? 1 : 0,
            clipPath: hovered
              ? `circle(160% at ${origin.x}% ${origin.y}%)`
              : `circle(0% at ${origin.x}% ${origin.y}%)`,
            transitionDuration: hovered ? "500ms" : "2000ms",
          }}
        >
          <SkyThumb
            image={img}
            width={Math.ceil(tileSize * (typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1))}
            className="block h-full w-full"
            preferSprite
          />
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
              "absolute left-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-[transform,background-color,box-shadow]",
              includeNight
                ? "translate-x-3.5 bg-paper shadow-[0_0_0_1px_hsl(var(--paper)),0_1px_2px_rgba(0,0,0,0.2)]"
                : "translate-x-0 bg-ink-faint shadow-none",
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

  const hoverMask = `radial-gradient(ellipse 68% 420% at ${pos.x}% ${pos.y}%, #000 0%, rgba(0,0,0,0.95) 42%, rgba(0,0,0,0) 84%)`;

  return (
    <span ref={ref} className="relative inline-block select-none">
      {/* base: light blue text */}
      <span style={{ color: "hsl(0 0% 92%)" }}>{children}</span>
      {/* real blue text revealed by a tall mask, so serif descenders render cleanly */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          color: "hsl(210 60% 80%)",
          WebkitMaskImage: hoverMask,
          maskImage: hoverMask,
        }}
      >
        {children}
      </span>
    </span>
  );
}

function Lightbox({ image, palette, onClose }: { image: SkyImage; palette?: Palette; onClose: () => void }) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const wipeRef = useRef<SVGSVGElement | null>(null);
  const wipePathRef = useRef<SVGPathElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const paletteMetaRef = useRef<HTMLDivElement | null>(null);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const entryTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const exitTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const isClosingRef = useRef(false);

  const close = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const modal = modalRef.current;
    const wipe = wipeRef.current;
    const wipePath = wipePathRef.current;
    const content = contentRef.current;
    const paletteMeta = paletteMetaRef.current;
    const paletteItems = paletteRef.current ? Array.from(paletteRef.current.children) : [];
    const closeButton = closeButtonRef.current;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!modal || !wipe || !wipePath || prefersReducedMotion) {
      onClose();
      return;
    }

    entryTimelineRef.current?.kill();
    exitTimelineRef.current?.kill();

    const curve = { edgeY: 100, controlY: 100 };
    const syncCurve = () => wipePath.setAttribute("d", curveSwipePath(curve.edgeY, curve.controlY));
    syncCurve();

    gsap.set(wipe, { autoAlpha: 1, clearProps: "transform", willChange: "contents" });

    exitTimelineRef.current = gsap.timeline({
      onComplete: () => {
        exitTimelineRef.current = null;
        onClose();
      },
    });
    exitTimelineRef.current
      .to([content, closeButton, paletteMeta, ...paletteItems].filter(Boolean), {
        autoAlpha: 0,
        y: -8,
        duration: 0.18,
        stagger: 0.01,
        ease: "power2.out",
      }, 0)
      .to(curve, { edgeY: 50, controlY: 0, duration: 0.34, ease: "power2.in", onUpdate: syncCurve }, 0)
      .to(curve, { edgeY: 0, controlY: 0, duration: 0.42, ease: "power2.out", onUpdate: syncCurve })
      .set(wipe, { clearProps: "willChange" });
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);
  const copyColor = async (color: string) => {
    setCopiedColor(color);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedColor(null), 1400);
    try {
      await copyText(color.toUpperCase());
    } catch {
      // Keep the interaction responsive even when a browser blocks clipboard access.
    }
  };
  const vt = `sky-${image.id.replace(/[^a-z0-9_-]/gi, "_")}`;
  const colors = immersionColorsFor(image, palette);
  const meshColors = meshColorsFor(colors);
  const primaryColor = colors[0];
  const textColor = readableInk(primaryColor);
  const imageWidth = Math.max(32, image.width ?? 128);
  const imageHeight = Math.max(24, image.height ?? Math.round(imageWidth * 9 / 16));
  const imageCropSize = Math.min(imageWidth, imageHeight);
  const capturedParts = getArchiveParts(image.capturedAt);
  const capturedStamp = `${archiveDayLabel(capturedParts)} · ${archiveTimeLabel(capturedParts)}`;

  useGSAP(() => {
    isClosingRef.current = false;
    const modal = modalRef.current;
    const wipe = wipeRef.current;
    const wipePath = wipePathRef.current;
    const content = contentRef.current;
    const paletteMeta = paletteMetaRef.current;
    const paletteItems = paletteRef.current ? Array.from(paletteRef.current.children) : [];
    const closeButton = closeButtonRef.current;
    if (!modal || !wipe || !wipePath || !content) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      entryTimelineRef.current = null;
      gsap.set(modal, { autoAlpha: 1 });
      gsap.set(wipe, { autoAlpha: 0 });
      gsap.set([content, closeButton, paletteMeta, ...paletteItems].filter(Boolean), { autoAlpha: 1, clearProps: "transform" });
      return;
    }

    const curve = { edgeY: 0, controlY: 0 };
    const syncCurve = () => wipePath.setAttribute("d", curveSwipePath(curve.edgeY, curve.controlY));
    syncCurve();

    gsap.set(modal, { autoAlpha: 1 });
    gsap.set(wipe, { autoAlpha: 1, clearProps: "transform", willChange: "contents" });
    gsap.set(content, { autoAlpha: 0, y: 28, scale: 0.985 });
    gsap.set(closeButton, { autoAlpha: 0, scale: 0.92 });
    gsap.set(paletteMeta, { autoAlpha: 0, y: 6 });
    gsap.set(paletteItems, { autoAlpha: 0, y: 10 });

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    entryTimelineRef.current = tl;
    tl.to(curve, { edgeY: 50, controlY: 0, duration: 0.34, ease: "power2.in", onUpdate: syncCurve }, 0)
      .to(curve, { edgeY: 100, controlY: 100, duration: 0.5, ease: "power2.out", onUpdate: syncCurve })
      .to(content, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7 }, 0.18)
      .to(closeButton, { autoAlpha: 1, scale: 1, duration: 0.36 }, 0.32)
      .to(paletteMeta, { autoAlpha: 1, y: 0, duration: 0.36 }, 0.38)
      .to(paletteItems, { autoAlpha: 1, y: 0, duration: 0.44, stagger: 0.035 }, 0.46)
      .set(wipe, { autoAlpha: 0, clearProps: "willChange" });

    return () => {
      if (entryTimelineRef.current === tl) entryTimelineRef.current = null;
    };
  }, { scope: modalRef, dependencies: [image.id], revertOnUpdate: true });

  return (
    <div
      ref={modalRef}
      data-color-immersion-modal
      className="fixed inset-0 z-[60] h-screen w-screen overflow-hidden opacity-0"
      onClick={close}
      style={{ backgroundColor: meshColors[0] }}
    >
      <svg
        ref={wipeRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[90] h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path ref={wipePathRef} d={curveSwipePath()} fill="hsl(var(--paper))" />
      </svg>
      <div
        className="color-immersion-wash absolute -inset-[8%]"
        style={{ backgroundImage: meshGradientFor(colors) }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, transparent 0%, transparent 36%, rgba(0,0,0,0.12) 100%)",
        }}
      />

      <button
        ref={closeButtonRef}
        onClick={(e) => { e.stopPropagation(); close(); }}
        aria-label="Close"
        className="fixed right-5 top-5 z-[80] grid h-11 w-11 place-items-center rounded-full border transition-transform hover:scale-105 active:scale-95"
        style={{
          color: textColor,
          borderColor: hexWithAlpha(textColor, 0.24),
          background: hexWithAlpha(textColor, 0.08),
        }}
      >
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <div className="pointer-events-none relative z-[68] flex h-full w-full items-center justify-center px-6 pb-36 pt-32 sm:pb-32 sm:pt-28">
        <div ref={contentRef} className="pointer-events-auto flex flex-col items-center gap-5" onClick={(e) => e.stopPropagation()}>
          <div
            className="relative overflow-hidden rounded-[4px] bg-paper/10"
            style={{
              width: imageCropSize,
              height: imageCropSize,
              outline: `1px solid ${hexWithAlpha(textColor, 0.2)}`,
              boxShadow: `0 28px 110px ${hexWithAlpha(primaryColor, 0.42)}`,
              viewTransitionName: vt,
            }}
          >
            <img
              src={image.imageUrl}
              alt={`${fmtDate(image.capturedAt)} ${fmtTime(image.capturedAt)} sky`}
              width={imageWidth}
              height={imageHeight}
              loading="eager"
              decoding="async"
              className="absolute left-1/2 top-1/2 block max-w-none"
              style={{
                width: imageWidth,
                height: imageHeight,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-4 bottom-5 z-[72] flex flex-col items-center justify-center gap-2.5 sm:bottom-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={paletteMetaRef}
          className="font-mono text-[10px] uppercase tracking-[0.2em] sm:text-[11px]"
          style={{
            color: hexWithAlpha(textColor, 0.76),
            textShadow: `0 1px 18px ${hexWithAlpha(primaryColor, 0.34)}`,
          }}
        >
          {capturedStamp}
        </div>
        <div ref={paletteRef} className="flex flex-wrap items-center justify-center gap-2">
          {colors.map((color) => {
            const copied = copiedColor === color;
            return (
              <button
                key={color}
                type="button"
                data-palette-color={color}
                aria-label={`Copy ${color.toUpperCase()}`}
                onClick={() => void copyColor(color)}
                className="inline-flex h-9 items-center gap-2 rounded-full border px-3 font-mono text-[11px] uppercase tracking-[0.12em] shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-paper/70 active:translate-y-0"
                style={{
                  background: hexWithAlpha(color, copied ? 0.92 : 0.68),
                  borderColor: hexWithAlpha(readableInk(color), 0.28),
                  color: readableInk(color),
                }}
              >
                <span className="h-2 w-2 rounded-full border" style={{ borderColor: hexWithAlpha(readableInk(color), 0.42) }} />
                <span>{copied ? "copied" : color.toUpperCase()}</span>
                {copied ? <Check className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
