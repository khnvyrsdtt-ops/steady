'use strict';
// One explicit allowlist is shared by backup, restore and deletion. Never clear
// the whole origin: other applications may use the same browser storage.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SteadyDataModel = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const keys = Object.freeze(['steady.v1', 'steady.settings', 'steady.reading', 'steady.theme', 'steadyTasks', 'steadyReflection', 'steady.reminded', 'steady.animal']);
  const maxBytes = 12 * 1024 * 1024;
  const fits = text => text.length <= maxBytes && new TextEncoder().encode(text).byteLength <= maxBytes;
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function snapshot(storage) {
    const values = Object.create(null);
    for (const key of keys) {
      const value = storage.getItem(key); // A failed read must stop the operation.
      if (value !== null) values[key] = value;
    }
    return values;
  }
  function backup(storage, now = new Date()) {
    const text = JSON.stringify({ format: 'steady-backup', version: 1, createdAt: now.toISOString(), values: snapshot(storage) }, null, 2);
    if (!fits(text)) throw new Error('This backup exceeds the 12 MB limit. Your entries have not been changed.');
    return text;
  }
  function parse(text) {
    if (typeof text !== 'string' || !fits(text)) throw new Error('Choose a Steady backup smaller than 12 MB.');
    let data;
    try {
      data = JSON.parse(text, (key, value) => {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe key');
        return value;
      });
    } catch { throw new Error('This file is not a readable Steady backup.'); }
    if (!record(data) || data.format !== 'steady-backup' || data.version !== 1 || !record(data.values)) throw new Error('Choose a Steady backup exported from Settings.');
    for (const [key, value] of Object.entries(data.values)) {
      if (!keys.includes(key) || typeof value !== 'string') throw new Error('This backup contains unsupported data.');
      if (key === 'steady.theme') {
        if (!['light', 'dark'].includes(value)) throw new Error('This backup has an unreadable theme.');
      } else if (!['steadyReflection', 'steady.reminded'].includes(key)) {
        let parsed;
        try {
          parsed = JSON.parse(value, (name, item) => {
            if (['__proto__', 'prototype', 'constructor'].includes(name)) throw new Error('Unsafe key');
            return item;
          });
        } catch { throw new Error('This backup contains unreadable saved data. Keep the original file for recovery.'); }
        if (key === 'steadyTasks' ? !Array.isArray(parsed) : !record(parsed)) throw new Error('This backup contains an invalid record.');
        if (key === 'steady.v1' && !record(parsed.days)) throw new Error('This backup has no readable daily record.');
      }
    }
    if (!Object.keys(data.values).length) throw new Error('This backup has no saved data to restore.');
    return data.values;
  }
  function same(a, b) { return keys.every(key => a[key] === b[key]); }
  function replace(storage, values, expected) {
    const original = snapshot(storage);
    if (expected && !same(original, expected)) throw new Error('Your saved data changed while this was open. Start again before replacing it.');
    try {
      for (const key of keys) {
        if (Object.hasOwn(values, key)) storage.setItem(key, values[key]);
        else storage.removeItem(key);
      }
    } catch {
      let restored = true;
      for (const key of keys) {
        try {
          if (Object.hasOwn(original, key)) storage.setItem(key, original[key]);
          else storage.removeItem(key);
        } catch { restored = false; }
      }
      throw new Error(restored ? 'The change could not be saved. Your previous data was restored.' : 'Storage failed during this change. Some data may have changed. Keep your backup and do not continue editing until storage is working.');
    }
  }
  return Object.freeze({ keys, maxBytes, snapshot, backup, parse, replace });
});
