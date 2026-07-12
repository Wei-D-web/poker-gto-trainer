/* ==========================================
   J.A.R.V.I.S. — Interactive 3D Network Graph
   Raycaster hover/click, node drag, auto-layout
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Network = (function () {
  let group, nodes = [], edges = [];
  let nodeGeo, edgeMat;
  let raycaster, mouse;
  let hoveredNode = null;
  let draggedNode = null;
  let isDragging = false;
  let autoRotate = true;

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

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    if (graphData) buildGraph(graphData);

    group.position.set(0, 0.3, 0);
    scene.add(group);

    setupInteraction();

    return group;
  }

  function buildGraph(data) {
    clearGraph();
    const { vertices, links } = data;
    if (!vertices || !links) return;

    const nodeCount = vertices.length;

    // Fibonacci sphere layout
    vertices.forEach((v, i) => {
      const phi = Math.acos(-1 + (2 * (i + 0.5)) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const radius = 3.0;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      const mat = new THREE.MeshBasicMaterial({
        color: v.color || '#60A5FA',
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = {
        type: 'node',
        id: v.id,
        label: v.label || v.id,
        color: v.color || '#60A5FA',
        connections: [],
      };
      group.add(mesh);

      // Glow halo
      const haloGeo = new THREE.TorusGeometry(0.12, 0.012, 8, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: v.color || '#60A5FA',
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(mesh.position);
      halo.userData = { type: 'halo', parentNode: mesh };
      group.add(halo);
      mesh.userData.halo = halo;

      nodes.push({ id: v.id, mesh, halo });
    });

    // Build edges
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);
      if (!source || !target) return;

      source.mesh.userData.connections.push(target.mesh);
      target.mesh.userData.connections.push(source.mesh);

      drawEdge(source.mesh.position, target.mesh.position);
    });
  }

  function drawEdge(start, end) {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();

    const edgeGeo = new THREE.CylinderGeometry(0.012, 0.012, length, 6);
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.copy(mid);
    edge.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize()
    );
    edge.userData = { type: 'edge', source: start.clone(), target: end.clone() };
    group.add(edge);
    edges.push(edge);
  }

  function clearGraph() {
    nodes.forEach(n => {
      group.remove(n.mesh);
      group.remove(n.halo);
      n.mesh.material.dispose();
      n.halo.material.dispose();
    });
    edges.forEach(e => {
      group.remove(e);
      if (e.geometry) e.geometry.dispose();
    });
    nodes = [];
    edges = [];
  }

  // ── Interaction ──
  function setupInteraction() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('mousemove', (e) => {
      if (!group) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, JARVIS.Scene.getCamera());
      const intersects = raycaster.intersectObjects(
        nodes.map(n => n.mesh),
        false
      );

      // Hover highlight
      if (hoveredNode && (!intersects.length || intersects[0].object !== hoveredNode)) {
        resetHighlight(hoveredNode);
        hoveredNode = null;
        canvas.style.cursor = isDragging ? 'grabbing' : 'default';
      }

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj !== hoveredNode) {
          hoveredNode = obj;
          highlightNode(obj);
          canvas.style.cursor = isDragging ? 'grabbing' : 'pointer';
        }
      }

      // Node dragging
      if (isDragging && draggedNode && group) {
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.at(intersects.length > 0 ? intersects[0].distance : 5, intersectPoint);
        draggedNode.position.copy(intersectPoint);
        // Update halo
        if (draggedNode.userData.halo) {
          draggedNode.userData.halo.position.copy(intersectPoint);
        }
        // Update edges
        updateConnectedEdges(draggedNode);
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      if (hoveredNode) {
        isDragging = true;
        draggedNode = hoveredNode;
        autoRotate = false;
        canvas.style.cursor = 'grabbing';
      }
    });

    canvas.addEventListener('mouseup', () => {
      isDragging = false;
      draggedNode = null;
      setTimeout(() => { autoRotate = true; }, 2000);
    });

    canvas.addEventListener('click', (e) => {
      if (!hoveredNode || isDragging) return;
      const d = hoveredNode.userData;

      // Highlight connected nodes
      if (d.connections) {
        highlightConnections(hoveredNode);
      }

      // Show info in chat
      if (d.label && JARVIS.Chat) {
        const connCount = (d.connections || []).length;
        JARVIS.Chat.addMessage('assistant',
          '🔗 **' + d.label + '**\n\n' +
          'Connected to ' + connCount + ' node' + (connCount !== 1 ? 's' : '') + '.'
        );
      }

      if (JARVIS.Particles && JARVIS.Particles.burst) {
        JARVIS.Particles.burst(0.3);
      }
    });
  }

  function highlightNode(obj) {
    obj.material.opacity = 1;
    obj.scale.setScalar(1.6);
    if (obj.userData.halo) {
      obj.userData.halo.material.opacity = 0.8;
      obj.userData.halo.scale.setScalar(1.5);
    }
  }

  function resetHighlight(obj) {
    obj.material.opacity = 0.8;
    obj.scale.setScalar(1);
    if (obj.userData.halo) {
      obj.userData.halo.material.opacity = 0.4;
      obj.userData.halo.scale.setScalar(1);
    }
    // Reset connections
    edges.forEach(e => {
      e.material.opacity = 0.2;
      e.material.color.set('#3B82F6');
    });
  }

  function highlightConnections(obj) {
    const connectedIds = new Set((obj.userData.connections || []).map(c => c.userData.id));
    // Brighten connected edges and nodes
    edges.forEach(e => {
      const srcId = findNodeAt(e.userData.source)?.userData?.id;
      const tgtId = findNodeAt(e.userData.target)?.userData?.id;
      if ((srcId === obj.userData.id || tgtId === obj.userData.id)) {
        e.material.opacity = 0.6;
        e.material.color.set('#60A5FA');
      }
    });
    nodes.forEach(n => {
      if (connectedIds.has(n.id) && n.mesh !== obj) {
        n.mesh.material.opacity = 0.9;
        n.mesh.scale.setScalar(1.2);
      }
    });
  }

  function findNodeAt(pos) {
    return nodes.find(n => n.mesh.position.distanceTo(pos) < 0.15)?.mesh;
  }

  function updateConnectedEdges(node) {
    edges.forEach(e => {
      const srcDist = e.userData.source.distanceTo(node.position);
      const tgtDist = e.userData.target.distanceTo(node.position);
      if (srcDist < 0.15 || tgtDist < 0.15) {
        // Rebuild this edge
        group.remove(e);
        const idx = edges.indexOf(e);
        edges.splice(idx, 1);
        drawEdge(
          srcDist < 0.15 ? node.position : e.userData.source,
          tgtDist < 0.15 ? node.position : e.userData.target
        );
      }
    });
  }

  function update(delta, elapsed) {
    if (!group) return;

    if (autoRotate) {
      group.rotation.y += delta * 0.04;
      group.rotation.x += delta * 0.015;
    }

    // Pulse nodes and halos
    nodes.forEach((n, i) => {
      const s = 1 + Math.sin(elapsed * 2.5 + i) * 0.15;
      if (!isDragging || n.mesh !== draggedNode) {
        n.mesh.scale.setScalar(
          n.mesh === hoveredNode ? 1.6 : s
        );
      }
      if (n.halo) {
        n.halo.rotation.x += delta * 0.4;
        n.halo.rotation.z += delta * 0.3;
        n.halo.material.opacity = n.mesh === hoveredNode ? 0.8 : 0.3 + Math.sin(elapsed * 2 + i) * 0.1;
      }
    });
  }

  function remove(scene) {
    clearGraph();
    scene.remove(group);
    group = null;
    hoveredNode = null;
    draggedNode = null;
    isDragging = false;
  }

  function getGraphData() {
    return {
      vertices: nodes.map(n => ({ id: n.id, label: n.mesh.userData.label, color: '#' + n.mesh.material.color.getHexString() })),
      links: edges.map(e => {
        const src = findNodeAt(e.userData.source);
        const tgt = findNodeAt(e.userData.target);
        return { source: src?.userData?.id, target: tgt?.userData?.id };
      }),
    };
  }

  return { init, buildGraph, update, remove, getGraphData };
})();

window.JARVIS = JARVIS;
