<script>
  import { tileListStore } from '../core/registry.js';
  import {
    selectedTileType,
    activeTool,
    paletteCounts,
    placedCounts,
    tileMode
  } from '../stores/mapStore.js';

  const tilesByCategory = $derived(() => {
    const groups = new Map();
    for (const tile of $tileListStore) {
      const cat = tile.category || 'General';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(tile);
    }
    return groups;
  });

  const categories = $derived(Array.from(tilesByCategory().keys()));

  /** Compute per-tile stats from reactive stores */
  function getTileStats(tileId) {
    const max = $paletteCounts.get(tileId) ?? 1;
    const used = $placedCounts.get(tileId) ?? 0;
    const remaining = Math.max(0, max - used);
    const pct = max > 0 ? used / max : 0;
    const exhausted = $tileMode === 'locked' && used >= max;
    return { max, used, remaining, pct, exhausted };
  }

  let open = $state(true);

  function selectTile(tile) {
    const stats = getTileStats(tile.id);
    // In lock mode, don't select exhausted tiles
    if (stats.exhausted) return;
    selectedTileType.set(tile.id);
    activeTool.set('paint');
  }

  function adjustMax(tileId, delta) {
    paletteCounts.update((counts) => {
      const current = counts.get(tileId) ?? 1;
      const next = Math.max(0, current + delta);
      const newCounts = new Map(counts);
      newCounts.set(tileId, next);
      return newCounts;
    });
  }

  /** Color for the usage bar / fraction */
  function usageColor(pct) {
    if (pct <= 0) return 'rgba(255,255,255,0.25)';
    if (pct < 0.5) return '#4ade80'; // green
    if (pct < 0.85) return '#facc15'; // yellow
    return '#f87171'; // red
  }
</script>

<aside class="palette" class:collapsed={!open}>
  <button class="palette-header" onclick={() => (open = !open)}>
    <span class="palette-title">Tiles</span>
    <span class="header-right">
      <span class="lock-hint">
        {#if $tileMode === 'locked'}🔒{:else}🔓{/if}
      </span>
      <span class="chevron" class:open>›</span>
    </span>
  </button>

  {#if open}
  <div class="palette-content">
    {#if $tileListStore.length === 0}
      <p class="empty-state">No tiles loaded…</p>
    {:else}
      {#each categories as category}
        {@const tiles = tilesByCategory().get(category) ?? []}
        <div class="category">
          <h3 class="category-title">{category}</h3>
          <div class="tile-list">
            {#each tiles as tile}
              {@const stats = getTileStats(tile.id)}
              <div
                class="tile-item"
                class:active={$selectedTileType === tile.id}
                class:edge-tile={tile.isEdgeTile}
                class:exhausted={stats.exhausted}
                onclick={() => selectTile(tile)}
                role="button"
                tabindex={stats.exhausted ? -1 : 0}
                aria-disabled={stats.exhausted}
                onkeydown={(e) => e.key === 'Enter' && !stats.exhausted && selectTile(tile)}
              >
                <div
                  class="tile-swatch"
                  style="background: {tile.color}; opacity: {stats.exhausted ? 0.4 : 1}"
                >
                  <span class="tile-icon">{tile.icon || ''}</span>
                  {#if tile.isEdgeTile}
                    <span class="edge-badge">◇</span>
                  {/if}
                </div>

                <div class="tile-info">
                  <div class="tile-name-row">
                    <span class="tile-label">{tile.label}</span>
                    {#if stats.exhausted}
                      <span class="exhausted-badge">FULL</span>
                    {/if}
                  </div>

                  <!-- Usage bar -->
                  <div class="usage-bar-track">
                    <div
                      class="usage-bar-fill"
                      style="width: {Math.min(stats.pct * 100, 100)}%; background: {usageColor(
                        stats.pct
                      )};"
                    ></div>
                  </div>

                  <!-- Count control -->
                  <div class="tile-count-row">
                    <button
                      class="count-btn"
                      onclick={(e) => {
                        e.stopPropagation();
                        adjustMax(tile.id, -1);
                      }}
                      aria-label="Decrease max">−</button
                    >

                    <span class="count-display" style="color: {usageColor(stats.pct)}">
                      {stats.used}<span class="count-sep">/</span>{stats.max}
                    </span>

                    <button
                      class="count-btn"
                      onclick={(e) => {
                        e.stopPropagation();
                        adjustMax(tile.id, 1);
                      }}
                      aria-label="Increase max">+</button
                    >

                    {#if $tileMode === 'locked' && stats.remaining > 0}
                      <span class="remaining-hint">{stats.remaining} left</span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
  {/if}
</aside>

<style>
  .palette {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .palette.collapsed {
    flex: 0 0 auto;
  }

  .palette-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    color: rgba(255, 255, 255, 0.4);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    transition: color 0.15s;
    flex-shrink: 0;
  }

  .palette-header:hover {
    color: rgba(255, 255, 255, 0.7);
  }

  .palette-title {
    color: rgba(255, 255, 255, 0.4);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .lock-hint {
    font-size: 11px;
    opacity: 0.6;
  }

  .chevron {
    font-size: 14px;
    font-weight: 400;
    transition: transform 0.2s;
    transform: rotate(90deg);
    display: inline-block;
    color: rgba(255, 255, 255, 0.3);
  }

  .chevron.open {
    transform: rotate(-90deg);
  }

  .palette-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }

  .empty-state {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
    text-align: center;
    padding: 24px 16px;
    margin: 0;
  }

  .category {
    margin-bottom: 2px;
  }

  .category-title {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 8px 16px 4px;
    margin: 0;
  }

  .tile-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px;
  }

  .tile-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 7px 8px;
    border-radius: 8px;
    cursor: pointer;
    transition:
      background 0.1s,
      opacity 0.15s;
    border: 1px solid transparent;
  }

  .tile-item:hover:not(.exhausted) {
    background: rgba(255, 255, 255, 0.06);
  }

  .tile-item.active {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .tile-item.edge-tile {
    border-style: dashed;
    border-color: rgba(255, 255, 255, 0.06);
  }

  .tile-item.edge-tile.active {
    border-color: rgba(251, 191, 36, 0.5);
    background: rgba(251, 191, 36, 0.08);
  }

  /* Exhausted tile: dimmed + no-drop cursor */
  .tile-item.exhausted {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .tile-swatch {
    width: 36px;
    height: 36px;
    min-width: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    position: relative;
    transition: opacity 0.15s;
  }

  .tile-icon {
    font-size: 18px;
    line-height: 1;
  }

  .edge-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 9px;
    color: #fbbf24;
  }

  .tile-info {
    flex: 1;
    min-width: 0;
    padding-top: 1px;
  }

  .tile-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    margin-bottom: 4px;
  }

  .tile-label {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .exhausted-badge {
    font-size: 9px;
    font-weight: 700;
    color: #f87171;
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  /* Usage progress bar */
  .usage-bar-track {
    height: 2px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 1px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .usage-bar-fill {
    height: 100%;
    border-radius: 1px;
    transition:
      width 0.2s ease,
      background 0.2s ease;
  }

  /* Count row */
  .tile-count-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .count-btn {
    width: 16px;
    height: 16px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.1s;
    flex-shrink: 0;
  }

  .count-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .count-display {
    font-size: 11px;
    font-weight: 700;
    min-width: 28px;
    text-align: center;
    transition: color 0.2s;
  }

  .count-sep {
    color: rgba(255, 255, 255, 0.3);
    font-weight: 400;
    margin: 0 1px;
  }

  .remaining-hint {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.3);
    margin-left: 2px;
    white-space: nowrap;
  }
</style>
