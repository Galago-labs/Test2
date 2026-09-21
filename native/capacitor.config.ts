import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.littlepause.game',
  appName: 'little pause.',
  // Deliberately NOT '../dist': that folder also contains raw, individually
  // extractable source images/audio (Vite's public/ passthrough, kept there
  // for local editing/handoff). `cap sync` copies whatever webDir points at
  // into the native project's assets as loose files, bypassing every in-app
  // check — see scripts/prepare-native-release.mjs and src/assets/README.md.
  webDir: '../dist-native'
};

export default config;
