import { useEffect, useState } from "react";

// Hardcoded location: San Francisco, USA
export const LOCATION = { name: "San Francisco", lat: 37.7749, lon: -122.4194 };

export type WeatherData = {
  tempC: number;
  tempHighC: number;
  tempLowC: number;
  realFeelC: number;
  humidity: number;
  pressureHpa: number;
  windKmh: number;
  windDirDeg: number;
  uvIndex: number;
  cloudCover: number;
  precipMm: number;
  weatherCode: number;
  sunrise: Date;
  sunset: Date;
  isDay: boolean;
  fetchedAt: Date;
};

const ENDPOINT =
  `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}` +
  `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m` +
  `&daily=temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset` +
  `&timezone=auto&wind_speed_unit=kmh`;

export function useWeather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(ENDPOINT, { cache: "no-store" });
        if (!r.ok) throw new Error(`weather ${r.status}`);
        const j = await r.json();
        const c = j.current;
        const d = j.daily;
        if (!alive) return;
        setData({
          tempC: c.temperature_2m,
          tempHighC: d.temperature_2m_max[0],
          tempLowC: d.temperature_2m_min[0],
          realFeelC: c.apparent_temperature,
          humidity: c.relative_humidity_2m,
          pressureHpa: c.pressure_msl,
          windKmh: c.wind_speed_10m,
          windDirDeg: c.wind_direction_10m,
          uvIndex: d.uv_index_max[0],
          cloudCover: c.cloud_cover,
          precipMm: c.precipitation,
          weatherCode: c.weather_code,
          sunrise: new Date(d.sunrise[0]),
          sunset: new Date(d.sunset[0]),
          isDay: c.is_day === 1,
          fetchedAt: new Date(),
        });
      } catch (e) {
        if (alive) setError(e as Error);
      }
    };
    load();
    const id = window.setInterval(load, 10 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return { data, error };
}

// Sun altitude (degrees above horizon) and azimuth for a given date/location.
// Simplified NOAA solar position algorithm — accurate to ~0.5° for UI use.
export function sunPosition(date: Date, lat = LOCATION.lat, lon = LOCATION.lon) {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const J1970 = 2440588;
  const J2000 = 2451545;
  const dayMs = 86400000;
  const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970;
  const toDays = (d: Date) => toJulian(d) - J2000;

  const d = toDays(date);
  const M = rad * (357.5291 + 0.98560028 * d);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = rad * 102.9372;
  const L = M + C + P + Math.PI;
  const e = rad * 23.4397;
  const dec = Math.asin(Math.sin(0) * Math.cos(e) + Math.cos(0) * Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e) - Math.tan(0) * Math.sin(e), Math.cos(L));
  const sidereal = rad * (280.16 + 360.9856235 * d) + rad * lon;
  const H = sidereal - ra;
  const phi = rad * lat;
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const azimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return {
    altitudeDeg: altitude * deg,
    azimuthDeg: ((azimuth * deg + 180) % 360 + 360) % 360, // 0 = north, clockwise
  };
}

// Day progress 0..1 between sunrise and sunset.
export function dayProgress(now: Date, sunrise: Date, sunset: Date): number {
  const t = now.getTime();
  const a = sunrise.getTime();
  const b = sunset.getTime();
  if (t <= a) return 0;
  if (t >= b) return 1;
  return (t - a) / (b - a);
}

export function weatherCodeLabel(code: number): string {
  if (code === 0) return "clear";
  if (code <= 3) return "partly cloudy";
  if (code <= 48) return "foggy";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "showers";
  if (code <= 86) return "snow showers";
  return "thunderstorm";
}