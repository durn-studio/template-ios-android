# Slamgoal — Rebrand Checklist

This repo started as a clean fork of `durn-studio/fruitclash` (Bubble Masters
in production). Every Bubble Masters identifier — code, config, store IDs,
ad networks, IAP SKUs, copy — needs to be replaced with slamgoal's own.
This file is the punch list for that work.

The game engine itself (physics, ad layer, IAP wrapper, leaderboard
dispatch, theme card components, Expo modules, build scripts) is
production-tested and stays byte-for-byte identical. **Do not refactor
gameplay code while you're rebranding** — change identifiers only.
You'll know you're done when `grep -ri "bubble\s*masters\|fruit-?clash"
artifacts scripts` returns zero hits and `pnpm typecheck` is clean.

---

## 0 · Identity decisions (owner)

Before writing any code, the product owner must decide and supply:

| Field | Example | Notes |
|---|---|---|
| **Display name** | `Slam Goal` | Shown in the App Store / Play Store and on home screens |
| **Internal slug** | `slamgoal` | Used in app.json, workspace name, EAS project name |
| **iOS bundle ID** | `com.durnstudio.slamgoal` | Must be globally unique; reserve in App Store Connect first |
| **Android package** | `com.durnstudio.slamgoal` | Same string as iOS bundle is conventional but not required |
| **URL scheme** | `slamgoal` | For deep links — pick something short and unique |
| **Marketing domain** (optional) | `slamgoal.com` | Only if you want a marketing site / app-ads.txt |

Lock these in writing before touching code. Renaming after the first
TestFlight upload requires a new App Store listing.

---

## 1 · External accounts (parallelisable, kick off before code work)

Each takes minutes to hours of clock time but rarely more than 15 min of
hands-on work. Start them in parallel because some have approval queues.

| Service | What to create | What you'll get back |
|---|---|---|
| **App Store Connect** | New app entry; reserve bundle ID `com.durnstudio.slamgoal`; create initial 1.0.0 version draft | ASC App ID (numeric, e.g. `6789012345`) |
| **Apple Developer** | App ID + push cert (EAS handles cert automatically on first build) | — (auto) |
| **Play Console** | New app entry; bundle ID = same as iOS; pick category, content rating; opt into Play App Signing | Play Console package name |
| **EAS / Expo** | `cd artifacts/slamgoal && eas init` — pick `durn-studio` org → creates new project under that account | New EAS project ID (UUID) |
| **AdMob** | New iOS + Android app entries; create ad units per format (rewarded, interstitial, banner, app-open); enable mediation if/when desired | iOS app ID, Android app ID, ad unit IDs |
| **RevenueCat** | New project under your dashboard; create iOS + Android API keys; set up products + entitlements (one per IAP SKU below) | Public iOS API key, public Android API key, entitlement identifiers |
| **AppsFlyer** | New app entry (iOS + Android share an "app" in AF) | Dev key (single string used by both platforms) |
| **Liftoff / Vungle** *(optional, only if mediation desired)* | New app entry under your publisher account | App ID, placement reference IDs, SKAdNetwork IDs (block of strings) |
| **Unity Ads** *(optional, same)* | New game in Unity Console | Game ID (iOS + Android), placement IDs, SKAdNetwork IDs |
| **Google Play Games Services** *(optional, only if Android leaderboards desired)* | New PGS project under Play Console → Grow → Play Games Services → Setup → Configuration | Numeric App ID (e.g. `123456789012`), per-leaderboard IDs (`CgkI...` strings) |

Park each ID in a shared note — you'll paste them into config files in
section 3.

---

## 2 · Mechanical rename (~30 min)

These are pure path / package metadata changes — no game logic.

