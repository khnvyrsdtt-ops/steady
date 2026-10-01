'use strict';
(() => {
  const config = window.SteadyRelease || {};
  const content = `<p class="small-copy">Last updated 27 September 2026</p>
    <h2>Your writing stays with you.</h2>
    <p>Steady is a free Scripture and reflection app. It has no account, advertising, analytics or tracking. It does not send your entries to a Steady server or an AI provider.</p>
    <h3>What is saved</h3>
    <p>Your notes, reflections, steps, saved passages and preferences are saved locally on this device or in this browser. Chat keeps up to 30 entries, including generated answers. On supported iPhones, Apple’s on-device AI can answer general questions using your message, recent conversation and relevant saved memory. It can also organise prepared explanations. This processing stays on the device; Scripture quotations and references come from the included library. You can turn AI off in Settings → Privacy & entries → On-device AI. If you enable “Use my notes for Scripture themes”, matching can use your notes locally.</p>
    <h3>Protection and backups</h3>
    <p>Automatic memory can keep up to 20 short details from new chats, using Apple Intelligence on this device. These are excerpts from your own words, separate from chat history. Relevant details and communication preferences can shape later answers; they do not change Bible quotations. Review or forget them in Settings → Memory. Turning memory off stops collection and use while keeping existing details for you to review. Forgetting a chat entry also forgets details linked to it. Memory is included in backups you export and is not a copy stored in the AI model.</p>
    <p>Steady does not provide cloud sync or a server copy of your writing. The standalone iOS app uses the device’s storage protections; the browser preview uses browser storage. Steady does not add a separate password or encryption vault. Other people with access to your unlocked device may be able to read your entries. Device backups may include app data, depending on your system settings.</p>
    <p>A backup you choose to export contains readable private text. You decide where to save or share it. That destination’s own privacy practices apply. Preview entries do not transfer automatically to the standalone app.</p>
    <h3>Your choices</h3>
    <p>In Settings → Privacy & entries → Manage my entries, you can save a backup, restore a backup or delete all Steady data stored here. You can also Forget individual Ask entries. Local storage is not guaranteed permanent: clearing browser/app data, removing the app or device/browser storage management can remove it. Backups you exported or kept through your device’s backup system are separate and must be managed there.</p>
    <h3>Links and support</h3>
    <p>Scripture sources, research references and help resources open outside Steady only when you choose them. Those services may receive normal connection information and have their own privacy policies. If you contact support, only send information you are comfortable sharing; do not include private reflections unless necessary.</p>
    <h3>Purpose and limits</h3>
    <p>Steady supports Christian reflection and practical next steps. It is not therapy, medical advice or an emergency service. Ask can misunderstand or miss what you mean. Seek qualified or urgent human support when you need it.</p>
    <h3>Changes</h3><p>This information will be updated if Steady’s data practices change.</p>`;
  let panel;
  if (document.body.dataset.privacyPage === 'true') panel = document.getElementById('privacy-content');
  else if (typeof SteadyExperience !== 'undefined') {
    panel = SteadyExperience.addPanel('settings/privacy', 'Privacy', '');
    const link = document.createElement('a'); link.className = 'text-link'; link.href = '#settings/privacy'; link.textContent = 'Privacy policy';
    document.getElementById('privacy-preferences')?.append(link);
  }
  if (!panel) return;
  panel.classList.add('privacy-policy'); panel.innerHTML = content;
  if (config.publisherName) {
    const publisher = document.createElement('p'); publisher.textContent = `Published by ${config.publisherName}.`; panel.append(publisher);
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail || '')) {
    const contact = document.createElement('a'); contact.className = 'text-link'; contact.href = `mailto:${config.supportEmail}`; contact.textContent = 'Contact Steady'; panel.append(contact);
    const about = document.querySelector('.settings-more');
    if (about) { about.append(contact.cloneNode(true)); document.getElementById('about-settings-title').textContent = 'About & support'; }
  }
  if (typeof renderScreen === 'function') renderScreen();
})();
