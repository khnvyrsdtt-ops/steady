# Steady audit — 24 September 2026

Scope: the current web app, bundled Scripture/guidance/exercises, local persistence, navigation, accessibility layouts and Expo wrapper. This records verified findings; it is not a guarantee that the app has no remaining defects.

## Fixed

- Unreadable saved JSON could be replaced by a new blank state. The original storage is now protected; the page remains usable with a persistent session-only warning.
- A stale tab could overwrite newer entries or resurrect entries removed in another tab. Saving now checks the last-read storage snapshot and refuses that overwrite while retaining the open page's edits.
- Malformed saved preferences, themes, goals and review intervals could crash startup or guidance. Inputs are validated without object coercion. Impossible calendar dates are rejected.
- The same suggestion used for a different goal inherited completion. Actions now complete, undo, survive reload and count independently by action and goal; overlapping legacy records are not double counted.
- Goal-specific feedback, corrected Scripture feedback and recommendation explanations now agree with the saved record. Explanations no longer attribute unrelated negative feedback to an option.
- Due practice previously showed the study answer immediately before recall. A due review now starts on its question; new cards still introduce the material, and reveal is recorded as a non-recall attempt.
- Settings had no visible return to the previous screen after its icon was hidden. Contextual Back now restores the originating screen and scroll position. Evidence navigation, styling and accessibility agree.
- Unknown routes that matched inherited object names could crash or blank the page. They now safely fall back to Home.
- The Expo wrapper now follows actual rendered routes, hides native tabs during Settings/onboarding, retains the current route on reconnect and uses contextual Android Back navigation.
- Task add/delete controls now have at least 44 px touch targets. The welcome card remains scrollable when text is enlarged.
- Evidence copy now distinguishes research supporting a principle from validation of Steady's particular exercises and review timings.

## Approved organisation changes

Explore is the fourth tab. It contains My actions, Learn & practise, Think and Progress. Existing features remain; Home's duplicate expandable tools group moved into Explore. Today remains the recommended-action flow. The About page credits ChatGPT and Codex as development assistance, without implying runtime AI.

## Verification

- 125 automated checks pass, including persistence, corrupt data, conflicting tabs, goal completions, feedback, Scripture matching, routes, settings, swipes and the Expo bridge.
- All public JavaScript files pass syntax checks. The current Expo iOS JavaScript bundle builds successfully.
- All 53 local asset references inspected resolve. No duplicate DOM IDs or unnamed visible form controls were found in the route sweep.
- 24 routes inspected at 390 px width; the core reading, action, onboarding and review screens also checked at 320 px with larger OpenDyslexic text and roomy spacing. No horizontal page overflow in those checks.
- Browser interaction checks covered task creation/completion/reload, bookmark save/reload/remove, Scripture reflection → action → feedback/reload, daily reflection buttons, Settings return, and learning recall/completion/reload. Audit interactions used a separate local preview address rather than the usual app origin.
- All 14 selected WEB/ASV quotations verified against eBible publisher sources. Integrity checks cover all 372 bundled chapter verse entries, numbering, chapter counts, selected-verse agreement and reference/source consistency. Full chapters were not independently transcribed word for word. Details and primary sources are in SOURCES.md.
- No runtime fetch/XHR/WebSocket/beacon/eval, analytics, remote fonts or AI service calls found in web scripts. Notes/tasks render as literal text. Source and charity links open only through user action; their sites have separate policies.

## Remaining limits and deliberate non-changes

- Physical iPhone/Android touch, safe-area, keyboard and native-tab behaviour still need device testing. The actual custom iOS build was not run because the Mac's Xcode licence is unaccepted; no system/licence changes were made.
- The storage conflict guard is conservative, not a transactional database. Conflicting edits remain only in the open page and must be copied before closing. There is no automatic merge, backup, cloud sync or restore interface; exactly simultaneous cross-tab writes are not guaranteed safe.
- Reminders work while Steady is open; there are no background push notifications.
- Guidance uses a small deterministic library and keyword matching, not live AI or complete understanding of a person. Exercises are specific practice tasks, not a validated measure of general intelligence.
- Tests use small DOM fixtures for logic and do not replace browser or assistive-technology testing. No WCAG certification or screen-reader/device conformance is claimed.
- The unreferenced app/src/main.js scaffold and hidden legacy dashboard markup remain as maintenance debt. They were not removed during the feature-preservation review.
- Give to Steady remains an explicitly inactive placeholder, as requested. No payment integration was added.
