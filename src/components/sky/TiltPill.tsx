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
      {/* glass layer — soft top sheen, always on */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 35%, rgba(255,255,255,0) 55%, rgba(0,0,0,0.10) 100%)",
        }}
      />
      {/* big sun-glare following the cursor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: glare.on ? 1 : 0,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.9) 0%, rgba(255,240,210,0.55) 14%, rgba(255,220,170,0.25) 32%, rgba(255,255,255,0.05) 55%, transparent 78%)`,
          mixBlendMode: "screen",
        }}
      />
      {/* soft outer bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: glare.on ? 0.9 : 0,
          background: `radial-gradient(70% 60% at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.3), transparent 70%)`,
          mixBlendMode: "soft-light",
          filter: "blur(10px)",
        }}
      />
      {/* glass edge — inset highlight + shadow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow:
            "inset 0 2px 1px rgba(255,255,255,0.5), inset 0 -2px 2px rgba(0,0,0,0.18), inset 0 0 40px rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}
