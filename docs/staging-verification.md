# Staging Verification

## Local Verification

- `npm test`: passed, 5 tests
- `npm run build`: passed
- `npm ci`: passed
- `npm run lint`: passed with warnings only
- Cloudinary references in `src` and `public`: none
- Manifest retained captures: 1,642
- Manifest pruned captures: 0
- Manifest retained bytes: 2,671,999
- Browser preview: `http://127.0.0.1:4173/`
- Route smoke checks passed: `/`, `/now`, `/calendar`, `/compare`, `/archive`
- Browser image check: 0 broken images on checked routes

## Pi Verification

- SSH verified with key against the local Raspberry Pi
- App path: `/home/haggy/skywatcher`
- Source captures found on Pi: 1,642
- Real generation completed into `/home/haggy/skywatcher/generated-sky`
- Low-cap pruning test: 1 MiB cap retained 692 and pruned 950

## GitHub Pages

- Site repository: `juleshaggard/heavenincolor`
- Repository visibility: public, so GitHub Pages can serve the staged build
- Staging URL before cutover: `https://juleshaggard.github.io/heavenincolor/`
- Custom domain after cutover: `https://heavenincolor.com/`
- Pages build type: workflow
- Latest Pages workflow: passed
- Runtime checks on staging passed for `/`, `/now`, `/calendar`, `/compare`, and `/archive`
- Browser image check on staging: 0 broken images on checked routes
- Runtime Cloudinary/Lovable references on staging: none found
- App rendering source: full `public/sky/manifest.json` list, with no date cutoff filter
- Staging screenshot: `docs/staging-home.png`
