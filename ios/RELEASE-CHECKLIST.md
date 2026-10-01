# Steady release checklist

The source can be built locally without signing. This is not a store approval or a legal clearance. The app is free for users; enrolling in Apple's distribution program is a separate developer expense.

## Required decisions outside the code

- Supply the real publisher name and support email in `app/public/release-config.js`.
- Host `app/public/privacy.html` and a support page at real public HTTPS addresses; fill in `privacyPolicyUrl` and `supportUrl`. The policy content is shared with the in-app Privacy screen. The local preview URL is not suitable for App Store Connect.
- Confirm ownership/licensing of the approved ribbon logo and donkey artwork. Existing Bible/font source records are in `app/SOURCES.md`; this task does not establish all artwork rights.
- Clear the name in intended launch countries before adopting a permanent App Store identity. “Steady” remains a working name: EU word mark 015720436 and adjacent meditation/wellbeing app usage were identified on 25 September 2026. A trademark professional should assess the actual scope and use, or a more distinctive name should be screened. Do not assume a new logo, faith subtitle or free pricing eliminates conflicts.
- Select your own Apple signing team and confirm the bundle identifier in Xcode. No accounts, payment, enrollment or upload were performed by this task.

## Before uploading

- Run the shared web suite: `node --test app/tests/*.test.cjs` from the project root.
- Run `node app/tools/check-release.cjs`; missing real contact/URL fields intentionally fail this check.
- Run the native test target and a Release build. Install over an earlier build without uninstalling and confirm entries survive.
- Test on a physical iPhone: first launch without Wi-Fi, Scripture search, exact chapter, reflection, step completion, restart, larger text, VoiceOver, keyboard and external source links.
- iPad is enabled: test landscape, split-screen, large text, keyboard and share-sheet presentation; prepare iPad screenshots.
- With disposable notes, test backup/restore/cancellation, malformed files, storage errors and confirmed deletion. Do not run destructive tests on real entries.
- Confirm final archive privacy manifest and App Store privacy answers. The production target has no third-party runtime SDKs or remote AI calls; source links and explicitly exported backups leave the app only at the user's choice.
- Complete accurate screenshots, age rating, app description and review notes. Describe Scripture Help as curated on-device guidance, not generative AI or therapy.
- Upload through Xcode Organizer to App Store Connect, test through TestFlight, then submit to App Review. Choose manual release if you want approval before publication.

## Naming sources (preliminary, not exhaustive)

- EUIPO: https://euipo.europa.eu/eSearch/#details/trademarks/015720436
- USPTO: https://tsdr.uspto.gov/#caseNumber=98236512&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch
- Adjacent meditation app: https://apps.apple.com/cd/app/steady-daily-gita-meditation/id6792077422
- Adjacent wellbeing app: https://apps.apple.com/ca/app/steady-mood-panic/id6800914833
- Apple review criteria: https://developer.apple.com/app-store/review/guidelines/

UK and Irish national registers were not exhaustively searched. The EU result is relevant to an EU/Irish launch. Store-name availability and trademark clearance are different checks.
