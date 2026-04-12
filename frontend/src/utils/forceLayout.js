/**
 * Hub-and-spoke layout.
 *
 * Tag hub nodes are arranged in a circle; each link node is placed in a
 * smaller orbit around its *primary* hub (the broad tag with the most links),
 * then a short force simulation tidies overlaps.
 */
export function applyForceLayout(nodes, edges) {
  return new Promise((resolve) => {
    if (!nodes || nodes.length === 0) {
      resolve(nodes || []);
      return;
    }

    const hubs = nodes.filter(n => n.type === 'tagNode');
    const spokes = nodes.filter(n => n.type !== 'tagNode');

    // ── 1. Position hubs in a circle ─────────────────────────────────────
    const CX = 0;
    const CY = 0;
    const hubRadius = Math.max(320, hubs.length * 90);
    const hubPos = new Map();

    hubs.forEach((hub, i) => {
      const angle = (i / Math.max(hubs.length, 1)) * Math.PI * 2 - Math.PI / 2;
      hubPos.set(hub.id, {
        x: CX + Math.cos(angle) * hubRadius,
        y: CY + Math.sin(angle) * hubRadius,
      });
    });

    // ── 2. Map each link to all its hubs, pick primary by hub size ────────
    const linkHubs = new Map(); // linkId -> [hubId, ...]
    edges.forEach(e => {
      if (!hubPos.has(e.target)) return;
      if (!linkHubs.has(e.source)) linkHubs.set(e.source, []);
      linkHubs.get(e.source).push(e.target);
    });

    // Count how many links belong to each hub
    const hubSize = new Map(hubs.map(h => [h.id, 0]));
    linkHubs.forEach(hubIds => {
      hubIds.forEach(hid => hubSize.set(hid, (hubSize.get(hid) || 0) + 1));
    });

    // Each link's primary hub = the one with the most links (most company)
    const linkPrimaryHub = new Map();
    linkHubs.forEach((hubIds, linkId) => {
      const best = hubIds.reduce((a, b) => (hubSize.get(b) > hubSize.get(a) ? b : a));
      linkPrimaryHub.set(linkId, best);
    });

    // ── 3. Place link nodes in a ring around their primary hub ────────────
    const hubBuckets = new Map(hubs.map(h => [h.id, []]));
    linkPrimaryHub.forEach((hubId, linkId) => hubBuckets.get(hubId)?.push(linkId));

    const spokePos = new Map();
    hubBuckets.forEach((linkIds, hubId) => {
      const { x: hx, y: hy } = hubPos.get(hubId);
      const spokeRadius = Math.max(140, linkIds.length * 28);
      linkIds.forEach((linkId, i) => {
        const angle = (i / Math.max(linkIds.length, 1)) * Math.PI * 2 - Math.PI / 2;
        spokePos.set(linkId, {
          x: hx + Math.cos(angle) * spokeRadius + (Math.random() - 0.5) * 20,
          y: hy + Math.sin(angle) * spokeRadius + (Math.random() - 0.5) * 20,
        });
      });
    });

    // Orphans: scatter around origin
    const orphans = spokes.filter(n => !spokePos.has(n.id));
    orphans.forEach((node, i) => {
      spokePos.set(node.id, {
        x: CX + (i % 5) * 160 - 320,
        y: CY + Math.floor(i / 5) * 140 + hubRadius + 200,
      });
    });

    // ── 4. Light force simulation to reduce overlap ───────────────────────
    const allPos = new Map([...hubPos, ...spokePos]);
    const allIds = Array.from(allPos.keys());
    const vel = new Map(allIds.map(id => [id, { vx: 0, vy: 0 }]));

    // Which nodes are free to move (hubs stay fixed)
    const free = new Set(spokes.map(n => n.id));

    const ITERS = 80;
    const REPULSION = 6000;
    const DAMPING = 0.82;

    for (let iter = 0; iter < ITERS; iter++) {
      const alpha = 1 - iter / ITERS;

      // Repulsion between ALL pairs
      for (let i = 0; i < allIds.length; i++) {
        for (let j = i + 1; j < allIds.length; j++) {
          const a = allIds[i], b = allIds[j];
          const pa = allPos.get(a), pb = allPos.get(b);
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (REPULSION * alpha) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (free.has(a)) { vel.get(a).vx -= fx; vel.get(a).vy -= fy; }
          if (free.has(b)) { vel.get(b).vx += fx; vel.get(b).vy += fy; }
        }
      }

      // Spring: link node pulled toward its primary hub
      spokes.forEach(node => {
        const primaryHub = linkPrimaryHub.get(node.id);
        if (!primaryHub) return;
        const pp = allPos.get(node.id);
        const hp = allPos.get(primaryHub);
        if (!pp || !hp) return;
        const dx = hp.x - pp.x;
        const dy = hp.y - pp.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = Math.max(140, Math.min(dist, 200));
        const force = (dist - target) * 0.04 * alpha;
        vel.get(node.id).vx += (dx / dist) * force;
        vel.get(node.id).vy += (dy / dist) * force;
      });

      // Integrate
      free.forEach(id => {
        const v = vel.get(id);
        v.vx *= DAMPING;
        v.vy *= DAMPING;
        const p = allPos.get(id);
        allPos.set(id, { x: p.x + v.vx, y: p.y + v.vy });
      });
    }

    // ── 5. Assemble final node list ───────────────────────────────────────
    resolve(
      nodes.map(node => ({
        ...node,
        position: allPos.get(node.id) ?? { x: 0, y: 0 },
      }))
    );
  });
}
