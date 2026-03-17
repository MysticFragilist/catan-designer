<script>
  import {
    hexToPixel,
    hexKey,
    generateHexGrid,
    hexPolygonPoints,
    hexCorners,
    edgeMidpoint,
    canonicalEdgeKey,
    canonicalVertexKey
  } from '../core/hex.js';
  import {
    mapStore,
    activeTool,
    selectedTileType,
    selectedHex,
    hoveredHex,
    hoveredEdge,
    hoveredVertex,
    paletteCounts,
    placedCounts,
    tileMode
  } from '../stores/mapStore.js';
  import { registry } from '../core/registry.js';
  import { get } from 'svelte/store';
  import HexTile from './HexTile.svelte';

  let { hexSize = 52, orientation = 'flat' } = $props();

  // ── Pan, Zoom & Rotation ──────────────────────────────────────────
  let scale = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0 });
  let isPainting = $state(false);
  let isAnimating = $state(false);

  // Rotation persisted in mapStore so it survives save/load
  const rotation = $derived($mapStore.canvasRotation);

  function rotateLeft() {
    isAnimating = true;
    mapStore.setCanvasRotation(($mapStore.canvasRotation - 30 + 360) % 360);
    setTimeout(() => (isAnimating = false), 350);
  }

  function rotateRight() {
    isAnimating = true;
    mapStore.setCanvasRotation(($mapStore.canvasRotation + 30) % 360);
    setTimeout(() => (isAnimating = false), 350);
  }

  function resetView() {
    isAnimating = true;
    mapStore.setCanvasRotation(0);
    scale = 1;
    panX = 0;
    panY = 0;
    setTimeout(() => (isAnimating = false), 350);
  }

  let svgEl = $state(/** @type {SVGSVGElement | null} */ (null));

  // ── Grid data ─────────────────────────────────────────────────────

  /** Active hexes to render based on gridMode */
  const activeHexes = $derived(() => {
    const state = $mapStore;
    if (state.gridMode === 'custom') {
      return Array.from(state.customHexes).map((k) => {
        const [q, r] = k.split(',').map(Number);
        return { q, r };
      });
    }
    return generateHexGrid(state.gridRadius - 1);
  });

  /** Ghost hexes shown when shape tool is active (the hexes OUTSIDE the current grid) */
  const ghostHexes = $derived(() => {
    const state = $mapStore;
    if ($activeTool !== 'shape') return [];
    // Canvas is always 2 rings larger than the current grid extent
    const canvasRadius = Math.max(state.gridRadius - 1, 3) + 2;
    const all = generateHexGrid(canvasRadius);
    // Active keys = only the current grid (NOT the canvas), so ghosts fill the ring outside
    const activeKeys = new Set(
      state.gridMode === 'custom'
        ? Array.from(state.customHexes)
        : generateHexGrid(state.gridRadius - 1).map((h) => hexKey(h.q, h.r))
    );
    return all.filter((h) => !activeKeys.has(hexKey(h.q, h.r)));
  });

  /** Pixel positions for all active hexes */
  const hexPositions = $derived(
    activeHexes().map((h) => {
      const { x, y } = hexToPixel(h.q, h.r, hexSize, orientation);
      return { ...h, cx: x, cy: y };
    })
  );

  /** Ghost hex positions (for shape editing) */
  const ghostPositions = $derived(
    ghostHexes().map((h) => {
      const { x, y } = hexToPixel(h.q, h.r, hexSize, orientation);
      return { ...h, cx: x, cy: y };
    })
  );

  /** All unique edges derived from active hexes */
  const allEdges = $derived(() => {
    const edgeMap = new Map();
    for (const hex of hexPositions) {
      for (let edgeIndex = 0; edgeIndex < 6; edgeIndex++) {
        const key = canonicalEdgeKey(hex.q, hex.r, edgeIndex);
        if (!edgeMap.has(key)) {
          const mid = edgeMidpoint(hex.cx, hex.cy, hexSize, edgeIndex, orientation);
          edgeMap.set(key, { key, x: mid.x, y: mid.y, q: hex.q, r: hex.r, edgeIndex });
        }
      }
    }
    return Array.from(edgeMap.values());
  });

  /** All unique vertices derived from active hexes */
  const allVertices = $derived(() => {
    const vertexMap = new Map();
    for (const hex of hexPositions) {
      const corners = hexCorners(hex.cx, hex.cy, hexSize, orientation);
      for (let v = 0; v < 6; v++) {
        const key = canonicalVertexKey(hex.q, hex.r, v);
        if (!vertexMap.has(key)) {
          vertexMap.set(key, { key, x: corners[v].x, y: corners[v].y });
        }
      }
    }
    return Array.from(vertexMap.values());
  });

  // Is the selected tile type an edge tile?
  const isEdgeTileSelected = $derived(() => {
    const id = $selectedTileType;
    if (!id) return false;
    const tile = registry.getTile(id);
    return tile?.isEdgeTile === true;
  });

  // Is the selected tile type a vertex tile?
  const isVertexTileSelected = $derived(() => {
    const id = $selectedTileType;
    if (!id) return false;
    const tile = registry.getTile(id);
    return tile?.isVertexTile === true;
  });

  // Whether to show edge hit targets
  const showEdgeHitTargets = $derived(
    ($activeTool === 'paint' && isEdgeTileSelected()) || $activeTool === 'erase'
  );

  // Whether to show vertex hit targets
  const showVertexHitTargets = $derived(
    ($activeTool === 'paint' && isVertexTileSelected()) || $activeTool === 'erase'
  );

  // ── SVG ViewBox ────────────────────────────────────────────────────
  const viewBox = $derived(() => {
    const margin = hexSize * 2.5;
    const allPositions = [...hexPositions, ...($activeTool === 'shape' ? ghostPositions : [])];
    if (allPositions.length === 0) return '-200 -200 400 400';
    const xs = allPositions.map((h) => h.cx);
    const ys = allPositions.map((h) => h.cy);
    const minX = Math.min(...xs) - margin;
    const minY = Math.min(...ys) - margin;
    const maxX = Math.max(...xs) + margin;
    const maxY = Math.max(...ys) + margin;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  });

  // ── Count enforcement ─────────────────────────────────────────────

  /**
   * Returns true if placing `tileId` is allowed given current mode + counts.
   * In freeform mode: always true.
   * In locked mode: allowed if placed count < max, OR if overwriting the same
   * tile type (net count stays the same).
   * @param {string} tileId
   * @param {number} q
   * @param {number} r
   */
  function canPlace(tileId, q, r) {
    if (get(tileMode) === 'freeform') return true;
    const state = get(mapStore);
    const existingTile = state.tiles.get(hexKey(q, r));
    // Overwriting same tile type: net count unchanged — always OK
    if (existingTile?.tileTypeId === tileId) return true;
    const used = get(placedCounts).get(tileId) ?? 0;
    const max = get(paletteCounts).get(tileId) ?? Infinity;
    return used < max;
  }

  /**
   * Returns true if placing vertex token `tokenTypeId` on `vertexKey` is allowed.
   */
  function canPlaceVertex(tokenTypeId, vertexKey) {
    if (get(tileMode) === 'freeform') return true;
    const state = get(mapStore);
    const existing = state.vertexTokens.get(vertexKey);
    if (existing?.tokenTypeId === tokenTypeId) return true;
    const used = get(placedCounts).get(tokenTypeId) ?? 0;
    const max = get(paletteCounts).get(tokenTypeId) ?? Infinity;
    return used < max;
  }

  /**
   * Returns true if placing port `portTypeId` on `edgeKey` is allowed.
   */
  function canPlacePort(portTypeId, edgeKey) {
    if (get(tileMode) === 'freeform') return true;
    const state = get(mapStore);
    const existingEdge = state.portEdges.get(edgeKey);
    if (existingEdge?.portTypeId === portTypeId) return true;
    const used = get(placedCounts).get(portTypeId) ?? 0;
    const max = get(paletteCounts).get(portTypeId) ?? Infinity;
    return used < max;
  }

  // ── Hex interaction ───────────────────────────────────────────────

  function handleHexClick(q, r, event) {
    event.stopPropagation();
    const tool = get(activeTool);

    if (tool === 'shape') {
      // In shape mode, toggle the hex in/out of the custom grid
      const state = get(mapStore);
      if (state.gridMode !== 'custom') {
        mapStore.enableCustomGrid();
      }
      mapStore.toggleCustomHex(q, r);
      return;
    }

    if (tool === 'paint') {
      const tileId = get(selectedTileType);
      if (!tileId) return;
      const tile = registry.getTile(tileId);
      if (tile?.isEdgeTile || tile?.isVertexTile) return; // placed on edges/vertices, not hexes
      if (!canPlace(tileId, q, r)) return; // locked mode: quota exceeded
      mapStore.placeTile(q, r, tileId);
    } else if (tool === 'erase') {
      mapStore.removeTile(q, r);
    } else if (tool === 'select') {
      selectedHex.set({ q, r });
    } else if (tool === 'robber') {
      // Toggle: click same hex = clear robber, click new hex = move robber
      const state = get(mapStore);
      if (state.robberHex?.q === q && state.robberHex?.r === r) {
        mapStore.clearRobber();
      } else {
        mapStore.setRobber(q, r);
      }
    } else if (tool === 'pirate' && $mapStore.includePirate) {
      const state = get(mapStore);
      if (state.pirateHex?.q === q && state.pirateHex?.r === r) {
        mapStore.clearPirate();
      } else {
        mapStore.setPirate(q, r);
      }
    } else if (tool === 'number') {
      const key = hexKey(q, r);
      const state = get(mapStore);
      const tile = state.tiles.get(key);
      if (tile) {
        const tokens = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, null];
        const currentIdx = tokens.indexOf(tile.number ?? null);
        const next = tokens[(currentIdx + 1) % tokens.length];
        mapStore.setNumberToken(q, r, next);
      }
    }
  }

  function handleHexContextMenu(q, r, event) {
    event.preventDefault();
    mapStore.removeTile(q, r);
  }

  function handleHexMouseEnter(q, r) {
    hoveredHex.set({ q, r });
    if (isPainting) {
      const tool = get(activeTool);
      if (tool === 'paint') {
        const tileId = get(selectedTileType);
        const tile = tileId ? registry.getTile(tileId) : null;
        if (tileId && !tile?.isEdgeTile && !tile?.isVertexTile && canPlace(tileId, q, r))
          mapStore.placeTile(q, r, tileId);
      } else if (tool === 'erase') {
        mapStore.removeTile(q, r);
      } else if (tool === 'shape') {
        // drag to add hexes in shape mode
        const state = get(mapStore);
        if (state.gridMode !== 'custom') mapStore.enableCustomGrid();
        const key = hexKey(q, r);
        if (!state.customHexes.has(key)) mapStore.toggleCustomHex(q, r);
      }
    }
  }

  function handleGhostHexClick(q, r) {
    const state = get(mapStore);
    if (state.gridMode !== 'custom') mapStore.enableCustomGrid();
    mapStore.toggleCustomHex(q, r);
  }

  function handleGhostHexMouseEnter(q, r) {
    if (isPainting) {
      const state = get(mapStore);
      if (state.gridMode !== 'custom') mapStore.enableCustomGrid();
      const key = hexKey(q, r);
      if (!state.customHexes.has(key)) mapStore.toggleCustomHex(q, r);
    }
  }

  // ── Edge interaction ──────────────────────────────────────────────

  function handleEdgeClick(edgeKey, event) {
    event.stopPropagation();
    const tool = get(activeTool);

    if (tool === 'paint') {
      const tileId = get(selectedTileType);
      if (!tileId) return;
      const tile = registry.getTile(tileId);
      if (!tile?.isEdgeTile) return;
      if (!canPlacePort(tileId, edgeKey)) return; // locked mode: quota exceeded
      mapStore.placePortEdge(edgeKey, tileId);
    } else if (tool === 'erase') {
      mapStore.removePortEdge(edgeKey);
    }
  }

  function handleEdgeContextMenu(edgeKey, event) {
    event.preventDefault();
    mapStore.removePortEdge(edgeKey);
  }

  // ── Vertex interaction ────────────────────────────────────────────

  function handleVertexClick(vertexKey, event) {
    event.stopPropagation();
    const tool = get(activeTool);
    if (tool === 'paint') {
      const tileId = get(selectedTileType);
      if (!tileId) return;
      const tile = registry.getTile(tileId);
      if (!tile?.isVertexTile) return;
      if (!canPlaceVertex(tileId, vertexKey)) return;
      mapStore.placeVertexToken(vertexKey, tileId);
    } else if (tool === 'erase') {
      mapStore.removeVertexToken(vertexKey);
    }
  }

  function handleVertexContextMenu(vertexKey, event) {
    event.preventDefault();
    mapStore.removeVertexToken(vertexKey);
  }

  // ── Canvas pan/zoom ────────────────────────────────────────────────

  function handleMouseDown(event) {
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      isPanning = true;
      panStart = { x: event.clientX - panX, y: event.clientY - panY };
      event.preventDefault();
    } else if (event.button === 0) {
      isPainting = true;
    }
  }

  function handleMouseMove(event) {
    if (isPanning) {
      panX = event.clientX - panStart.x;
      panY = event.clientY - panStart.y;
    }
  }

  function handleMouseUp() {
    isPanning = false;
    isPainting = false;
  }

  function handleWheel(event) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.min(Math.max(scale * delta, 0.3), 4);
  }

  function handleKeydown(event) {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === 'q' || event.key === 'Q') rotateLeft();
    if (event.key === 'w' || event.key === 'W') rotateRight();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="grid-container"
  role="presentation"
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseUp}
  onwheel={handleWheel}
  style:cursor={isPanning ? 'grabbing' : $activeTool === 'shape' ? 'cell' : 'default'}
