'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const physics = require('../public/rain-physics.js');
const width = 400, height = 800;
const finger = { x: 200, y: 260, strength: 1, holding: true };
const drop = (x, y, extra = {}) => ({ lane: x / width, offset: 0, y, speed: 20,
  size: 1.5, length: 26, side: x < finger.x ? -1 : 1, trail: [], ...extra });
const xOf = d => d.lane * width + d.offset;
function advance(drops, seconds, touch = null, fps = 60) {
  for (let i = 0; i < Math.round(seconds * fps); i++) physics.advanceAll(drops, 1 / fps, width, height, touch);
}
function pathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return length;
}

test('gravity and drag approach terminal speed without oscillation', () => {
  const d = drop(80, 400, { vy: 0 });
  let previous = 0;
  for (let i = 0; i < 300; i++) {
    physics.advanceAll([d], 1 / 60, width, height, null);
    assert.ok(d.vy >= previous && d.vy <= d.speed);
    previous = d.vy;
  }
  assert.ok(d.vy > d.speed * 0.99);
  assert.ok(d.y > 480);
});

test('a fingertip redirects rainfall around both shoulders using continuous contact', () => {
  for (const side of [-1, 1]) {
    const d = drop(finger.x + side * 22, finger.y - 65);
    let shoulder = false, downstream = false;
    for (let i = 0; i < 1200; i++) {
      physics.advanceAll([d], 1 / 60, width, height, finger);
      const dx = xOf(d) - finger.x, dy = d.y - finger.y;
      assert.ok(Math.hypot(dx / 52, dy / 36) >= 0.985, 'incoming water stays outside the finger');
      if (Math.abs(dx) > 48 && Math.abs(dy) < 20) shoulder = true;
      if (d.y > finger.y + 45) downstream = true;
    }
    assert.ok(shoulder, `water reaches ${side === -1 ? 'left' : 'right'} shoulder`);
    assert.ok(downstream, 'water leaves the underside and falls');
  }
});

test('a finger placed over existing water moves it out without teleportation or deletion', () => {
  const d = drop(200, 249, { vy: 20 });
  const particles = [d];
  for (let i = 0; i < 360; i++) {
    const before = { x: xOf(d), y: d.y };
    physics.advanceAll(particles, 1 / 60, width, height, finger);
    assert.ok(Math.hypot(xOf(d) - before.x, d.y - before.y) <= d.speed * 1.05 / 60 + 1e-9);
    assert.equal(particles[0], d);
    assert.equal(particles.length, 1);
  }
  assert.ok(Math.hypot((xOf(d) - 200) / 52, (d.y - 260) / 36) >= 0.985);
  assert.ok(d.trail.length > 1);
});

test('short and long holds at different frame rates never accelerate or teleport rain', () => {
  for (const fps of [20, 60, 120]) for (const speed of [15, 24.6]) for (const side of [-1, 1]) {
    const d = drop(200 + side * 15, 221, { speed });
    for (let i = 0; i < fps * 18; i++) {
      const before = { x: xOf(d), y: d.y };
      const touch = i < fps * 10 ? finger : { ...finger, holding: false };
      physics.advanceAll([d], 1 / fps, width, height, touch);
      assert.ok(Math.hypot(xOf(d) - before.x, d.y - before.y) <= speed * 1.05 / fps + 1e-9);
      assert.ok(Math.hypot(d.vx, d.vy) <= speed * 1.05 + 1e-9);
    }
  }
});

test('releasing the finger preserves momentum and resumes downward acceleration', () => {
  const d = drop(220, 220);
  advance([d], 4, finger);
  const before = { vx: d.vx, vy: d.vy, x: xOf(d), y: d.y };
  physics.advanceAll([d], 1 / 60, width, height, { ...finger, holding: false });
  assert.ok(Math.hypot(d.vx - before.vx, d.vy - before.vy) < 1);
  assert.ok(Math.hypot(xOf(d) - before.x, d.y - before.y) < 0.36);
  advance([d], 3);
  assert.ok(d.vy > 19);
});

test('colliding rain shares momentum without bouncing or losing particles', () => {
  const a = drop(196, 420, { vx: 8 }), b = drop(199, 420, { vx: -8 });
  const particles = [a, b];
  const beforeDifference = Math.abs(a.vx - b.vx);
  physics.advanceAll(particles, 1 / 60, width, height, null);
  assert.ok(Math.abs(a.vx - b.vx) < beforeDifference * 0.9);
  assert.ok(a.vx > 0 && b.vx < 0, 'inelastic water contact does not bounce');
  assert.ok(Math.abs(a.vx + b.vx) < 1e-9, 'equal contact impulses conserve horizontal momentum');
  advance(particles, 1);
  assert.ok(Math.abs(a.vx - b.vx) < 1);
  assert.deepEqual(particles, [a, b]);
});

