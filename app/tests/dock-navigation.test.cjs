const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function open({shared = true, missing = false, deferNavigation = false, singleMain = false, hidden = false} = {}) {
  const visits = [], frames = [], resizeObservers = [], mutations = [], pendingRoutes = [];
  let width = 330, visible = true, time = 0, captured = null;
  function node() {
    const events = {}, attributes = new Map(), classes = new Set(), properties = new Map(), listeners = new Map();
    return {
      dataset: {}, classes, properties, listeners,
      classList: {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        toggle: (name, active) => active ? classes.add(name) : classes.delete(name)
      },
      style: {setProperty: (name, value) => properties.set(name, value)},
      setAttribute: (name, value) => attributes.set(name, value),
      hasAttribute: name => attributes.has(name),
      removeAttribute: name => attributes.delete(name),
      addEventListener: (name, listener, options) => { (events[name] ||= []).push(listener); listeners.set(name, options); },
      fire: (name, event = {}) => { for (const listener of events[name] || []) listener(event); }
    };
  }
  const navigation = node(), document = node(), window = node();
  navigation.hidden = hidden;
  window.ontouchstart = null;
  const rect = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});
  const links = ['home', 'today', 'review'].map((route, index) => {
    const link = node();
    link.dataset.section = route;
    link.getBoundingClientRect = () => rect(27 + index * ((width - 22) / 3 + 4), 607, (width - 22) / 3, 56);
    if (!index) link.setAttribute('aria-current', 'location');
    return link;
  });
  navigation.querySelectorAll = () => links;
  navigation.getBoundingClientRect = () => visible ? rect(20, 600, width, 70) : rect(0, 0, 0, 0);
  navigation.clientLeft = navigation.clientTop = 1;
  navigation.scrollLeft = navigation.scrollTop = 0;
  navigation.append = element => { navigation.indicator = element; };
  navigation.setPointerCapture = id => { captured = id; };
  navigation.hasPointerCapture = id => captured === id;
  navigation.releasePointerCapture = id => { captured = null; navigation.fire('lostpointercapture', {pointerId: id}); };
  document.querySelector = () => missing ? null : navigation;
  document.createElement = node;
  document.documentElement = node();
  if (singleMain) document.documentElement.dataset.singleMain = 'true';
  document.body = node();
  function commit(route) {
    links.forEach(link => link.dataset.section === route ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
    document.fire('steady:screen', {detail: route});
  }
  function select(route) {
    visits.push(route);
    // The real shared navigator scrolls an already-current tab without rendering it.
    if (links.some(link => link.dataset.section === route && link.hasAttribute('aria-current'))) return;
    if (deferNavigation) pendingRoutes.push(route);
    else commit(route);
  }
  if (shared) window.SteadyNavigation = {selectTab: select};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/dock-navigation.js'), 'utf8'), {
    window, document, navigateScreen: select,
    getComputedStyle: () => ({display: visible ? 'flex' : 'none', visibility: 'visible'}),
    performance: {now: () => time},
    requestAnimationFrame: fn => { frames.push(fn); return frames.length; },
    ResizeObserver: class { constructor(callback) { resizeObservers.push(callback); } observe() {} },
    MutationObserver: class { constructor(callback) { mutations.push(callback); } observe() {} }
  });
  function event(x, y, options = {}) {
    return {clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, detail: 1,
      prevented: false, stopped: false,
      preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...options};
  }
  function down(x, y = 635, options = {}) {
    const input = event(x, y, options);
    document.fire('pointerdown', input);
    if (options.inDock !== false) navigation.fire('pointerdown', input);
    return input;
  }
  function move(x, y = 635, options = {}) { const input = event(x, y, options); document.fire('pointermove', input); return input; }
  function up(x, y = 635, options = {}) { const input = event(x, y, options); document.fire('pointerup', input); return input; }
  const touch = (x, y = 635, id = 7) => ({clientX: x, clientY: y, identifier: id});
  function touchEvent(name, x, y = 635, options = {}) {
    const point = touch(x, y, options.id);
    const input = event(x, y, {touches: name === 'touchend' || name === 'touchcancel' ? [] : [point], changedTouches: [point], ...options});
    document.fire(name, input);
    if (name === 'touchstart' && options.inDock !== false) navigation.fire(name, input);
    return input;
  }
  function click(route, detail = 1) {
    const input = event(0, 0, {detail});
    navigation.fire('click', input);
    if (!input.prevented) select(route);
    return input;
  }
  const center = index => { const bounds = links[index].getBoundingClientRect(); return bounds.left + bounds.width / 2; };
  const flush = () => { while (frames.length) frames.shift()(); };
  const queueResize = next => { width = next; resizeObservers.forEach(callback => callback()); };
  return {navigation, document, window, links, visits, down, move, up, click, center, flush, select, touch, touchEvent,
    property: name => navigation.properties.get('--dock-selection-' + name),
    cancel: () => document.fire('pointercancel', {pointerId: 1}),
    queueResize,
    resize: next => { queueResize(next); flush(); },
    commitNavigation: () => { while (pendingRoutes.length) commit(pendingRoutes.shift()); },
    show: value => { visible = value; mutations.forEach(callback => callback()); flush(); },
    advance: amount => { time += amount; },
    get captured() { return captured; }};
}

