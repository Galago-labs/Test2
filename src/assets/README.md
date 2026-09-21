# Local Image Assets

All 57 images exist as actual named files under `public/images/`, embedded directly into the game — nothing is fetched over the network or loaded from a remote image service.

There is deliberately no in-game or build-time way to export, catalog, or download this artwork as a separate file. It ships only as pixels rendered inside the compiled game, and — as of the native Android build — only inside the single self-contained `index.html`, never as loose files an archive tool could extract. See `../../native/README.md` for why the native package is built that way.

## Source Files

| Asset | File(s) on disk | Use |
| --- | --- | --- |
| Original Momo and bedroom illustration | `public/images/nap-room.jpg` | Main scene, loading validation, and reward collection preview |
| Momo's alternate expressions | `public/images/momo-{anxious,awake,content}.png` | Swapped in during gameplay depending on how the dream is going |
| Per-scenario dream-reveal illustrations | `public/images/dream-{afternoon,breeze,fireflies}.png` | Shown in the Dream Journal once a scenario is fully completed (5/5) |
| Six gift illustrations | `public/images/rewards/*.svg` | My Little Room, including locked gift previews |
| Six distinct trophy illustrations | `public/images/trophies/*.svg` | Dream Journal; no shared generic trophy placeholder |
| Seven game illustrations | `public/images/game/*.svg` | Cloud, moon, alarm, pillow, firefly, maple leaf, brand moon |
| 31 UI icons, favicon, and paper texture | `public/images/ui/*.svg` | Every game interface icon and decorative texture |

The original 211,835-byte JPEG was generated during the initial implementation and saved into the project. It is a real local binary file, not a URL, a placeholder, or an LFS pointer, and has not been redrawn or replaced. The unused experimental `quiet-room.jpg` was removed early on and stays removed.

## How Bundling Works

`src/assets/images.ts` imports the JPEG and PNGs with Vite's explicit `?inline` suffix. Vite reads each file at build time and emits a `data:image/...;base64,...` URL. `GAME_IMAGES` (room + Momo's expressions) and `DREAM_IMAGES` (the three per-scenario reveals) are separate exported maps — the dream images are optional per-scenario rewards, not core assets needed before any dream completes.

`src/assets/vectors.ts` eagerly imports every local SVG as raw source (`import.meta.glob(..., { query: '?raw', eager: true })`). `LocalSvg` renders the corresponding trusted file body; `NapArt`, `DecorationArt`, `TrophyArt`, and `Icons` are small adapters around those exact source files. No second hidden drawing definition or runtime fetch is used. SVGs contain no external images, scripts, or fonts.

`src/main.tsx` sets the favicon and paper texture from their embedded SVG data URLs. Do not replace these imports with string paths like `./images/...` or `/images/...` — the SVG namespace URL identifies the file format, it is not a network request.

The single-file production build (`npm run build`, `dist/index.html`) embeds all artwork bytes, CSS, scripts, and fonts in that one file. `vite-plugin-singlefile` is what makes this possible — do not add a second build target that skips it, and do not point the native wrapper (`native/capacitor.config.ts`'s `webDir`) at the raw `dist/` folder instead of the stripped single-file output; see `native/README.md`.

Image retry restarts the local decoder using the same data URL. It never appends `?retry=` to embedded base64 bytes.

## Yandex SDK Is Preserved

None of the above changes how the game talks to the platform. Production builds load `/sdk.js` and call `YaGames.init()` by default. There are no host/referrer allowlists, browser-online gates, file-protocol gates, or hidden offline flags gating that call. `?platform=standalone` remains an explicit developer override, not automatic release behavior; `?platform=yandex` enables SDK testing through the official local proxy.

Game Ready, gameplay reporting, platform pause/resume, language detection, and fullscreen all stay connected to the SDK. A real SDK error still follows the existing bounded error/fallback path — local artwork being available is never a reason to skip platform initialization.

## Verification

`tests/assets.test.ts` covers: the JPEG is a real local binary (not an LFS pointer), every image enters the module graph through an explicit local import (no bare `images/...` paths, no remote URLs), and the production build embeds the original JPEG byte-for-byte. Run for real — `tsc --noEmit`, `vite build`, and the full `node --test` suite — plus the built game has been exercised in an actual browser.
