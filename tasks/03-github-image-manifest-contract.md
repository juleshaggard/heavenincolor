# Task: GitHub Image Manifest Contract

## Status

<!-- TODO | IN PROGRESS | DONE | SKIPPED -->
<!-- Detailed state here; PLAN.md checkbox is source of truth for completion -->

DONE

## Requires

- Task 02 must be complete

## Description

Define the static data contract that replaces Cloudinary's tag list. The site should load a GitHub-hosted manifest that describes every currently retained capture without relying on Cloudinary APIs or transformations.

## Proposed Solution

Add a manifest schema with stable fields for capture identity, capture time, full image URL, thumbnail URL, average color, dimensions, generated time, retained count, and retained byte total. Build a small TypeScript client around that schema, including URL resolution relative to `import.meta.env.BASE_URL`, sorting, filtering, and tests for timestamp parsing.

## Subtasks

- [ ] Add a sample `public/sky/manifest.json` with versioned metadata and a tiny fixture image or placeholder entry for local development.
- [ ] Include manifest-level retention metadata: cap bytes, retained bytes, oldest retained timestamp, newest retained timestamp, and source total count if known.
- [ ] Create a new TypeScript module, such as `src/lib/skyImages.ts`, that owns `SkyImage`, manifest loading, URL resolution, and timestamp parsing.
- [ ] Preserve the current filtering behavior from `src/hooks/useSkyImages.ts`, including the April 24, 2026 minimum capture date and explicit excluded frame.
- [ ] Add tests for manifest parsing, relative URL resolution, chronological sorting, and malformed manifest handling.
- [ ] Document the manifest schema for the Pi sync tool.

## Files to Modify

- `public/sky/manifest.json` - Initial staged manifest fixture with retention metadata.
- `src/lib/skyImages.ts` - New GitHub-hosted image client and types.
- `src/hooks/useSkyImages.ts` - Import the new data client while keeping hook behavior.
- `src/test/skyImages.test.ts` - Manifest parsing and URL behavior tests.
- `docs/image-hosting.md` - Manifest schema and examples.

## Verification

- [ ] Tests pass: `npm test` (timeout: 5min)
- [ ] Builds without errors: `npm run build` (timeout: 5min)
- [ ] Missing or malformed manifests surface a helpful error state without crashing the app.
- [ ] The hook returns images sorted from oldest to newest, matching the current site assumptions.

## Notes

Keep this contract independent of where GitHub stores the assets. If the audit selects sharded media repos, the manifest can still point to absolute GitHub Pages URLs.
