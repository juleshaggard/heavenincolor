# Task: Refactor Site off Cloudinary

## Status

<!-- TODO | IN PROGRESS | DONE | SKIPPED -->
<!-- Detailed state here; PLAN.md checkbox is source of truth for completion -->

DONE

## Requires

- Task 03 must be complete

## Description

Remove Cloudinary as the frontend image source. All archive, calendar, compare, timelapse, and lightbox views should render from GitHub-hosted manifest data and image URLs.

## Proposed Solution

Replace imports from `src/lib/cloudinary.ts` with the new manifest client. Update `SkyThumb`, palette helpers, lightbox links, and any width-specific image code so they use precomputed GitHub image and thumbnail URLs instead of Cloudinary transformations.

## Subtasks

- [ ] Update `SkyThumb` to render `image.thumbUrl` or `image.imageUrl` directly, with optional `srcSet` if multiple generated sizes are available.
- [ ] Update lightbox/download links to use the GitHub-hosted full image URL.
- [ ] Update palette and color ribbon code to prefer manifest `averageHex` or manifest palette data instead of fetching Cloudinary-transformed images.
- [ ] Rename or delete Cloudinary-specific helpers once no imports remain.
- [ ] Search for remaining `cloudinary`, `cldUrl`, `public_id`, and Cloudinary URL references and remove them.
- [ ] Verify all routes that currently use sky images still work with more than 1000 manifest entries.

## Files to Modify

- `src/components/sky/SkyThumb.tsx` - Render GitHub-hosted images.
- `src/components/sky/Filmstrip.tsx` - Use manifest image URLs and counts.
- `src/components/sky/ColorRibbon.tsx` - Use manifest colors or updated palette helpers.
- `src/lib/palette.ts` - Remove Cloudinary URL assumptions.
- `src/pages/Archive.tsx` - Update lightbox and download behavior.
- `src/pages/Now.tsx` - Remove Cloudinary imports.
- `src/pages/Timelapse.tsx` - Remove Cloudinary imports.
- `src/lib/cloudinary.ts` - Delete or replace with compatibility wrapper during the migration.

## Verification

- [ ] Tests pass: `npm test` (timeout: 5min)
- [ ] Builds without errors: `npm run build` (timeout: 5min)
- [ ] `rg -n "cloudinary|Cloudinary|cldUrl|public_id" src public` returns no active frontend dependency.
- [ ] Archive, Now, Calendar, Compare, and Timelapse render against a manifest containing more than 1000 entries.
- [ ] Browser network inspection shows no requests to `res.cloudinary.com`.

## Notes

This task should preserve the current UI behavior. The visible difference is that the data source becomes GitHub-hosted and no image disappears because of Cloudinary pruning.
