/* ═══════════════════════════════════════
   J.A.R.V.I.S. — Weapons Systems Panel
   ═══════════════════════════════════════ */

var JARVIS = window.JARVIS || {};

JARVIS.Weapons = (function () {
  var active = false;
  var weapons = [
    { name: 'REPULSOR L', icon: '🔵', charge: 100, label: 'PWR: FULL' },
    { name: 'REPULSOR R', icon: '🔵', charge: 100, label: 'PWR: FULL' },
    { name: 'UNIBEAM',    icon: '⚡', charge: 85,  label: 'CHARGED' },
    { name: 'MISSILES',   icon: '🚀', count: 8,     label: 'ARMED' },
    { name: 'LASER',      icon: '🔴', charge: 62,   label: 'COOLING' },
    { name: 'FLARES',     icon: '🔥', count: 12,    label: 'READY' },
  ];

  function init() {
    injectDOM();
    console.log('%c[Weapons] %cArmament systems online.',
      'color: #F59E0B;', 'color: #94A3B8;');
  }

  function injectDOM() {
    var panel = document.createElement('div');
    panel.id = 'weapons-panel';
    panel.innerHTML = '<h3>⚔ WEAPONS SYSTEM</h3><div id="weapon-slots"></div>';
    document.body.appendChild(panel);
    renderWeapons();
  }

  function renderWeapons() {
    var container = document.getElementById('weapon-slots');
    if (!container) return;
    var html = '';
    weapons.forEach(function (w, i) {
      html += '<div class="weapon-slot" data-idx="' + i + '">' +
        '<span class="wp-icon">' + w.icon + '</span>' +
        '<div class="wp-info"><div class="wp-name">' + w.name + '</div>' +
        '<div class="wp-stat">' + w.label + '</div></div>';
      if (w.charge !== undefined) {
        var color = w.charge > 70 ? '' : w.charge > 30 ? 'style="background:#F59E0B"' : 'style="background:#EF4444"';
        html += '<div class="wp-charge"><div class="wp-charge-fill" style="width:' + w.charge + '%" ' + color + '></div></div>' +
          '<span class="wp-count">' + w.charge + '%</span>';
      } else {
        html += '<span class="wp-count">' + w.count + '</span>';
      }
      html += '</div>';
    });
    container.innerHTML = html;

    // Click to simulate "firing"
    container.querySelectorAll('.weapon-slot').forEach(function (slot) {
      slot.addEventListener('click', function () {
        var idx = parseInt(slot.dataset.idx);
        fireWeapon(idx);
      });
    });
  }

  function fireWeapon(idx) {
    var w = weapons[idx];
    if (!w) return;
    if (w.count !== undefined && w.count > 0) {
      w.count--;
      if (w.count === 0) w.label = 'DEPLETED';
      else w.label = 'FIRING';
      setTimeout(function () { if (w.count > 0) w.label = 'ARMED'; renderWeapons(); }, 800);
    } else if (w.charge !== undefined && w.charge > 5) {
      w.charge = Math.max(0, w.charge - 15);
      w.label = 'FIRING';
      if (w.charge < 30) w.label = 'LOW PWR';
      setTimeout(function () { w.charge = Math.min(100, w.charge + 8); w.label = w.charge > 70 ? 'CHARGED' : 'RECHARGING'; renderWeapons(); }, 1200);
    }
    renderWeapons();
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel(w.name + ' FIRED');
    if (JARVIS.SoundFX && JARVIS.SoundFX.play) JARVIS.SoundFX.play('fire');
  }

  function toggle() {
    if (active) { deactivate(); }
    else { activate(); }
  }

  function activate() {
    active = true;
    document.body.classList.add('weapons-active');
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('WEAPONS ONLINE');
  }

  function deactivate() {
    active = false;
    document.body.classList.remove('weapons-active');
    if (JARVIS.App && JARVIS.App.spawnFloatLabel) JARVIS.App.spawnFloatLabel('WEAPONS STANDBY');
  }

  return {
    init: init, toggle: toggle, activate: activate, deactivate: deactivate,
    isActive: function () { return active; },
  };
})();

window.JARVIS = JARVIS;
