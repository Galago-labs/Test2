# Local Image Assets

All 51 images now exist as actual named files under `public/images/`. Open `public/images/catalog.html` to see the entire set without a server or network. `public/images/manifest.json` lists every file.

## Source Files

| Asset | File on disk | Use |
| --- | --- | --- |
| Original Momo and bedroom illustration | `public/images/nap-room.jpg` | Main scene, loading validation, and reward collection preview |
| Six gift illustrations | `public/images/rewards/*.svg` | My Little Room, including locked gift previews |
| Six distinct trophy illustrations | `public/images/trophies/*.svg` | Dream Journal; no shared generic trophy placeholder |
| Seven game illustrations | `public/images/game/*.svg` | Cloud, moon, alarm, pillow, firefly, maple leaf, brand moon |
| All 29 UI icons, favicon, and paper texture | `public/images/ui/*.svg` | Every game interface icon and decorative texture |

The original 211,835-byte JPEG was generated during the initial implementation and saved into the project. It is a real local binary file, not a URL, a placeholder, or an LFS pointer. It has not been redrawn or replaced by this packaging fix. The unused experimental `quiet-room.jpg` has been removed.

## How Bundling Works

`src/assets/images.ts` imports the JPEG with Vite's explicit `?inline` suffix. Vite reads the file at build time and emits a `data:image/jpeg;base64,...` URL. The same import is used by startup, the main scene, and the collection preview through `src/game/artwork.ts`.

`src/assets/vectors.ts` eagerly imports every local SVG as raw source. `LocalSvg` renders the corresponding trusted file body; `NapArt`, `DecorationArt`, `TrophyArt`, and `Icons` are small adapters around those exact source files. No second hidden drawing definition or runtime fetch is used. SVGs contain no external images, scripts, or fonts.

`src/main.tsx` sets the favicon and paper texture from their embedded SVG data URLs. Do not replace these imports with string paths like `./images/...` or `/images/...`. The SVG namespace URL identifies the file format; it is not a network request.

The single-file build contains all artwork bytes, CSS, scripts, and fonts in `dist/index.html`. Vite also copies the complete `public/images/` folder to `dist/images/` for editing, handoff, and direct inspection. Those files are not runtime network dependencies of the bundled game.

Image retry restarts the local decoder using the same data URL. It never appends `?retry=` to embedded base64 bytes.

## Image ZIP

In standalone Settings, Download All Images creates `five-more-minutes-images.zip` entirely in memory. It contains all 51 unmodified image files, a manifest, and an offline HTML catalog. No fetch or server is used. `fflate` is bundled locally to write the ZIP.

The export is for image files only. It does not clone the game, remove its SDK, or create a different game distribution.

## Yandex SDK Is Preserved

Production builds load `/sdk.js` and initialize `YaGames.init()` by default, exactly as before the image packaging work. There are no host/referrer allowlists, browser-online gates, file-protocol gates, or hidden offline meta flags. The existing development mode and explicit `?platform=standalone` parameter remain available for development; `?platform=yandex` enables SDK testing through the official local proxy.

Game Ready, gameplay reporting, platform pause/resume, language detection, and fullscreen remain connected to the SDK. A real SDK error still follows the pre-existing bounded error/fallback path; local artwork must not be used as a reason to skip platform initialization.

The images can be viewed and decoded without an image server. This does not mean Yandex platform services work without their required connection. The image ZIP control is hidden in Yandex mode to avoid downloadable-file links inside the portal.