const { test } = require('node:test');
const assert = require('node:assert/strict');
const physics = require('../public/rain-physics.js');

const width = 402, height = 874;
function field(viewWidth = width, viewHeight = height, count = 103) {
  const drops = Array.from({ length: count }, (_, i) => {
    const depth = (i * 0.41421356237 + 0.31) % 1;
    return { lane: (i * 0.61803398875 + 0.13) % 1, speed: 15 + depth * 7,
      size: 0.9 + depth * 0.9, length: 16 + depth * 14, side: i % 2 ? 1 : -1 };
  });
  return { drops, cadence: physics.createCadence(drops, viewWidth, viewHeight) };
}

function run(duration, frameDurations, scenario = () => ({})) {
  const { drops, cadence } = field();
  const identities = drops.slice(), events = [];
  let elapsed = 0, frame = 0, minimumWaiting = cadence.waiting.length;
  while (elapsed < duration - 1e-9) {
    const dt = Math.min(frameDurations[frame++ % frameDurations.length], duration - elapsed);
    elapsed += dt;
    const before = cadence.emissions;
    const { viewHeight = height, touch = null } = scenario(elapsed);
    physics.advanceAll(drops, dt, width, viewHeight, touch, cadence);
    const emitted = cadence.emissions - before;
    assert.ok(emitted <= 1, 'one frame never emits a cluster');
    if (emitted) events.push(elapsed);
    minimumWaiting = Math.min(minimumWaiting, cadence.waiting.length);
  }
  assert.equal(drops.length, identities.length, 'the original bounded pool is retained');
  drops.forEach((drop, index) => assert.equal(drop, identities[index], 'existing particles are reused'));
  assert.equal(new Set(cadence.waiting).size, cadence.waiting.length, 'no drop is queued twice');
  assert.equal(drops.filter(drop => drop.waiting).length, cadence.waiting.length);
  assert.ok(drops.every(drop => Number.isFinite(drop.y) && drop.trail.length <= 64));
  return { drops, cadence, events, minimumWaiting };
}

test('three minutes of rain retain an even half-second cadence without adding particles', () => {
  const { cadence, events, minimumWaiting } = run(180, [1 / 30]);
  assert.ok(cadence.interval >= 0.5 && cadence.interval <= 0.6, 'a quiet, continuous phone-sized rhythm');
  assert.equal(events.length, Math.floor(180 / cadence.interval), 'the reserve sustains every scheduled arrival');
  assert.ok(minimumWaiting > 0, 'individual speed variation cannot exhaust the reserve');
  for (let i = 1; i < events.length; i++) {
    assert.ok(Math.abs(events[i] - events[i - 1] - cadence.interval) <= 1 / 30 + 1e-9,
      'each arrival stays within one display frame of its intended interval');
  }
});

test('rain keeps every approximate open-screen region supplied without persistent empty areas', () => {
  for (const [viewWidth, viewHeight, count] of [[320, 568, 53], [402, 874, 103]]) {
    const { drops, cadence } = field(viewWidth, viewHeight, count);
    const columns = Math.round(viewWidth / 100);
    const rows = Math.round((viewHeight - 160) / 120);
    const emptyFor = Array(columns * rows).fill(0);
    let emptySamples = 0, samples = 0;
    for (let frame = 0; frame < 180 * 20; frame++) {
      physics.advanceAll(drops, 1 / 20, viewWidth, viewHeight, null, cadence);
      if (frame % 5) continue;
      const occupied = emptyFor.map(() => false);
      for (const drop of drops) {
        if (drop.waiting) continue;
        const column = Math.floor((drop.lane * viewWidth + drop.offset) / viewWidth * columns);
        if (column < 0 || column >= columns) continue;
        for (let row = 0; row < rows; row++) {
          const top = 80 + row * (viewHeight - 160) / rows;
          const bottom = 80 + (row + 1) * (viewHeight - 160) / rows;
          if (drop.y >= top && drop.y - drop.length <= bottom) occupied[row * columns + column] = true;
        }
      }
      occupied.forEach((hasRain, index) => {
        emptyFor[index] = hasRain ? 0 : emptyFor[index] + 0.25;
        assert.ok(emptyFor[index] <= 3, 'no approximate 100×120px region stays empty for more than 3 seconds');
        if (!hasRain) emptySamples++;
      });
      samples++;
    }
    assert.ok(emptySamples / (samples * emptyFor.length) < 0.005, 'broad coverage persists as drops recycle');
    assert.equal(drops.length, count, 'coverage uses the same particle count');
  }
});

