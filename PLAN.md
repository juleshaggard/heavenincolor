# Plan: Move Heaven in Color to GitHub Pages with GitHub-Hosted Images

## Problem

The public site is still shaped like a Lovable project and depends on Cloudinary for sky image listing and image delivery. The Raspberry Pi uploader intentionally prunes Cloudinary history at 1000 images, which prevents the main site from showing every capture.

## Solution

Deploy the Vite/React site from GitHub with a GitHub Actions workflow and stage it first at the default GitHub Pages URL, with no custom domain configured during staging. Replace the Cloudinary data source with a GitHub-hosted manifest and image URL layer, then have the Raspberry Pi publish optimized web images and manifest updates into GitHub in batches.

Start with a media audit because GitHub Pages and regular Git have practical limits for large image collections. Use a rolling published-media window: when the next capture would push the staged image set close to the 1 GB GitHub Pages cap, remove the oldest retained capture files and manifest entries before adding the newest one. To avoid normal Git history growth from binary churn, publish media as a squashed/orphan GitHub media snapshot rather than appending every image forever to `main`.

## Tasks

<!-- Tasks are numbered in execution order. Each task depends on all previous tasks being complete. -->

- [x] [01-media-and-hosting-audit](tasks/01-media-and-hosting-audit.md) - Measure the image collection, confirm GitHub Pages constraints, and choose the GitHub asset layout.
- [x] [02-github-pages-staging-deploy](tasks/02-github-pages-staging-deploy.md) - Add a GitHub Pages staging deployment for the Vite site without a custom domain.
- [x] [03-github-image-manifest-contract](tasks/03-github-image-manifest-contract.md) - Define the manifest schema and client-side GitHub image data model.
- [x] [04-refactor-site-off-cloudinary](tasks/04-refactor-site-off-cloudinary.md) - Replace Cloudinary listing and transform URLs with GitHub-hosted manifest/image URLs.
- [x] [05-pi-github-media-sync](tasks/05-pi-github-media-sync.md) - Add Raspberry Pi tooling to publish optimized captures with a rolling size cap.
- [x] [06-backfill-existing-captures](tasks/06-backfill-existing-captures.md) - Seed the GitHub-hosted image layout up to the rolling size cap.
- [ ] [07-stage-and-verify-end-to-end](tasks/07-stage-and-verify-end-to-end.md) - Verify the staged GitHub Pages site is fully operational and shows every retained image.
- [ ] [08-custom-domain-cutover](tasks/08-custom-domain-cutover.md) - After staging approval, move the custom domain from Lovable to GitHub Pages.

## Dependencies

- Admin access to `juleshaggard/heavenincolor` for Pages settings and GitHub Actions deployment.
- Write access or a fine-grained GitHub token for the Raspberry Pi to push image/manifest updates.
- Access to the Pi capture directory, expected at `../Pi build/data/captures` on the device.
- DNS provider access for the eventual custom domain cutover, intentionally deferred until staging is approved.
- A chosen published-media threshold below 1 GB, such as 900 MiB, so the Pi can prune oldest retained images before adding new captures.

## Notes

- Staging target: `https://juleshaggard.github.io/heavenincolor/` unless repository settings produce a different GitHub Pages URL.
- Do not configure a `CNAME` file or GitHub Pages custom domain until task 08.
- Current site image dependencies are centered in `src/lib/cloudinary.ts`, `src/hooks/useSkyImages.ts`, and the sky components.
- Current Pi limit is `CLOUDINARY_MAX_IMAGES = 1000` in `../Pi build/app.py`.
- GitHub Pages currently documents a 1 GB recommended source repository limit, a 1 GB published site limit, and a 100 GB/month soft bandwidth limit: https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/github-pages-limits
- Deleting old media from a normal Git branch does not erase those files from repository history, so the media publishing path should squash or force-publish the current retained snapshot instead of accumulating binary commits indefinitely.
- Regular GitHub repositories warn above 50 MiB per file and block files above 100 MiB, so the migration should publish web-sized derivatives rather than raw camera originals: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
- GitHub Pages supports custom GitHub Actions workflows with `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
