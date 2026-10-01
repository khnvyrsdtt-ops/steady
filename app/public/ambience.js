'use strict';

// Quiet interactive light for Home. Still air, not weather: two soft glows
// drift on their own and lean gently toward the pointer. Transform-only,
// paused off-screen, off without motion. No data, no storage, no network.
const SteadyAmbience = (() => {
  const reduceMotion = () => typeof document !== 'undefined' &&
    (document.documentElement.dataset.motion === 'off' ||
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  function build(hub) {
    if (hub.querySelector('.ambience')) return hub.querySelector('.ambience');
    const layer = document.createElement('div');
    layer.className = 'ambience';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<span class="amb-a"><span></span></span><span class="amb-b"><span></span></span>';
    hub.append(layer);
    return layer;
  }

  function init() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return null;
    const state = { hub: null, raf: 0, tx: 0, ty: 0, cx: 0, cy: 0, onHome: false };
    const schedule = fn => (window.requestAnimationFrame || (callback => setTimeout(callback, 16)))(fn);
    const cancel = id => (window.cancelAnimationFrame || clearTimeout)(id);
    const frame = () => {
      state.raf = 0;
      if (!state.onHome || document.hidden || reduceMotion()) return;
      state.cx += (state.tx - state.cx) * 0.06;
      state.cy += (state.ty - state.cy) * 0.06;
      if (state.hub) {
        state.hub.style.setProperty('--amb-x', state.cx.toFixed(3));
        state.hub.style.setProperty('--amb-y', state.cy.toFixed(3));
      }
      if (Math.abs(state.tx - state.cx) > 0.001 || Math.abs(state.ty - state.cy) > 0.001) {
        state.raf = schedule(frame);
      }
    };
    const kick = () => { if (!state.raf && !reduceMotion()) state.raf = schedule(frame); };
    const homeHub = () => document.querySelector('.home-screen .hub-heading');
    const sync = () => {
      state.onHome = document.body.classList.contains('home-screen');
      const hub = state.onHome ? homeHub() : null;
      state.hub = hub;
      if (hub && !reduceMotion()) build(hub);
    };
    window.addEventListener('pointermove', event => {
      if (!state.onHome || reduceMotion()) return;
      const width = window.innerWidth || 1, height = window.innerHeight || 1;
      state.tx = Math.max(-1, Math.min(1, (event.clientX / width - 0.5) * 2));
      state.ty = Math.max(-1, Math.min(1, (event.clientY / height - 0.5) * 2));
      kick();
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.raf) { cancel(state.raf); state.raf = 0; }
    });
    document.addEventListener('steady:screen', sync);
    sync();
    return state;
  }

  return { init };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SteadyAmbience;
if (typeof document !== 'undefined') {
  const start = () => SteadyAmbience.init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
