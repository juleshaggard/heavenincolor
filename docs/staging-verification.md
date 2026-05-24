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

- Site commit pushed to `juleshaggard/heavenincolor`.
- First Pages workflow failed because GitHub Pages is not enabled and the repository is currently private on a plan that does not support private Pages.
- Next step: make `juleshaggard/heavenincolor` public, then rerun the Pages workflow.
