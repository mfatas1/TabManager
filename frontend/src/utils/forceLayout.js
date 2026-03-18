/**
 * Native force-directed layout - NO external dependencies.
 * Uses physics simulation to position nodes based on their connections.
 */

/**
 * Apply a force-directed layout to React Flow nodes based on their connections.
 *
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @param {number} width - Approximate canvas width
 * @param {number} height - Approximate canvas height
 * @returns {Promise<Array>} - Promise resolving to layouted nodes
 */
export function applyForceLayout(nodes, edges, width = 800, height = 600) {
  return new Promise((resolve) => {
    if (!nodes || nodes.length === 0) {
      resolve(nodes || []);
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;

    // For very small graphs, use a simple manual layout
    if (nodes.length <= 3) {
      const layoutedSmall = nodes.map((node, index) => {
        let x = centerX;
        let y = centerY;

        if (nodes.length === 2) {
          x = centerX + (index === 0 ? -140 : 140);
          y = centerY + (index === 0 ? -40 : 40);
        } else if (nodes.length === 3) {
          const angle = (index / 3) * Math.PI * 2;
          const radius = 180;
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
        }

        return {
          ...node,
          position: { x, y },
        };
      });

      resolve(layoutedSmall);
      return;
    }

    // Create simulation nodes with initial positions
    const simNodes = nodes.map((n, i) => {
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const initialX = (i % cols) * 200 + Math.random() * 50;
      const initialY = Math.floor(i / cols) * 200 + Math.random() * 50;

      return {
        id: n.id,
        x: initialX,
        y: initialY,
        vx: 0,
        vy: 0,
      };
    });

    // Create a map for quick lookup
    const nodeMap = new Map(simNodes.map(n => [n.id, n]));

    // Simulation parameters
    const iterations = 100;
    const repulsionStrength = 5000;
    const attractionStrength = 0.05;
    const linkDistance = 250;
    const centerStrength = 0.01;
    const damping = 0.9;
    const minDistance = 100;

    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
      const alpha = 1 - iter / iterations;

      // Apply repulsion between all nodes
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const nodeA = simNodes[i];
          const nodeB = simNodes[j];

          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          if (distance < minDistance * 3) {
            const force = (repulsionStrength * alpha) / (distance * distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }

      // Apply attraction for connected nodes
      edges.forEach(edge => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);

        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          const displacement = distance - linkDistance;
          const force = displacement * attractionStrength * alpha;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // Apply centering force
      simNodes.forEach(node => {
        node.vx += (centerX - node.x) * centerStrength * alpha;
        node.vy += (centerY - node.y) * centerStrength * alpha;
      });

      // Update positions
      simNodes.forEach(node => {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
      });
    }

    // Map positions back onto original React Flow node objects
    const layoutedNodes = nodes.map((node) => {
      const simNode = nodeMap.get(node.id);
      return {
        ...node,
        position: {
          x: simNode ? simNode.x : 0,
          y: simNode ? simNode.y : 0,
        },
      };
    });

    resolve(layoutedNodes);
  });
}
