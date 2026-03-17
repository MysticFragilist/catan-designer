<script>
  import { hexToPixel, hexPolygonPoints } from '../core/hex.js';

  /**
   * @type {{
   *   snapshot: Array<{q: number, r: number, color: string}>,
   *   width?: number,
   *   height?: number,
   *   orientation?: string
   * }}
   */
  let { snapshot = [], width = 72, height = 56, orientation = 'flat' } = $props();

  const SIZE = 6;

  const positions = $derived(
    snapshot.map((h) => {
      const { x, y } = hexToPixel(h.q, h.r, SIZE, orientation);
      return { ...h, cx: x, cy: y };
    })
  );

  const viewBox = $derived(() => {
    if (positions.length === 0) return '-36 -28 72 56';
    const margin = SIZE * 1.4;
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
      points={hexPolygonPoints(hex.cx, hex.cy, SIZE - 0.5, orientation)}
      fill={hex.color}
      stroke="rgba(0,0,0,0.25)"
      stroke-width="0.4"
    />
  {/each}
</svg>
