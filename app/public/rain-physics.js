'use strict';

// Decorative, slowed particle physics: gravity, air drag, inelastic water
// contact and an impermeable fingertip. All distances are CSS pixels.
const SteadyRainPhysics = (() => {
  const radius = Object.freeze({ x: 52, y: 36 });
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
  const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
  const position = (drop, width) => ({ x: drop.lane * width + drop.offset, y: drop.y });

  function sourceLane(lane, y, width, height) {
    // A small quiet gap at entry, then the same water fills the available
    // width early. A broad, screen-height-dependent split left a dead column.
    const source = lane < 0.5 ? 0.02 + lane * 0.8 : 0.58 + (lane - 0.5) * 0.8;
    const fan = 1 - smooth((y - 12) / clamp(height * 0.18, 80, 160));
    return (lane + (source - lane) * fan) * width;
  }

  function limitVelocity(drop) {
    const magnitude = Math.hypot(drop.vx, drop.vy);
    const limit = drop.speed * 1.05;
    if (magnitude > limit) {
      drop.vx *= limit / magnitude;
      drop.vy *= limit / magnitude;
    }
  }

  function normalAt(x, y, touch) {
    const dx = x - touch.x, dy = y - touch.y;
    const nx = dx / (radius.x * radius.x), ny = dy / (radius.y * radius.y);
    const magnitude = Math.hypot(nx, ny);
    return { x: nx / (magnitude || 1), y: ny / (magnitude || 1),
      level: Math.hypot(dx / radius.x, dy / radius.y) };
  }

  function initialise(drop, width, height) {
    drop.lane = clamp(finite(drop.lane, 0.5), 0, 1);
    drop.speed = clamp(finite(drop.speed, 20), 1, 40);
    drop.length = clamp(finite(drop.length, 26), 1, 60);
    drop.y = finite(drop.y, -18);
    drop.offset = finite(drop.offset, sourceLane(drop.lane, drop.y, width, height) - drop.lane * width);
    drop.vx = finite(drop.vx);
    drop.vy = finite(drop.vy, drop.speed);
    if (!Array.isArray(drop.trail)) drop.trail = [];
    limitVelocity(drop);
  }

  function createCadence(drops, width, height) {
    const worldHeight = Math.max(1, finite(height, 1));
    width = Math.max(1, finite(width, 1));
    const count = Array.isArray(drops) ? drops.length : 0;
    const reserveCount = Math.min(Math.max(0, count - 1), Math.max(1, Math.ceil(count * 0.08)));
    const fallingCount = Math.max(1, count - reserveCount);
    let inverseSpeed = 0;
    const waiting = [];
    for (let i = 0; i < count; i++) {
      const drop = drops[i];
      initialise(drop, width, worldHeight);
      inverseSpeed += 1 / drop.speed;
      drop.waiting = i >= fallingCount;
      // Stratified travel phases fill the screen immediately. A small part of
      // the existing pool waits below it to absorb individual touch delays.
      drop.y = drop.waiting ? worldHeight + 41 : -18 + (i + 0.5) / fallingCount * (worldHeight + 58);
      drop.offset = sourceLane(drop.lane, drop.y, width, worldHeight) - drop.lane * width;
      drop.vx = 0; drop.vy = drop.speed; drop.trail = [];
      if (drop.waiting) waiting.push(drop);
    }
    const journeyFactor = count ? inverseSpeed / count / fallingCount : 1;
    const interval = Math.max(0.12, (worldHeight + 58) * journeyFactor);
    return { worldHeight, reserveCount, waiting, journeyFactor, interval, clock: 0,
      nextEmission: interval, emissions: 0 };
  }

  function advanceCadence(cadence, dt, width, height) {
    // A keyboard crops the view of the same rain field. Keeping its extent
    // avoids retiring half the pool together when the visible area shrinks.
    if (height > cadence.worldHeight) {
      const remaining = clamp((cadence.nextEmission - cadence.clock) / cadence.interval, 0, 1);
      cadence.worldHeight = height;
      cadence.interval = Math.max(0.12, (height + 58) * cadence.journeyFactor);
      cadence.nextEmission = cadence.clock + cadence.interval * remaining;
    }
    cadence.clock += dt;
    if (cadence.clock + 1e-9 < cadence.nextEmission) return;
    // Empty ticks are deliberately skipped, with no accumulated debt. The
    // foreground simulation clock also pauses when the animation is hidden.
    const missed = Math.max(1, Math.floor((cadence.clock - cadence.nextEmission + 1e-9) / cadence.interval) + 1);
    cadence.nextEmission += cadence.interval * missed;
    const drop = cadence.waiting.shift();
    if (!drop) return;
    drop.waiting = false;
    drop.y = -18;
    drop.offset = sourceLane(drop.lane, drop.y, width, cadence.worldHeight) - drop.lane * width;
    drop.vx = 0; drop.vy = drop.speed; drop.trail = [];
    drop.generation = (drop.generation || 0) + 1;
    cadence.emissions++;
  }

  function appendTrail(drop, width) {
    const head = position(drop, width);
    if (!drop.trail.length) drop.trail.push({ ...head });
    else if (Math.hypot(head.x - drop.trail[0].x, head.y - drop.trail[0].y) >= 0.45) drop.trail.unshift(head);
    let travelled = 0;
    const length = drop.length + 3;
    for (let i = 1; i < drop.trail.length; i++) {
      const previous = drop.trail[i - 1], current = drop.trail[i];
      const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
      if (travelled + distance >= length) {
        const fraction = (length - travelled) / Math.max(distance, 0.001);
        drop.trail[i] = { x: previous.x + (current.x - previous.x) * fraction,
          y: previous.y + (current.y - previous.y) * fraction };
        drop.trail.length = i + 1;
        break;
      }
      travelled += distance;
    }
    if (drop.trail.length > 64) drop.trail.length = 64;
  }

  function nearestTrail(drop, point) {
    let nearest = null;
    for (let i = 1; i < drop.trail.length; i++) {
      const a = drop.trail[i - 1], b = drop.trail[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / Math.max(0.001, dx * dx + dy * dy), 0, 1);
      const x = a.x + dx * t, y = a.y + dy * t;
      const distance = Math.hypot(point.x - x, point.y - y);
      if (!nearest || distance < nearest.distance) nearest = { x, y, distance };
    }
    return nearest;
  }

  function couple(drops, dt, width) {
    // Equal-mass, inelastic contact shares momentum instead of rebounding.
    // Retain both water samples, so contact never erases a coloured stroke.
    for (let i = 0; i < drops.length; i++) for (let j = i + 1; j < drops.length; j++) {
      const a = drops[i], b = drops[j], pa = position(a, width), pb = position(b, width);
      const dx = pb.x - pa.x, dy = pb.y - pa.y, distance = Math.hypot(dx, dy);
      const contactRadius = (finite(a.size, 1.5) + finite(b.size, 1.5)) * 1.5 + 1;
      let contact = distance < contactRadius;
      // A falling drop can join water in an existing falling streak, too.
      if (!contact && Math.abs(dx) < Math.max(a.length, b.length) + 3 && Math.abs(dy) < Math.max(a.length, b.length) + 3) {
        const lower = pa.y > pb.y ? a : b, upper = lower === a ? b : a;
        const hit = nearestTrail(lower, position(upper, width));
        if (hit && hit.distance < 2.5) {
          contact = true;
        }
      }
      if (!contact) continue;
      const sharing = (1 - Math.exp(-9 * dt)) * 0.5;
      const impulseX = (b.vx - a.vx) * sharing;
      const impulseY = (b.vy - a.vy) * sharing;
      a.vx += impulseX; b.vx -= impulseX;
      a.vy += impulseY; b.vy -= impulseY;
      // Viscous sharing dissipates relative motion. A positional spring here
      // would store energy and make adjoining rain rebound or oscillate.
    }
  }

  function contact(drop, before, dt, touch) {
    if (!touch || touch.holding === false || !(touch.strength > 0.45)) return;
    const normal = normalAt(before.x, before.y, touch);
    const predicted = normalAt(before.x + drop.vx * dt, before.y + drop.vy * dt, touch);
    if (normal.level > 1.012 && predicted.level >= 1) return;
    let nx = normal.x, ny = normal.y;
    if (!nx && !ny) { nx = drop.side === -1 ? -1 : 1; ny = 0; }
    if (normal.level < 0.97) {
      // Placing a finger over rain displaces it continuously at the same slow
      // speed. No opacity trick, positional jump or deleted sample is used.
      const targetX = nx * drop.speed * 0.85;
      const targetY = ny * drop.speed * 0.85;
      const response = 1 - Math.exp(-14 * dt);
      drop.vx += (targetX - drop.vx) * response;
      drop.vy += (targetY - drop.vy) * response;
      return;
    }
    const normalVelocity = drop.vx * nx + drop.vy * ny;
    const upperSurface = ny <= 0;
    // Wet contact has no restitution. Remove BOTH signs of normal momentum on
    // the upper surface, including momentum left by an initially covered drop.
    if (upperSurface || normalVelocity < 0) {
      drop.vx -= normalVelocity * nx;
      drop.vy -= normalVelocity * ny;
    }
    // Gravity is projected onto the local surface tangent. Exactly at the
    // crown a tiny symmetric wetting force resolves the unstable equilibrium.
    if (Math.abs(nx) < 0.18 && ny < -0.8) {
      const nudge = (drop.side === -1 ? -1 : 1) * 2.8 * dt;
      drop.vx += nudge * (1 - nx * nx);
      drop.vy -= nudge * nx * ny;
    }
    limitVelocity(drop);
    const next = { x: before.x + drop.vx * dt, y: before.y + drop.vy * dt };
    const nextNormal = normalAt(next.x, next.y, touch);
    if (!upperSurface && nextNormal.level >= 1) return;
    // Resolve the positional constraint separately from velocity. Folding this
    // correction into velocity injected outward kicks on every contact frame.
    const scale = 1 / Math.max(nextNormal.level, 0.001);
    const surface = { x: touch.x + (next.x - touch.x) * scale,
      y: touch.y + (next.y - touch.y) * scale };
    const dx = surface.x - before.x, dy = surface.y - before.y;
    const distance = Math.hypot(dx, dy), limit = drop.speed * 1.05 * dt;
    const fraction = Math.min(1, limit / Math.max(distance, 0.001));
    const resolved = { x: before.x + dx * fraction, y: before.y + dy * fraction };
    const finalNormal = normalAt(resolved.x, resolved.y, touch);
    const remaining = drop.vx * finalNormal.x + drop.vy * finalNormal.y;
    if (upperSurface || remaining < 0) {
      drop.vx -= remaining * finalNormal.x;
      drop.vy -= remaining * finalNormal.y;
    }
    return resolved;
  }

  function advanceAll(drops, seconds, width, height, touch, cadence = null) {
    const dt = clamp(finite(seconds), 0, 0.05);
    width = Math.max(1, finite(width, 1)); height = Math.max(1, finite(height, 1));
    if (!dt || !Array.isArray(drops)) return;
    const timed = cadence && Array.isArray(cadence.waiting);
    const worldHeight = timed ? Math.max(height, cadence.worldHeight) : height;
    const falling = timed ? drops.filter(drop => !drop.waiting) : drops;
    const obstacle = touch && Number.isFinite(touch.x) && Number.isFinite(touch.y) ? touch : null;
    for (const drop of falling) {
      initialise(drop, width, worldHeight);
      const p = position(drop, width);
      if (!drop.trail.length) drop.trail = [{ ...p }, { x: p.x, y: p.y - drop.length }];
      const nearFinger = obstacle && obstacle.holding !== false && obstacle.strength > 0.45 &&
        normalAt(p.x, p.y, obstacle).level < 1.2;
      // Linear drag gives a stable terminal falling speed. Sideways air drift
      // spreads the same particles gently from the upper corners.
      const drag = 1.45;
      const drift = nearFinger ? 0 : clamp((sourceLane(drop.lane, drop.y, width, worldHeight) - p.x) * 0.12, -5.5, 5.5);
      const decay = Math.exp(-drag * dt);
      drop.vx = drift + (drop.vx - drift) * decay;
      drop.vy = drop.speed + (drop.vy - drop.speed) * decay;
    }
    couple(falling, dt, width);
    for (const drop of falling) {
      const before = position(drop, width);
      const resolved = contact(drop, before, dt, obstacle);
      limitVelocity(drop);
      drop.offset = (resolved ? resolved.x : before.x + drop.vx * dt) - drop.lane * width;
      drop.y = resolved ? resolved.y : before.y + drop.vy * dt;
      if (drop.y > worldHeight + 40 || before.x < -60 || before.x > width + 60) {
        if (timed) {
          drop.waiting = true;
          drop.trail = [];
          cadence.waiting.push(drop);
        } else {
          drop.y = -18;
          drop.offset = sourceLane(drop.lane, -18, width, worldHeight) - drop.lane * width;
          drop.vx = 0; drop.vy = drop.speed; drop.trail = [];
          drop.generation = (drop.generation || 0) + 1;
        }
      } else appendTrail(drop, width);
    }
    if (timed) advanceCadence(cadence, dt, width, height);
  }

  return Object.freeze({ radius, sourceLane, createCadence, advanceAll });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyRainPhysics;