```bash
cd ~/slamgoal

# 2a. Rename the app workspace dir
git mv artifacts/fruit-clash artifacts/slamgoal

# 2b. Update workspace package name
# In artifacts/slamgoal/package.json:
#   "name": "@workspace/fruit-clash"  →  "@workspace/slamgoal"
# macOS: sed -i '' '...'    Linux: sed -i '...'
sed -i 's|@workspace/fruit-clash|@workspace/slamgoal|g' \
  artifacts/slamgoal/package.json

# 2c. Update any tsconfig / workspace references
grep -rl "@workspace/fruit-clash" --include="*.json" --include="*.ts" .

# Manually edit each hit — usually just artifacts/slamgoal/package.json,
# artifacts/slamgoal/tsconfig.json, and any imports in scripts/.

# 2d. Reinstall to refresh symlinks under the new path
pnpm install

# 2e. Smoke check
pnpm --filter @workspace/slamgoal typecheck
```

---

## 3 · Identifier replacement (~2 hours)

This is the longest section. Work through it file-by-file, replacing
Bubble Masters values with slamgoal's. Use the IDs you collected in
section 1.

### 3a. `artifacts/slamgoal/app.json`

| Field | Old value | New value |
|---|---|---|
| `expo.name` | `"Bubble Masters"` | `"Slam Goal"` |
| `expo.slug` | `"bubble-masters"` | `"slamgoal"` |
| `expo.scheme` | `"fruit-clash"` | `"slamgoal"` |
| `expo.version` | `"1.0.2"` | `"1.0.0"` (reset for new app) |
| `expo.ios.bundleIdentifier` | `"com.bubblemastersnextlevel.app"` | new bundle ID |
| `expo.android.package` | `"com.bubblemastersnextlevel.app"` | new package |
| `expo.owner` | `"durn-studio"` | keep |
| `expo.extra.eas.projectId` | `"fbb77f83-d04f-4a56-ba20-347d25642910"` | new ID from `eas init` |
| `expo.updates.url` | `"https://u.expo.dev/fbb77f83-..."` | replaced by `eas update:configure` |
| `expo.runtimeVersion.policy` | `"appVersion"` | keep |
| Plugin `react-native-google-mobile-ads.iosAppId` | `"ca-app-pub-3083118242430480~1151744849"` | new AdMob iOS app ID |
| Plugin `react-native-google-mobile-ads.androidAppId` | `"ca-app-pub-3083118242430480~6217825535"` | new AdMob Android app ID |
| `expo.ios.infoPlist.NSAdvertisingAttributionReportEndpoint` | `"https://appsflyer-skadnetwork.com/"` | keep (still AppsFlyer) |
| Plugin `withPlayGamesServices.playGamesAppId` | `"482181838006"` | new PGS App ID, or `"REPLACE_WITH_PLAY_CONSOLE_APP_ID"` if not yet created |
| `expo.plugins[].react-native-google-mobile-ads.skAdNetworkItems` | 165-entry list | keep — these are network-wide IDs, not app-specific |

### 3b. `artifacts/slamgoal/eas.json`

| Field | Old value | New value |
|---|---|---|
| `submit.production.ios.ascAppId` | `"6762621346"` | new ASC App ID |
| `submit.production.ios.appleTeamId` | `"7FBWD46RKH"` | keep (still Durn Studio team) |
| `build.production.env.EXPO_PUBLIC_API_URL` | `"https://fruitclash-production.up.railway.app"` | new backend URL or remove if no backend |

### 3c. `artifacts/slamgoal/constants/products.ts`

Replace every IAP product ID. The patterns:

```diff
-  id: "com.bubblemastersnextlevel.coins.500",
+  id: "com.durnstudio.slamgoal.coins.500",
```

Apply to all coin packs (500, 2500, 10000, 50000), heart packs (5, 20,
unlimited.monthly), and the starter bundle. Then create matching products
in **App Store Connect → In-App Purchases**, **Play Console → Products
→ In-app products**, and **RevenueCat → Products** (attached to
appropriate entitlements).

### 3d. `artifacts/slamgoal/lib/purchases.ts`

