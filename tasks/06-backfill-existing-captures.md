# Task: Backfill Existing Captures

## Status

<!-- TODO | IN PROGRESS | DONE | SKIPPED -->
<!-- Detailed state here; PLAN.md checkbox is source of truth for completion -->

DONE

## Requires

- Task 05 must be complete

## Description

Migrate the existing image backlog into the GitHub-hosted asset layout up to the chosen rolling size cap. This task proves that the new flow keeps as many captures as fit under the storage threshold instead of stopping at Cloudinary's fixed 1000-image limit.

## Proposed Solution

Run the Pi sync tool against the full capture history in a staging media checkout. Let the sync retain newest captures and prune oldest captures until the generated snapshot fits below the cap, publish the squashed/orphan media snapshot to GitHub, and let GitHub Pages deploy that current retained dataset.

## Subtasks

- [ ] Run a dry-run backfill and capture expected retained counts, pruned counts, bytes, and generated file paths.
- [ ] Run the backfill against the chosen GitHub asset layout.
- [ ] Publish the generated manifest and assets as the current retained media snapshot.
- [ ] Push the branch and verify GitHub accepts all files without size warnings or blocked files.
- [ ] Confirm the manifest image count plus pruned count matches the intended post-filter capture count.
- [ ] Confirm the oldest retained timestamp is the expected first image after cap-based pruning.
- [ ] Keep Cloudinary live until the staged GitHub Pages site passes task 07.

## Files to Modify

- `public/sky/manifest.json` - Full generated manifest.
- `public/sky/images/**` - Optimized web images.
- `public/sky/thumbs/**` - Thumbnail images.
- `docs/media-audit.md` - Final observed backfill totals.

## Verification

- [ ] Generated manifest count equals expected retained capture count.
- [ ] Retained byte total is below the configured cap.
- [ ] No generated file exceeds GitHub's regular repository file size limits.
- [ ] `git status --short` shows only expected generated assets and docs before commit.
- [ ] GitHub Actions deployment completes successfully after the backfill push.
- [ ] Staged site can load the manifest and initial image set from GitHub Pages.

## Notes

If the newest retained capture plus minimum viable history cannot fit under the configured cap, reduce derivative sizes or quality before considering sharding.