test('a long hold and a cropped keyboard viewport preserve the same arrival rhythm', () => {
  const control = run(180, [1 / 30]);
  const interactive = run(180, [1 / 30], elapsed => ({
    viewHeight: elapsed >= 30 && elapsed < 90 ? 500 : height,
    touch: elapsed >= 30 && elapsed < 60 ? { x: 201, y: 350, strength: 1, holding: true } : null
  }));
  assert.deepEqual(interactive.events, control.events, 'touch delays and keyboard changes cause neither bursts nor gaps');
  assert.equal(interactive.cadence.worldHeight, height);
  assert.ok(interactive.minimumWaiting > 0);
});

test('emission timing follows elapsed animation time across changing frame rates', () => {
  for (const frames of [[1 / 120], [1 / 20], [1 / 120, 1 / 60, 1 / 30, 0.045, 1 / 90]]) {
    const { cadence, events } = run(90, frames);
    assert.equal(events.length, Math.floor(90 / cadence.interval));
    const tolerance = Math.max(...frames) + 1e-8;
    events.forEach((time, index) => {
      assert.ok(Math.abs(time - (index + 1) * cadence.interval) <= tolerance,
        'arrivals do not drift when the display frame rate changes');
    });
  }
});

test('shrinking the visible height does not move or recycle the lower rain', () => {
  const normal = field(), cropped = field();
  physics.advanceAll(normal.drops, 1 / 60, width, height, null, normal.cadence);
  physics.advanceAll(cropped.drops, 1 / 60, width, 400, null, cropped.cadence);
  assert.deepEqual(cropped.drops, normal.drops, 'a keyboard clips the field without changing any water position');
  assert.equal(cropped.cadence.emissions, normal.cadence.emissions);
  assert.equal(cropped.cadence.waiting.length, normal.cadence.waiting.length);
});

test('a larger viewport stretches the future cadence without jumping existing water', () => {
  const { drops, cadence } = field();
  const oldInterval = cadence.interval;
  const positions = drops.map(drop => ({ x: drop.lane * width + drop.offset, y: drop.y, waiting: drop.waiting }));
  physics.advanceAll(drops, 1 / 60, width, 1100, null, cadence);
  assert.equal(cadence.worldHeight, 1100);
  assert.ok(cadence.interval > oldInterval);
  assert.equal(cadence.emissions, 0);
  drops.forEach((drop, index) => {
    const before = positions[index];
    const distance = Math.hypot(drop.lane * width + drop.offset - before.x, drop.y - before.y);
    assert.ok(distance <= drop.speed * 1.05 / 60 + 1e-9, 'resize never reseeds visible particles');
    assert.equal(drop.waiting, before.waiting);
  });
});

test('background pauses and empty ticks never accumulate a release backlog', () => {
  const { drops, cadence } = field();
  physics.advanceAll(drops, 3600, width, height, null, cadence);
  assert.equal(cadence.clock, 0.05, 'a long pause only advances the clamped simulation frame');
  assert.equal(cadence.emissions, 0);
  physics.advanceAll(drops, -1, width, height, null, cadence);
  assert.equal(cadence.clock, 0.05);

  // Model an unusually long obstruction with every sample still on screen.
  cadence.waiting.length = 0;
  drops.forEach(drop => { drop.waiting = false; drop.y = height / 2; drop.trail = []; });
  for (let i = 0; i < 90; i++) physics.advanceAll(drops, 1 / 30, width, height, null, cadence);
  assert.equal(cadence.emissions, 0);
  assert.ok(cadence.nextEmission > cadence.clock, 'unavailable arrivals are skipped rather than owed');
  const nextTick = cadence.nextEmission;
  drops[0].y = height + 41;
  physics.advanceAll(drops, 1 / 30, width, height, null, cadence);
  assert.equal(cadence.emissions, 0, 'retiring water waits for the next planned tick');
  assert.equal(drops[0].waiting, true);
  while (cadence.clock + 1e-9 < nextTick) physics.advanceAll(drops, 1 / 30, width, height, null, cadence);
  assert.equal(cadence.emissions, 1);
  assert.equal(drops[0].waiting, false);
  assert.equal(drops[0].y, -18);
  assert.equal(drops[0].trail.length, 0, 'recycling cannot draw a trail across the screen');
});
