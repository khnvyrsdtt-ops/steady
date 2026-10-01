'use strict';
/*
 * Provider implementations.
 *
 * Three routes, none of which is a dependency of Steady's core:
 *
 *   local        Ollama or anything OpenAI-compatible on the developer's own
 *                machine. Genuinely free, genuinely private -- nothing the user
 *                writes leaves the room. This is the recommended default because
 *                it costs nothing, cannot be rate-limited by a vendor, and works
 *                offline.
 *
 *   gemini-free  Google's unpaid tier. Verified for this project: the free tier
 *                has no spend-based rate limit (documented as "N/A") and
 *                gemini-2.5-flash-lite allows roughly 15 requests/minute and
 *                1000/day. That ceiling is a real constraint, which is why the
 *                facade has a daily limit and a cooldown, and why the local
 *                provider is tried first.
 *
 *   metered      Declared, not implemented. It exists so that enabling a paid
 *                model later is registering an object here, not editing Steady.
 *                Nothing registers it, and the facade refuses metered providers
 *                unless metering is explicitly enabled in code.
 *
 * Credentials are read from runtime configuration. Nothing in this file is a
 * secret, and no key is written into app/public, which is bundled into the iOS
 * app. See AI-PROVIDERS.md.
 */
const SteadyAIProviders = (() => {
  const doFetch = (config) => (typeof config.fetch === 'function' ? config.fetch : globalThis.fetch).bind(globalThis);

  const local = Object.freeze({
    id: 'local',
    label: 'Local model',
    cost: 'local',
    model: 'llama3.2:3b',
    requiresConfig: true,
    // A local server is optional configuration, so the check is honest about
    // whether one is configured rather than assuming.
    available(config = {}) {
      return Boolean(config.localEndpoint);
    },
    async complete(request, config = {}) {
      const endpoint = String(config.localEndpoint || '').replace(/\/+$/, '');
      if (!endpoint) throw new Error('No local endpoint configured');
      const response = await doFetch(config)(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: request.signal,
        body: JSON.stringify({
          model: config.localModel || request.model || this.model,
          stream: false,
          options: { temperature: request.temperature ?? 0.3, num_predict: request.maxOutputTokens },
          messages: [
            ...(request.system ? [{ role: 'system', content: request.system }] : []),
            { role: 'user', content: request.prompt },
          ],
        }),
      });
      if (!response.ok) { const error = new Error(`Local model refused: ${response.status}`); error.status = response.status; throw error; }
      const body = await response.json();
      return {
        text: String((body.message && body.message.content) || ''),
        model: body.model || config.localModel || this.model,
        usage: body.eval_count ? { completionTokens: body.eval_count } : null,
        estimatedUsd: 0,
      };
    },
  });

  const geminiFree = Object.freeze({
    id: 'gemini-free',
    label: 'Gemini free tier',
    cost: 'free',
    model: 'gemini-2.5-flash-lite',
    requiresConfig: true,
    available(config = {}) {
      return Boolean(config.geminiKey);
    },
    async complete(request, config = {}) {
      const key = config.geminiKey;
      if (!key) throw new Error('No Gemini key configured');
      const model = config.geminiModel || this.model;
      const response = await doFetch(config)(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        signal: request.signal,
        body: JSON.stringify({
          systemInstruction: request.system ? { parts: [{ text: request.system }] } : undefined,
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          generationConfig: { maxOutputTokens: request.maxOutputTokens, temperature: request.temperature ?? 0.4 },
        }),
      });
      if (!response.ok) {
        const error = new Error(`Gemini refused: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const body = await response.json();
      const candidate = body.candidates && body.candidates[0];
      return {
        text: String(((candidate && candidate.content && candidate.content.parts) || []).map(part => part.text || '').join('')),
        model,
        usage: body.usageMetadata || null,
        // Free tier: nothing is billed. Recorded as zero so a future report can
        // state actual spend rather than assume it.
        estimatedUsd: 0,
      };
    },
  });

  /*
   * Declared but not registered. Its presence is the point: it shows what a paid
   * provider looks like without making one. It is never returned by
   * `registerable()` and the facade refuses it while metering is off, so it
   * cannot be switched on by a stray configuration value.
   */
  const meteredExample = Object.freeze({
    id: 'paid-example',
    label: 'Paid model (example only, not registered)',
    cost: 'metered',
    requiresConfig: true,
    available(config = {}) { return Boolean(config.paidKey); },
    async complete(request, config = {}) {
      // Deliberately unimplemented. Wiring a real paid call is a conscious
      // future change to this file, made with metering enabled in provider.js.
      throw new Error('No paid provider is configured');
    },
  });

  // What Steady will actually register. Free routes only.
  const registerable = () => [local, geminiFree];

  return Object.freeze({ local, geminiFree, meteredExample, registerable });
})();

if (typeof window !== 'undefined') window.SteadyAIProviders = SteadyAIProviders;
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyAIProviders;
