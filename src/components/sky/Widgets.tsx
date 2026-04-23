import { useEffect, useState } from "react";
import { useWeather, sunPosition, dayProgress, weatherCodeLabel, LOCATION } from "@/hooks/useWeather";
import { cn } from "@/lib/utils";

const cToF = (c: number) => Math.round(c * 9 / 5 + 32);

function Tile({
  children,
  className,
  dark = false,
  rounded = "rounded-3xl",
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  rounded?: string;
}) {
  return (
    <div
      className={cn(
        rounded,
        "relative p-5 transition-all",
        dark ? "bg-ink text-paper shadow-neu" : "bg-paper text-ink shadow-neu",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Label({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.28em]",
        light ? "text-paper/70" : "text-ink-dim",
      )}
    >
      {children}
    </div>
  );
}

/* ---------- Big temperature circle ---------- */
function TempCircle({ tempC, hi, lo }: { tempC: number; hi: number; lo: number }) {
  return (
    <Tile dark rounded="rounded-full" className="aspect-square flex flex-col items-center justify-center p-0">
      <div className="font-display text-[clamp(3rem,9vw,5rem)] leading-none">
        {cToF(tempC)}°
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-paper/70">
        H:{cToF(hi)}° L:{cToF(lo)}°
      </div>
    </Tile>
  );
}

/* ---------- Air quality / UV stacked pills ---------- */
function StatPill({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <Tile rounded="rounded-3xl" className="flex flex-col justify-center">
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink">
        {label} <span className="ml-2 font-display normal-case tracking-normal">{value}</span>
      </div>
      <div className="mt-1 font-display text-base">{sub}</div>
    </Tile>
  );
}

/* ---------- Sun position arc ---------- */
function SunArc({ progress, altitude, isDay }: { progress: number; altitude: number; isDay: boolean }) {
  // semicircle from (10,90) to (190,90), peak (100,10)
  const t = Math.max(0, Math.min(1, progress));
  const angle = Math.PI * (1 - t); // π → 0
  const cx = 100 - 90 * Math.cos(angle);
  const cy = 90 - 80 * Math.sin(angle);
  return (
    <Tile className="flex flex-col">
      <Label>Sun position</Label>
      <div className="mt-3 flex-1">
        <svg viewBox="0 0 200 110" className="w-full">
          <path d="M10 90 A 90 80 0 0 1 190 90" fill="none" stroke="hsl(var(--ink) / 0.25)" strokeWidth="1" />
          <line x1="10" y1="90" x2="190" y2="90" stroke="hsl(var(--ink) / 0.4)" strokeWidth="1" />
          {/* tick marks */}
          {[0.25, 0.5, 0.75].map((p) => {
            const a = Math.PI * (1 - p);
            const x = 100 - 90 * Math.cos(a);
            return <line key={p} x1={x} y1="88" x2={x} y2="92" stroke="hsl(var(--ink) / 0.5)" strokeWidth="1" />;
          })}
          <circle cx={cx} cy={cy} r="7" fill="hsl(var(--ink))" />
          <circle cx={cx} cy={cy} r="3" fill="hsl(var(--paper))" />
        </svg>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="font-display text-2xl">{Math.round(altitude)}°</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-ink-faint">
          {isDay ? "above horizon" : "below horizon"}
        </div>
      </div>
    </Tile>
  );
}

/* ---------- Humidity / cloud cover dot ring ---------- */
function PercentDot({ label, value, unit = "%" }: { label: string; value: number; unit?: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <Tile className="flex flex-col">
      <Label>{label}</Label>
      <div className="mt-2 grid place-items-center flex-1">
        <svg viewBox="0 0 80 80" className="w-24">
          <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--ink) / 0.15)" strokeWidth="2" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="hsl(var(--ink))"
            strokeWidth="2"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 40 40)"
            strokeLinecap="round"
          />
          <circle cx="40" cy="40" r="10" fill="hsl(var(--ink))" />
        </svg>
      </div>
      <div className="mt-2 font-display text-xl">
        {Math.round(value)}
        <span className="text-sm text-ink-dim">{unit}</span>
      </div>
    </Tile>
  );
}

