# Steady — Built on Christ

Truth → Mind → Direction → Action → Reflection.

A local-first Scripture and daily-action companion, built with plain HTML,
CSS and JavaScript. The production app is `ios/Steady.xcodeproj`; use a static
local web server for a browser preview. Expo Go is retired. Keep the same host/address: browser storage
belongs to its origin and is not shared between Safari, WebView or desktops.

## Current experience

- One main screen, Steady, replaces Home/Ask/Reflect tabs. It begins with
  “What would help right now?” and offers conversation, a next step, Scripture
  and reflection. Guided choices show one question at a time; support can be
  shaped as perspective, one small step or Scripture context. People can skip
  a question, write freely or continue their saved conversation. A composer
  tools menu keeps these starting points and existing actions available.
- Guided answers use the existing verified paths; the guided UI adds no new
  model or factual source. An explicit help-style choice applies to that answer
  without changing the saved manual preference. Unsubmitted choices are not
  persisted. Guided reflections save only on Keep, retaining previous entries
  and leaving the day open. Existing reflection, record, chapter and action
  screens remain focused secondary tools, with Back returning to Steady.
  Settings and Memory remain accessible; old Home links redirect to Steady.
- Scripture Help opens Bible references and searches words across 66 books in
  classic WEB and ASV, alongside the existing 18 curated situation guides.
  Its complete text library loads only when a lookup needs it. The standalone
  iOS app bundles this offline; Expo Go needs its preview connection to load it.
  Prepared, cited reading notes answer a bounded set of context questions,
  each with one optional deeper explanation.
  Explicit follow-ups can return to the immediately preceding study passage;
  unrelated entries are never treated as evidence for an invented answer. It is
  not a clinical/emergency service. The bounded matcher
  can miss meaning. Known explicit danger phrases route to human-support
  wording, but this must not be treated as exhaustive risk detection.
- On supported iPhones with Apple Intelligence available, the Foundation Models
  framework can organise the latest prepared reply's prose on-device. It never
  supplies Bible quotations or selects references. Unavailable models, failures,
  canceled requests and rejected wording retain the library response. Generated
  wording is labelled, cached only for the session, and can be disabled under
  Settings → Privacy & entries → On-device AI. No cloud AI API or downloaded model
  dependency is used. Urgent and unmatched personal replies bypass this feature.
- Burden → Memory replaces the separate Saved area. On supported iPhones,
  new personal chats can yield at most two verbatim useful details, retained
  in `steady.v1` as a bounded set of 20 notes. No existing history is scanned.
  Relevant context can frame future prepared reply wording. Memory has its
  own off switch, individual Forget and a clear-memory control. Turning it off
  stops both collection and use; forgetting the source chat removes associated
  notes. The page reports the memory record's UTF-8 storage bytes and keeps
  existing bookmarked passages accessible. Backup/restore includes memory;
  generated reply prose remains ephemeral and the model is never trained.
- Replies separate the quotation from a visible, clearly labelled small practical
  response. Context remains optional. A focus selector inside that disclosure lets the reader
  correct the match. Unmatched personal requests ask for clarification. Study
  questions without a prepared explanation are labelled word searches, not
  answers. Lookups and searches never replace the reader's daily passage or
  become the emotional context for a later continuation.
- The transcript keeps up to 30 entries locally. Each matched entry has Read chapter
  and Forget controls. Drafts, text safety, translations and scroll position
  remain supported. Forget removes references without changing unrelated days.
- Help chapter reads use a transient selection, preserving ordinary passage
  bookmarks, reflections and action identities. Legacy entries retain their
  original quotations. No model, API key, subscription or remote inference is used.
- Passages have WEB and ASV text, chapter context, bookmarks and optional
  reflection. Editorial prompts and prayers are distinct from quotations.
  Sitting with a passage is a valid stopping point.
- General and Scripture-derived next steps retain their own source/feedback
  logic. Each starts with one action and one completion button; the general
  step's Make this step fit disclosure holds supporting options and explanation,
  while Scripture-derived steps retain Details & adjustments.
  Completed steps hide those options and offer optional feedback separately,
  with all four ratings together and a quiet undo control.
  Notes and feedback can influence matching locally; this is optional.