test('horizontal dragging follows the finger and commits exactly once through shared tab selection', () => {
  const app = open();
  assert.ok(app.navigation.classes.has('has-dock-selection'));
  assert.equal(app.navigation.indicator.className, 'dock-selection');
  assert.ok(app.navigation.indicator.hasAttribute('aria-hidden'));
  const original = Number.parseFloat(app.property('x'));
  app.down(app.center(0));
  assert.equal(app.move(app.center(0) + 35).prevented, true);
  assert.equal(Number.parseFloat(app.property('x')), original + 35);
  assert.equal(app.captured, 1);
  app.move(app.center(2));
  assert.equal(app.navigation.dataset.dragTarget, 'review');
  assert.ok(app.links[0].hasAttribute('aria-current'));
  assert.deepEqual(app.visits, []);
  app.up(app.center(2));
  assert.deepEqual(app.visits, ['review']);
  assert.equal(app.captured, null);
  assert.ok(!app.navigation.classes.has('is-dragging'));
  assert.equal(app.click('review').prevented, true);
  assert.deepEqual(app.visits, ['review']);
});

test('a slight diagonal start can continue into a horizontal dock drag', () => {
  const app = open();
  app.down(app.center(0), 635);
  assert.equal(app.move(app.center(0) + 10, 644).prevented, true);
  app.move(app.center(2), 640);
  app.up(app.center(2), 640);
  assert.deepEqual(app.visits, ['review']);
  assert.ok(app.links[2].hasAttribute('aria-current'));
});

test('an edge-start drag selects the tab under the release point', () => {
  const app = open();
  const home = app.links[0].getBoundingClientRect();
  const today = app.links[1].getBoundingClientRect();
  assert.ok(125 > home.left && 125 < home.right);
  assert.ok(155 > today.left && 155 < today.right);
  app.down(125);
  app.move(155);
  assert.equal(app.navigation.dataset.dragTarget, 'today');
  app.up(155);
  assert.deepEqual(app.visits, ['today']);
});

test('body and queued resize notifications preserve a drag when dock geometry is unchanged', () => {
  for (const notify of [
    app => app.show(true),
    app => { app.queueResize(330); app.flush(); },
    app => { app.window.fire('resize'); app.flush(); }
  ]) {
    const app = open();
    // A frame requested before pointerdown must also preserve the new gesture.
    app.queueResize(330);
    app.down(app.center(0));
    app.move(app.center(2));
    const preview = app.property('x');
    notify(app);
    assert.equal(app.navigation.dataset.dragTarget, 'review');
    assert.equal(app.captured, 1);
    assert.equal(app.property('x'), preview);
    app.up(app.center(2));
    assert.deepEqual(app.visits, ['review']);
  }
});

test('the dragged selection stays at its destination until asynchronous navigation commits', () => {
  const app = open({deferNavigation: true});
  const original = app.property('x');
  app.down(app.center(0));
  app.move(app.center(2));
  const preview = app.property('x');
  assert.notEqual(preview, original);
  app.queueResize(330);
  app.up(app.center(2));
  assert.deepEqual(app.visits, ['review']);
  assert.equal(app.captured, null);
  assert.ok(app.links[0].hasAttribute('aria-current'));
  assert.equal(app.property('x'), preview);
  // A delayed observer frame can run between pointerup and the hashchange render.
  app.flush();
  assert.ok(app.links[0].hasAttribute('aria-current'));
  assert.equal(app.property('x'), preview);
  app.commitNavigation();
  assert.ok(app.links[2].hasAttribute('aria-current'));
  assert.equal(app.property('x'), preview);
});

