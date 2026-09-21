# Native Android Wrapper (Capacitor)

This packages the web build for RuStore and Google Play using [Capacitor](https://capacitorjs.com/). It is a separate project from the web game — it does not modify it, only wraps it, and it monetizes with the Yandex Mobile Ads SDK directly (`YandexAdsPlugin.kt`) since neither store hosts the Yandex Games portal's own ad calls.

**Important:** `webDir` points at `../dist-native/`, not `../dist/`. `../dist/` also contains raw, individually extractable source images and audio (Vite's `public/` folder, copied there for local editing convenience) — `cap sync` would otherwise package all of it as loose files inside the app, extractable with a plain `unzip` on the APK/AAB regardless of any in-app check. `npm run sync` (below) always regenerates `dist-native/` — a single stripped `index.html` — before syncing, via `../scripts/prepare-native-release.mjs`. See `../GAME_DESIGN.md`'s "Copyright and Asset Protection" section for the full reasoning; don't repoint `webDir` back at `../dist` to "simplify" this.

```
native/
  capacitor.config.ts   appId: com.littlepause.game, appName: "little pause.", webDir: ../dist-native
  android/               the generated Android Studio project
    app/src/main/java/com/littlepause/game/YandexAdsPlugin.kt   bridges platform.showInterstitial() to the native ads SDK
```

## Local development

```
cd ..                      # project root
npm run build               # produces dist/index.html
cd native
npm install
npm run sync                 # strips to dist-native/index.html, then cap syncs it into the Android project
npx cap open android         # opens Android Studio
```

Before shipping a real build, replace the placeholder Yandex ad unit ID in `android/app/src/main/java/com/littlepause/game/YandexAdsPlugin.kt` (`AD_UNIT_ID = "R-M-0000000-0"`) with the real one from your app's page at ads.yandex.com/monetization.

## CI (`.github/workflows/android-build.yml`)

Every push touching `src/`, `public/`, or `native/` builds the web game, runs its test suite, then builds a **debug APK** — good enough to install on a device or emulator to sanity-check, no signing required. That part needs no setup.

Producing a **signed release** (AAB for Google Play, APK for RuStore) is manual: run the workflow from the Actions tab and tick "Also build a signed release AAB". That step only runs if the four secrets below are set in this repo's **Settings → Secrets and variables → Actions**.

| Secret | What it is |
| --- | --- |
| `RELEASE_KEYSTORE_BASE64` | Your release `.keystore` file, base64-encoded |
| `RELEASE_STORE_PASSWORD` | The keystore's password |
| `RELEASE_KEY_ALIAS` | The key alias inside the keystore |
| `RELEASE_KEY_PASSWORD` | That key's password |

### Generating a release keystore (once, if you don't already have one)

```
keytool -genkey -v -keystore release.keystore -alias little-pause -keyalg RSA -keysize 2048 -validity 10000
```

Answer the prompts (name, org, etc. — these appear on the certificate, not in the app itself) and choose strong store/key passwords. **Keep `release.keystore` and its passwords somewhere safe outside the repo — losing it means you can never publish an update under the same app identity again**, on either store.

Then, to fill in the four secrets:

```
base64 -i release.keystore | pbcopy   # macOS; use base64 -w0 release.keystore on Linux
```
Paste that as `RELEASE_KEYSTORE_BASE64`. Use the alias and the two passwords you chose above for the other three secrets.

The workflow decodes the keystore into the runner's workspace only for the signing step and deletes it immediately after (`rm -f app/release.keystore`, `if: always()`), so it never lingers in a build artifact or cache.

## Where this fits in the wider project

TV/D-pad navigation (`../src/game/useTvNavigation.ts`) and the rest of the web game work identically inside this wrapper — Capacitor just loads the stripped `dist-native/index.html` in a native WebView. See `../GAME_DESIGN.md` for the web game's own architecture (including the "Publishing Plan" and "Copyright and Asset Protection" sections), and `../YANDEX_PUBLISHING.md` for the (separate, web-only) Yandex Games portal checklist.
