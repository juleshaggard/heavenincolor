import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSkyImages, imagesInRange } from "@/hooks/useSkyImages";
import { useAmbientTint } from "@/hooks/useAmbientTint";
import { getPalette, type Palette } from "@/lib/palette";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { Swatches } from "@/components/sky/Swatches";
import { ColorRibbon } from "@/components/sky/ColorRibbon";
import { captionFor, fmtTime, relativeTime } from "@/lib/format";

export default function Now() {
  const { images } = useSkyImages();
  const [palette, setPalette] = useState<Palette | null>(null);

  const latest = images?.[images.length - 1];
  const today = useMemo(() => {
    if (!images) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return imagesInRange(images, start, end);
  }, [images]);

  useEffect(() => {
    if (!latest) return;
    getPalette(latest).then(setPalette);
  }, [latest]);

  useAmbientTint(palette?.hex);

  if (!images || !latest) {
    return (
      <div className="grid h-[70vh] place-items-center font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
        listening to the sky…
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-sm border border-hairline">
        <SkyThumb image={latest} width={1600} hero className="aspect-[16/10] w-full" alt="Latest sky" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/60 to-transparent p-8 md:p-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-dim">
                {relativeTime(latest.capturedAt)} · {captionFor(latest.capturedAt)}
              </div>
              <h1 className="font-display mt-2 text-6xl leading-[0.9] text-ink md:text-8xl">
                {fmtTime(latest.capturedAt)}
              </h1>
              <div className="mt-3 font-mono text-xs text-ink-faint">
                {latest.capturedAt.toDateString()}
              </div>
            </div>
            <div className="w-full max-w-md space-y-3">
              {palette && <Swatches swatches={palette.swatches} size="lg" />}
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">
                <span>dominant</span>
                <span className="text-ink">{palette?.hex.toUpperCase() ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-ink">today, in color</h2>
          <Link
            to="/timelapse"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim hover:text-ink"
          >
            scrub →
          </Link>
        </div>
        <ColorRibbon images={today} height={64} showTicks />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          {today.length} frames · the day so far
        </p>
      </section>

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline md:grid-cols-4">
        {[...today].slice(-8).reverse().map((img) => (
          <div key={img.public_id} className="bg-background">
            <SkyThumb image={img} width={400} className="aspect-square" />
            <div className="flex items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              <span>{fmtTime(img.capturedAt)}</span>
              <span>{captionFor(img.capturedAt)}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}