| Constant | Old | New |
|---|---|---|
| `PRO_ENTITLEMENT` | `"Bubble masters Pro"` | `"Slamgoal Pro"` (must match the entitlement name in RevenueCat dashboard exactly) |
| `UNLIMITED_HEARTS_ENTITLEMENT` | `"unlimited_hearts"` | keep or rename — must match RC dashboard |
| Whatever `Purchases.configure({ apiKey })` is called with | Bubble Masters' iOS / Android keys | new RC public keys |

### 3e. `artifacts/slamgoal/constants/i18n/{en,es,fr,it,pt,de}.ts`

Search each locale file for "Bubble Masters", "BUBBLE MASTERS",
"BubbleMasters", "Bubbles", and replace with the slamgoal name in that
language. Approximately 10–20 hits per locale. Common spots:

- `home.eyebrow` (e.g. "THE NEXT LEVEL")
- `home.tagline` (e.g. "Drop. Merge. Don't overflow.")
- App display name in welcome screens, share copy, store-review prompts

The German / Spanish / Portuguese / Italian / French strings need a real
translation if the new name doesn't translate (most don't — keep "Slam
Goal" verbatim across all locales unless you intentionally localise it).

### 3f. `artifacts/slamgoal/constants/gameCenter.ts`

| Constant | Old | New |
|---|---|---|
| `IOS_LEADERBOARD_PREFIX` | `"com.bubblemastersnextlevel.app.leaderboard"` | `"com.durnstudio.slamgoal.leaderboard"` |
| `ANDROID_LEADERBOARD_IDS_BY_WORLD` | `{}` | populate as you create them in PGS console |
| `OVERALL_LEADERBOARD_ID_ANDROID` | `""` | populate when overall leaderboard is created |

### 3g. `artifacts/slamgoal/constants/worlds.ts` and player assets

This is where slamgoal **diverges from a Bubble Masters reskin** — the
worlds (Superstars / Brazil / Argentina / etc.) and per-world character
art are Bubble Masters content. For an actual new product:

- Decide slamgoal's themes (e.g. football leagues, fictional teams,
  whatever the new game's identity is)
- Replace the `WORLDS` and `WORLD_GROUPS` data structures
- Replace all PNG/WebP assets in `artifacts/slamgoal/assets/images/`
  with slamgoal's own art

If you ship slamgoal with Bubble Masters' player art, **Apple may reject
it as a duplicate of an existing app** in your developer account, and
Google can pull it for the same reason. Plan for new art before public
launch; engineering / dev builds with the inherited art are fine.

### 3h. `artifacts/slamgoal/scripts/optimize-images.mjs`

No string changes — script operates on whatever PNGs land in
`assets/images/`. Just confirm the path it iterates over still resolves
under the renamed `artifacts/slamgoal/` directory.

### 3i. Native Expo modules

`artifacts/slamgoal/modules/expo-game-center/`,
`expo-play-games-services/`, `expo-icloud-kv/` — each has its own
`package.json`, `expo-module.config.json`, and Swift/Kotlin source.
**No string changes needed** — these are bridge modules with no
Bubble Masters branding. They carry over as-is.

### 3j. Custom config plugins

`artifacts/slamgoal/plugins/withAdMobMediation.js`,
`withPlayGamesServices.js`, `withRemoveAndroidPermissions.js`,
`withGameCenter.js`, `withICloudKV.js` — **no string changes**. Each
reads from `app.json` config so it auto-adapts to slamgoal's values.

### 3k. Web assets — `artifacts/web/`

Two options:

- **Delete the directory entirely** if slamgoal doesn't need a marketing
  site yet
- **Rebrand it** — replace every "Bubble Masters" reference in
  `index.html`, `privacy.html`, `terms.html`, `support.html`,
  `app-ads.txt`, `sitemap.xml`. Replace favicons + icons. Update
  `vercel.json` if the production domain changes.