test('a same-tab drag snaps back to its center without needing a route-render event', () => {
  const app = open();
  let renders = 0;
  app.document.addEventListener('steady:screen', () => { renders += 1; });
  const original = app.property('x');
  app.down(app.center(0));
  app.move(app.center(0) + 22);
  assert.notEqual(app.property('x'), original);
  app.up(app.center(0) + 22);
  assert.deepEqual(app.visits, ['home']);
  assert.equal(renders, 0);
  assert.equal(app.property('x'), original);
});

test('a small tap and keyboard activation keep their existing click behavior', () => {
  const app = open();
  app.down(app.center(1));
  app.move(app.center(1) + 3, 638);
  app.up(app.center(1) + 3, 638);
  assert.deepEqual(app.visits, []);
  assert.equal(app.click('today').prevented, false);
  app.down(app.center(1)); app.move(app.center(2)); app.cancel();
  assert.equal(app.click('home', 0).prevented, false);
  assert.deepEqual(app.visits, ['today', 'home']);
});

test('vertical scrolling cannot later turn into tab navigation', () => {
  const app = open();
  app.down(app.center(0));
  assert.equal(app.move(app.center(0) + 3, 656).prevented, false);
  app.move(app.center(2), 656); app.up(app.center(2), 656);
  assert.equal(app.click('review').prevented, true);
  assert.deepEqual(app.visits, []);
  assert.ok(Math.abs(Number.parseFloat(app.property('x')) - 6) < .001);
  app.down(app.center(1)); app.up(app.center(1));
  assert.equal(app.click('today').prevented, false);
  assert.deepEqual(app.visits, ['today']);
});

test('cancelled, interrupted, multi-touch and far-outside drags restore the committed tab', () => {
  for (const cancel of [
    app => app.cancel(),
    app => app.window.fire('blur'),
    app => app.navigation.fire('lostpointercapture', {pointerId: 1}),
    app => app.down(app.center(1), 635, {pointerId: 2, isPrimary: false, inDock: false}),
    app => app.up(app.center(2), 550),
    app => app.up(500, 635)
  ]) {
    const app = open();
    app.down(app.center(0)); app.move(app.center(2)); cancel(app); app.up(app.center(2));
    app.click('review');
    assert.deepEqual(app.visits, []);
    assert.ok(Math.abs(Number.parseFloat(app.property('x')) - 6) < .001);
    assert.ok(!app.navigation.classes.has('is-dragging'));
  }
});

test('right clicks, modified clicks, secondary pointers and content swipes cannot start a dock drag', () => {
  for (const options of [{button: 2}, {ctrlKey: true}, {isPrimary: false}, {inDock: false}]) {
    const app = open();
    app.down(app.center(0), 635, options); app.move(app.center(2)); app.up(app.center(2));
    assert.deepEqual(app.visits, []);
    assert.ok(!app.navigation.classes.has('is-dragging'));
  }
});

test('route changes, resizing, visibility and native tab changes keep the indicator aligned', () => {
  const app = open();
  app.select('review');
  const before = app.property('x');
  app.resize(420);
  assert.notEqual(app.property('x'), before);
  assert.equal(Number.parseFloat(app.property('x')), app.links[2].getBoundingClientRect().left - 21);
  app.down(app.center(2)); app.move(app.center(0));
  app.select('today'); app.up(app.center(0));
  assert.deepEqual(app.visits, ['review', 'today']);
  app.show(false);
  assert.ok(!app.navigation.classes.has('has-dock-selection'));
  app.show(true);
  assert.ok(app.navigation.classes.has('has-dock-selection'));
  app.document.documentElement.dataset.nativeTabs = 'true';
  app.document.fire('steady:screen');
  assert.ok(!app.navigation.classes.has('has-dock-selection'));
  app.down(app.center(0)); app.move(app.center(2)); app.up(app.center(2));
  assert.deepEqual(app.visits, ['review', 'today']);
});

