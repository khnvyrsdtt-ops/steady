# Steady's AI layer

## Installed iOS app

The chat uses Apple Intelligence on the device for general questions through
`SteadyNative.answerAsk`. It includes recent user/assistant turns and relevant,
user-controlled memories. Replies default to short, direct language; saved
communication preferences influence the tone. General answers are saved with
the conversation and are not regenerated when it reopens.

`ask-routing.js` keeps Scripture requests on the verified local Bible path.
Quotations and references come from that library; the existing `organiseReply`
operation can only reword supplied explanatory prose. A brief loading cue is
retained for quick Scripture lookups. Urgent support stays immediate.

These operations have no network requests, API keys, or per-call charges. General
generation requires Apple Intelligence to be available and enabled. A rejected,
unavailable or timed-out response falls back honestly, with retry available.
This is not a guarantee that general model answers are factually correct.

The provider facade described below is a separate web abstraction; it is not the
installed iOS chat's general-answer transport.

**Principle: deterministic where possible, AI where understanding is required.**

Steady has one place that talks to a model, and it is not a feature. Everything
else — Scripture, time, settings, storage, navigation, calculations, app state —
is ordinary deterministic code and stays that way. That is what keeps the app
fast, free, offline-capable and impossible to hallucinate into.

**AI cost today: €0.** That is enforced in code, not by intention.

---

## The request flow

```
user input
  → can deterministic code handle it?     yes → answer. No model call.
  → understand                           what did they actually mean
  → route                                a specialist, quietly
  → retrieve                             trusted, verified material
  → free model                           reasoning over that material only
  → validate                             the answer may not outrun its sources
```

`answer()` in `app/public/ai/pipeline.js` runs these. It never throws: every stage
degrades to something Steady can already do alone, and the returned `source` says
which route produced the answer (`deterministic`, `model`, or `none`).

## The three guarantees

**1. Scripture is never generated.**
The model is handed verified passages and asked to reason over them. The *words*
of the quotation come from the composer, read off the sealed passage from
`verified-scripture.js` — not from the model. After generation, `validate()` strips
any citation that was not among the retrieved passages, and any long quoted span
that does not appear verbatim in one of them. A reconstructed verse cannot reach
the reader.

**2. No model call when ordinary code is reliable.**
The `deterministic` handler is asked first. When it can answer, nothing else
runs — no quota, no latency, no cost. Most of Steady never reaches the model.

**3. No model call that could cost money.**
A provider declares `cost: 'local' | 'free' | 'metered'`. The facade refuses
`metered` unless metering is explicitly enabled *in `provider.js`*, and it also
enforces a daily call ceiling. An exhausted quota (HTTP 429) puts that provider
in cooldown and the next free route is tried; if none remains, the answer is the
deterministic one. **Nothing is ever silently swapped for something billable.**

---

## Providers

All live in `app/public/ai/providers.js` and implement the same shape:

```js
{
  id, label,
  cost: 'local' | 'free' | 'metered',
  available(config) -> boolean,     // cheap check
  complete(request, config) -> { text, model, usage, estimatedUsd }
}
```

| id | cost | notes |
|---|---|---|
| `local` | `local` | Ollama or any OpenAI-compatible server on your own machine. **Recommended default**: free, private, works offline, no vendor rate limit. |
| `gemini-free` | `free` | Google's unpaid tier, `gemini-2.5-flash-lite`. Verified for this project: free tier has no spend-based rate limit (documented "N/A"), roughly 15 req/min and 1000 req/day. That ceiling is real, which is why the facade has a daily limit and cooldown, and why `local` is tried first. |
| `paid-example` | `metered` | **Declared, not registered.** It shows what a paid provider looks like without making one. |

### Free-tier facts, and where they came from

- Gemini free tier: spend-based rate limit is **N/A** for the free usage tier;
  limits are per *project*, not per API key, and RPD resets midnight Pacific.
  Model ceilings around **Flash-Lite 15 RPM / 1000 RPD**, Flash 10 RPM / 250 RPD.
