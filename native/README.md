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

## App icon and splash screen

Generated with the official [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) tool from a single source image, `native/assets/logo.png` (Momo, near full-bleed — see the note below on why it's not pre-padded). To regenerate after changing that source image:

```
cd native
npx capacitor-assets generate --android --iconBackgroundColor '#ece4cf' --iconBackgroundColorDark '#ece4cf' --splashBackgroundColor '#ece4cf' --splashBackgroundColorDark '#ece4cf' --assetPath assets
```

This writes real Android resources (`android/app/src/main/res/mipmap-*/`, `drawable*/`) — never hand-edit those directly; re-run the command above instead, so they stay in sync with `logo.png` and with each other.

**Why `logo.png` is near full-bleed, not pre-shrunk:** Android's adaptive icon system (`mipmap-anydpi-v26/ic_launcher.xml`) applies its own 16.7% inset to whatever foreground image it's given — that's the platform's own standard safe-zone mechanism, already accounting for every launcher's mask shape (circle, squircle, rounded square, ...). Pre-shrinking the source image *again* on top of that compounds into a needlessly tiny, distant-looking icon (a mistake made once while setting this up — caught by simulating the actual composited result, not by assuming the first output was correct). Given a full-bleed source, the system's own inset alone lands at a comfortable ~67% fill — verified by actually compositing the generated foreground+background layers, applying that same 16.7% inset, and masking the result with a circle and a squircle to check nothing (ears, the hat) gets clipped in either.

The 512×512 flat PNG for the Google Play Console and RuStore Console listings (not part of the APK itself — a separate upload in each console) is generated the same way, from the same source, saved as `momo-store-listing-icon-512.png`. **RuStore specifically rejects a submission if this listing icon doesn't visually match the icon of the installed app** — always regenerate this alongside `logo.png`, from the same crop, never separately.

## Where this fits in the wider project

TV/D-pad navigation (`../src/game/useTvNavigation.ts`) and the rest of the web game work identically inside this wrapper — Capacitor just loads the stripped `dist-native/index.html` in a native WebView. See `../GAME_DESIGN.md` for the web game's own architecture (including the "Publishing Plan" and "Copyright and Asset Protection" sections), and `../YANDEX_PUBLISHING.md` for the (separate, web-only) Yandex Games portal checklist.
