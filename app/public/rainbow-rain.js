'use strict';

// A decorative layer only: passive touch observation, no captured gestures or
// changes to the conversation's layout. Nothing is stored here.
const SteadyRainbowRain = (() => {
  const palette = ['#ff5e92', '#ff9847', '#e8bf28', '#33d797', '#35c8ef', '#8b8cff', '#d66cff'];
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  const protectedSelector = '.steady-presence, .chat-bubble, .ask-welcome-title, .chat-method, .chat-inline-prompt, .chat-draft-presence, .chat-actions, .chat-input-area, button, a, summary, [role="status"]';
  const controlSelector = 'button, a, input, textarea, select, summary, [contenteditable], [role="button"], [role="switch"], .chat-bubble, .steady-presence';
  const physics = typeof SteadyRainPhysics !== 'undefined' ? SteadyRainPhysics : require('./rain-physics.js');
  const sourceLane = physics.sourceLane;
  const holdDelay = 100;

  function createDrops(width, height) {
    const count = clamp(Math.round(width * height / 3400), 52, 160);
    return Array.from({ length: count }, (_, i) => {
      const lane = ((i * 0.61803398875 + 0.13) % 1);
      const y = ((i * 0.754877666 + 0.21) % 1) * (height + 36) - 18;
      const depth = ((i * 0.41421356237 + 0.31) % 1);
      return {
        // Stable, independent depth and colour keep the rain from reading as
        // evenly weighted confetti. The same particles survive every resize.
        lane,
        y,
        speed: 15 + depth * 7,
        size: 0.9 + depth * 0.9,
        length: 16 + depth * 14,
        opacity: 0.36 + depth * 0.52,
        colour: palette[i % palette.length],
        offset: sourceLane(lane, y, width, height) - lane * width,
        vx: 0,
        trail: [],
        side: i % 2 ? 1 : -1
      };
    });
  }

  function streakPoints(drop, width) {
    const head = { x: drop.lane * width + drop.offset, y: drop.y };
    const history = drop.trail?.length ? drop.trail : [{ x: head.x, y: head.y - drop.length }];
    const points = [head];
    let remaining = drop.length;
    for (const point of history) {
      const previous = points[points.length - 1];
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      if (distance < 0.001) continue;
      const fraction = Math.min(1, remaining / distance);
      points.push({ x: previous.x + (point.x - previous.x) * fraction, y: previous.y + (point.y - previous.y) * fraction });
      remaining -= distance;
      if (remaining <= 0) break;
    }
    return points.reverse();
  }

  function smoothStreak(points) {
    if (points.length < 3) return points;
    const first = points[0], last = points[points.length - 1];
    const span = Math.hypot(last.x - first.x, last.y - first.y);
    // Keep straight falling water exact. Curved histories are resampled by
    // distance, so rounding does not depend on the screen's refresh rate.
    if (span > 0 && points.every(point => Math.abs((point.x - first.x) * (last.y - first.y) -
      (point.y - first.y) * (last.x - first.x)) / span < 0.025)) return [first, last];
    const samples = [first], spacing = 3.5;
    let travelled = 0, next = spacing;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], distance = Math.hypot(b.x - a.x, b.y - a.y);
      while (distance > 0 && next < travelled + distance) {
        const fraction = (next - travelled) / distance;
        samples.push({ x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction });
        next += spacing;
      }
      travelled += distance;
    }
    if (Math.hypot(samples[samples.length - 1].x - last.x, samples[samples.length - 1].y - last.y) > 0.001) samples.push(last);
    else samples[samples.length - 1] = last;
    const rounded = [first];
    const curve = (control, end) => {
      const start = rounded[rounded.length - 1];
      const distance = Math.hypot(control.x - start.x, control.y - start.y) + Math.hypot(end.x - control.x, end.y - control.y);
      const steps = Math.max(2, Math.ceil(distance / 0.65));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        rounded.push({ x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
          y: u * u * start.y + 2 * u * t * control.y + t * t * end.y });
      }
    };
    // Midpoint quadratics have matching tangents at every join. They only
    // round inside the recorded water path; no ring or extra tail is drawn.
    for (let i = 0; i < samples.length - 1; i++) {
      curve(samples[i], { x: (samples[i].x + samples[i + 1].x) / 2,
        y: (samples[i].y + samples[i + 1].y) / 2 });
    }
    curve(last, last);
    return rounded;
  }

  function pathAlpha(points, zones, radius = 0) {
    let alpha = 1;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      for (const zone of zones) {
        const dx = Math.max(zone.left - Math.max(a.x, b.x) - radius, 0, Math.min(a.x, b.x) - radius - zone.right);
        const dy = Math.max(zone.top - Math.max(a.y, b.y) - radius, 0, Math.min(a.y, b.y) - radius - zone.bottom);
        alpha = Math.min(alpha, smooth(Math.hypot(dx, dy) / zone.feather));
        if (!alpha) return 0;
      }
    }
    return alpha;
  }

  function clearSpaceAlpha(x, y, zones, length = 0, radius = 0) {
    let alpha = 1;
    for (const zone of zones) {
      // Distance from the whole stroke, including its rounded ends. A long
      // tail must never cross a protected area when its head is already clear.
      const dx = Math.max(zone.left - x - radius, 0, x - radius - zone.right);
      const dy = Math.max(zone.top - y - radius, 0, y - length - radius - zone.bottom);
      alpha = Math.min(alpha, smooth(Math.hypot(dx, dy) / zone.feather));
      if (!alpha) break;
    }
    return alpha;
  }

  function init() {
    const panel = document.querySelector('.feelings-panel');
    if (!panel) return null;
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let canvas = null, context = null, frame = 0, previous = null, active = false;
    let bounds = null, zones = [], drops = [], cadence = null, width = 0, height = 0;
    let dirty = true, held = null, touch = null, dark = false, ambience = 1;
    const cleanup = [];
    const listen = (target, event, handler, options) => {
      target?.addEventListener(event, handler, options);
      cleanup.push(() => target?.removeEventListener(event, handler, options));
    };
    const motion = () => root.dataset.motion !== 'off' && !media.matches;
    const release = () => { held = null; };
    const schedule = () => { if (active && !frame) frame = window.requestAnimationFrame(render); };
    const invalidate = () => { dirty = true; schedule(); };

    function measure() {
      bounds = panel.getBoundingClientRect();
      const nextWidth = Math.max(1, bounds.width), nextHeight = Math.max(1, bounds.height);
      if (nextWidth !== width || nextHeight !== height) {
        if (width && nextWidth !== width) drops.forEach(drop => {
          const scaleX = nextWidth / width;
          drop.offset *= scaleX;
          drop.trail.forEach(point => { point.x *= scaleX; });
        });
        // Opening a keyboard changes the visible window, not the water's
        // position. Scaling y here compressed every streak into a new place.
        width = nextWidth; height = nextHeight;
        // Antialiased fine strokes remain smooth with a modest backing buffer.
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
        context.setTransform(scale, 0, 0, scale, 0, 0);
        if (!drops.length) {
          drops = createDrops(width, height);
          cadence = physics.createCadence(drops, width, height);
        }
      }
      dark = root.dataset.theme === 'dark';
      const protectedElements = [...panel.querySelectorAll(protectedSelector), ...document.querySelectorAll('.sidebar .settings-link')];
      zones = protectedElements.flatMap(element => {
        // The welcome bubble is a transparent layout container. Its text and
        // individual controls have their own clearances; clearing the whole
        // rectangle also erased the empty space between and around them.
        if (element.classList.contains('chat-bubble') && element.closest('.chat-welcome')) return [];
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height || element.closest('[hidden]')) return [];
        const logo = element.classList.contains('steady-presence');
        const padding = logo ? 12 : 7;
        return [{ left: rect.left - bounds.left - padding, right: rect.right - bounds.left + padding,
          top: rect.top - bounds.top - padding, bottom: rect.bottom - bounds.top + padding,
          feather: logo ? 16 : 14 }];
      });
      // UIKit owns these controls outside the web document. Keep their existing
      // glass appearance unchanged by also reserving their measured clearances.
      const scroll = panel.querySelector('.chat-scroll');
      const scrollStyle = window.getComputedStyle(scroll);
      const top = (parseFloat(scrollStyle.scrollPaddingTop) || 0) +
        (root.dataset.nativeHeader === 'true' && root.dataset.keyboardOpen !== 'true' ? 48 : 0);
      const bottom = root.dataset.nativeComposer === 'true' ? parseFloat(scrollStyle.scrollPaddingBottom) || 0 : 0;
      zones.push({ left: 0, right: width, top: 0, bottom: top, feather: 22 });
      if (bottom) zones.push({ left: 0, right: width, top: height - bottom, bottom: height, feather: 22 });
      dirty = false;
    }

    function render(now) {
      frame = 0;
      if (!active) return;
      if (dirty) measure();
      const moving = motion();
      const dt = previous === null ? 0 : clamp((now - previous) / 1000, 0, 0.05);
      previous = now;
      const targetAmbience = root.dataset.keyboardOpen === 'true' ? 0.56 : 1;
      ambience = moving ? ambience + (targetAmbience - ambience) * (1 - Math.exp(-dt * 5)) : targetAmbience;
      if (held && now - held.since >= holdDelay && moving) {
        if (!touch) touch = { x: held.x, y: held.y, strength: 0 };
        touch.holding = true;
        const follow = 1 - Math.exp(-dt * 24);
        touch.x += (held.x - touch.x) * follow;
        touch.y += (held.y - touch.y) * follow;
        // Only integrate the part of this frame after the short hold gate.
        // Activation then takes the same time on slower and faster displays.
        const heldDt = Math.min(dt, Math.max(0, (now - held.since - holdDelay) / 1000));
        touch.strength += (1 - touch.strength) * (1 - Math.exp(-heldDt * 12));
      } else if (touch) {
        touch.holding = false;
        touch.strength *= Math.exp(-dt * 4);
        if (touch.strength < 0.005 || !moving) touch = null;
      }
      context.clearRect(0, 0, width, height);
      if (moving) {
        physics.advanceAll(drops, dt, width, height, touch, cadence);
      }
      for (const drop of drops) {
        if (drop.waiting) continue;
        const points = smoothStreak(streakPoints(drop, width));
        if (points.length < 2) continue;
        const tail = points[0], head = points[points.length - 1];
        const top = Math.min(...points.map(point => point.y)), bottom = Math.max(...points.map(point => point.y));
        if (bottom < 0 || top > height) continue;
        const alpha = pathAlpha(points, zones, drop.size / 2);
        const edge = smooth(top / 42) * smooth((height - bottom) / 72);
        // Finger interaction changes the path, never the drop's visibility.
        context.globalAlpha = (dark ? 0.78 : 0.7) * drop.opacity * ambience * alpha * edge;
        if (context.globalAlpha <= 0.005) continue;
        const gradient = context.createLinearGradient(tail.x, tail.y, head.x, head.y);
        gradient.addColorStop(0, drop.colour + '00');
        gradient.addColorStop(0.4, drop.colour + '45');
        gradient.addColorStop(1, drop.colour);
        context.strokeStyle = gradient;
        context.lineWidth = drop.size;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(tail.x, tail.y);
        points.slice(1).forEach(point => context.lineTo(point.x, point.y));
        context.stroke();
      }
      context.globalAlpha = 1;
      if (moving) schedule();
    }

    function sync() {
      const nextActive = root.dataset.rainbowRain === 'on' && document.body.classList.contains('chat-screen') && !document.hidden;
      if (nextActive && !canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'rainbow-rain';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.setAttribute('draggable', 'false');
        context = canvas.getContext('2d');
        if (!context) { canvas = null; return; }
        panel.prepend(canvas);
      }
      active = nextActive;
      if (canvas) canvas.hidden = !active;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0; previous = null; release(); touch = null;
      dirty = true;
      schedule();
    }

    listen(panel, 'pointerdown', event => {
      if (!active || !motion() || event.isPrimary === false || event.button > 0 || event.target?.closest?.(controlSelector)) return;
      if (dirty) measure();
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
      if (clearSpaceAlpha(x, y, zones) < 0.95) return;
      held = { id: event.pointerId, x, y,
        startX: event.clientX, startY: event.clientY, since: window.performance.now() };
    }, { passive: true });
    listen(window, 'pointermove', event => {
      if (!held || event.pointerId !== held.id) return;
      const samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : null;
      const latest = samples?.length ? samples[samples.length - 1] : event;
      if (event.target?.closest?.(controlSelector) || (window.performance.now() - held.since < holdDelay && Math.hypot(latest.clientX - held.startX, latest.clientY - held.startY) > 10)) { release(); return; }
      held.x = latest.clientX - bounds.left; held.y = latest.clientY - bounds.top;
      if (clearSpaceAlpha(held.x, held.y, zones) < 0.95) release();
    }, { passive: true });
    const endPointer = event => { if (held && event.pointerId === held.id) release(); };
    listen(window, 'pointerup', endPointer, { passive: true });
    listen(window, 'pointercancel', endPointer, { passive: true });
    listen(window, 'blur', release);
    listen(panel, 'scroll', () => { release(); invalidate(); }, { passive: true, capture: true });
    listen(window, 'resize', invalidate, { passive: true });
    listen(window.visualViewport, 'resize', invalidate, { passive: true });
    listen(window.visualViewport, 'scroll', invalidate, { passive: true });
    listen(document, 'visibilitychange', sync);
    listen(document, 'steady:screen', sync);
    listen(window, 'steady:rainbow-rain-setting', sync);
    listen(media, 'change', sync);
    const preferences = new MutationObserver(sync);
    preferences.observe(root, { attributes: true, attributeFilter: ['data-rainbow-rain', 'data-motion', 'data-theme', 'data-keyboard-open', 'data-native-keyboard', 'data-size', 'data-font', 'data-spacing'] });
    const contents = new MutationObserver(invalidate);
    contents.observe(panel.querySelector('#feelings-form'), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    const resize = new ResizeObserver(invalidate);
    resize.observe(panel);
    resize.observe(panel.querySelector('#feelings-form'));
    sync();
    return { destroy() {
      active = false;
      if (frame) window.cancelAnimationFrame(frame);
      cleanup.forEach(remove => remove());
      preferences.disconnect(); contents.disconnect(); resize.disconnect(); canvas?.remove();
    } };
  }
  return { createDrops, advanceAll: physics.advanceAll, sourceLane, streakPoints, smoothStreak, pathAlpha, clearSpaceAlpha, init };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SteadyRainbowRain;
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => SteadyRainbowRain.init(), { once: true });
  else SteadyRainbowRain.init();
}