/* ---------- Wind compass ---------- */
function WindCompass({ kmh, dirDeg }: { kmh: number; dirDeg: number }) {
  return (
    <Tile className="flex flex-col">
      <Label>Wind speed</Label>
      <div className="mt-2 grid place-items-center flex-1">
        <svg viewBox="0 0 80 80" className="w-24" style={{ transform: `rotate(${dirDeg}deg)` }}>
          <circle cx="40" cy="40" r="30" fill="hsl(var(--ink))" />
          <text x="40" y="14" textAnchor="middle" className="font-mono" fontSize="8" fill="hsl(var(--paper))">N</text>
          <line x1="40" y1="22" x2="40" y2="58" stroke="hsl(var(--paper))" strokeWidth="1.5" />
          <polygon points="40,58 36,52 44,52" fill="hsl(var(--paper))" />
          <polygon points="40,22 36,28 44,28" fill="hsl(var(--paper))" />
        </svg>
      </div>
      <div className="mt-2 font-display text-xl">
        {Math.round(kmh)} <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">km/h</span>
      </div>
    </Tile>
  );
}

/* ---------- UV dome ---------- */
function UvDome({ uv }: { uv: number }) {
  const level = uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : uv < 11 ? "Very High" : "Extreme";
  const lines = Math.max(1, Math.min(8, Math.round(uv)));
  return (
    <Tile className="flex flex-col">
      <Label>UV Index</Label>
      <div className="mt-1 font-display text-base">{level}</div>
      <div className="mt-2 grid place-items-center flex-1">
        <svg viewBox="0 0 100 70" className="w-28">
          <ellipse cx="50" cy="60" rx="38" ry="6" fill="none" stroke="hsl(var(--ink) / 0.4)" strokeWidth="1" />
          {Array.from({ length: lines }).map((_, i) => {
            const ry = 6 + (i + 1) * 4;
            return (
              <path
                key={i}
                d={`M 12 60 A 38 ${ry} 0 0 1 88 60`}
                fill="none"
                stroke="hsl(var(--ink))"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-2 font-display text-xl">{uv.toFixed(0).padStart(2, "0")}</div>
    </Tile>
  );
}

/* ---------- Sunrise/sunset ---------- */
function SunriseTile({ sunrise, sunset, now }: { sunrise: Date; sunset: Date; now: Date }) {
  const showSunrise = now < sunrise || now > sunset;
  const time = showSunrise ? sunrise : sunset;
  const label = showSunrise ? "Sunrise" : "Sunset";
  const fmt = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  return (
    <Tile className="flex flex-col">
      <Label>{label}</Label>
      <div className="mt-2 grid place-items-center flex-1">
        <svg viewBox="0 0 100 60" className="w-28">
          <line x1="5" y1="50" x2="95" y2="50" stroke="hsl(var(--ink))" strokeWidth="1" />
          <line x1="15" y1="55" x2="85" y2="55" stroke="hsl(var(--ink) / 0.5)" strokeWidth="1" strokeDasharray="2 3" />
          <path d="M 25 50 A 25 25 0 0 1 75 50" fill="none" stroke="hsl(var(--ink))" strokeWidth="1" />
          <line x1="50" y1="20" x2="50" y2="40" stroke="hsl(var(--ink))" strokeWidth="1" />
          <polygon points="50,20 46,26 54,26" fill="hsl(var(--ink))" />
        </svg>
      </div>
      <div className="mt-2 font-display text-xl">{fmt}</div>
    </Tile>
  );
}

/* ---------- RealFeel circle ---------- */
function RealFeel({ c }: { c: number }) {
  return (
    <Tile dark rounded="rounded-full" className="aspect-square flex flex-col items-center justify-center p-0">
      <div className="font-display italic text-base text-paper/80">RealFeel®</div>
      <div className="font-display text-[clamp(2.5rem,8vw,4rem)] leading-none">{cToF(c)}°</div>
    </Tile>
  );
}

/* ---------- Pressure ---------- */
function PressureTile({ hpa }: { hpa: number }) {
  // Map 980-1040 hPa to a needle angle -90..90
  const min = 980, max = 1040;
  const t = Math.max(0, Math.min(1, (hpa - min) / (max - min)));
  const angle = -90 + t * 180;
  return (
    <Tile className="flex flex-col">
      <Label>Pressure</Label>
      <div className="mt-2 grid place-items-center flex-1">
        <svg viewBox="0 0 100 60" className="w-28">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="hsl(var(--ink) / 0.3)" strokeWidth="1" />
          {[0, 0.25, 0.5, 0.75, 1].map((p) => {
            const a = (-90 + p * 180) * (Math.PI / 180);
            const x1 = 50 + 36 * Math.cos(a);
            const y1 = 50 + 36 * Math.sin(a);
            const x2 = 50 + 42 * Math.cos(a);
            const y2 = 50 + 42 * Math.sin(a);
            return <line key={p} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--ink))" strokeWidth="1" />;
          })}
          <g transform={`rotate(${angle} 50 50)`}>
            <line x1="50" y1="50" x2="50" y2="18" stroke="hsl(var(--ink))" strokeWidth="1.5" />
            <polygon points="50,18 47,24 53,24" fill="hsl(var(--ink))" />
          </g>
          <circle cx="50" cy="50" r="3" fill="hsl(var(--ink))" />
        </svg>
      </div>
      <div className="mt-2 font-display text-xl">
        {Math.round(hpa)} <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">hPa</span>
      </div>
    </Tile>
  );
}

/* ---------- Main grid ---------- */
export function Widgets() {
  const { data, error } = useWeather();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (error) {
    return (
      <section className="rounded-2xl bg-paper p-6 shadow-neu text-center font-mono text-[10px] uppercase tracking-[0.25em] text-ink-faint">
        weather unavailable
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-2xl bg-paper p-6 shadow-neu text-center font-mono text-[10px] uppercase tracking-[0.25em] text-ink-faint">
        loading conditions…
      </section>
    );
  }

  const sun = sunPosition(now);
  const progress = dayProgress(now, data.sunrise, data.sunset);
  const condition = weatherCodeLabel(data.weatherCode);

  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between px-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-faint">
          {LOCATION.name} · live conditions
        </div>
        <div className="font-display italic text-ink-dim">~{condition}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TempCircle tempC={data.tempC} hi={data.tempHighC} lo={data.tempLowC} />
        <StatPill
          label="HUMIDITY"
          value={`${Math.round(data.humidity)}%`}
          sub={data.humidity < 30 ? "Dry" : data.humidity < 60 ? "Comfortable" : "Humid"}
        />
        <StatPill
          label="UV INDEX"
          value={String(Math.round(data.uvIndex)).padStart(2, "0")}
          sub={data.uvIndex < 3 ? "Low" : data.uvIndex < 6 ? "Moderate" : data.uvIndex < 8 ? "High" : "Very High"}
        />
        <SunArc progress={progress} altitude={sun.altitudeDeg} isDay={data.isDay} />
        <PercentDot label="Cloud cover" value={data.cloudCover} />
        <WindCompass kmh={data.windKmh} dirDeg={data.windDirDeg} />
        <UvDome uv={data.uvIndex} />
        <SunriseTile sunrise={data.sunrise} sunset={data.sunset} now={now} />
        <RealFeel c={data.realFeelC} />
        <PressureTile hpa={data.pressureHpa} />
      </div>
    </section>
  );
}