- Free-tier usage may be used by Google to improve its products. That is a reason
  to prefer the **local** provider for anything a person would not want read.
- Nothing is billed on the free tier, so `estimatedUsd` is recorded as `0` —
  recorded rather than assumed, so a future report states actual spend.

---

## Credentials

**No key is ever in `app/public`.** That directory is bundled into the iOS app,
so a key committed there would ship on every device. This is checked
mechanically by the test *“no credential can ship inside the app bundle”*,
which scans every `.js/.html/.css/.json` under `app/public` for API-key shapes.

Providers read configuration at runtime instead:

```js
// dev only — never inside app/public
window.STEADY_AI_CONFIG = {
  localEndpoint: 'http://127.0.0.1:11434',   // Ollama
  localModel: 'llama3.2:3b',
  // geminiKey: '…',                          // optional, free tier
};
```

With no configuration there is simply no route, which is why the shipped iOS app
is inert and costs nothing.

---

## Replacing the provider later

**This is the part you asked to be able to do without touching anything else.**

Features call `SteadyAI.answer(...)` and never name a vendor, a model, or an SDK.
To switch:

1. **Local → another free host:** change the URL or key in the config object.
   No code changes.
2. **Free host → a different vendor:** add an object to
   `app/public/ai/providers.js` with the same four fields and push it onto
   `registerable()`. No feature changes.
3. **Add a paid model for hard cases:** implement a provider, set
   `cost: 'metered'`, and enable metering in `app/public/ai/provider.js` by
   changing `allowMetered: false` to `true`. Because preference is ordered
   `local → free → metered`, a stronger model becomes reachable **only after**
   the free routes are unavailable, which is exactly the intended escalation.
4. **Cheap model for normal requests, strong model for difficult ones:** order is
   the escalation list, and `preferred` is a soft hint that falls through rather
   than failing. Nothing in the UI changes; the user does not see the switch.

---

## Specialists (the future animals)

`app/public/ai/specialists.js` is a registry. A specialist is a role with its own
`purpose`, `instructions`, trusted `retrieve` source, `capability` and behaviour,
and they all share this one provider layer — so the person meets a single coherent
Steady rather than several disconnected chatbots.

```js
SteadySpecialists.register({
  id, name, purpose, capability,
  instructions(context) { … },     // the system instructions for a model
  retrieve(input, deps) { … },     // verified material, from trusted sources
});
```

Routing is quiet and automatic when confidence is real, falls back rather than
guessing when it is not, and honours a manual override when one is given. One
specialist ships today (`scripture`, which is Burden's role). The second is
deliberately not built: an unbuilt specialist costs nothing and does nothing, and
the registry above is what a future one plugs into.

---

## Using it from Burden

Burden keeps its existing deterministic behaviour. To let a model explain a
verified passage, pass a deterministic handler that covers the cases you want
answered without a model, and let the rest fall through:

```js
const answer = await SteadyAI.answer({
  text,
  history,
  deterministic: ({ text, history }) => {
    // cases ordinary code handles reliably → return { text }
    return null;                   // fall through to a model
  },
  capability: 'scripture-explanation',
  deps: { verified, guides, chapters, library, matcher, translation },
});
```

`answer()` returns `source: 'none'` with the verified `passages` attached whenever
no model is available — so the deterministic composer still has everything it
needs and the user sees no difference.

That switch has deliberately **not** been made yet: it changes what a person
reads, and it is worth deciding knowingly rather than as a side effect of
building the plumbing.

## Tests

```bash
cd app && node --test tests/ai-provider.test.cjs
```

Covers: no credential can ship in the bundle; metered providers are unreachable;
the daily ceiling is enforced in the layer; an exhausted quota is not retried in a
loop; deterministic code answers first and spends nothing; an invented quotation
and an invented reference are both removed; and routing behaves when confidence
is real, absent, or overridden.
