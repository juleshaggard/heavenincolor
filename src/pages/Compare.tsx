import { useEffect, useMemo, useState } from "react";
import { useSkyImages, imagesByDay } from "@/hooks/useSkyImages";
import { SkyThumb } from "@/components/sky/SkyThumb";
import { ColorRibbon } from "@/components/sky/ColorRibbon";
import { getPalette } from "@/lib/palette";
import { deltaE } from "@/lib/palette";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ComparePage() {
  const { images } = useSkyImages();
  const byDay = useMemo(() => (images ? imagesByDay(images) : new Map<string, any[]>()), [images]);
  const dayKeys = useMemo(() => Array.from(byDay.keys()).sort(), [byDay]);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [t, setT] = useState(0.5); // 0..1 time of day

  useEffect(() => {
    if (dayKeys.length && !a) setA(dayKeys[dayKeys.length - 1]);
    if (dayKeys.length > 1 && !b) setB(dayKeys[0]);
  }, [dayKeys, a, b]);

  const listA = (a && byDay.get(a)) || [];
  const listB = (b && byDay.get(b)) || [];
  const idxA = Math.min(listA.length - 1, Math.floor(t * (listA.length - 1)));
  const idxB = Math.min(listB.length - 1, Math.floor(t * (listB.length - 1)));
  const imgA = listA[idxA];
  const imgB = listB[idxB];

  const [delta, setDelta] = useState<number[]>([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!listA.length || !listB.length) return setDelta([]);
      const n = Math.min(listA.length, listB.length, 64);
      const out: number[] = [];
      for (let i = 0; i < n; i++) {
        const ia = Math.floor((i / (n - 1)) * (listA.length - 1));
        const ib = Math.floor((i / (n - 1)) * (listB.length - 1));
        const [pa, pb] = await Promise.all([getPalette(listA[ia]), getPalette(listB[ib])]);
        out.push(deltaE(pa.hex, pb.hex));
      }
      if (!cancel) setDelta(out);
    })();
    return () => { cancel = true; };
  }, [a, b, listA.length, listB.length]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink md:text-5xl">Compare</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">
            two days · synchronised through time
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em]">
          <DaySelect value={a} onChange={setA} options={dayKeys} label="A" />
          <DaySelect value={b} onChange={setB} options={dayKeys} label="B" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline">
        <Pane label="A" date={a} img={imgA} />
        <Pane label="B" date={b} img={imgB} />
      </div>

      <div className="space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">scrub time of day</div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={t}
          onChange={(e) => setT(parseFloat(e.target.value))}
          className="w-full accent-ink"
        />
      </div>

      <div className="space-y-3">
        <Strip label={`A · ${a ?? ""}`} list={listA} />
        <Strip label={`B · ${b ?? ""}`} list={listB} />
        <DeltaStrip values={delta} />
      </div>
    </div>
  );
}

function DaySelect({ value, onChange, options, label }: { value: string | null; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <label className="flex items-center gap-2 rounded-sm border border-hairline bg-card px-3 py-1.5">
      <span className="text-ink-faint">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-ink outline-none"
      >
        {options.map((d) => (
          <option key={d} value={d} className="bg-card text-ink">
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pane({ label, date, img }: { label: string; date: string | null; img: any }) {
  return (
    <div className="relative bg-background">
      {img ? <SkyThumb image={img} width={1200} className="aspect-[4/3]" /> : <div className="aspect-[4/3]" />}
      <div className="absolute left-4 top-4 flex items-baseline gap-3 mix-blend-difference">
        <span className="font-display text-2xl text-white">{label}</span>
        {date && (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">
            {fmtDate(new Date(date))}
          </span>
        )}
      </div>
      {img && (
        <div className="absolute right-4 top-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/80 mix-blend-difference">
          {fmtTime(img.capturedAt)}
        </div>
      )}
    </div>
  );
}

function Strip({ label, list }: { label: string; list: any[] }) {
  return (
    <div className="space-y-1">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">{label}</div>
      <ColorRibbon images={list} height={28} />
    </div>
  );
}

function DeltaStrip({ values }: { values: number[] }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
        <span>perceptual difference · ΔE</span>
        <span className="text-ink-dim">max {max.toFixed(1)}</span>
      </div>
      <div className="flex h-12 items-end gap-px rounded-sm border border-hairline bg-card p-1">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${(v / max) * 100}%`,
              background: `hsl(var(--sky-h) var(--sky-s) ${30 + (v / max) * 50}%)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}