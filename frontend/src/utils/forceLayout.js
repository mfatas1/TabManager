import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

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

    // For very small graphs, use a simple manual layout so nodes
    // don't sit perfectly on top of their single edge.
    if (nodes.length <= 3) {
      const centerX = width / 2;
      const centerY = height / 2;

      const layoutedSmall = nodes.map((node, index) => {
        let x = centerX;
        let y = centerY;

        if (nodes.length === 2) {
          // Two nodes side by side with a bit of vertical offset
          x = centerX + (index === 0 ? -140 : 140);
          y = centerY + (index === 0 ? -40 : 40);
        } else if (nodes.length === 3) {
          // Simple triangle
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


    
    const simNodes = nodes.map((n, i) => {
      const fallbackX = (i % 5) * 150;
      const fallbackY = Math.floor(i / 5) * 150;
      const initialX = n.position?.x ?? fallbackX;
      const initialY = n.position?.y ?? fallbackY;

      return {
        ...n,
        x: initialX,
        y: initialY,
      };
    });

    const simLinks = edges.map((e) => ({
      source: e.source,
      target: e.target,
      // If you later store more metadata on edges, you can make this smarter.
      strength: 1,
    }));

    const simulation = forceSimulation(simNodes)
      .force(
        'link',
        forceLink(simLinks)
          .id((n) => n.id)
          .distance(350) // more space between connected nodes
          .strength((l) => Math.min(l.strength * 0.25, 1))
      )
      // Stronger repulsion spreads clusters apart so edges are more visible
      .force('charge', forceManyBody().strength(-250))
      .force('center', forceCenter(width / 2, height / 2)) // pull everything to center
      // Larger collision radius to keep cards from overlapping visually
      .force('collision', forceCollide(110))
      .stop();

    // run the simulation synchronously instead of animating it
    // so nodes appear in their final positions immediately
    const iterations = Math.ceil(
      Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())
    );
    for (let i = 0; i < iterations; i++) {
      simulation.tick();
    }

    // map positions back onto your original React Flow node objects
    const layoutedNodes = nodes.map((node, i) => ({
      ...node,
      position: {
        x: simNodes[i].x,
        y: simNodes[i].y,
      },
    }));

    resolve(layoutedNodes);
  });
}

