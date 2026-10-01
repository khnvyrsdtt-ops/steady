'use strict';
(() => {
  const key = 'steady.settings';
  const defaults = { font: 'default', guidance: 'brief' };
  let stored, readFailed = false;
  try {
    stored = JSON.parse(localStorage.getItem(key));
    if (stored !== null && (typeof stored !== 'object' || Array.isArray(stored))) readFailed = true;
  } catch { readFailed = true; }
  // Retired settings remain inert; changing reading preferences need not erase them.
  const preferences = { ...(stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{}), ...defaults };
  const options = { font: ['default', 'system', 'serif', 'dyslexic'], guidance: ['brief', 'explained'], theme: ['light', 'dark'] };
  const validPreference = (name, value) => options[name].includes(value);
  for (const name of Object.keys(defaults)) {
    if (validPreference(name, stored?.[name])) preferences[name] = stored[name];
  }
  const status = document.getElementById('settings-status');
  const readFailureMessage='Saved preferences could not be read. Existing preferences have not been changed. Changes apply to this session only.';
  const savePreferences=()=>{
    if(readFailed){status.textContent=readFailureMessage;return;}
    try{localStorage.setItem(key,JSON.stringify(preferences));status.textContent='Saved';}
    catch{status.textContent='Applied for this session. Device storage is unavailable.';}
  };
  function applyPreferences() {
    document.documentElement.dataset.font = preferences.font;
    const stepOptions=document.querySelector('.step-options');
    if(stepOptions)stepOptions.open = preferences.guidance === 'explained';
    for (const name of Object.keys(defaults)) document.getElementById(`setting-${name}`).value = preferences[name];
  }
  applyPreferences();
  if(readFailed)status.textContent=readFailureMessage;
  for (const name of Object.keys(defaults)) {
    document.getElementById(`setting-${name}`).addEventListener('change', event => {
      if (!validPreference(name, event.target.value)) {
        event.target.value = preferences[name];
        status.textContent = 'Choose an available option.';
        return;
      }
      preferences[name] = event.target.value;
      applyPreferences();
      savePreferences();
    });
  }
  const theme = document.getElementById('setting-theme');
  const syncTheme = () => { theme.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; };
  syncTheme();
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  theme.addEventListener('change', () => {
    if (!validPreference('theme', theme.value)) {
      syncTheme();
      status.textContent = 'Choose an available theme.';
      return;
    }
    applyTheme(theme.value);
    try { localStorage.setItem('steady.theme', theme.value); status.textContent = 'Saved'; }
    catch { status.textContent = 'Applied for this session. Device storage is unavailable.'; }
  });
})();
