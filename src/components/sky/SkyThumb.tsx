import { cldUrl, demoSkyColor, isDemo, type SkyImage } from "@/lib/cloudinary";
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

// Snap to a small set of widths so Cloudinary's CDN cache hits across users
// instead of generating a unique transform per pixel size.
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

  if (isDemo(image)) {
    const { hex, palette } = demoSkyColor(image.capturedAt);
    const grad = `linear-gradient(180deg, ${palette[4]} 0%, ${palette[3]} 35%, ${hex} 60%, ${palette[1]} 85%, ${palette[0]} 100%)`;
    return (
      <div
        className={cn("relative overflow-hidden", rounded && "rounded-sm", className)}
        style={{ background: grad }}
        aria-label={alt}
      >
        {hero && (
          <div
            className="absolute inset-0 opacity-60 mix-blend-screen"
            style={{
              background: `radial-gradient(80% 50% at 50% 75%, ${palette[3]}99, transparent 70%)`,
            }}
          />
        )}
      </div>
    );
  }

  const src = cldUrl(image.public_id, { w: bucket(width) });
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