test('native iOS hides the shared web dock when the bridge marks the page', () => {
  const css = fs.readFileSync(require.resolve('../public/branding.css'), 'utf8');
  assert.match(css, /html\[data-native-app=ios\] \.sidebar nav[^{]*\{display:none!important\}/);
});

test('a new tap after a cancelled drag is not swallowed and the fallback navigator works', () => {
  const app = open({shared: false});
  app.down(app.center(0)); app.move(app.center(2)); app.cancel();
  app.down(app.center(1)); app.up(app.center(1)); app.click('today');
  app.down(app.center(1)); app.move(app.center(2)); app.up(app.center(2));
  assert.deepEqual(app.visits, ['today', 'review']);
});

test('a page without the dock initializes safely', () => { assert.doesNotThrow(() => open({missing: true})); });

test('the single main screen never installs dock gestures or an indicator', () => {
  for (const options of [{singleMain: true}, {hidden: true}]) {
    const app = open(options);
    assert.equal(app.navigation.indicator, undefined);
    assert.equal(app.navigation.listeners.size, 0);
    app.down(app.center(0)); app.move(app.center(2)); app.up(app.center(2));
    assert.deepEqual(app.visits, []);
  }
});

test('iPhone touchstart claims the dock before WebKit can begin scrolling or link dragging', () => {
  const app = open();
  assert.equal(app.navigation.listeners.get('touchstart').passive, false);
  assert.equal(app.document.listeners.get('touchmove').passive, false);
  assert.equal(app.document.listeners.get('touchend').passive, false);
  assert.equal(app.touchEvent('touchstart', app.center(0)).prevented, true);
  assert.equal(app.touchEvent('touchmove', app.center(0) + 3).prevented, true);
  assert.equal(app.touchEvent('touchmove', app.center(2)).prevented, true);
  assert.equal(app.navigation.dataset.dragTarget, 'review');
  assert.equal(app.touchEvent('touchend', app.center(2)).prevented, true);
  assert.deepEqual(app.visits, ['review']);
  assert.equal(app.click('home').prevented, true);
  assert.deepEqual(app.visits, ['review']);
});

test('touch taps commit once even though touchstart intentionally suppresses the native click', () => {
  const app = open();
  app.touchEvent('touchstart', app.center(1));
  app.touchEvent('touchmove', app.center(1) + 3, 638);
  app.touchEvent('touchend', app.center(1) + 3, 638);
  assert.deepEqual(app.visits, ['today']);
  app.click('today');
  assert.deepEqual(app.visits, ['today']);
  assert.equal(app.click('home', 0).prevented, false);
  assert.deepEqual(app.visits, ['today', 'home']);
});

test('Safari compatibility pointer events and pointercancel cannot interrupt the owned touch stream', () => {
  const app = open();
  app.down(app.center(0), 635, {pointerType: 'touch', pointerId: 14});
  app.touchEvent('touchstart', app.center(0));
  app.move(app.center(2), 635, {pointerType: 'touch', pointerId: 14});
  app.document.fire('pointercancel', {pointerType: 'touch', pointerId: 14});
  app.touchEvent('touchmove', app.center(2));
  assert.equal(app.captured, null);
  assert.equal(app.navigation.dataset.dragTarget, 'review');
  app.up(app.center(2), 635, {pointerType: 'touch', pointerId: 14});
  assert.deepEqual(app.visits, []);
  app.touchEvent('touchend', app.center(2));
  assert.deepEqual(app.visits, ['review']);
});

test('touch cancellation, another finger, outside release and vertical movement never change tabs', () => {
  for (const cancel of [
    app => app.touchEvent('touchcancel', app.center(2)),
    app => app.touchEvent('touchstart', 100, 100, {inDock: false, touches: [app.touch(app.center(0)), app.touch(100, 100, 8)]}),
    app => app.touchEvent('touchmove', app.center(2), 635, {id: 8}),
    app => app.touchEvent('touchmove', app.center(0) + 2, 660),
    app => app.touchEvent('touchend', app.center(2), 550),
    app => app.window.fire('blur')
  ]) {
    const app = open();
    app.touchEvent('touchstart', app.center(0));
    cancel(app);
    app.touchEvent('touchmove', app.center(2));
    app.touchEvent('touchend', app.center(2));
    app.click('review');
    assert.deepEqual(app.visits, []);
    assert.ok(!app.navigation.classes.has('is-dragging'));
    app.touchEvent('touchstart', app.center(1));
    app.touchEvent('touchend', app.center(1));
    assert.deepEqual(app.visits, ['today']);
  }
});

test('touch gestures ignore unchanged layout notifications and keep the pending destination until commit', () => {
  const app = open({deferNavigation: true});
  app.touchEvent('touchstart', app.center(0));
  app.touchEvent('touchmove', app.center(2));
  const preview = app.property('x');
  app.queueResize(330); app.flush();
  app.touchEvent('touchend', app.center(2));
  app.show(true);
  assert.deepEqual(app.visits, ['review']);
  assert.equal(app.property('x'), preview);
  app.commitNavigation();
  assert.ok(app.links[2].hasAttribute('aria-current'));
  assert.equal(app.property('x'), preview);
});
