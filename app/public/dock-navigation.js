'use strict';
(() => {
  const navigation = document.querySelector('.sidebar nav');
  if (!navigation || navigation.hidden || document.documentElement.dataset.singleMain === 'true') return;
  const links = [...navigation.querySelectorAll('a.nav-item[data-section]')];
  if (!links.length) return;

  const selection = document.createElement('span');
  selection.className = 'dock-selection';
  selection.setAttribute('aria-hidden', 'true');
  navigation.append(selection);
  let gesture = null;
  let pendingSelection = null;
  let refreshFrame = 0;
  let suppressClickUntil = 0;

  function layout() {
    const bounds = navigation.getBoundingClientRect();
    const style = getComputedStyle(navigation);
    if (document.hidden || document.documentElement.dataset.nativeTabs === 'true' ||
        !bounds.width || !bounds.height || style.display === 'none' || style.visibility === 'hidden') return null;
    const items = links.map(link => {
      const rect = link.getBoundingClientRect();
      return {link, rect, center: rect.left + rect.width / 2};
    }).filter(item => item.rect.width && item.rect.height);
    return items.length ? {bounds, items} : null;
  }

  function position(item, bounds, center = item.center) {
    const values = {
      x: center - item.rect.width / 2 - bounds.left - navigation.clientLeft + navigation.scrollLeft,
      y: item.rect.top - bounds.top - navigation.clientTop + navigation.scrollTop,
      width: item.rect.width,
      height: item.rect.height
    };
    for (const [name, value] of Object.entries(values)) {
      navigation.style.setProperty(`--dock-selection-${name}`, `${value}px`);
    }
    navigation.classList.add('has-dock-selection');
  }

  function sync() {
    const geometry = layout();
    const selected = geometry?.items.find(item => item.link === pendingSelection) ||
      geometry?.items.find(item => item.link.hasAttribute('aria-current'));
    if (selected) position(selected, geometry.bounds);
    else navigation.classList.remove('has-dock-selection');
  }

  function stop(suppress = false, restore = true) {
    const previous = gesture;
    gesture = null;
    if (suppress) suppressClickUntil = performance.now() + 750;
    navigation.classList.remove('is-dragging');
    delete navigation.dataset.dragTarget;
    links.forEach(link => link.classList.remove('is-drag-target'));
    if (previous?.source === 'pointer' && navigation.hasPointerCapture?.(previous.id)) navigation.releasePointerCapture(previous.id);
    if (restore) sync();
  }

  function refresh() {
    if (refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      if (gesture) {
        const next = layout();
        const previous = gesture.geometry;
        const unchanged = next && ['left', 'top', 'width', 'height'].every(key =>
          Math.abs(next.bounds[key] - previous.bounds[key]) < 1) &&
          next.items.length === previous.items.length && next.items.every((item, index) =>
            Math.abs(item.center - previous.items[index].center) < 1 &&
            Math.abs(item.rect.height - previous.items[index].rect.height) < 1);
        // Observer notifications and queued frames are not new gestures.
        if (unchanged) return;
        stop(true);
        return;
      }
      sync();
    });
  }

  function follow(clientX) {
    const {geometry} = gesture;
    const {items, bounds} = geometry;
    const center = Math.max(items[0].center, Math.min(items[items.length - 1].center, clientX));
    const target = items.reduce((nearest, item) => Math.abs(item.center - center) < Math.abs(nearest.center - center) ? item : nearest);
    gesture.target = target.link;
    navigation.dataset.dragTarget = target.link.dataset.section;
    links.forEach(link => link.classList.toggle('is-drag-target', link === target.link));
    position(target, bounds, center);
  }

  function begin(source, id, clientX, clientY) {
    const geometry = layout();
    if (!geometry) return false;
    pendingSelection = null;
    suppressClickUntil = 0;
    const origin = geometry.items.reduce((nearest, item) => Math.abs(item.center - clientX) < Math.abs(nearest.center - clientX) ? item : nearest);
    gesture = {source, id, x: clientX, y: clientY, geometry, dragging: false, target: origin.link};
    return true;
  }

  function move(clientX, clientY, event) {
    const dx = Math.abs(clientX - gesture.x);
    const dy = Math.abs(clientY - gesture.y);
    if (!gesture.dragging) {
      // Once scrolling starts vertically, it cannot turn into a tab change.
      if (dy > 18 && dy > dx * 1.3) { stop(true); return; }
      if (dx <= 8 || dx < dy * .8) return;
      gesture.dragging = true;
      navigation.classList.add('is-dragging');
      if (gesture.source === 'pointer') {
        try { navigation.setPointerCapture?.(gesture.id); } catch (_) { /* Pointer may already have ended. */ }
      }
    }
    event.preventDefault();
    follow(clientX);
  }

  function finish(clientX, clientY, event) {
    // Touchstart is cancelled deliberately, so touch taps commit here as well.
    // Pointer taps retain native link/keyboard click behavior.
    if (!gesture.dragging && gesture.source !== 'touch') { stop(); return; }
    const {bounds} = gesture.geometry;
    const inside = clientX >= bounds.left - 24 && clientX <= bounds.right + 24 &&
      clientY >= bounds.top - 24 && clientY <= bounds.bottom + 24;
    follow(clientX);
    const target = gesture.target;
    const route = target.dataset.section;
    const shown = !!layout();
    // Keep the preview in place until the destination commits; restoring the
    // old selection here creates a visible snap back before hashchange.
    stop(true, !inside || !shown);
    if (!inside || !shown) return;
    pendingSelection = target;
    sync();
    event.preventDefault();
    if (typeof window.SteadyNavigation?.selectTab === 'function') window.SteadyNavigation.selectTab(route);
    else if (typeof navigateScreen === 'function') navigateScreen(route);
  }

  // Safari/WKWebView sends both pointer and touch events. Own its touch stream
  // from touchstart, before link dragging or the WebView scroll recognizer can
  // cancel the pointer stream. Preventing only pointermove is too late there.
  const nativeTouch = 'ontouchstart' in window;
  document.addEventListener('touchstart', event => {
    if (gesture && (event.touches.length !== 1 || gesture.source !== 'touch' || event.touches[0].identifier !== gesture.id)) stop(true);
  }, {capture: true, passive: true});
  navigation.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (begin('touch', touch.identifier, touch.clientX, touch.clientY)) event.preventDefault();
  }, {passive: false});
  document.addEventListener('touchmove', event => {
    if (gesture?.source !== 'touch') return;
    if (event.touches.length !== 1 || event.touches[0].identifier !== gesture.id) { stop(true); return; }
    event.preventDefault();
    const touch = event.touches[0];
    move(touch.clientX, touch.clientY, event);
  }, {passive: false});
  document.addEventListener('touchend', event => {
    if (gesture?.source !== 'touch') return;
    if (event.touches.length || event.changedTouches.length !== 1 || event.changedTouches[0].identifier !== gesture.id) { stop(true); return; }
    const touch = event.changedTouches[0];
    finish(touch.clientX, touch.clientY, event);
  }, {passive: false});
  document.addEventListener('touchcancel', () => { if (gesture?.source === 'touch') stop(true); }, {passive: true});

  document.addEventListener('pointerdown', event => {
    if (nativeTouch && event.pointerType === 'touch') return;
    if (gesture && (gesture.source !== 'pointer' || event.pointerId !== gesture.id)) stop(true);
  }, {capture: true, passive: true});
  navigation.addEventListener('pointerdown', event => {
    if (nativeTouch && event.pointerType === 'touch') return;
    if (event.button !== 0 || event.isPrimary === false || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    begin('pointer', event.pointerId, event.clientX, event.clientY);
  }, {passive: true});
  document.addEventListener('pointermove', event => {
    if (gesture?.source === 'pointer' && event.pointerId === gesture.id) move(event.clientX, event.clientY, event);
  }, {passive: false});
  document.addEventListener('pointerup', event => {
    if (gesture?.source === 'pointer' && event.pointerId === gesture.id) finish(event.clientX, event.clientY, event);
  }, {passive: false});
  document.addEventListener('pointercancel', event => {
    if (gesture?.source === 'pointer' && gesture.id === event.pointerId) stop(true);
  }, {passive: true});
  navigation.addEventListener('lostpointercapture', event => {
    if (gesture?.source === 'pointer' && gesture.id === event.pointerId) stop(true);
  });
  navigation.addEventListener('click', event => {
    // A completed drag already selected its tab. Keyboard clicks remain native.
    if (event.detail !== 0 && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickUntil = 0;
    }
  }, true);
  navigation.addEventListener('dragstart', event => event.preventDefault());
  navigation.addEventListener('contextmenu', () => { if (gesture) stop(true); });
  window.addEventListener('blur', () => { if (gesture) stop(true); });
  window.addEventListener('resize', refresh);
  navigation.addEventListener('scroll', refresh, {passive: true});
  document.addEventListener('visibilitychange', () => { stop(!!gesture); });
  document.addEventListener('steady:screen', () => {
    pendingSelection = null;
    stop(!!gesture);
  });

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(refresh);
    observer.observe(navigation);
    links.forEach(link => observer.observe(link));
  }
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-native-tabs', 'data-motion']});
    observer.observe(document.body, {attributes: true, attributeFilter: ['class']});
  }
  sync();
})();
