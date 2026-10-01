'use strict';
/*
 * SteadyAIProvider -- the one place Steady talks to a model.
 *
 * Principle: deterministic where possible, AI where understanding is required.
 * This module exists so that second half can be true without the first half
 * becoming expensive, fragile, or provider-bound. Features never import a vendor
 * SDK or name a model. They call this, and this decides whether a model is
 * needed, which one, and what it is allowed to cost.
 *
 * Cost is a property of the code, not of good intentions:
 *   - a provider declares whether it is 'free', 'local' or 'metered';
 *   - 'metered' providers are refused unless metering is explicitly enabled,
 *     which it is not by default and is not enabled by configuration alone;
 *   - a daily call ceiling is enforced here, not by the caller;
 *   - when a provider fails or its quota is gone, it is put in cooldown and the
 *     next one is tried. Nothing is ever substituted silently for something that
 *     would cost money -- if no free route remains, the answer is "no model",
 *     and the caller falls back to what it can do without one.
 *
 * Credentials: providers read their key from runtime configuration, which is
 * supplied by the host page and is never part of the shipped app bundle. See
 * AI-PROVIDERS.md. `assertNoSecretsInBundle` is enforced by test.
 */
const SteadyAIProvider = (() => {
  const providers = new Map();
  const cooldowns = new Map();

  const defaults = Object.freeze({
    // Metered providers stay off. Turning this on is a deliberate act in code,
    // not a setting a build or a user can flip by accident.
    allowMetered: false,
    // A ceiling that makes "AI cost 0" true in practice as well as in principle.
    dailyCallLimit: 60,
    timeoutMs: 20000,
    maxOutputTokens: 700,
    config: Object.freeze({}),
  });
  let config = { ...defaults };

  const ledger = { day: '', calls: 0, meteredCalls: 0, estimatedUsd: 0 };
  const today = () => new Date().toISOString().slice(0, 10);
  const rollDay = () => {
    const day = today();
    if (ledger.day !== day) Object.assign(ledger, { day, calls: 0, meteredCalls: 0, estimatedUsd: 0 });
    return ledger;
  };

  /*
   * Register a provider. The shape is checked once, at registration, so a
   * malformed provider fails loudly at wiring time rather than on a user's
   * question. Swapping providers later means registering a different object.
   */
  function register(provider) {
    if (!provider || typeof provider.id !== 'string' || !provider.id) throw new Error('A provider needs an id');
    if (!['free', 'local', 'metered'].includes(provider.cost)) throw new Error(`Provider ${provider.id} must declare cost as free, local or metered`);
    if (typeof provider.complete !== 'function') throw new Error(`Provider ${provider.id} needs a complete()`);
    if (typeof provider.available !== 'function') provider.available = () => !provider.requiresConfig;
    providers.set(provider.id, Object.freeze({ label: provider.id, ...provider }));
    return provider.id;
  }
  const unregister = id => providers.delete(id);
  const registered = () => [...providers.values()].map(p => ({ id: p.id, label: p.label, cost: p.cost }));
  const clear = () => { providers.clear(); cooldowns.clear(); Object.assign(ledger, { day: '', calls: 0, meteredCalls: 0, estimatedUsd: 0 }); };

  function configure(next) {
    config = { ...config, ...(next || {}), config: { ...config.config, ...((next && next.config) || {}) } };
    return { ...config };
  }
  const currentConfig = () => ({ ...config });

  // Ordering encodes preference, not dependency: local first because it is free
  // and private, then free hosted tiers, then metered only if explicitly allowed.
  const order = ['local', 'free', 'metered'];
  const permitted = cost => cost === 'local' || cost === 'free' || config.allowMetered;

  const coolingDown = id => {
    const until = cooldowns.get(id);
    if (!until) return false;
    if (Date.now() >= until) { cooldowns.delete(id); return false; }
    return true;
  };

  /*
   * Choose a provider. `preferred` is a soft hint, not a command: an unavailable
   * or unaffordable preferred provider falls through rather than failing.
   */
  async function resolve(preferred) {
    const candidates = [...providers.values()]
      .filter(p => permitted(p.cost))
      .filter(p => !coolingDown(p.id))
      .sort((a, b) => order.indexOf(a.cost) - order.indexOf(b.cost));
    const preferredFirst = preferred ? candidates.filter(p => p.id === preferred) : [];
    for (const provider of [...preferredFirst, ...candidates]) {
      try { if (await provider.available(config.config)) return provider; } catch { /* a broken check is not a reason to stop looking */ }
    }
    return null;
  }

  const refuse = reason => Object.freeze({ ok: false, used: false, reason, text: '', provider: null });

  /*
   * Ask a model. Always returns a result and never throws: an AI layer that can
   * break the app is worse than no AI layer, and every failure here is a normal
   * outcome with a reason attached.
   */
  async function complete({ system, prompt, preferred, capability, maxOutputTokens, signal, temperature } = {}) {
    if (typeof prompt !== 'string' || !prompt.trim()) return refuse('no-prompt');
    rollDay();
    if (ledger.calls >= config.dailyCallLimit) return refuse('daily-limit');

    const provider = await resolve(preferred);
    if (!provider) return refuse('no-provider');

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), config.timeoutMs) : null;
    if (signal && controller && typeof signal.addEventListener === 'function') signal.addEventListener('abort', () => controller.abort());

    const started = Date.now();
    try {
      const result = await provider.complete({
        system, prompt, signal: controller ? controller.signal : undefined,
        maxOutputTokens: maxOutputTokens || config.maxOutputTokens,
        temperature, config: config.config,
      }, config.config);
      if (!result || typeof result.text !== 'string' || !result.text.trim()) {
        cooldowns.set(provider.id, Date.now() + 60000);
        return { ...refuse('empty'), provider: provider.id };
      }
      ledger.calls += 1;
      if (provider.cost === 'metered') {
        ledger.meteredCalls += 1;
        // Recorded whether or not it is allowed, so a future report can state
        // what would have been spent rather than guessing after the fact.
        ledger.estimatedUsd += Number(result.estimatedUsd) || 0;
      }
      return Object.freeze({
        ok: true, used: true, text: result.text, provider: provider.id, model: result.model || provider.model || null,
        cost: provider.cost, ms: Date.now() - started, usage: result.usage || null,
        estimatedUsd: Number(result.estimatedUsd) || 0,
      });
    } catch (error) {
      // A quota or rate refusal means "not now", which is different from broken.
      // Both cool the provider down so a broken one is not retried in a loop.
      const status = Number(error && (error.status || error.statusCode)) || 0;
      const quota = status === 429 || /quota|rate limit|resource[_ ]exhausted/i.test(String(error && error.message));
      cooldowns.set(provider.id, Date.now() + (quota ? 15 * 60000 : 60000));
      return { ...refuse(quota ? 'quota-exhausted' : 'provider-failed'), provider: provider.id, status };
    } finally { if (timer) clearTimeout(timer); }
  }

  const status = () => ({
    ...rollDay(), configured: providers.size > 0,
    providers: registered(), cooling: [...cooldowns.keys()],
    allowMetered: config.allowMetered, dailyCallLimit: config.dailyCallLimit,
  });

  return Object.freeze({ register, unregister, registered, clear, configure, currentConfig, resolve, complete, status });
})();

if (typeof window !== 'undefined') window.SteadyAIProvider = SteadyAIProvider;
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyAIProvider;
