'use strict';

// One quiet, outlined icon family. Visible labels supply each control's name.
(() => {
  const shapes = {
    home: '<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/>',
    today: '<path d="M3 16h18M5 20h14M7 16a5 5 0 0 1 10 0M12 3v3M4.5 8.5l2 2m11 0 2-2"/>',
    help: '<path d="M6.5 3.5h13v17h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"/><path d="M4.5 18.5a2 2 0 0 1 2-2h13M12 7v6m-2.5-3.5h5"/>',
    think: '<path d="M7 4h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H9l-5 3v-4a4 4 0 0 1-1-3V8a4 4 0 0 1 4-4Z"/><path d="M8 9h8M8 13h5"/>',
    learn: '<path d="M12 6c-2.5-2-6-2.5-9-1v14c3-1.5 6.5-1 9 1 2.5-2 6-2.5 9-1V5c-3-1.5-6.5-1-9 1Zm0 0v14"/>',
    direction: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
    review: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M5 3v18M3 7h4M3 12h4M3 17h4m3-5 2 2 4-4"/>',
    grow: '<path d="M12 21V11M12 15C6 15 3 12 3 6c6 0 9 3 9 9Zm0-4c0-5 3-8 9-8 0 6-3 9-9 9"/>',
    explore: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    tools: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    clarity: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/><circle cx="12" cy="12" r="3"/>',
    calm: '<path d="M3 8c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0"/>',
    connection: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
    settings: '<path d="m12 3 1.4 1.7 2.2-.3.8 2.1 2.1.8-.3 2.2L20 11v2l-1.8 1.5.3 2.2-2.1.8-.8 2.1-2.2-.3L12 21l-1.4-1.7-2.2.3-.8-2.1-2.1-.8.3-2.2L4 13v-2l1.8-1.5-.3-2.2 2.1-.8.8-2.1 2.2.3L12 3Z"/><circle cx="12" cy="12" r="2.8"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    arrowRight: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    arrowLeft: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    send: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
    swap: '<path d="M5.2 10a7 7 0 0 1 11.6-3.5M16.8 4.5v3.4h-3.4M18.8 14a7 7 0 0 1-11.6 3.5M7.2 19.5v-3.4h3.4"/>',
    bookmark: '<path d="M6 3.5h12v17L12 17l-6 3.5v-17Z"/>',
    // One kept note, legible at the small size used in the header.
    memory: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 12h6"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    showedUp: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    burden: '<path d="M7 4h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H9l-5 3v-4a4 4 0 0 1-1-3V8a4 4 0 0 1 4-4Z"/><path d="M12 9.5v4m-2-2h4"/>'
  };
  Object.assign(shapes, {
    progress: shapes.arrowRight,
    energy: shapes.sun,
    rest: shapes.moon,
    noticedGood: shapes.sun,
    learned: shapes.learn
  });
  Object.freeze(shapes);

  const escapeAttribute = value => String(value).replace(/[&"<>']/g, character => ({'&':'&amp;', '"':'&quot;', '<':'&lt;', '>':'&gt;', "'":'&#39;'}[character]));
  function svg(name, className = '') {
    if (!Object.hasOwn(shapes, name)) return '';
    const classes = className ? `steady-icon ${className}` : 'steady-icon';
    return `<svg class="${escapeAttribute(classes)}" data-icon="${escapeAttribute(name)}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[name]}</svg>`;
  }

  const icons = Object.freeze({svg, names: Object.freeze(Object.keys(shapes))});
  globalThis.SteadyIcons = icons;
  if (typeof module !== 'undefined' && module.exports) module.exports = icons;
})();
