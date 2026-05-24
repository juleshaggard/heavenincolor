export type SkyImage = {
  id: string;
  capturedAt: Date;
  imageUrl: string;
  thumbUrl: string;
  averageHex?: string;
  palette?: string[];
  width?: number;
  height?: number;
  bytes?: number;
  thumbBytes?: number;
};

export type SkyManifestRetention = {
  capBytes?: number;
  retainedBytes?: number;
  retainedCount?: number;
  sourceCount?: number;
  prunedCount?: number;
  oldestCapturedAt?: string;
  newestCapturedAt?: string;
};

export type SkyManifest = {
  version: 1;
  generatedAt: string;
  retention?: SkyManifestRetention;
  images: RawSkyImage[];
};

export type RawSkyImage = {
  id: string;
  capturedAt?: string;
  imageUrl: string;
  thumbUrl?: string;
  averageHex?: string;
  palette?: string[];
  width?: number;
  height?: number;
  bytes?: number;
  thumbBytes?: number;
};

const TS_RE = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z|(\d{4})-(\d{2})-(\d{2})[T_](\d{2})[-:](\d{2})(?:[-:](\d{2}))?/;

let cache: SkyImage[] | null = null;
let inflight: Promise<SkyImage[]> | null = null;
let retention: SkyManifestRetention | null = null;

export function getSkyRetention(): SkyManifestRetention | null {
  return retention;
}

export function parseCapturedAt(id: string, fallbackIso?: string): Date {
  if (fallbackIso) {
    const d = new Date(fallbackIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const m = id.match(TS_RE);
  if (m?.[1]) {
    const [, y, mo, d, h, mi, s] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  }
  if (m?.[7]) {
    const [, , , , , , , y, mo, d, h, mi, s] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0));
  }
  return new Date(0);
}

export function resolveAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/?$/, "/")}${path.replace(/^\/+/, "")}`;
}

export function resolveSkyAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/^\/+/, "");
  return resolveAssetUrl(clean.startsWith("sky/") ? clean : `sky/${clean}`);
}

async function fetchManifest(): Promise<SkyManifest> {
  const url = resolveAssetUrl("sky/manifest.json");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`sky manifest ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) throw new Error("sky manifest missing or non-json");
  const data = await res.json();
  if (data?.version !== 1 || !Array.isArray(data.images)) {
    throw new Error("sky manifest has an unsupported shape");
  }
  return data;
}

export async function listSkyImages(force = false): Promise<SkyImage[]> {
  if (cache && !force) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const manifest = await fetchManifest();
      retention = manifest.retention ?? null;
      const mapped = manifest.images
        .map((r) => ({
          id: r.id,
          capturedAt: parseCapturedAt(r.id, r.capturedAt),
          imageUrl: resolveSkyAssetUrl(r.imageUrl),
          thumbUrl: resolveSkyAssetUrl(r.thumbUrl ?? r.imageUrl),
          averageHex: r.averageHex,
          palette: r.palette,
          width: r.width,
          height: r.height,
          bytes: r.bytes,
          thumbBytes: r.thumbBytes,
        }))
        .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
      cache = mapped;
      return mapped;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
