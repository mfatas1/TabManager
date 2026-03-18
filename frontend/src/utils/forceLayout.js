/**
 * Native force-directed graph layout algorithm
 * Pure JavaScript implementation with zero dependencies
 */

export function calculateForceLayout(nodes, links, width, height, iterations = 50) {
  if (!nodes || nodes.length === 0) return [];

  // Initialize positions if not already set
  const simNodes = nodes.map((node) => ({
    ...node,
    x: node.x || Math.random() * width,
    y: node.y || Math.random() * height,
    vx: 0,
    vy: 0,
  }));

  const simLinks = links.map((link) => ({
    ...link,
    source: typeof link.source === 'string' 
      ? simNodes.find((n) => n.id === link.source)
      : simNodes[link.source],
    target: typeof link.target === 'string'
      ? simNodes.find((n) => n.id === link.target)
      : simNodes[link.target],
  })).filter(link => link.source && link.target);

  // Simulation parameters
  const centerX = width / 2;
  const centerY = height / 2;
  const attractionStrength = 0.05;
  const repulsionStrength = 200;
  const centeringStrength = 0.01;
  const damping = 0.85;

  // Run simulation iterations
  for (let iter = 0; iter < iterations; iter++) {
    // Reset forces
    simNodes.forEach((node) => {
      node.fx = 0;
      node.fy = 0;
    });

    // Repulsive forces (all pairs)
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const dx = simNodes[j].x - simNodes[i].x;
        const dy = simNodes[j].y - simNodes[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionStrength / (distance * distance);

        simNodes[i].fx -= (force * dx) / distance;
        simNodes[i].fy -= (force * dy) / distance;
        simNodes[j].fx += (force * dx) / distance;
        simNodes[j].fy += (force * dy) / distance;
      }
    }

    // Attractive forces (connected nodes)
    simLinks.forEach((link) => {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = attractionStrength * distance;

      link.source.fx += (force * dx) / distance;
      link.source.fy += (force * dy) / distance;
      link.target.fx -= (force * dx) / distance;
      link.target.fy -= (force * dy) / distance;
    });

    // Centering force
    simNodes.forEach((node) => {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.fx += dx * centeringStrength;
      node.fy += dy * centeringStrength;
    });

    // Update positions
    simNodes.forEach((node) => {
      node.vx = (node.vx + node.fx) * damping;
      node.vy = (node.vy + node.fy) * damping;
      node.x += node.vx;
      node.y += node.vy;

      // Boundary constraints
      node.x = Math.max(50, Math.min(width - 50, node.x));
      node.y = Math.max(50, Math.min(height - 50, node.y));
    });
  }

  return simNodes;
}
