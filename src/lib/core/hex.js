/**
 * Hexagonal grid math using axial coordinates (q, r)
 * Based on https://www.redblobgames.com/grids/hexagons/
 *
 * Flat-top hexagons are used throughout.
 */

export const ORIENTATIONS = {
  FLAT: 'flat',
  POINTY: 'pointy'
};

/**
 * Convert axial coordinates to pixel position (flat-top)
 * @param {number} q
 * @param {number} r
 * @param {number} size - hex radius in pixels
 * @param {string} orientation
 * @returns {{ x: number, y: number }}
 */
export function hexToPixel(q, r, size, orientation = ORIENTATIONS.FLAT) {
  if (orientation === ORIENTATIONS.FLAT) {
    const x = size * (3 / 2) * q;
    const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
    return { x, y };
  } else {
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = size * (3 / 2) * r;
    return { x, y };
  }
}

/**
 * Convert pixel to axial hex coordinates (flat-top)
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {string} orientation
 * @returns {{ q: number, r: number }}
 */
export function pixelToHex(x, y, size, orientation = ORIENTATIONS.FLAT) {
  let q, r;
  if (orientation === ORIENTATIONS.FLAT) {
    q = ((2 / 3) * x) / size;
    r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / size;
  } else {
    q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
    r = ((2 / 3) * y) / size;
  }
  return hexRound(q, r);
}

/**
 * Round fractional axial coords to nearest hex
 */
export function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

/**
 * Get the 6 corners of a flat-top hexagon
 * @param {number} cx - center x
 * @param {number} cy - center y
 * @param {number} size
 * @param {string} orientation
 * @returns {Array<{x: number, y: number}>}
 */
export function hexCorners(cx, cy, size, orientation = ORIENTATIONS.FLAT) {
  const corners = [];
  const startAngle = orientation === ORIENTATIONS.FLAT ? 0 : 30;
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i + startAngle;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: cx + size * Math.cos(angleRad),
      y: cy + size * Math.sin(angleRad)
    });
  }
  return corners;
}

/**
 * Get SVG polygon points string for a hex
 */
export function hexPolygonPoints(cx, cy, size, orientation = ORIENTATIONS.FLAT) {
  return hexCorners(cx, cy, size, orientation)
    .map(({ x, y }) => `${x},${y}`)
    .join(' ');
}

/**
 * Generate a radial hex grid in axial coordinates
 * @param {number} radius - grid radius (0 = just center)
 * @returns {Array<{q: number, r: number}>}
 */
