/**
 * Tiny Voronoi: for each seed, the cell is the bounding rectangle clipped
 * by half-planes from every other seed (Sutherland-Hodgman).
 *
 * O(N²) per cell, O(N³) total. Fine for N ≤ ~200 seeds, which is what we
 * have (street intersections in a city neighborhood). Vector-pure: returns
 * polygons as arrays of [x, y] vertices.
 */
export type Point = [number, number];
export type Cell = Point[];

export interface VoronoiOptions {
  /** Clipping rectangle [minX, minY, maxX, maxY]. */
  bbox: [number, number, number, number];
}

export function voronoi(seeds: Point[], opts: VoronoiOptions): Cell[] {
  const [minX, minY, maxX, maxY] = opts.bbox;
  const rect: Cell = [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY]
  ];

  // Deduplicate seeds (Voronoi degenerates on coincident points)
  const uniq: Point[] = [];
  const seen = new Set<string>();
  for (const s of seeds) {
    const k = `${s[0].toFixed(1)}|${s[1].toFixed(1)}`;
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(s);
    }
  }

  const cells: Cell[] = [];
  for (let i = 0; i < uniq.length; i++) {
    let cell: Cell = rect.slice();
    for (let j = 0; j < uniq.length; j++) {
      if (i === j) continue;
      cell = clipHalfPlane(cell, uniq[i], uniq[j]);
      if (cell.length === 0) break;
    }
    cells.push(cell);
  }
  return cells;
}

/**
 * Sutherland-Hodgman clip: keep the part of `polygon` closer to `keepPt`
 * than to `cutPt`, i.e. on the keepPt side of the perpendicular bisector.
 */
function clipHalfPlane(polygon: Cell, keepPt: Point, cutPt: Point): Cell {
  const mx = (keepPt[0] + cutPt[0]) / 2;
  const my = (keepPt[1] + cutPt[1]) / 2;
  // Normal points from keepPt toward cutPt → "inside" half-plane (toward keepPt)
  // is where (p - midpoint) · normal <= 0.
  const nx = cutPt[0] - keepPt[0];
  const ny = cutPt[1] - keepPt[1];
  const sideOf = (p: Point) => nx * (p[0] - mx) + ny * (p[1] - my);

  const out: Cell = [];
  for (let i = 0; i < polygon.length; i++) {
    const cur = polygon[i];
    const nxt = polygon[(i + 1) % polygon.length];
    const dCur = sideOf(cur);
    const dNxt = sideOf(nxt);
    const curIn = dCur <= 0;
    const nxtIn = dNxt <= 0;
    if (curIn) out.push(cur);
    if (curIn !== nxtIn) {
      // Linear interpolation at the crossing
      const t = dCur / (dCur - dNxt);
      out.push([
        cur[0] + t * (nxt[0] - cur[0]),
        cur[1] + t * (nxt[1] - cur[1])
      ]);
    }
  }
  return out;
}
