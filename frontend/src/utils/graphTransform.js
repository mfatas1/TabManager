/**
 * Transform links data into React Flow nodes and edges format
 * @param {Array} links - Array of link objects from the API
 * @returns {Object} { nodes, edges } - React Flow compatible data
 */
export function buildGraphData(links) {
  // Step 1: turn each link into a node
  // We spread links across a grid layout instead of random positions
  // so that nodes don't all start piled on top of each other
  const GRID_COLS = 4;
  const H_SPACING = 250;
  const V_SPACING = 150;

  const nodes = links
    .filter(link => link.id != null) // Filter out links without IDs
    .map((link, i) => {
      // Separate specific and broad tags
      const allTags = link.tags || [];
      const specificTags = allTags.filter(t => t.tag_type === 'specific' || !t.tag_type); // fallback for old data
      const broadTags = allTags.filter(t => t.tag_type === 'broad');
      
      return {
        id: String(link.id),
        type: 'linkNode', // Use our custom node type
        data: {
          label: link.title || link.url,  // fall back to URL if title is missing
          tags: specificTags,              // store specific tags for display
          broadTags: broadTags,           // store broad tags for edges
          url: link.url
        },
        position: {
          x: (i % GRID_COLS) * H_SPACING,
          y: Math.floor(i / GRID_COLS) * V_SPACING
        }
      };
    });

  // Step 2: find shared tags between every pair of links
  // and create an edge for each pair that shares at least one tag
  const edges = [];
  
  // Create a set of valid node IDs for quick lookup
  const validNodeIds = new Set(nodes.map(n => n.id));

  for (let i = 0; i < links.length; i++) {
    for (let j = i + 1; j < links.length; j++) {
      // Skip if either link doesn't have a valid ID
      if (!links[i].id || !links[j].id) continue;
      
      const sourceId = String(links[i].id);
      const targetId = String(links[j].id);
      
      // Only create edge if both nodes exist
      if (!validNodeIds.has(sourceId) || !validNodeIds.has(targetId)) continue;
      
      // Use broad tags for graph connections (more meaningful connections)
      const broadTagsA = (links[i].tags || [])
        .filter(t => t.tag_type === 'broad')
        .map(t => t.name || t);
      const broadTagsB = (links[j].tags || [])
        .filter(t => t.tag_type === 'broad')
        .map(t => t.name || t);

      const sharedTags = broadTagsA.filter(tag => broadTagsB.includes(tag));

      if (sharedTags.length > 0) {
        edges.push({
          id: `e${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          label: sharedTags.join(', '),  // show shared tags on the edge
          style: { strokeWidth: Math.min(sharedTags.length, 5) }  // thicker edge = more shared tags, cap at 5
        });
      }
    }
  }

  return { nodes, edges };
}
