# Heaven in Color

Static React/Vite site for the sky archive captured by the Raspberry Pi.

## Staging

GitHub Pages staging deploys from `main` to:

https://juleshaggard.github.io/heavenincolor/

The staging workflow intentionally does not configure a custom domain. Cut the domain over only after the GitHub Pages version is verified.

## Images

Sky images are loaded from `public/sky/manifest.json`. The Pi sync tool writes 128px hosted images plus 64px thumbnails and prunes oldest retained captures when the published media set would exceed the configured cap.

Current generated archive:

- 1,642 retained captures
- 0 pruned captures
- 2,671,999 JPEG bytes reported in the manifest
- 900 MiB configured published-media cap

## Commands

```bash
npm install
npm test
npm run build
npm run preview
```
