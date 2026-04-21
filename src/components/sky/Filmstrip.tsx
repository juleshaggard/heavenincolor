import { useEffect, useMemo, useRef } from "react";
import { demoSkyColor, isDemo, cldUrl, type SkyImage } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

type Props = {
  images: SkyImage[];
  index: number;
  onScrub: (i: number) => void;
  thumbWidth?: number;
  height?: number;
  className?: string;
};

/** A horizontal, draggable filmstrip with a fixed center playhead.
 *  Real frames render from Cloudinary; demo frames render as procedural sky gradients. */
export function Filmstrip({ images, index, onScrub, thumbWidth = 56, height = 96, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startIdx = useRef(0);

  // keep the active frame centered when index changes externally (playback)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || dragging.current) return;
    const target = index * thumbWidth - el.clientWidth / 2 + thumbWidth / 2;
    el.scrollTo({ left: target, behavior: "auto" });
  }, [index, thumbWidth]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startIdx.current = index;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const next = Math.round(startIdx.current - dx / thumbWidth);
    onScrub(Math.max(0, Math.min(images.length - 1, next)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };
  const onWheel = (e: React.WheelEvent) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const next = Math.round(index + delta / thumbWidth);
    onScrub(Math.max(0, Math.min(images.length - 1, next)));
  };

  // Visible window — only render thumbs near current index for perf at 2k frames.
  const window = 80;
  const lo = Math.max(0, index - window);
  const hi = Math.min(images.length, index + window);
  const slice = useMemo(() => images.slice(lo, hi).map((img, i) => ({ img, i: lo + i })), [images, lo, hi]);

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-paper to-transparent" />

      {/* fixed center playhead */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2">
        <div className="h-full w-[2px] bg-ink shadow-[0_0_0_3px_hsl(var(--paper))]" />
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-ink" />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-ink" />
      </div>

      <div
        ref={wrapRef}
        className="no-scrollbar relative h-full w-full overflow-x-scroll overflow-y-hidden cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ scrollbarWidth: "none" as const }}
      >
        {/* spacer to allow centering first/last frames under the playhead */}
        <div style={{ width: images.length * thumbWidth, height: "100%", position: "relative" }}>
          <div style={{ position: "absolute", left: lo * thumbWidth, top: 0, bottom: 0, display: "flex" }}>
            {slice.map(({ img, i }) => (
              <FilmFrame
                key={img.public_id}
                img={img}
                width={thumbWidth}
                active={i === index}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilmFrame({ img, width, active }: { img: SkyImage; width: number; active: boolean }) {
  if (isDemo(img)) {
    const { hex, palette } = demoSkyColor(img.capturedAt);
    const grad = `linear-gradient(180deg, ${palette[4]} 0%, ${palette[3]} 35%, ${hex} 60%, ${palette[1]} 85%, ${palette[0]} 100%)`;
    return (
      <div
        className={cn(
          "h-full shrink-0 border-r border-paper/30 transition-[transform,filter] duration-200",
          active ? "scale-y-100" : "scale-y-[0.78] opacity-80",
        )}
        style={{ width, background: grad }}
      />
    );
  }
  return (
    <div
      className={cn(
        "h-full shrink-0 overflow-hidden border-r border-paper/30 bg-secondary transition-[transform,filter] duration-200",
        active ? "scale-y-100" : "scale-y-[0.78] opacity-80",
      )}
      style={{ width }}
    >
      <img
        src={cldUrl(img.public_id, { w: 80 })}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  );
}