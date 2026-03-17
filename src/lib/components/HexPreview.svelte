<script>
  import { hexToPixel, hexPolygonPoints } from '../core/hex.js';

  /**
   * @type {{ hexes: Array<{q: number, r: number}>, width?: number, height?: number, orientation?: string }}
   */
  let { hexes = [], width = 140, height = 110, orientation = 'flat' } = $props();

  const SIZE = 12; // hex radius for preview

  const positions = $derived(
    hexes.map((h) => {
      const { x, y } = hexToPixel(h.q, h.r, SIZE, orientation);
      return { ...h, cx: x, cy: y };
    })
  );

  const viewBox = $derived(() => {
    if (positions.length === 0) return '-50 -40 100 80';
    const margin = SIZE * 1.5;
    const xs = positions.map((p) => p.cx);
    const ys = positions.map((p) => p.cy);
    const minX = Math.min(...xs) - margin;
    const minY = Math.min(...ys) - margin;
    const maxX = Math.max(...xs) + margin;
    const maxY = Math.max(...ys) + margin;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  });
</script>

<svg {width} {height} viewBox={viewBox()} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  {#each positions as hex}
    <polygon
      points={hexPolygonPoints(hex.cx, hex.cy, SIZE - 1, orientation)}
      fill="rgba(99, 102, 241, 0.18)"
      stroke="rgba(99, 102, 241, 0.5)"
      stroke-width="0.8"
    />
  {/each}
</svg>
