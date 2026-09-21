// The native Android/iOS wrapper must ship ONLY the single self-contained
// dist/index.html — never the rest of dist/ (dist/images/, dist/audio/,
// font-licenses.txt, third-party-notices.txt, ...). Those extra files are
// Vite's public/ folder copied verbatim into dist/ for local editing and
// handoff convenience; the game itself never reads them at runtime (every
// image, font, and audio clip is embedded as a data URL directly inside
// index.html — see src/assets/README.md). Capacitor's `cap sync`, however,
// copies its entire configured webDir into the native project's assets
// as loose, individually extractable files — completely bypassing every
// in-app permission check, since unzipping an APK/AAB runs no JavaScript
// at all. Pointing native/capacitor.config.ts's webDir at THIS script's
// output instead of dist/ directly is what actually closes that gap; a
// runtime "hide the button" check does not.
//
// Run automatically by `npm run sync` inside native/ (see native/package.json),
// which is also what the CI workflow uses — never point capacitor.config.ts
// back at ../dist.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distIndex = join(repoRoot, 'dist', 'index.html');
const outDir = join(repoRoot, 'dist-native');
const outIndex = join(outDir, 'index.html');

if (!existsSync(distIndex)) {
  console.error(`${distIndex} does not exist. Run "npm run build" in the project root first.`);
  process.exit(1);
}

const html = readFileSync(distIndex, 'utf8');

// Belt-and-suspenders: refuse to ship a build that still references loose
// files instead of embedding them. A genuinely self-contained single-file
// build should never contain a relative path into images/, audio/, or fonts/.
const suspiciousRef = html.match(/["'(]\.?\/?(images|audio|fonts)\/[^"')]+["')]/);
if (suspiciousRef) {
  console.error(`dist/index.html appears to reference a loose file (${suspiciousRef[0]}) instead of an embedded one. Refusing to package it for native — check vite-plugin-singlefile is still active and every asset import still uses ?inline/?raw.`);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(outIndex, html);

console.log(`Wrote ${outIndex} (${(html.length / 1024).toFixed(0)} KB) — the only file the native build will see.`);