>
  <svg
    bind:this={svgEl}
    viewBox={viewBox()}
    preserveAspectRatio="xMidYMid meet"
    style:transform="rotate({rotation}deg) scale({scale}) translate({panX / scale}px, {panY / scale}px)"
    style:transform-origin="center"
    style:transition={isAnimating ? 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'}
  >
    <defs>
      <filter id="port-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    <!-- Ghost hexes (shape editing) -->
    {#if $activeTool === 'shape'}
      {#each ghostPositions as hex (hexKey(hex.q, hex.r))}
        <polygon
          points={hexPolygonPoints(hex.cx, hex.cy, hexSize - 1, orientation)}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.10)"
          stroke-width="1"
          stroke-dasharray="4,4"
          style:cursor="cell"
          role="button"
          tabindex="0"
          aria-label="Add hex to map"
          onclick={() => handleGhostHexClick(hex.q, hex.r)}
          onkeydown={(e) => e.key === 'Enter' && handleGhostHexClick(hex.q, hex.r)}
          onmouseenter={() => handleGhostHexMouseEnter(hex.q, hex.r)}
        />
      {/each}
    {/if}

    <!-- Active hex tiles -->
    {#each hexPositions as hex (hexKey(hex.q, hex.r))}
      {@const key = hexKey(hex.q, hex.r)}
      {@const placed = $mapStore.tiles.get(key)}
      {@const tileType = placed ? registry.getTile(placed.tileTypeId) : null}
      {@const isHovered = $hoveredHex?.q === hex.q && $hoveredHex?.r === hex.r}
      {@const isSelected = $selectedHex?.q === hex.q && $selectedHex?.r === hex.r}
      {@const isShapeMode = $activeTool === 'shape'}

      <HexTile
        q={hex.q}
        r={hex.r}
        cx={hex.cx}
        cy={hex.cy}
        size={hexSize}
        {tileType}
        rotation={placed?.rotation ?? 0}
        number={placed?.number ?? null}
        {isHovered}
        {isSelected}
        {orientation}
        shapeMode={isShapeMode}
        canvasRotation={rotation}
        onclick={(e) => handleHexClick(hex.q, hex.r, e)}
        onmouseenter={() => handleHexMouseEnter(hex.q, hex.r)}
        onmouseleave={() => hoveredHex.set(null)}
        oncontextmenu={(e) => handleHexContextMenu(hex.q, hex.r, e)}
      />
    {/each}

    <!-- Edge layer: hit targets + placed ports -->
    {#each allEdges() as edge}
      {@const portEdge = $mapStore.portEdges.get(edge.key)}
      {@const portType = portEdge ? registry.getTile(portEdge.portTypeId) : null}
      {@const isHoveredEdge = $hoveredEdge === edge.key}

      {#if portType}
        <!-- Placed port badge -->
        <g
          class="edge-port"
          onclick={(e) => handleEdgeClick(edge.key, e)}
          oncontextmenu={(e) => handleEdgeContextMenu(edge.key, e)}
          onmouseenter={() => hoveredEdge.set(edge.key)}
          onmouseleave={() => hoveredEdge.set(null)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Delete' && mapStore.removePortEdge(edge.key)}
        >
          <!-- Glow ring when hovered -->
          {#if isHoveredEdge}
            <circle
              cx={edge.x}
              cy={edge.y}
              r={hexSize * 0.28}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              stroke-width="2"
            />
          {/if}
          <!-- Port circle -->
          <circle
            cx={edge.x}
            cy={edge.y}
            r={hexSize * 0.22}
            fill={portType.color}
            stroke="rgba(255,255,255,0.3)"
            stroke-width="1.5"
          />
          <!-- Port icon + label (counter-rotated to stay horizontal) -->
          <g transform="rotate({-rotation}, {edge.x}, {edge.y})" style:pointer-events="none">
            <text
              x={edge.x}
              y={edge.y + 1}
              text-anchor="middle"
              dominant-baseline="middle"
              font-size={hexSize * 0.18}
              style:user-select="none">{portType.icon || '⚓'}</text
            >
            {#if isHoveredEdge}
              <text
                x={edge.x}
                y={edge.y + hexSize * 0.32}
                text-anchor="middle"
                dominant-baseline="middle"
                font-size={hexSize * 0.1}
                fill={portType.textColor || '#fff'}
                font-weight="600"
                style:user-select="none">{portType.label}</text
              >
            {/if}
          </g>
        </g>
      {:else if showEdgeHitTargets}
        <!-- Empty edge hit target (shown when port tool selected or erasing) -->
        <circle
          class="edge-hit"
          cx={edge.x}
          cy={edge.y}
          r={hexSize * 0.18}
          fill={isHoveredEdge ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.06)'}
          stroke={isHoveredEdge ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.12)'}
          stroke-width="1"
          style:cursor="pointer"
          role="button"
          tabindex="0"
          aria-label="Place port on edge"
          onclick={(e) => handleEdgeClick(edge.key, e)}
          onkeydown={(e) => e.key === 'Enter' && handleEdgeClick(edge.key, e)}
          oncontextmenu={(e) => handleEdgeContextMenu(edge.key, e)}
          onmouseenter={() => hoveredEdge.set(edge.key)}
          onmouseleave={() => hoveredEdge.set(null)}
        />
      {/if}
    {/each}

    <!-- Vertex layer: hit targets + placed village tokens -->
    {#each allVertices() as vertex}
      {@const vt = $mapStore.vertexTokens.get(vertex.key)}
      {@const tokenType = vt ? registry.getTile(vt.tokenTypeId) : null}
      {@const isHoveredVertex = $hoveredVertex === vertex.key}

      {#if tokenType}
        <!-- Placed vertex token -->
        <g
          class="vertex-token"
          onclick={(e) => handleVertexClick(vertex.key, e)}
          oncontextmenu={(e) => handleVertexContextMenu(vertex.key, e)}
          onmouseenter={() => hoveredVertex.set(vertex.key)}
          onmouseleave={() => hoveredVertex.set(null)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Delete' && mapStore.removeVertexToken(vertex.key)}
        >
          {#if isHoveredVertex}
            <circle
              cx={vertex.x}
              cy={vertex.y}
              r={hexSize * 0.2}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              stroke-width="1.5"
            />
          {/if}
          <circle
            cx={vertex.x}
            cy={vertex.y}
            r={hexSize * 0.15}
            fill={tokenType.color}
            stroke="rgba(255,255,255,0.4)"
            stroke-width="1.5"
          />
          <!-- Icon + label counter-rotated to stay horizontal -->
          <g transform="rotate({-rotation}, {vertex.x}, {vertex.y})" style:pointer-events="none">
            <text
              x={vertex.x}
              y={vertex.y + 1}
              text-anchor="middle"
              dominant-baseline="middle"
              font-size={hexSize * 0.12}
              style:user-select="none">{tokenType.icon || '🏘️'}</text
            >
            {#if isHoveredVertex}
              <text
                x={vertex.x}
                y={vertex.y + hexSize * 0.24}
                text-anchor="middle"
                dominant-baseline="middle"
                font-size={hexSize * 0.09}
                fill={tokenType.textColor || '#fff'}
                font-weight="600"
                style:user-select="none">{tokenType.label}</text
              >
            {/if}
          </g>
        </g>
      {:else if showVertexHitTargets}
        <!-- Empty vertex hit target -->
        <circle
          class="vertex-hit"
          cx={vertex.x}
          cy={vertex.y}
          r={hexSize * 0.12}
          fill={isHoveredVertex ? 'rgba(200,169,126,0.35)' : 'rgba(255,255,255,0.05)'}
          stroke={isHoveredVertex ? 'rgba(200,169,126,0.8)' : 'rgba(255,255,255,0.1)'}
          stroke-width="1"
          style:cursor="pointer"
          role="button"
          tabindex="0"
          aria-label="Place token on vertex"
          onclick={(e) => handleVertexClick(vertex.key, e)}
          onkeydown={(e) => e.key === 'Enter' && handleVertexClick(vertex.key, e)}
          oncontextmenu={(e) => handleVertexContextMenu(vertex.key, e)}
          onmouseenter={() => hoveredVertex.set(vertex.key)}
          onmouseleave={() => hoveredVertex.set(null)}
        />
      {/if}
    {/each}

    <!-- Robber marker -->
    {#if $mapStore.robberHex}
      {@const rh = $mapStore.robberHex}
      {@const rp = hexToPixel(rh.q, rh.r, hexSize, orientation)}
      <g style:pointer-events="none" style:user-select="none">
        <circle
          cx={rp.x}
          cy={rp.y}
          r={hexSize * 0.32}
          fill="rgba(30,0,0,0.75)"
          stroke="rgba(220,38,38,0.9)"
          stroke-width="2"
        />
        <g transform="rotate({-rotation}, {rp.x}, {rp.y})">
          <text
            x={rp.x}
            y={rp.y + 1}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size={hexSize * 0.28}>🏴</text
          >
        </g>
      </g>
    {/if}

    <!-- Pirate marker -->
    {#if $mapStore.pirateHex && $mapStore.includePirate}
      {@const ph = $mapStore.pirateHex}
      {@const pp = hexToPixel(ph.q, ph.r, hexSize, orientation)}
      <g style:pointer-events="none" style:user-select="none">
        <circle
          cx={pp.x}
          cy={pp.y}
          r={hexSize * 0.32}
          fill="rgba(10,0,30,0.82)"
          stroke="rgba(139,92,246,0.9)"
          stroke-width="2"
        />
        <g transform="rotate({-rotation}, {pp.x}, {pp.y})">
          <text
            x={pp.x}
            y={pp.y + 1}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size={hexSize * 0.28}>☠️</text
          >
        </g>
      </g>
    {/if}
  </svg>

  <!-- Canvas controls (rotation + zoom) -->
  <div class="canvas-controls">
    <button class="ctrl-btn" onclick={rotateLeft} title="Rotate left 60° (Q)">↺</button>
    <span class="ctrl-label">{rotation}°</span>
    <button class="ctrl-btn" onclick={rotateRight} title="Rotate right 60° (W)">↻</button>
    <div class="ctrl-divider"></div>
    <button
      class="ctrl-btn"
      onclick={() => (scale = Math.max(scale / 1.25, 0.3))}
      title="Zoom out">−</button
    >
    <span class="ctrl-label">{Math.round(scale * 100)}%</span>
    <button
      class="ctrl-btn"
      onclick={() => (scale = Math.min(scale * 1.25, 4))}
      title="Zoom in">+</button
    >
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn" onclick={resetView} title="Reset view">⌂</button>
  </div>

  <!-- Shape mode overlay hint -->
  {#if $activeTool === 'shape'}
    <div class="shape-hint">
      <span>✏️ Shape mode — click hexes to add/remove from map</span>
      <button
        onclick={() => {
          activeTool.set('paint');
        }}>Done</button
      >
    </div>
  {/if}
</div>

<style>
  .grid-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .edge-port {
    cursor: pointer;
  }

  .edge-hit {
    transition:
      fill 0.1s,
      stroke 0.1s;
  }

  .vertex-token {
    cursor: pointer;
  }

  .vertex-hit {
    transition:
      fill 0.1s,
      stroke 0.1s;
  }

  .canvas-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 2px;
    background: rgba(10, 10, 24, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 5px 10px;
    backdrop-filter: blur(8px);
    pointer-events: all;
    user-select: none;
  }

  .ctrl-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.65);
    font-size: 15px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, color 0.1s;
    padding: 0;
    line-height: 1;
  }

  .ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }

  .ctrl-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.35);
    min-width: 28px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .ctrl-divider {
    width: 1px;
    height: 16px;
    background: rgba(255, 255, 255, 0.1);
    margin: 0 4px;
  }

  .shape-hint {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(10, 10, 24, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 24px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(8px);
    pointer-events: all;
  }

  .shape-hint button {
    background: rgba(99, 102, 241, 0.4);
    border: 1px solid rgba(99, 102, 241, 0.6);
    border-radius: 12px;
    color: #fff;
    font-size: 11px;
    padding: 4px 12px;
    cursor: pointer;
    transition: background 0.1s;
  }

  .shape-hint button:hover {
    background: rgba(99, 102, 241, 0.65);
  }
</style>
