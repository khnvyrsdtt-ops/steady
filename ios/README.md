# Steady for Xcode

This is the standalone iPhone/iPad app. Open `Steady.xcodeproj`, select the **Steady** scheme and an iPhone or iPad simulator, then press Run. Xcode 26 or newer is recommended. It does **not** need Expo, Metro, CocoaPods, a local server, Wi-Fi, an account, or an API key.

The UIKit shell bundles the existing `../app/public` website at build time. This keeps the approved artwork, Scripture icon, web navigation, accessibility controls and future content updates in one source of truth. The old `../expo` folder remains only the Expo Go preview. Build the Xcode project after changing shared web files; an installed App Store release does not silently fetch code from your Mac.

## Product commitments

- Launch is completely free, with no in-app purchases.
- A dependable, fully usable free mode remains a permanent requirement. Core conversation, local Scripture and saved content must not become a trial or a deliberately degraded experience.
- General AI uses Apple's on-device model where available, with no paid API or account requirement. Capability still depends on the device and Apple Intelligence availability; library features remain available offline.
- Scripture quotations and references come from the bundled library by default. Generated prose must not be presented as verified Scripture.
- Rainbow rain is an optional appearance setting, off by default.

## On your iPhone

1. In Xcode → Settings → Accounts, sign in with your Apple account.
2. Select the Steady target → Signing & Capabilities and choose your own team. No developer team, certificate or provisioning profile is committed here.
3. The neutral technical identifier is `app.steady.mobile.s8d3c7a1`. Its suffix helps distinguish this project without including a person's or organisation's name. Apple must still accept it for your signing team; it is not trademark clearance or proof of App Store registration. Keep it unchanged after installation to retain the same app's data container. Changing it creates a separate app; use explicit backup/export to transfer entries from an older installation.
4. Connect your iPhone, enable Developer Mode if prompted, select it as the destination, and press Run.

## Before TestFlight or App Review

- Confirm the public privacy-policy URL and genuine support contact in `../app/public/release-config.js`; publish those pages outside the app. Do not submit placeholder contact details.
- Confirm the name and ownership/licences for the logo, artwork, fonts and Bible translations. No legal clearance is implied by this project.
- Check privacy and age-rating answers against the final binary, not just the web preview. This target has no analytics, advertising, tracking, remote AI, accounts or payments. External source links leave the app; an exported backup leaves the device only when its owner chooses a share destination.
- Test VoiceOver, Larger Text, both themes, keyboard, rotation and iPad split-screen. Check the full entry → Scripture → next step → reflection journey offline.
- Test export/import with disposable entries, cancellation, malformed backups, erase confirmation, cold launches and installation over a previous build without uninstalling it.
- Increment the build number for each upload. Select a device/archive destination, Product → Archive, then validate/distribute from Organizer. Paid Apple Developer Program membership is normally required for TestFlight/App Store distribution.
- Complete screenshots, description, support/privacy URLs and review notes in App Store Connect. Steady combines on-device general chat with verified local Scripture; it is not therapy or an emergency service. App Review approval is not guaranteed.

## Local data

WKWebView uses its persistent data store. Public resources are copied to a stable `Application Support/Steady/WebContent` path on each launch. Separately, each allowed local-storage change is mirrored into an atomic, file-protected `entries-v1.json` in Application Support, so an app update/file-origin change can restore it. This folder is excluded from OS backups; Steady does not offer cloud sync. The web interface's export/import controls provide a user-owned JSON backup. WebKit itself manages its separate storage; do not claim app-level encryption for that copy.

Only Steady's known entry/preference keys are mirrored. An unreadable mirror blocks overwriting and displays an error rather than replacing saved data with an empty session. Storage errors must be resolved before treating a new entry as safely saved. Removing the app removes its local data; export first. Expo Go, Safari and this signed app have separate storage, so move entries using the explicit backup controls, never by silently copying browser history.

Colour is defined once, in `app/public/branding.css`, and mirrored in `SteadyPalette` in `SteadyViewController.swift`: true white over true black, one neutral ramp, and the four brand hues used only for the mark and for accents that have to be found. The two lists are the same list, because both layers draw the same surfaces.

Burden's "Choose who helps" wheel is native. It is handed the registry the page already routes with, draws the portraits from the artwork the page points at, and never decides the mode itself: it reports the choice and `SteadyAnimalChosen` applies it, so the page stays the one owner of automatic and manual.

The native bridge is limited to the trusted local main frame. Export uses the iOS share sheet, import uses the Files picker, JavaScript confirmations use native alerts, and activated HTTP/HTTPS/mail links open outside the app. Other navigation is blocked. There are no unnecessary camera, microphone, location, photo-library or tracking permissions.

## Checks

`xcodebuild -project Steady.xcodeproj -scheme Steady -configuration Release -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/steady-derived CODE_SIGNING_ALLOWED=NO build`

Run the `SteadyTests` target in Xcode to check persistent snapshot round trips, invalid/stale/corrupt data safeguards, erase persistence and web-resource replacement. Also run the existing web test suite from `../app`.

The App Store icon set is generated from one canonical implementation. To regenerate it after an approved artwork change:

`python3 ../app/tools/build-home-icon.py`

`python3 ../app/tools/build-home-icon.py --web` also refreshes the web favicons and the legacy Expo icon copies from the same mark.

The set carries three appearances: `AppIcon.png` on pure white, `AppIcon-dark.png` on pure black, and `AppIcon-tinted.png` as a white monogram on transparency so iOS can apply its own tint and glass. `--check` verifies that all generated appearances match the canonical artwork.
