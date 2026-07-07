/* ==========================================
   J.A.R.V.I.S. — 3D Network Topology Graph
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Network = (function () {
  let group, nodes = [], edges = [];
  let nodeGeo, edgeMat;

  function init(scene, graphData) {
    group = new THREE.Group();

    nodeGeo = new THREE.SphereGeometry(0.08, 12, 12);
    edgeMat = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    if (graphData) {
      buildGraph(graphData);
    }

    group.position.set(0, 0.3, 0);
    scene.add(group);

    return group;
  }

  function buildGraph(data) {
    // Clear existing
    nodes.forEach((n) => group.remove(n.mesh));
    edges.forEach((e) => group.remove(e));
    nodes = [];
    edges = [];

    const { vertices, links } = data;
    if (!vertices || !links) return;

    // Layout nodes in a sphere
    const nodeCount = vertices.length;
    vertices.forEach((v, i) => {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;

      const x = 3 * Math.cos(theta) * Math.sin(phi);
      const y = 3 * Math.sin(theta) * Math.sin(phi);
      const z = 3 * Math.cos(phi);

      const mat = new THREE.MeshBasicMaterial({
        color: v.color || '#60A5FA',
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { id: v.id, label: v.label };
      group.add(mesh);

      nodes.push({ id: v.id, mesh });
    });

    // Draw edges
    links.forEach((link) => {
      const source = nodes.find((n) => n.id === link.source);
      const target = nodes.find((n) => n.id === link.target);
      if (!source || !target) return;

      const start = source.mesh.position;
      const end = target.mesh.position;
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(end, start);
      const length = dir.length();

      const edgeGeo = new THREE.CylinderGeometry(0.015, 0.015, length, 6);
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.copy(mid);
      edge.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.normalize()
      );
      group.add(edge);
      edges.push(edge);
    });
  }

  function update(delta, elapsed) {
    if (!group) return;
    group.rotation.y += delta * 0.05;
    group.rotation.x += delta * 0.02;

    // Pulse nodes
    nodes.forEach((n, i) => {
      const scale = 1 + Math.sin(elapsed * 2 + i) * 0.2;
      n.mesh.scale.setScalar(scale);
    });
  }

  function remove(scene) {
    if (group) {
      scene.remove(group);
      group = null;
    }
  }

  return { init, buildGraph, update, remove };
})();

window.JARVIS = JARVIS;