export function generateHexGrid(radius) {
  const hexes = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

/**
 * Generate an irregular convex hexagon defined by 6 side lengths (flat-top, axial coords).
 * Side order: [top-left, top-right, right, bottom-right, bottom-left, left]
 * @param {number[]} sides - six side lengths, e.g. [5, 4, 4, 5, 4, 4]
 * @returns {Array<{q: number, r: number}>}
 */
export function generateIrregularHexGrid(sides) {
  const [a0, a1, a2, a3] = sides;
  const qMin = a2 - a1 + 1 - a0;
  const qMax = a2 - 1;
  const rMin = 1 - a1;
  const rMax = a2 - a1 - 1 + a3;
  const sMin = a2 - 2 * a1 + 1;
  const sMax = 2 * a2 - a1 - 1;
  const hexes = [];
  for (let q = qMin; q <= qMax; q++) {
    for (let r = rMin; r <= rMax; r++) {
      const s = q + r;
      if (s >= sMin && s <= sMax) {
        hexes.push({ q, r });
      }
    }
  }
  return hexes;
}

/**
 * Hex key for use in Maps/Sets
 */
export function hexKey(q, r) {
  return `${q},${r}`;
}

/**
 * Axial direction vectors for flat-top hexes (clockwise from SE edge).
 * Edge index i → direction HEX_DIRECTIONS[i]
 * Edge i midpoint angle: 30° + 60° * i  (SE=30°, S=90°, SW=150°, NW=210°, N=270°, NE=330°)
 */
export const HEX_DIRECTIONS = [
  { q: 1, r: 0 }, // 0: SE  (30°)
  { q: 0, r: 1 }, // 1: S   (90°)
  { q: -1, r: 1 }, // 2: SW  (150°)
  { q: -1, r: 0 }, // 3: NW  (210°)
  { q: 0, r: -1 }, // 4: N   (270°)
  { q: 1, r: -1 } // 5: NE  (330°)
];

export function hexNeighbors(q, r) {
  return HEX_DIRECTIONS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

/**
 * Get the pixel position of the midpoint of edge `edgeIndex` of a hex.
 * For flat-top: edge 0 = SE (30°), edge 1 = S (90°), ..., edge 5 = NE (330°)
 * @param {number} cx
 * @param {number} cy
 * @param {number} size
 * @param {number} edgeIndex - 0..5
 * @param {string} orientation
 * @returns {{ x: number, y: number }}
 */
export function edgeMidpoint(cx, cy, size, edgeIndex, orientation = ORIENTATIONS.FLAT) {
  const startAngle = orientation === ORIENTATIONS.FLAT ? 30 : 60;
  const angleDeg = startAngle + 60 * edgeIndex;
  const angleRad = (Math.PI / 180) * angleDeg;
  // Apothem: distance from hex center to edge midpoint = size * cos(30°) = size * √3/2
  const apothem = size * Math.cos(Math.PI / 6);
  return {
    x: cx + apothem * Math.cos(angleRad),
    y: cy + apothem * Math.sin(angleRad)
  };
}

/**
 * Compute a canonical edge key (unique per physical edge, regardless of which side you look from).
 * @param {number} q
 * @param {number} r
 * @param {number} edgeIndex
 * @returns {string}
 */
export function canonicalEdgeKey(q, r, edgeIndex) {
  const dir = HEX_DIRECTIONS[edgeIndex];
  const nq = q + dir.q;
  const nr = r + dir.r;
  const oppositeEdge = (edgeIndex + 3) % 6;

  // Always use the "smaller" hex as canonical
  if (q < nq || (q === nq && r < nr)) {
    return `${q},${r},${edgeIndex}`;
  } else {
    return `${nq},${nr},${oppositeEdge}`;
  }
}

/**
 * Parse a canonical edge key back to {q, r, edgeIndex}
 * @param {string} key
 * @returns {{ q: number, r: number, edgeIndex: number }}
 */
export function parseEdgeKey(key) {
  const parts = key.split(',');
  return { q: parseInt(parts[0]), r: parseInt(parts[1]), edgeIndex: parseInt(parts[2]) };
}

/**
 * Get the neighbor hex across edge `edgeIndex`
 */
export function edgeNeighbor(q, r, edgeIndex) {
  const dir = HEX_DIRECTIONS[edgeIndex];
  return { q: q + dir.q, r: r + dir.r };
}

/**
 * Compute a canonical vertex key (unique per physical vertex, shared by up to 3 hexes).
 *
 * For flat-top hexes, vertex i of hex (q,r) is also:
 *   - vertex (i+2)%6 of neighbor in direction (i-1+6)%6
 *   - vertex (i+4)%6 of neighbor in direction i
 *
 * @param {number} q
 * @param {number} r
 * @param {number} vertexIndex - 0..5
 * @returns {string}
 */
export function canonicalVertexKey(q, r, vertexIndex) {
  const prev = (vertexIndex - 1 + 6) % 6;
  const dPrev = HEX_DIRECTIONS[prev];
  const dCurr = HEX_DIRECTIONS[vertexIndex];
  const candidates = [
    { q, r, v: vertexIndex },
    { q: q + dPrev.q, r: r + dPrev.r, v: (vertexIndex + 2) % 6 },
    { q: q + dCurr.q, r: r + dCurr.r, v: (vertexIndex + 4) % 6 }
  ];
  candidates.sort((a, b) => a.q - b.q || a.r - b.r || a.v - b.v);
  const c = candidates[0];
  return `v:${c.q},${c.r},${c.v}`;
}