test('water joining an existing falling streak aligns with the stream', () => {
  const lower = drop(200, 420, { vx: 4, trail: [{ x: 200, y: 420 }, { x: 198, y: 405 }, { x: 196, y: 395 }] });
  const upper = drop(198.5, 406, { vx: -4 });
  const before = Math.abs(lower.vx - upper.vx);
  physics.advanceAll([lower, upper], 1 / 60, width, height, null);
  assert.ok(Math.abs(lower.vx - upper.vx) < before * 0.9);
  assert.ok(lower.trail.length > 1 && upper.trail.length > 1);
});

test('source leaves only a modest quiet entry then fills the available width early', () => {
  const positions = Array.from({ length: 100 }, (_, i) => physics.sourceLane((i + 0.5) / 100, 0, width, height));
  assert.ok(positions.every(x => x < width * 0.43 || x > width * 0.57));
  assert.ok(Math.min(...positions) < 15 && Math.max(...positions) > width - 15);
  assert.ok(positions.some(x => x > width * 0.39 && x < width * 0.43),'rain reaches close to the centre without filling the quiet entry');
  const gaps = positions.slice(1).map((x,i) => x - positions[i]);
  assert.ok(Math.max(...gaps) < width * 0.18,'the top gap cannot become a broad empty column');
  for (const lane of [0.05, 0.25, 0.5, 0.75, 0.95]) assert.equal(physics.sourceLane(lane, 175, width, height), lane * width);
});

test('long runs bound trail memory and recycle without drawing across the screen', () => {
  const particles = Array.from({ length: 60 }, (_, i) => drop(8 + i * 6.4, i * 10));
  for (let i = 0; i < 1800; i++) {
    physics.advanceAll(particles, 1 / 20, width, height, finger);
    for (const d of particles) {
      assert.ok(d.trail.length <= 64);
      assert.ok(pathLength(d.trail) <= d.length + 3 + 1e-8);
      assert.ok([xOf(d), d.y, d.vx, d.vy].every(Number.isFinite));
    }
  }
  assert.equal(particles.length, 60);
  assert.ok(particles.some(d => d.generation > 0));
});

test('background resumption clamps frame time and safely handles invalid values', () => {
  const d = drop(120, 400, { vx: Infinity, vy: NaN });
  physics.advanceAll([d], 8, width, height, null);
  assert.ok([d.y, d.vx, d.vy, d.offset].every(Number.isFinite));
  assert.ok(d.y <= 401.05);
  const position = d.y;
  physics.advanceAll([d], NaN, width, height, finger);
  assert.equal(d.y, position);
});

test('sustained wet contact removes normal rebound rather than kicking water outward', () => {
  for (const fps of [20, 60, 120]) for (const side of [-1, 1]) {
    // Include a drop already beneath a newly placed finger: its initial escape
    // momentum must disappear at contact, not throw it clear of the surface.
    const d = drop(200 + side * 12, 242);
    let contactFrames = 0, contactStarted = false;
    for (let i = 0; i < fps * 14; i++) {
      physics.advanceAll([d], 1 / fps, width, height, finger);
      const dx = xOf(d) - finger.x, dy = d.y - finger.y;
      const level = Math.hypot(dx / 52, dy / 36);
      if (dy >= -1) break;
      if (level >= 0.999) contactStarted = true;
      if (!contactStarted) continue;
      contactFrames++;
      const nx = dx / (52 * 52), ny = dy / (36 * 36);
      const length = Math.hypot(nx, ny);
      const normalVelocity = (d.vx * nx + d.vy * ny) / length;
      assert.ok(Math.abs(normalVelocity) < 1e-8, 'surface motion remains tangent, with zero restitution');
      assert.ok(Math.abs(level - 1) < 1e-8, 'water stays on the wet surface instead of repeatedly bouncing away');
    }
    assert.ok(contactFrames > fps, 'observed at least one second of wet contact');
  }
});

test('joined drops converge without spring-driven relative-velocity reversals', () => {
  for (const fps of [20, 60, 120]) {
    const a = drop(200, 420, { offset: -3, vx: 8 });
    const b = drop(200, 420, { offset: 0, vx: -8 });
    let previousDifference = Infinity;
    for (let i = 0; i < fps * 4; i++) {
      physics.advanceAll([a, b], 1 / fps, width, height, null);
      const difference = a.vx - b.vx;
      assert.ok(difference >= 0, 'viscosity does not reverse relative momentum');
      assert.ok(difference <= previousDifference + 1e-8, 'relative motion decays without oscillating');
      previousDifference = difference;
    }
    assert.ok(previousDifference < 0.03, 'nearby rain settles into a common flow');
  }
});
