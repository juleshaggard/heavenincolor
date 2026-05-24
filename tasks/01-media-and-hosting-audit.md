# Task: Media and Hosting Audit

## Status

<!-- TODO | IN PROGRESS | DONE | SKIPPED -->
<!-- Detailed state here; PLAN.md checkbox is source of truth for completion -->

DONE

## Requires

- None

## Description

Measure the existing image library and projected growth before deciding exactly how GitHub should host the captures. This task turns "host images on GitHub" into a concrete rolling asset layout that fits GitHub Pages and repository limits.

## Proposed Solution

Inspect the Pi capture directory, history metadata, and average file sizes. Estimate the size of full-resolution originals, web-sized images, and thumbnails, then choose a published-media threshold below 1 GB and the exact pruning behavior that removes oldest retained captures before adding new ones.

## Subtasks

- [ ] Count all existing captures and compare that count to `../Pi build/data/history.json` when available.
- [ ] Measure total bytes, average bytes per image, largest image size, and expected monthly growth at the current 30-minute capture interval.
- [ ] Generate a small sample of optimized derivatives, capped at 128px display images with smaller thumbnails, and measure their size.
- [ ] Choose the staged asset layout: `sky/images/YYYY/MM/...`, `sky/thumbs/YYYY/MM/...`, and `sky/manifest.json` in a GitHub media snapshot consumed by the site build.
- [ ] Choose the published-media cap and warning threshold, such as prune at 900 MiB and hard-stop at 975 MiB.
- [ ] Define how many oldest captures must be removed before each new capture when the projected snapshot would exceed the threshold.
- [ ] Record the decision, size estimates, and rollback considerations in a short audit document.

## Files to Modify

- `docs/media-audit.md` - Audit results, hosting decision, expected growth, and limits.
- `docs/image-hosting.md` - Final asset layout and manifest URL conventions.

## Verification

- [ ] Capture count matches the Pi history count or any mismatch is explained.
- [ ] Largest planned web asset is below GitHub's 100 MiB hard file limit.
- [ ] Projected retained asset size for staging is below the chosen threshold.
- [ ] Audit document identifies the exact staging image base URL the site will use.
- [ ] Audit document explains that oldest retained images are pruned by size, not by a fixed image count.

## Notes

The goal is to make GitHub work without recreating Cloudinary's hidden 1000-image ceiling. The new ceiling should be storage-based and explicit: keep as many optimized captures as fit under the chosen cap, then prune oldest first.
