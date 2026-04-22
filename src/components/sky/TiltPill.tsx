import { useRef, useState, type ReactNode, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  aspectRatio?: string;
  maxTilt?: number; // degrees
};

export function TiltPill({ children, className, aspectRatio = "21 / 9", maxTilt = 8 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glare, setGlare] = useState<{ x: number; y: number; on: boolean }>({ x: 50, y: 50, on: false });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (0.5 - py) * maxTilt * 2;
    const ry = (px - 0.5) * maxTilt * 2;
    setStyle({
      transform: `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.02)`,
    });
    setGlare({ x: px * 100, y: py * 100, on: true });
  };

  const onLeave = () => {
    setStyle({ transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)" });
    setGlare((g) => ({ ...g, on: false }));
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("relative w-full overflow-hidden rounded-full transition-transform duration-300 ease-out will-change-transform", className)}
      style={{ aspectRatio, transformStyle: "preserve-3d", ...style }}
    >
      {children}
      {/* glare layer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: glare.on ? 1 : 0,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.35), rgba(255,255,255,0.08) 25%, transparent 55%)`,
          mixBlendMode: "soft-light",
        }}
      />
      {/* edge sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300"
        style={{
          opacity: glare.on ? 1 : 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}
