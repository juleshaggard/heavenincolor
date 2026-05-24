# Task: GitHub Pages Staging Deploy

## Status

<!-- TODO | IN PROGRESS | DONE | SKIPPED -->
<!-- Detailed state here; PLAN.md checkbox is source of truth for completion -->

DONE

## Requires

- Task 01 must be complete

## Description

Add a repeatable GitHub Pages deployment for the React/Vite site while keeping the custom domain untouched. The staged site should publish from GitHub Actions to the repository's default Pages URL.

## Proposed Solution

Create a GitHub Actions workflow that installs dependencies, builds the Vite app, prepares SPA fallback routing, uploads the `dist/` artifact, and deploys to GitHub Pages. Configure Vite's base path for project Pages, and remove Lovable-specific project text or build hooks once staging is stable.

## Subtasks

- [ ] Add `.github/workflows/pages.yml` using `actions/checkout`, Node setup, `npm ci`, `npm run build`, `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`.
- [ ] If media lives on a separate squashed snapshot branch, check out that branch during the workflow and copy its `sky/` folder into the Pages artifact before upload.
- [ ] Set the Vite base path so assets resolve under `/heavenincolor/` on the default GitHub Pages project URL.
- [ ] Add an SPA fallback step that copies `dist/index.html` to `dist/404.html`.
- [ ] Update the README with GitHub Pages staging instructions and remove the Lovable placeholder copy.
- [ ] Remove or isolate `lovable-tagger` so production/staging builds no longer depend on Lovable tooling.
- [ ] Leave custom domain settings and any `CNAME` file absent.

## Files to Modify

- `.github/workflows/pages.yml` - GitHub Pages staging deployment workflow.
- `vite.config.ts` - Project Pages base path and any Lovable tagger removal.
- `package.json` - Scripts or dependency cleanup if Lovable tooling is removed.
- `package-lock.json` - Lockfile update if dependencies change.
- `README.md` - GitHub Pages staging runbook.

## Verification

- [ ] Tests pass: `npm test` (timeout: 5min)
- [ ] Builds without errors: `npm run build` (timeout: 5min)
- [ ] Preview works locally: `npm run preview -- --host 127.0.0.1` (timeout: 2min)
- [ ] GitHub Actions publishes a Pages deployment at the default GitHub Pages URL.
- [ ] The deployed page loads JS/CSS assets without 404s under the `/heavenincolor/` base path.

## Notes

This task only stages the app. Do not add a custom domain in GitHub settings and do not add a `public/CNAME` file.
