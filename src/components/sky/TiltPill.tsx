import { useRef, useState, type ReactNode, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  aspectRatio?: string;
  /** Optional explicit height override (overrides aspectRatio for smooth transitions). */
  height?: number | string;
  maxTilt?: number; // degrees
};

export function TiltPill({ children, className, aspectRatio = "21 / 9", height, maxTilt = 8 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)",
    filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.18))",
  });
  const [glare, setGlare] = useState<{ x: number; y: number; on: boolean }>({ x: 50, y: 50, on: false });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (0.5 - py) * maxTilt * 2;
    const ry = (px - 0.5) * maxTilt * 2;
    // Drop shadow shifts opposite to tilt — light source stays fixed top-left.
    const shX = (px - 0.5) * -40;
    const shY = (py - 0.5) * -40 + 28;
    const blur = 36;
    setStyle({
      transform: `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.03)`,
      filter: `drop-shadow(${shX.toFixed(1)}px ${shY.toFixed(1)}px ${blur}px rgba(0,0,0,0.28))`,
    });
    setGlare({ x: px * 100, y: py * 100, on: true });
  };

  const onLeave = () => {
    setStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)",
      filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.18))",
    });
    setGlare((g) => ({ ...g, on: false }));
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        "relative w-full overflow-hidden rounded-full transition-[transform,filter,height] duration-500 ease-out will-change-transform",
        className,
      )}
      style={{
        ...(height != null ? { height: typeof height === "number" ? `${height}px` : height } : { aspectRatio }),
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      {children}
      {/* subtle moving glare — original intensity */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: glare.on ? 1 : 0,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.35), rgba(255,255,255,0.08) 25%, transparent 55%)`,
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );
}
