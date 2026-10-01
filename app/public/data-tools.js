'use strict';
(() => {
  const model = window.SteadyDataModel;
  const container = document.getElementById('privacy-preferences');
  if (!model || !container) return;
  const tools = document.createElement('details');
  tools.className = 'entry-tools';
  tools.innerHTML = `<summary>Manage my entries</summary>
    <p class="small-copy">A backup contains your private writing as readable text. Keep it somewhere you trust. Nothing is uploaded to Steady.</p>
    <div class="entry-tool-actions"><button type="button" class="button secondary" data-entry-action="export">Save a backup</button><button type="button" class="button secondary" data-entry-action="import">Restore a backup</button></div>
    <input type="file" accept="application/json,.json" hidden id="steady-backup-file">
    <button type="button" class="text-link erase-entries" data-entry-action="erase">Delete all Steady data on this device</button>
    <p class="small-copy" role="status" aria-live="polite" id="entry-tools-status"></p>`;
  container.append(tools);
  const status = tools.querySelector('#entry-tools-status');
  const fileInput = tools.querySelector('#steady-backup-file');
  const reportError = message => { status.textContent = message; };
  let busy = false;
  function setBusy(value) {
    busy = value;
    tools.querySelectorAll('button').forEach(button => { button.disabled = value; });
  }
  async function replaceAndReload(values, before) {
    model.replace(localStorage, values, before);
    if (window.SteadyNative?.flushStorage) {
      try { await window.SteadyNative.flushStorage(); }
      catch {
        // A native failure must not leave a half-restored store hidden behind a
        // generic error. Restore only if nothing else has changed since our write.
        try {
          model.replace(localStorage, before, values);
          await window.SteadyNative.flushStorage();
        } catch { throw new Error('Storage failed during this change. Some data may have changed. Keep your backup and do not continue editing until storage is working.'); }
        throw new Error('The on-device copy could not be saved. Your previous data was restored.');
      }
    }
    location.reload();
  }
  async function receiveImport(text) {
    if (busy) return;
    status.textContent = '';
    setBusy(true);
    try {
      const values = model.parse(text);
      const before = model.snapshot(localStorage);
      if (!window.confirm('Restore this backup? It will replace all Steady entries and preferences on this device. Save a backup of anything you want to keep first.')) return;
      await replaceAndReload(values, before);
    } catch (error) { reportError(error.message || 'The backup could not be restored.'); }
    finally { setBusy(false); }
  }
  async function exportBackup() {
    // Include the latest in-memory edits only when saving succeeds. Refuse a
    // misleading partial backup when the active record is unreadable/conflicted.
    if (typeof save === 'function' && !save()) throw new Error('Your latest changes could not be saved. Keep this page open and resolve the storage warning before making a backup.');
    const text = model.backup(localStorage);
    if (window.SteadyNative?.exportBackup) {
      await window.SteadyNative.flushStorage?.();
      await window.SteadyNative.exportBackup(text);
      status.textContent = 'Choose where to save your private backup.';
      return;
    }
    const blob = new Blob([text], {type: 'application/json'});
    const file = typeof File === 'function' ? new File([blob], `steady-backup-${new Date().toISOString().slice(0,10)}.json`, {type: 'application/json'}) : null;
    if (file && navigator.canShare?.({files: [file]})) {
      try { await navigator.share({files: [file], title: 'Steady backup'}); status.textContent = 'Backup shared. Keep your copy safe.'; }
      catch (error) { if (error.name !== 'AbortError') throw error; }
      return;
    }
    // Expo Go's WebView cannot reliably download blob URLs. Provide a selectable
    // copy instead of claiming an invisible download succeeded.
    if (window.ReactNativeWebView) {
      let copy = tools.querySelector('.backup-copy');
      if (!copy) { copy = document.createElement('textarea'); copy.className = 'backup-copy'; copy.readOnly = true; copy.setAttribute('aria-label', 'Private backup JSON. Copy all text to a file ending in .json.'); tools.append(copy); }
      copy.value = text; copy.focus(); copy.select();
      status.textContent = 'Copy all this text into a file ending in .json, then use Restore a backup in the standalone app. This contains private writing.';
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `steady-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent = 'Backup download requested. Check that the file was saved.';
  }
  tools.addEventListener('click', async event => {
    const action = event.target.closest('[data-entry-action]')?.dataset.entryAction;
    if (!action || busy) return;
    status.textContent = '';
    setBusy(true);
    try {
      if (action === 'import') {
        if (window.SteadyNative?.importBackup) await window.SteadyNative.importBackup();
        else fileInput.click();
      }
      if (action === 'export') await exportBackup();
      if (action === 'erase') {
        const before = model.snapshot(localStorage);
        if (!window.confirm('Delete all Steady data on this device? This removes your entries, saved passages and preferences. It cannot be undone without a backup. Backups you exported are not deleted.')) return;
        await replaceAndReload({}, before);
      }
    } catch (error) { reportError(error.message || 'The change could not be completed.'); }
    finally { setBusy(false); }
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; fileInput.value = '';
    if (!file) return;
    if (file.size > model.maxBytes) { reportError('Choose a Steady backup smaller than 12 MB.'); return; }
    try { await receiveImport(await file.text()); }
    catch { reportError('This file could not be opened. Your entries were not changed.'); }
  });
  window.SteadyData = Object.freeze({ receiveImport, reportError });
})();
