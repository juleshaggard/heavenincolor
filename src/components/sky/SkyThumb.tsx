import { useEffect, useState } from "react";
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
};

export function SkyThumb({ image, width = 320, className, rounded, hero, alt, flatColor }: Props) {
  const [loaded, setLoaded] = useState(false);

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

  const src = cldUrl(image.public_id, { w: width });
  const blur = cldUrl(image.public_id, { w: 24, q: 30, blur: 800 });
  return (
    <div className={cn("relative overflow-hidden bg-black", rounded && "rounded-sm", className)}>
      <img
        src={src}
        alt={alt ?? "Sky"}
        onLoad={() => setLoaded(true)}
        className={cn(
          "relative h-full w-full object-cover",
          hero && "ken-burns",
        )}
      />
    </div>
  );
}