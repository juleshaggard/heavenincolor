import { useEffect, useMemo, useState } from "react";
import { useSkyImages, imagesByDay } from "@/hooks/useSkyImages";
import { getPalette } from "@/lib/palette";
import { cn } from "@/lib/utils";

const MONTHS_BACK = 3; // show last N months including current

type DayBand = {
  key: string;
  date: Date;
  hasData: boolean;
  // 12 hourly bins (every 2h) of hex
  bins: string[];
};

const FALLBACK = "hsl(var(--secondary))";

export default function CalendarPage() {
  const { images } = useSkyImages();
  const byDay = useMemo(() => (images ? imagesByDay(images) : new Map()), [images]);
  const [bands, setBands] = useState<Record<string, string[]>>({});

  // Build month grids: list of months, each with grid of days (Sun..Sat rows×weeks)
  const months = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: { year: number; month: number; weeks: (Date | null)[][] }[] = [];
    for (let m = MONTHS_BACK - 1; m >= 0; m--) {
      const ref = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const year = ref.getFullYear();
      const month = ref.getMonth();
      const firstDow = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const weeks: (Date | null)[][] = [];
      let week: (Date | null)[] = Array(firstDow).fill(null);
      for (let d = 1; d <= daysInMonth; d++) {
        week.push(new Date(year, month, d));
        if (week.length === 7) { weeks.push(week); week = []; }
      }
      if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }
      out.push({ year, month, weeks });
    }
    return out;
  }, []);

  // Compute per-day vertical bands (morning → night)
  useEffect(() => {
    if (!images) return;
    let cancel = false;
    (async () => {
      const out: Record<string, string[]> = {};
      const BINS = 12; // 2h each, 0..23
      for (const [k, list] of byDay) {
        const buckets: any[][] = Array.from({ length: BINS }, () => []);
        for (const img of list as any[]) {
          const h = img.capturedAt.getHours();
          buckets[Math.floor(h / 2)].push(img);
        }
        const bins: string[] = [];
        for (let i = 0; i < BINS; i++) {
          const sample = buckets[i].slice(0, 2);
          if (!sample.length) { bins.push(""); continue; }
          const palettes = await Promise.all(sample.map((im) => getPalette(im)));
          let r = 0, g = 0, b = 0;
          for (const p of palettes) {
            const m = p.hex.replace("#", "").match(/.{2}/g)!;
            r += parseInt(m[0], 16); g += parseInt(m[1], 16); b += parseInt(m[2], 16);
          }
          const n = palettes.length;
          bins.push(`#${[r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("")}`);
        }
        // fill empty bins by interpolating from neighbours
        for (let i = 0; i < BINS; i++) {
          if (bins[i]) continue;
          let prev = "", next = "";
          for (let j = i - 1; j >= 0; j--) if (bins[j]) { prev = bins[j]; break; }
          for (let j = i + 1; j < BINS; j++) if (bins[j]) { next = bins[j]; break; }
          bins[i] = prev || next || "";
        }
        out[k] = bins;
      }
      if (!cancel) setBands(out);
    })();
    return () => { cancel = true; };
  }, [images, byDay]);

  const monthName = (y: number, m: number) =>
    new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="font-display text-4xl text-ink md:text-5xl">Calendar</h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">
          each column · one day · morning above · night below
        </p>
      </header>

      {months.map(({ year, month, weeks }) => (
        <section key={`${year}-${month}`} className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-hairline/20 pb-2">
            <h2 className="font-display italic text-2xl text-ink md:text-3xl">{monthName(year, month)}</h2>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-faint">
              06 · 12 · 18 · 24
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center">{d}</div>
            ))}
          </div>

          <div className="space-y-2">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-2">
                {week.map((date, di) => {
                  if (!date) return <div key={di} />;
                  const key = date.toISOString().slice(0, 10);
                  const has = byDay.has(key);
                  const bins = bands[key];
                  const future = date.getTime() > today.getTime();
                  const isToday = date.getTime() === today.getTime();

                  // Build vertical gradient from bins (top = morning hour 0, bottom = hour 22)
                  const gradient = bins && bins.some(Boolean)
                    ? `linear-gradient(180deg, ${bins.map((c, i) => `${c || "#1a1a22"} ${(i / (bins.length - 1)) * 100}%`).join(", ")})`
                    : undefined;

                  return (
                    <div
                      key={key}
                      title={key}
                      className={cn(
                        "relative flex flex-col overflow-hidden rounded-md border border-hairline/15 transition-transform hover:scale-[1.03]",
                        future && "opacity-25",
                        isToday && "ring-2 ring-ink/40",
                      )}
                      style={{
                        aspectRatio: "1 / 2.4",
                        background: gradient ?? FALLBACK,
                      }}
                    >
                      <div className="absolute left-1 top-1 font-mono text-[10px] text-paper/90 mix-blend-difference">
                        {date.getDate()}
                      </div>
                      {!has && !future && (
                        <div className="absolute inset-0 grid place-items-center">
                          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">—</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex items-center justify-center gap-3 pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
        <span>morning</span>
        <div className="flex h-24 w-3 flex-col overflow-hidden rounded-sm">
          {["#9bb6d8", "#f0c8a0", "#e89870", "#a85a5a", "#3a3a6a", "#0a0a14"].map((c) => (
            <div key={c} className="flex-1" style={{ background: c }} />
          ))}
        </div>
        <span>night</span>
      </div>
    </div>
  );
}
