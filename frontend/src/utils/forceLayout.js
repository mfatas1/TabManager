/**
 * Simple force-directed layout implementation without external dependencies.
 * Uses a basic physics simulation to position nodes based on their connections.
 * Native implementation - no d3-force dependency required.
 */

function computeLayout(nodes, links, width, height, iterations = 50) {
  // Initialize nodes with random positions if not already set
  const simNodes = nodes.map(n => ({
    ...n,
    x: n.x !== undefined ? n.x : Math.random() * width,
    y: n.y !== undefined ? n.y : Math.random() * height,
    vx: 0,
    vy: 0
  }));

  // Run simulation iterations
  for (let i = 0; i < iterations; i++) {
    const alpha = 1 - i / iterations; // cooling factor

    // Reset forces
    simNodes.forEach(node => {
      node.fx = 0;
      node.fy = 0;
    });

    // Apply repulsion forces between all nodes (many-body force)
    for (let j = 0; j < simNodes.length; j++) {
      for (let k = j + 1; k < simNodes.length; k++) {
        const dx = simNodes[k].x - simNodes[j].x;
        const dy = simNodes[k].y - simNodes[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const repulsion = (-250 * alpha) / distance;
        
        const fx = (dx / distance) * repulsion;
        const fy = (dy / distance) * repulsion;
        
        simNodes[j].fx -= fx;
        simNodes[j].fy -= fy;
        simNodes[k].fx += fx;
        simNodes[k].fy += fy;
      }
    }

    // Apply attraction forces for linked nodes
    links.forEach(link => {
      const source = simNodes.find(n => n.id === link.source);
      const target = simNodes.find(n => n.id === link.target);
      
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
        
        // Spring force - pulls connected nodes together
        const attraction = (distance - 350) * 0.25 * alpha;
        const fx = (dx / distance) * attraction;
        const fy = (dy / distance) * attraction;
        
        source.fx += fx;
        source.fy += fy;
        target.fx -= fx;
        target.fy -= fy;
      }
    });

    // Apply center force to keep everything centered
    const centerX = width / 2;
    const centerY = height / 2;
    
    simNodes.forEach(node => {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const strength = 0.1 * alpha;
      
      node.fx += (dx / distance) * strength || 0;
      node.fy += (dy / distance) * strength || 0;
    });

    // Update velocities and positions with damping
    simNodes.forEach(node => {
      node.vx += node.fx;
      node.vy += node.fy;
      node.vx *= 0.8; // damping
      node.vy *= 0.8;
      
      node.x += node.vx;
      node.y += node.vy;
      
      // Keep nodes within bounds with collision
      const padding = 110;
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    });
  }

  return simNodes.map(({ fx, fy, vx, vy, ...node }) => node);
}

export { computeLayout };
