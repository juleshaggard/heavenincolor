# Task: Pi GitHub Media Sync

## Status

<!-- TODO | IN PROGRESS | DONE | SKIPPED -->
<!-- Detailed state here; PLAN.md checkbox is source of truth for completion -->

DONE

## Requires

- Task 04 must be complete

## Description

Teach the Raspberry Pi build to publish captures to GitHub instead of Cloudinary. The sync should generate web-ready images, prune oldest retained captures when the next upload would approach the chosen cap, update the manifest, and push changes in batches so the staged GitHub Pages site stays current.

## Proposed Solution

Add a standalone Python sync script in `../Pi build` that reads `data/history.json` and `data/captures/*.jpg`, writes optimized derivatives into a configured GitHub media snapshot checkout, updates `sky/manifest.json`, commits the current retained snapshot, and force-publishes a squashed/orphan media branch. Keep the Flask capture loop responsible for taking photos, and run the sync on a timer or after captures with batching to avoid excessive GitHub pushes.

## Subtasks

- [ ] Add configuration variables for GitHub media sync, including repo checkout path, branch, commit identity, push cadence, and dry-run mode.
- [ ] Add configuration variables for retention, including cap bytes, warning bytes, and whether pruning is enabled.
- [ ] Add a sync script that generates 128px web images and smaller thumbnails with Pillow while preserving capture timestamps and average colors.
- [ ] Before writing a new capture into the media snapshot, compute projected retained bytes and delete the oldest retained image/thumb pairs plus manifest entries until the new capture fits below the configured cap.
- [ ] Make the sync idempotent so reruns do not rewrite unchanged image files or reorder the manifest unnecessarily.
- [ ] Publish the media snapshot in a way that does not keep normal binary history forever, such as an orphan branch with a single current snapshot commit.
- [ ] Add a systemd timer or documented cron entry that batches pushes, such as hourly or daily, instead of committing every 30-minute capture.
- [ ] Disable Cloudinary pruning/uploading once GitHub sync is confirmed in staging.
- [ ] Update Pi setup docs for GitHub token setup and the media checkout location.

## Files to Modify

- `../Pi build/github_media_sync.py` - New GitHub media publishing script.
- `../Pi build/app.py` - Remove or gate Cloudinary upload/prune calls after sync is live.
- `../Pi build/.env.example` - GitHub sync configuration examples.
- `../Pi build/requirements.txt` - Dependencies for image optimization if needed.
- `../Pi build/install_pi.sh` - Optional install steps for git config, sync service, or timer.
- `../Pi build/README.md` - Setup, dry-run, and recovery instructions.
- `../Pi build/skywatcher-media-sync.service` - Optional systemd sync service.
- `../Pi build/skywatcher-media-sync.timer` - Optional systemd sync timer.

## Verification

- [ ] Dry run reports expected new or changed captures without writing files.
- [ ] Dry run reports which oldest captures would be pruned when projected bytes exceed the cap.
- [ ] One-shot sync writes optimized images, thumbnails, and manifest entries for a small sample set.
- [ ] Re-running sync produces no Git diff when inputs have not changed.
- [ ] A cap-limit test starts with a nearly full media snapshot, adds one new capture, and verifies the oldest retained capture is removed before the newest one is published.
- [ ] Git commit and push succeed from the Pi or a staging clone.
- [ ] Cloudinary credentials are no longer required for new captures after GitHub sync is enabled.

## Notes

Keep the old Cloudinary path available behind configuration until the staged GitHub Pages site has been verified. The GitHub path should have an explicit storage cap, not a fixed image-count cap.
