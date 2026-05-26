# Image Hosting

## Layout

The published site reads:

```text
public/sky/
├── manifest.json
├── images/YYYY/MM/<timestamp>.jpg
└── thumbs/YYYY/MM/<timestamp>.jpg
```

The current publisher caps `images/` files at 128px wide and `thumbs/` files at 64px wide.

## Manifest

`public/sky/manifest.json` is versioned and contains retention metadata plus image records:

```json
{
  "version": 1,
  "generatedAt": "2026-05-24T17:00:00Z",
  "retention": {
    "capBytes": 943718400,
    "retainedBytes": 2671999,
    "retainedCount": 1642,
    "sourceCount": 1642,
    "prunedCount": 0,
    "oldestCapturedAt": "2026-04-20T22:43:38Z",
    "newestCapturedAt": "2026-05-24T16:57:16Z"
  },
  "images": [
    {
      "id": "20260524T165716Z",
      "capturedAt": "2026-05-24T16:57:16Z",
      "imageUrl": "images/2026/05/20260524T165716Z.jpg",
      "thumbUrl": "thumbs/2026/05/20260524T165716Z.jpg",
      "averageHex": "#9da9b4",
      "cropAverageHex": "#99a4ae",
      "cropPalette": ["#7d8791", "#9aa4ae", "#b6bec5", "#c6c9ca", "#d2d2cf"],
      "width": 128,
      "height": 72,
      "bytes": 1415,
      "thumbBytes": 863
    }
  ]
}
```

All relative URLs are resolved under Vite's `BASE_URL`, so the same manifest works locally and on the custom domain.

`averageHex` is the full-frame camera average. `cropAverageHex` and `cropPalette` are computed from the center-square crop used by the archive sprites and color-immersion modal, so the modal colors match the image area a visitor actually sees.

## Pi Publishing

On the Pi, use:

```bash
/home/haggy/skywatcher/.venv/bin/python /home/haggy/skywatcher/github_media_sync.py --output-dir /home/haggy/heavenincolor/public/sky --commit
```

Recommended environment:

```bash
SKY_MEDIA_ROOT=/home/haggy/heavenincolor
SKY_GIT_BRANCH=main
SKY_GIT_COMMIT=true
SKY_PUBLISHED_CAP_MIB=900
SKY_IMAGE_MAX_WIDTH=128
SKY_THUMB_MAX_WIDTH=64
SKY_PRUNE_ENABLED=true
```

When the cap is reached, the sync keeps newest captures and removes the oldest retained files and manifest entries before publishing the newest capture.