- The practical next move now accepts one optional, daily-only starting blocker:
  size, low energy, interruptions or hesitation. It changes the action, not just
  its explanation. Goals and current conditions still use the existing Make it fit
  controls. A short, input-based reason is visible; deeper explanation remains
  behind Make this step fit. Leaving is unscored, and feedback can be given without
  first declaring a step complete. High-energy growth can use the chosen ten
  minutes; no extra survey, AI, dashboard, streak or inferred personal context.
- Semantic action variants keep completions and ordinary ratings separate.
  Legacy entries remain the base variant. Made-worse exclusions still take
  precedence across variants. What helped labels any saved starting obstacle;
  it is applied only when Use this today is deliberately selected. New-day
  conditions do not silently reuse yesterday's obstacle.
- Preferences are a single screen: starting priority and focus.
  The tone selector is retired; existing hidden tone values remain intact.
  Old setup-only fields remain in storage but no longer affect new suggestions.
- Reflect keeps written/selected reflections and any existing earlier private
  note. Note-only, planned-step and explicitly closed days remain accessible
  through Your record without being counted as completed actions or reflections.
  Earlier-day pagination announces newly shown entries and keeps focus in the
  record; full date labels distinguish entries from different years.
- Finishing Reflect replaces the prompts with a quiet saved acknowledgement,
  Done for now and Edit reflection. Editing preserves the existing text and
  closed-day record; storage failures use honest session-only wording.
- Using private notes to match Scripture requires explicit opt-in. Saved true
  and false choices are respected; no existing notes or Scripture records are
  changed. Ordinary Today stays in the practical path even when a separate
  Scripture step has been saved. That step remains available through its
  labelled Reflect link, and Scripture items in What helped are labelled.
- New days have no compulsory default checklist. Existing actions are preserved;
  every current action can be removed through its own control, with Undo for
  the most recent removal during that day’s open session.
- Brain-training screens and page-wide swipes are retired. Old URLs redirect
  safely. Earlier practice records remain readable through a titles-only map.
- Settings groups reading/appearance, starting preferences, privacy and About.
  In-app reminders and the charity directory are retired. About keeps a simple
  free-to-use statement. Storage details stay in Settings rather than below
  the Scripture search box; actual storage-failure warnings remain visible.
- The main screen uses restrained cobalt accents, open replies and short
  opacity transitions that respect reduced motion. Animals stay out of the
  conversation UI; their optional answer styles remain in Settings. The Home
  Screen icon stays separate from the in-app interface.
- Back controls use the actual entry path and preserve Settings return position.

## Data and privacy

No account, analytics, cloud sync, AI API or runtime Scripture API.
Fonts, Bible chapters and guidance are bundled locally. External source and
human-support links only open when selected.

The preview uses browser-local storage. The standalone iOS app bundles the same
screens and mirrors the explicit Steady storage keys to a protected local file.
Neither supplies cloud sync or a separate password/encryption vault. System
device backups may include app data. Settings provides deliberate export,
validated restore and confirmed deletion; exported JSON contains readable
private text. It must be stored safely. Preview records do not migrate
automatically. Storage failures leave the current session usable with a visible
warning. Unreadable saved data and preferences are not overwritten.
Cross-tab conflicts preserve the earlier stored data and warn that this tab's
new edits are in memory only.

Retiring a screen does not remove the user's historical data. No migration in
the cleanup deliberately deletes notes, action logs, feedback or practice records.

## Artwork

`app/tools/build-home-icon.py` builds the Home Screen S mark on white and black
fields, plus a transparent monochrome foreground for iOS clear and tinted
appearances. `--web` also refreshes the web favicons and the legacy Expo icon
copies. The in-app header uses the Steady Arc wordmark without the icon. Native
icon changes require a fresh native build to appear there.

## Verification

From this folder:

```sh
node --test tests/*.test.cjs
```

Check public JavaScript syntax and use a separate preview origin for browser QA.
Verify Back controls, visible Forget/Read chapter actions, both next-step paths,
preferences, note-only history, themes and larger-text layouts. Unit tests alone
do not prove that a control is visible or reachable.

The production target is `../ios/Steady.xcodeproj`, with bundled content and
native storage/backup integration. Expo Go still requires its preview server.
See the iOS README and release checklist for build verification and remaining
publisher, policy-hosting, licensing and signing requirements. A successful
local build is not App Store approval.
