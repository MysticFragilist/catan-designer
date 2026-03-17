<script>
  import { hexPolygonPoints } from '../core/hex.js';

  let {
    q,
    r,
    cx,
    cy,
    size,
    tileType = null,
    rotation = 0,
    number: numberToken = null,
    isHovered = false,
    isSelected = false,
    shapeMode = false,
    orientation = 'flat',
    canvasRotation = 0,
    onclick,
    onmouseenter,
    onmouseleave,
    oncontextmenu
  } = $props();

  const points = $derived(hexPolygonPoints(cx, cy, size, orientation));
  const innerPoints = $derived(hexPolygonPoints(cx, cy, size - 3, orientation));

  const fillColor = $derived(
    tileType ? tileType.color : isHovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)'
  );

  const strokeColor = $derived(
    shapeMode && isHovered
      ? '#ef4444'
      : isSelected
        ? '#ffffff'
        : isHovered
          ? 'rgba(255,255,255,0.5)'
          : 'rgba(255,255,255,0.1)'
  );

  const strokeWidth = $derived(isSelected ? 2.5 : isHovered ? 2 : 1);

  const rotationDeg = $derived(rotation * 60);

  const numberColor = $derived(numberToken === 6 || numberToken === 8 ? '#e63946' : '#1a1a2e');
</script>

<g
  class="hex-tile"
  class:hovered={isHovered}
  class:selected={isSelected}
  class:shape-mode={shapeMode}
  role="button"
  tabindex="0"
  {onclick}
  {onmouseenter}
  {onmouseleave}
  {oncontextmenu}
  onkeydown={(e) => e.key === 'Enter' && onclick?.(e)}
>
  <!-- Shadow -->
  {#if tileType}
    <polygon
      points={hexPolygonPoints(cx + 1.5, cy + 2, size - 0.5, orientation)}
      fill="rgba(0,0,0,0.25)"
      style:pointer-events="none"
    />
  {/if}

  <!-- Main hex -->
  <polygon
    {points}
    fill={fillColor}
    stroke={strokeColor}
    stroke-width={strokeWidth}
    style:transition="fill 0.12s, stroke 0.12s"
  />

  <!-- Inner highlight -->
  {#if tileType}
    <polygon
      points={hexPolygonPoints(cx, cy - 1, size * 0.82, orientation)}
      fill="rgba(255,255,255,0.07)"
      stroke="none"
      style:pointer-events="none"
    />
  {/if}

  <!-- Tile content: counter-rotated so text always stays horizontal -->
  {#if tileType}
    <g
      transform={`rotate(${rotationDeg - canvasRotation}, ${cx}, ${cy})`}
      style:pointer-events="none"
    >
      <text
        x={cx}
        y={cy + (numberToken !== null ? size * 0.14 : 5)}
        text-anchor="middle"
        dominant-baseline="middle"
        font-size={size * 0.42}
        style:user-select="none"
      >
        {tileType.icon || ''}
      </text>

      {#if size > 30}
        <text
          x={cx}
          y={cy + size * 0.42}
          text-anchor="middle"
          dominant-baseline="middle"
          font-size={size * 0.14}
          fill={tileType.textColor || '#ffffff'}
          font-family="system-ui, sans-serif"
          font-weight="600"
          letter-spacing="0.02em"
          style:user-select="none"
          style:text-transform="uppercase"
        >
          {tileType.label}
        </text>
      {/if}

      <!-- Number token (above icon) -->
      {#if numberToken !== null}
        <circle
          {cx}
          cy={cy - size * 0.2}
          r={size * 0.22}
          fill="rgba(255,255,255,0.92)"
          stroke="rgba(0,0,0,0.2)"
          stroke-width="1"
        />
        <text
          x={cx}
          y={cy - size * 0.2 + 1}
          text-anchor="middle"
          dominant-baseline="middle"
          font-size={size * 0.2}
          fill={numberColor}
          font-family="system-ui, sans-serif"
          font-weight="700"
          style:user-select="none"
        >
          {numberToken}
        </text>
      {/if}
    </g>
  {:else if isHovered}
    <!-- Empty hover indicator -->
    <text
      x={cx}
      y={cy + 4}
      text-anchor="middle"
      dominant-baseline="middle"
      font-size={size * 0.3}
      fill={shapeMode ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.3)'}
      style:user-select="none"
      style:pointer-events="none"
    >
      {shapeMode ? '−' : '+'}
    </text>
  {/if}

  <!-- Shape mode: show remove indicator on active tiles -->
  {#if shapeMode && isHovered}
    <polygon
      points={innerPoints}
      fill="rgba(239,68,68,0.15)"
      stroke="rgba(239,68,68,0.4)"
      stroke-width="1.5"
      stroke-dasharray="3,2"
      style:pointer-events="none"
    />
  {/if}
</g>

<style>
  .hex-tile {
    cursor: pointer;
  }

  .hex-tile:focus {
    outline: none;
  }
</style>
