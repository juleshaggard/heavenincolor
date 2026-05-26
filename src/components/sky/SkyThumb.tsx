import type { SkyImage } from "@/lib/skyImages";
import { cn } from "@/lib/utils";

type Props = {
  image: SkyImage;
  width?: number;
  className?: string;
  rounded?: boolean;
  hero?: boolean;
  alt?: string;
  flatColor?: string;
  eager?: boolean;
  preferSprite?: boolean;
};

const WIDTH_BUCKETS = [64, 96, 160, 240, 400, 640, 960, 1280, 1600];
function bucket(w: number): number {
  for (const b of WIDTH_BUCKETS) if (w <= b) return b;
  return WIDTH_BUCKETS[WIDTH_BUCKETS.length - 1];
}

function spritePosition(index: number, columns: number, rows: number): string {
  const col = index % columns;
  const row = Math.floor(index / columns);
  const x = columns > 1 ? (col / (columns - 1)) * 100 : 0;
  const y = rows > 1 ? (row / (rows - 1)) * 100 : 0;
  return `${x}% ${y}%`;
}

export function SkyThumb({ image, width = 240, className, rounded, hero, alt, flatColor, eager, preferSprite }: Props) {
  if (flatColor) {
    return (
      <div
        className={cn("relative overflow-hidden", rounded && "rounded-sm", className)}
        style={{ background: flatColor }}
        aria-label={alt}
      />
    );
  }

  if (preferSprite && image.sprite) {
    const { url, index, columns, rows } = image.sprite;
    return (
      <div
        className={cn("relative overflow-hidden", rounded && "rounded-sm", className)}
        aria-label={alt ?? "Sky"}
        role={alt ? "img" : undefined}
        style={{
          backgroundImage: `url(${url})`,
          backgroundPosition: spritePosition(index, columns, rows),
          backgroundRepeat: "no-repeat",
          backgroundSize: `${columns * 100}% ${rows * 100}%`,
        }}
      />
    );
  }

  const src = bucket(width) <= 400 ? image.thumbUrl : image.imageUrl;
  return (
    <div className={cn("relative overflow-hidden", rounded && "rounded-sm", className)}>
      <img
        src={src}
        alt={alt ?? "Sky"}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={cn(
          "relative h-full w-full object-cover",
          hero && "ken-burns",
        )}
      />
    </div>
  );
}
