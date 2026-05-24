# Task: Stage and Verify End to End

## Status

<!-- TODO | IN PROGRESS | DONE | SKIPPED -->
<!-- Detailed state here; PLAN.md checkbox is source of truth for completion -->

IN PROGRESS

## Requires

- Task 06 must be complete

## Description

Prove the GitHub-hosted site is fully operational before touching the custom domain. The staged GitHub Pages URL should behave like production and show every image currently retained by the rolling cap.

## Proposed Solution

Use local build checks, browser verification, and deployed GitHub Pages checks. Confirm the retained image count, retention metadata, navigation, SPA routing, lightbox, timeline, archive filtering, and Pi update path without any custom domain DNS change.

## Subtasks

- [ ] Run the local test and build suite after the backfill.
- [ ] Open the local preview and test Archive, Now, Calendar, Compare, Timelapse, and direct deep links.
- [ ] Open the deployed GitHub Pages staging URL and repeat the same route checks.
- [ ] Confirm the manifest count shown or logged by the site is greater than 1000 when enough captures fit under the configured size cap.
- [ ] Confirm retention metadata reports cap bytes, retained bytes, oldest retained capture, and newest retained capture.
- [ ] Confirm no Cloudinary network requests are made.
- [ ] Trigger or simulate one new Pi capture sync near the cap and verify it appears on staging after GitHub Pages deploys while the oldest retained capture disappears.
- [ ] Record the staging URL, verification notes, and any known issues.

## Files to Modify

- `docs/staging-verification.md` - Verification checklist, staging URL, image count, and signoff notes.
- `README.md` - Link to the staged deployment and operational notes if needed.

## Verification

- [ ] Tests pass: `npm test` (timeout: 5min)
- [ ] Builds without errors: `npm run build` (timeout: 5min)
- [ ] GitHub Pages URL loads without a custom domain.
- [ ] Browser route refreshes do not 404.
- [ ] Staged site shows every currently retained capture according to the manifest count.
- [ ] A new synced Pi capture appears on the staged site after deployment.

## Notes

This is the approval gate. The Lovable-hosted custom domain should remain in place until this task is complete and accepted.
