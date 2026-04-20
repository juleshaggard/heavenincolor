

# Sky Archive — a chromatic timelapse archive for your Pi

A "Deep dusk + chromatic" interface that turns a single growing folder of Cloudinary sky photos into a living, scrubbable, generative-art-leaning archive. Built to scale to thousands of frames.

## Setup

- **Cloud name** `dc2xbsh7h` is hardcoded (it's public). We will **not** use the API secret you pasted — please rotate it in Cloudinary now.
- Enable **Lovable Cloud**. We use it for:
  - A tiny Edge Function `list-sky-images` that calls the Cloudinary Admin API (server-side, secret-safe) and returns paginated, sorted image metadata.
  - A `sky_image_meta` table caching `{public_id, captured_at, width, height, dominant_hex, palette[5], avg_lab}` so palette extraction runs **once per image**, then thousands load instantly.
  - A scheduled job that incrementally pulls new uploads every 15 min and computes palettes for new ones only.
- Image filename convention: `YYYY-MM-DDTHH-mm-ss.jpg` in a single folder. Capture time parsed from the filename (fallback to Cloudinary `created_at`).
- Palette extraction: client-side k-means on a tiny Cloudinary thumbnail (`w_64`) the first time an image is seen, then persisted server-side.

## Aesthetic

- Near-black canvas (`#0A0A0B`), 1px hairline dividers in `#1A1A1D`.
- Oversized display serif (Fraunces) for hero numerals + dates; mono (JetBrains Mono) for timestamps and hex codes; clean sans (Inter) for body.
- The **only** color in the UI comes from the sky itself — palette swatches, glowing thumbnails, and a subtle ambient backdrop tint pulled from the most-recent image.
- Generative touches: animated noise grain overlay, palette swatches that bloom on hover, smooth chromatic crossfades between frames, a subtle "aurora" gradient footer driven by today's average sky color.

## Pages & features

### 1. Home — "Now"
- Full-bleed **latest image** with a slow Ken Burns drift.
- Overlay: huge timestamp, location-agnostic caption ("4 minutes ago · golden hour"), 5-swatch palette, dominant hex.
- Auto-refreshes every 60s.
- Bottom rail: a horizontally-scrolling **today's color strip** — every frame from today rendered as a 4px-wide vertical bar, forming a gradient of the day so far.

### 2. Timelapse
- A scrubbable timeline (day / week / month toggle).
- Play / pause / speed (1×, 4×, 16×, 60×). Playback uses preloaded thumbnails for buttery scrubbing, swaps to full-res on pause.
- Below the player: a **chromatic ribbon** — the same gradient strip as Home but for the chosen range. Click anywhere on the ribbon to jump to that moment. The ribbon doubles as a scrub bar.
- Keyboard: ←/→ frame, space play/pause.

### 3. Calendar / Heatmap
- GitHub-style year heatmap, but each day cell is colored by that day's **average sunset hue** (sampled 1h around local sunset).
- Hover a day → mini popover with that day's gradient strip + thumbnail.
- Click → opens that day in Timelapse.

### 4. Compare
- Two-pane side-by-side (or draggable split-view slider).
- Pick day A and day B from a date picker or from the Calendar.
- Synchronized scrubbing — both panes move together through the same time-of-day.
- Below: stacked gradient strips of A and B for at-a-glance color comparison + a delta strip showing perceptual color difference (ΔE in Lab) over the day.

### 5. Palette / Archive
- Infinite-scroll grid of every frame, virtualized so thousands stay smooth.
- Each tile: thumbnail + a thin 5-swatch palette bar underneath.
- Filter chips: time-of-day (dawn / day / golden / dusk / night), dominant hue band (drag a hue wheel), date range.
- Sort: chronological, by saturation, by warmth, by "most unusual" (palette distance from rolling average).
- Click a tile → lightbox with full-res, palette, hex codes (click to copy), capture time, and "see this moment in Timelapse".

## Navigation

Sticky top bar, ultra-minimal: `Sky` wordmark · `Now` · `Timelapse` · `Calendar` · `Compare` · `Archive`. The nav background subtly tints to the latest sky's dominant color (10% opacity).

## Performance & scale (built-in from day one)

- All listing goes through paginated Cloudinary search (`max_results=500` + `next_cursor`), cached in the `sky_image_meta` table.
- Thumbnails use Cloudinary transformations: `f_auto,q_auto,w_320` for grid, `w_64` for ribbons/heatmap, `w_1600` for hero.
- Virtualized lists (`@tanstack/react-virtual`) for the archive.
- Palette computation memoized in DB — never recomputed.
- Skeleton states + progressive blur-up loading everywhere.

## Out of scope for v1 (easy follow-ups)

- Audio/ambient soundtrack tied to color, sharing/export of timelapse videos, public per-day permalinks, mobile PWA install, Pi upload-status dashboard.

