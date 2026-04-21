import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSkyImages, imagesByDay } from "@/hooks/useSkyImages";
import { getPalette } from "@/lib/palette";
import { cn } from "@/lib/utils";

const WEEKS = 53;

export default function CalendarPage() {
  const { images } = useSkyImages();
  const byDay = useMemo(() => (images ? imagesByDay(images) : new Map()), [images]);
  const [dayHex, setDayHex] = useState<Record<string, string>>({});
  const [hover, setHover] = useState<string | null>(null);

  // Compute average sunset hue per day (sample 1h around 19:00).
  useEffect(() => {
    if (!images) return;
    let cancel = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const [k, list] of byDay) {
        const sun = list.filter((i: any) => {
          const h = i.capturedAt.getHours();
          return h >= 18 && h <= 20;
        });
        const sample = sun.length ? sun : list.slice(Math.floor(list.length / 2), Math.floor(list.length / 2) + 2);
        if (!sample.length) continue;
        const palettes = await Promise.all(sample.map((i: any) => getPalette(i)));
        // average in RGB
        let r = 0, g = 0, b = 0;
        for (const p of palettes) {
          const m = p.hex.replace("#", "").match(/.{2}/g)!;
          r += parseInt(m[0], 16);
          g += parseInt(m[1], 16);
          b += parseInt(m[2], 16);
        }
        const n = palettes.length;
        const hex = `#${[r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("")}`;
        out[k] = hex;
      }
      if (!cancel) setDayHex(out);
    })();
    return () => { cancel = true; };
  }, [images, byDay]);

  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - WEEKS * 7 + 1 - today.getDay());
    const out: { date: Date; key: string }[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({ date: d, key: d.toISOString().slice(0, 10) });
    }
    return out;
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl text-ink md:text-5xl">Calendar</h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">
          each cell · the sky's average sunset hue
        </p>
      </header>

      <div className="overflow-x-auto rounded-sm border border-hairline bg-card p-6">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${WEEKS}, 14px)`,
            gridTemplateRows: "repeat(7, 14px)",
            gridAutoFlow: "column",
            gap: 3,
          }}
        >
          {cells.map(({ date, key }) => {
            const has = byDay.has(key);
            const hex = dayHex[key];
            const future = date.getTime() > Date.now();
            return (
              <Link
                key={key}
                to="/timelapse"
                onMouseEnter={() => setHover(key)}
                onMouseLeave={() => setHover(null)}
                title={`${key}${has ? "" : " · no frames"}`}
                className={cn(
                  "h-3.5 w-3.5 rounded-[2px] transition-transform hover:scale-150",
                  !has && "bg-secondary",
                  future && "opacity-30",
                )}
                style={has ? { background: hex ?? "#222227", boxShadow: hex ? `0 0 6px ${hex}55` : undefined } : undefined}
              />
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            {hover ?? "hover a day"}
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            <span>cool</span>
            <div className="flex h-3 w-40 overflow-hidden rounded-sm">
              {["#1a2a4a", "#3a3a6a", "#6a3a5a", "#a85a3a", "#e8a85a"].map((c) => (
                <div key={c} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            <span>warm</span>
          </div>
        </div>
      </div>
    </div>
  );
}