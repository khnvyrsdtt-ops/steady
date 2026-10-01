'use strict';
(() => {
  const lockup = () => {
    const el = document.createElement('div');
    el.className = 'brand-lockup welcome-brand';
    el.innerHTML = '<span class="brand-wordmark">Steady Arc<span class="brand-tm">\u2122</span></span><span class="brand-foundation">BUILT ON CHRIST</span>';
    return el;
  };
  const welcome = SteadyExperience.routePanel('welcome').node;
  welcome.classList.add('branded-welcome');
  welcome.querySelector('.eyebrow')?.remove();
  welcome.prepend(lockup());

  const about = SteadyExperience.addPanel('settings/about', 'About Steady', `
    <h2>Growth, with a foundation.</h2>
    <p class="small-copy">Made to help you think clearly, take a useful step, and return to life.</p>
    <p class="small-copy">Steady is free to use.</p>
    <dl class="brand-meaning">
      <div><dt>Steady Arc</dt><dd>A place to find your footing and return to a useful next step.</dd></div>
      <div><dt>The foundation</dt><dd>Built on Christ, with Scripture offered for reflection.</dd></div>
    </dl>
    <p class="core-path">Truth → Mind → Direction → Action → Reflection</p>
    <div class="about-sources"><div class="eyebrow">USEFUL, NOT CERTAIN</div><h2>What guides Steady.</h2><div id="about-evidence-content"></div><p class="small-copy">Scripture is offered for faith and reflection, separately from research claims. WEB and ASV are public-domain translations. Passages are stored locally; opening a source leaves Steady.</p><a href="https://ebible.org/eng-web/webfaq.htm" target="_blank" rel="noopener noreferrer" class="text-link">Bible text & licensing ↗</a></div>
    <p class="small-copy brand-credit">Developed with help from AI assistants, including ChatGPT and Codex.</p>
    `);
  about.classList.add('brand-about');
  about.prepend(lockup());
  for(const item of Object.values((window.SteadyGuide||{}).evidence||{})){
    const section=document.createElement('div');section.className='evidence-item';
    const heading=document.createElement('h3');heading.textContent=item.label;section.append(heading);
    const copy=document.createElement('p');copy.textContent=item.text;section.append(copy);
    if(item.url){const a=document.createElement('a');a.className='text-link';a.textContent=item.source+' ↗';a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';section.append(a);}
    about.querySelector('#about-evidence-content').append(section);
  }
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = '#settings/about';
  link.textContent = 'About Steady';
  document.querySelector('.settings-more').append(link);
  // Keep the selected tab visible when navigation is resized.
  const navigation = document.querySelector('.sidebar nav');
  function revealSelectedTab() {
    const selected = navigation?.querySelector('[aria-current]');
    if (!selected) return;
    const bounds = navigation.getBoundingClientRect();
    const selectedBounds = selected.getBoundingClientRect();
    const left = selectedBounds.left - bounds.left - navigation.clientLeft + navigation.scrollLeft;
    const right = left + selectedBounds.width;
    const inset = 7;
    const target = left < navigation.scrollLeft + inset
      ? left - inset
      : right > navigation.scrollLeft + navigation.clientWidth - inset
        ? right - navigation.clientWidth + inset
        : navigation.scrollLeft;
    navigation.scrollTo({left:target, behavior:'instant'});
  }
  document.addEventListener('steady:screen', revealSelectedTab);
  window.addEventListener('resize', revealSelectedTab);
  // Completion has one quiet physical cue, rather than a reward loop.
  document.addEventListener('click', event => {
    const completed=event.target.closest('#complete-recommendation, #finish-day');
    if (!completed || (completed.id==='complete-recommendation' && completed.getAttribute('aria-pressed')!=='true')) return;
    if (document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if(completed.id==='finish-day')SteadyExperience.haptic();
  });
  // Register the About route before restoring direct links on a reload.
  renderScreen();
})();
