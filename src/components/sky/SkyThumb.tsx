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
};

const WIDTH_BUCKETS = [64, 96, 160, 240, 400, 640, 960, 1280, 1600];
function bucket(w: number): number {
  for (const b of WIDTH_BUCKETS) if (w <= b) return b;
  return WIDTH_BUCKETS[WIDTH_BUCKETS.length - 1];
}

export function SkyThumb({ image, width = 240, className, rounded, hero, alt, flatColor, eager }: Props) {
  if (flatColor) {
    return (
      <div
        className={cn("relative overflow-hidden", rounded && "rounded-sm", className)}
        style={{ background: flatColor }}
        aria-label={alt}
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