For `app-ads.txt`: the existing file is Bubble Masters' AdMob publisher
ID + Vungle + Unity reseller block. Slamgoal needs **its own** AdMob
publisher entry (DIRECT line) and its own mediation network entries
(generated from each network's onboarding wizard against slamgoal's app
ID).

### 3l. Top-level workspace files

| File | Action |
|---|---|
| `CLAUDE.md` (workspace root) | Delete or rewrite — it's Bubble Masters operating notes |
| `pnpm-workspace.yaml` | No changes — it uses `artifacts/*` glob, not the renamed dir |
| `eas.json` (workspace root) | If a duplicate of the per-app eas.json exists at root, sync the bundle IDs |
| `.github/workflows/*` | Already removed during initial bootstrap; add slamgoal-specific CI later |

---

## 4 · Mass verification (run after section 3)

```bash
cd ~/slamgoal

# Should return zero hits if rebrand is complete
grep -ri "bubble\s*masters\|fruit-?clash\|fruitclash\|com\.bubblemasters" \
  --include="*.{ts,tsx,js,json,kt,swift,gradle,xml,plist,md,mjs,html}" \
  artifacts scripts lib

# If any hits: spot-check each. Either:
#   - It's a legitimate transient mention (e.g. CHANGELOG note) — leave it
#   - It's a missed identifier — fix it

# Type check
cd artifacts/slamgoal && pnpm typecheck
```

Both must come back clean before moving to section 5.

---

## 5 · First dev build (smoke test, ~20 min)

```bash
cd ~/slamgoal/artifacts/slamgoal

# Generate native projects + new EAS project
eas init                      # creates new project, captures projectId
eas update:configure          # injects expo.updates.url

# Smoke build for an iOS simulator
eas build --platform ios --profile development --local

# Install the resulting .ipa on a simulator or device, launch it.
# Verify:
#   - App icon shows the new (or temporary Bubble Masters) icon
#   - Settings → app version is 1.0.0
#   - No crashes on launch
#   - Bundle ID under Settings → General → iPhone Storage → Slam Goal
#     reads the new value
#   - AdMob test ads load (if test mode enabled)
```

If any of these fail, fix and re-run before going to production.

---

## 6 · First production build + App Store submission

```bash
cd ~/slamgoal/artifacts/slamgoal

# Update the build:production script in package.json to point at the
# new GitHub remote (the existing script's git guard checks origin/main)
# — only needed if you're branching from a different remote than origin

pnpm build:production         # produces .ipa, auto-submits to ASC

# In App Store Connect:
#   - Verify the build appears under TestFlight
#   - Add testers / internal group
#   - When ready: submit for review with the new app metadata
```

Same flow for Android via `eas build --platform android --profile production`
+ manual upload to Play Console internal testing.

---

## 7 · What NOT to touch

- Game loop / physics in `hooks/usePhysicsGame.ts` — production-tested
- Ad show/grant flow in `lib/ads.ts` — already includes the mediation
  reward fix (long Unity ads paying out correctly)
- `components/PlayerCircle` memo comparator in `app/game.tsx` — load-
  bearing perf optimisation
- Custom Expo modules under `modules/` — no Bubble Masters references
- Build / OTA scripts in `package.json` — refusal guards work identically
  on any repo with `main` branch + `origin` remote

---

## 8 · Done when

- [ ] Section 4 grep returns zero hits
- [ ] `pnpm typecheck` clean
- [ ] First dev build launches with the new name + bundle ID
- [ ] First production build accepted by App Store Connect
- [ ] First production .aab uploaded to Play Console internal testing
- [ ] AdMob test ads load on both platforms
- [ ] RevenueCat sandbox purchase grants the new entitlement
- [ ] No "Bubble Masters" or "fruit-clash" string appears anywhere a
      user can see it (app UI, store listings, website)

When all eight are checked, slamgoal is a self-standing product
sharing nothing but DNA with Bubble Masters.
