/* ==========================================
   J.A.R.V.I.S. — 3D Visualization Controller
   Manages: Globe, Network, Charts, Data Tower, Particle Text
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Viz = (function () {
  let currentViz = null; // 'globe' | 'network' | 'bars' | 'scatter' | 'tower' | 'particletext' | null
  let scene, camera, renderer;

  function init(threeScene) {
    scene = threeScene;
    camera = JARVIS.Scene.getCamera();
    renderer = JARVIS.Scene.getRenderer();

    // Initialize all sub-modules (they'll be shown on demand)
    JARVIS.Charts.init(scene);
    JARVIS.DataTower.init(scene);
    JARVIS.ParticleText.init(scene);
  }

  function showGlobe() {
    if (currentViz === 'globe') return;
    clear();
    JARVIS.Globe.init(scene, camera, renderer);
    currentViz = 'globe';
  }

  function showNetwork(data) {
    clear();
    JARVIS.Network.init(scene, data || {
      vertices: [
        {id:'a',label:'Core',color:'#60A5FA'},{id:'b',label:'Vision',color:'#06B6D4'},
        {id:'c',label:'Voice',color:'#8B5CF6'},{id:'d',label:'Agents',color:'#F97316'},
        {id:'e',label:'Memory',color:'#10B981'},{id:'f',label:'Research',color:'#F59E0B'},
        {id:'g',label:'Charts',color:'#EC4899'},{id:'h',label:'Network',color:'#3B82F6'},
      ],
      links: [
        {source:'a',target:'b'},{source:'a',target:'c'},{source:'a',target:'d'},
        {source:'a',target:'e'},{source:'b',target:'d'},{source:'c',target:'d'},
        {source:'d',target:'f'},{source:'e',target:'f'},{source:'d',target:'g'},
        {source:'g',target:'h'},{source:'b',target:'h'},
      ]
    });
    currentViz = 'network';
  }

  function showBarChart(data) {
    clear();
    JARVIS.Charts.showBarChart(data || {
      labels: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'],
      values: [85, 62, 93, 45, 78],
      colors: ['#3B82F6', '#06B6D4', '#8B5CF6', '#F97316', '#10B981'],
    });
    currentViz = 'bars';
  }

  function showScatterPlot(data) {
    clear();
    const pts = [];
    for (let i = 0; i < 30; i++) {
      pts.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
        color: ['#3B82F6','#06B6D4','#8B5CF6','#F97316','#10B981'][i % 5],
        size: 0.04 + Math.random() * 0.08,
        label: 'Point ' + (i + 1),
      });
    }
    JARVIS.Charts.showScatterPlot(data || { points: pts });
    currentViz = 'scatter';
  }

  function showDataTower(data) {
    clear();
    JARVIS.DataTower.buildTower(data || {
      layers: [
        {label:'Network',value:95,color:'#3B82F6'},
        {label:'Compute',value:78,color:'#06B6D4'},
        {label:'Storage',value:62,color:'#8B5CF6'},
        {label:'Security',value:88,color:'#F97316'},
        {label:'AI/ML',value:91,color:'#10B981'},
      ],
    });
    currentViz = 'tower';
  }

  function showParticleText(text, opts) {
    clear();
    JARVIS.ParticleText.showText(text || 'J.A.R.V.I.S.', opts);
    currentViz = 'particletext';
  }

  function update(delta, elapsed) {
    switch (currentViz) {
      case 'globe': JARVIS.Globe.update(delta, elapsed); break;
      case 'network': JARVIS.Network.update(delta, elapsed); break;
      case 'bars': case 'scatter': JARVIS.Charts.update(delta, elapsed); break;
      case 'tower': JARVIS.DataTower.update(delta, elapsed); break;
      case 'particletext': JARVIS.ParticleText.update(delta, elapsed); break;
    }
  }

  function clear() {
    switch (currentViz) {
      case 'globe': JARVIS.Globe.remove(scene); break;
      case 'network': JARVIS.Network.remove(scene); break;
      case 'bars': case 'scatter': JARVIS.Charts.clearChart(); break;
      case 'tower': JARVIS.DataTower.clear(); break;
      case 'particletext': JARVIS.ParticleText.clear(); break;
    }
    currentViz = null;
  }

  function getCurrent() { return currentViz; }

  return { init, showGlobe, showNetwork, showBarChart, showScatterPlot, showDataTower, showParticleText, update, clear, getCurrent };
})();

window.JARVIS = JARVIS;
