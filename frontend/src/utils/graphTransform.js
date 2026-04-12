/**
 * Hub-and-spoke graph model:
 *   - Broad tag categories become large hub nodes (type: 'tagNode')
 *   - Each saved link becomes a smaller spoke node (type: 'linkNode')
 *   - Edges connect link nodes to every broad-tag hub they belong to
 */
export function buildGraphData(links) {
  // Step 1: collect all broad tags and count how many links use each
  const tagMap = new Map(); // tagName -> { id, name, count }

  links.forEach(link => {
    (link.tags || []).forEach(tag => {
      const tagObj = typeof tag === 'string' ? { name: tag, tag_type: 'broad' } : tag;
      if (tagObj.tag_type === 'broad' && tagObj.name) {
        if (!tagMap.has(tagObj.name)) {
          tagMap.set(tagObj.name, { id: `tag__${tagObj.name}`, name: tagObj.name, count: 0 });
        }
        tagMap.get(tagObj.name).count++;
      }
    });
  });

  // Step 2: hub nodes (one per broad tag)
  const tagNodes = Array.from(tagMap.values()).map(tag => ({
    id: tag.id,
    type: 'tagNode',
    data: { label: tag.name, count: tag.count },
    position: { x: 0, y: 0 }, // filled by layout
  }));

  // Step 3: link (spoke) nodes
  const linkNodes = links
    .filter(link => link.id != null)
    .map(link => {
      const allTags = link.tags || [];
      const specificTags = allTags.filter(t => {
        const o = typeof t === 'string' ? { tag_type: undefined } : t;
        return o.tag_type === 'specific' || !o.tag_type;
      });
      const broadTags = allTags.filter(t => {
        const o = typeof t === 'string' ? { tag_type: undefined } : t;
        return o.tag_type === 'broad';
      });
      return {
        id: String(link.id),
        type: 'linkNode',
        data: {
          label: link.title || link.url,
          tags: specificTags,
          broadTags,
          url: link.url,
        },
        position: { x: 0, y: 0 },
      };
    });

  // Step 4: edges — link node → tag hub (for every broad tag on the link)
  const edges = [];
  links.forEach(link => {
    if (!link.id) return;
    const linkId = String(link.id);
    (link.tags || []).forEach(tag => {
      const tagObj = typeof tag === 'string' ? { name: tag, tag_type: 'broad' } : tag;
      if (tagObj.tag_type === 'broad' && tagObj.name && tagMap.has(tagObj.name)) {
        const hubId = tagMap.get(tagObj.name).id;
        edges.push({
          id: `e-${linkId}-${hubId}`,
          source: linkId,
          target: hubId,
          style: {
            stroke: 'rgba(129, 140, 248, 0.18)',
            strokeWidth: 1,
          },
        });
      }
    });
  });

  return { nodes: [...tagNodes, ...linkNodes], edges };
}
