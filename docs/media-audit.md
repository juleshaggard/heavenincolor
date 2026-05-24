# Media Audit

## Current Pi Source

- Pi host: local Raspberry Pi on the private LAN
- App path: `/home/haggy/skywatcher`
- Source capture folder: `/home/haggy/skywatcher/data/captures`
- Source history: `/home/haggy/skywatcher/data/history.json`
- Source captures: 1,642
- Source originals: 319 MB on disk, 330,985,542 bytes by file sum
- Source date range: 2026-04-20T22:43:38Z to 2026-05-24T16:57:16Z
- Source image sizes observed: 1280x720 and 2304x1296
- Largest source JPG observed: 569,558 bytes

## GitHub Published Media

Generated with `../Pi build/github_media_sync.py` using:

- Hosted image max width: 128px
- Thumbnail max width: 64px
- Hosted image quality: 76
- Thumbnail quality: 68
- Published cap: 900 MiB

Result:

- Retained captures: 1,642
- Pruned captures: 0
- Generated image files: 1,642
- Generated thumbnail files: 1,642
- Manifest-reported JPG bytes: 2,671,999
- Local filesystem usage: about 13 MB
- Average generated JPG file: 814 bytes
- Largest generated JPG file: 2,554 bytes

## Retention Behavior

The site should not rely on a fixed image-count limit. The Pi publisher keeps newest captures first, computes the projected published bytes, and skips/removes the oldest retained capture pairs when the next capture would exceed the configured cap.

A forced 1 MiB cap test against the generated output retained 692 captures and pruned 950, proving the pruning path removes oldest captures before keeping newest captures.

## Decision

Use the site repo's `public/sky/` folder for staging and production because the 128px generated archive is far below GitHub Pages' 1 GB published-site cap. Keep the cap at 900 MiB so there is a clear buffer below the Pages limit.
