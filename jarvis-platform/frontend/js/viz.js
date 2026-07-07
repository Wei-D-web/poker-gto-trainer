/* ==========================================
   J.A.R.V.I.S. — 3D Visualization Controller
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Viz = (function () {
  let currentViz = null; // 'globe' | 'network' | null
  let scene;

  function init(threeScene) {
    scene = threeScene;
  }

  function showGlobe() {
    if (currentViz === 'globe') return;
    clear();

    JARVIS.Globe.init(scene);
    currentViz = 'globe';
  }

  function showNetwork(data) {
    if (currentViz === 'network') return;
    clear();

    JARVIS.Network.init(scene, data);
    currentViz = 'network';
  }

  function update(delta, elapsed) {
    if (currentViz === 'globe') {
      JARVIS.Globe.update(delta, elapsed);
    } else if (currentViz === 'network') {
      JARVIS.Network.update(delta, elapsed);
    }
  }

  function clear() {
    if (currentViz === 'globe') {
      JARVIS.Globe.remove(scene);
    } else if (currentViz === 'network') {
      JARVIS.Network.remove(scene);
    }
    currentViz = null;
  }

  function getCurrent() {
    return currentViz;
  }

  return { init, showGlobe, showNetwork, update, clear, getCurrent };
})();

window.JARVIS = JARVIS;
