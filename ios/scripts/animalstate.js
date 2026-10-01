const say = t => { try { window.webkit.messageHandlers.steady.postMessage({type:'diagLog', line:t}); } catch (_) {} };
(() => {
  const A = window.SteadyAnimals;
  const read = () => {
    let stored = null; try { stored = localStorage.getItem('steady.animal'); } catch (_) {}
    return { stored, moduleMode: A.mode, moduleCurrent: A.current(), manual: A.isManual() };
  };
  const tiles = () => [...document.querySelectorAll('.donkey-guide')].filter(t => t.getClientRects().length)
    .map(t => (t.getAttribute('data-animal') || '?') + ':' + ((t.querySelector('img') || {}).getAttribute?.('src') || '?'));
  const report = label => say('ANIMAL| ' + label + ' state=' + JSON.stringify(read()) + ' tiles=' + JSON.stringify(tiles()));
  window.__animalReport = report;
  window.__animalSet = choice => {
    window.SteadyAnimalChosen(choice);
    return new Promise(r => setTimeout(() => { report('after ' + choice); r(); }, 600));
  };
  return 'ok';
})();
