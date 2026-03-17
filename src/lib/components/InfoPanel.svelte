<script>
  import { selectedHex, mapStore, activeTool } from '../stores/mapStore.js';
  import { registry } from '../core/registry.js';
  import { hexKey } from '../core/hex.js';
  import { get } from 'svelte/store';

  const selectedTile = $derived(() => {
    const hex = $selectedHex;
    if (!hex) return null;
    const key = hexKey(hex.q, hex.r);
    const placed = $mapStore.tiles.get(key);
    if (!placed) return null;
    return { ...placed, tileType: registry.getTile(placed.tileTypeId) };
  });

  const NUMBER_TOKENS = [null, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

  function setNumber(n) {
    if (!$selectedHex) return;
    mapStore.setNumberToken($selectedHex.q, $selectedHex.r, n);
  }

  function rotateTile() {
    if (!$selectedHex) return;
    mapStore.rotateTile($selectedHex.q, $selectedHex.r);
  }

  function removeTile() {
    if (!$selectedHex) return;
    mapStore.removeTile($selectedHex.q, $selectedHex.r);
    selectedHex.set(null);
  }
</script>

{#if $selectedHex && $activeTool === 'select'}
  <div class="info-panel">
    <div class="panel-header">
      <h3>Hex {$selectedHex.q}, {$selectedHex.r}</h3>
      <button class="close-btn" onclick={() => selectedHex.set(null)}>✕</button>
    </div>

    {#if selectedTile()}
      {@const tile = selectedTile()}
      <div class="tile-preview" style="background: {tile.tileType?.color};">
        <span class="preview-icon">{tile.tileType?.icon || ''}</span>
        <span class="preview-label" style="color: {tile.tileType?.textColor}"
          >{tile.tileType?.label}</span
        >
      </div>

      <!-- Number token selector -->
      <div class="section">
        <span class="section-label">Number Token</span>
        <div class="token-grid">
          {#each NUMBER_TOKENS as n}
            <button
              class="token-btn"
              class:active={tile.number === n}
              class:red={n === 6 || n === 8}
              onclick={() => setNumber(n)}
            >
              {n ?? '—'}
            </button>
          {/each}
        </div>
      </div>

      <!-- Rotation -->
      <div class="section">
        <span class="section-label">Rotation</span>
        <button class="action-btn" onclick={rotateTile}>↻ Rotate 60°</button>
      </div>

      <!-- Remove -->
      <button class="remove-btn" onclick={removeTile}>🗑️ Remove Tile</button>
    {:else}
      <p class="empty-msg">No tile at this position.<br />Switch to Paint mode to add one.</p>
    {/if}
  </div>
{/if}

<style>
  .info-panel {
    position: absolute;
    right: 16px;
    top: 72px;
    width: 200px;
    background: rgba(10, 10, 24, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .panel-header h3 {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 4px;
    transition: color 0.1s;
  }

  .close-btn:hover {
    color: #fff;
  }

  .tile-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .preview-icon {
    font-size: 20px;
  }

  .preview-label {
    font-size: 13px;
    font-weight: 600;
  }

  .section {
    margin-bottom: 12px;
  }

  .section-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }

  .token-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }

  .token-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 5px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    font-weight: 600;
    padding: 5px 2px;
    cursor: pointer;
    transition: all 0.1s;
    text-align: center;
  }

  .token-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .token-btn.active {
    background: rgba(99, 102, 241, 0.4);
    border-color: rgba(99, 102, 241, 0.7);
    color: #fff;
  }

  .token-btn.red {
    color: #f87171;
  }

  .token-btn.red.active {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.6);
  }

  .action-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    padding: 6px 12px;
    cursor: pointer;
    width: 100%;
    transition: all 0.1s;
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }

  .remove-btn {
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.2);
    border-radius: 6px;
    color: #fca5a5;
    font-size: 12px;
    padding: 6px 12px;
    cursor: pointer;
    width: 100%;
    transition: all 0.1s;
    margin-top: 4px;
  }

  .remove-btn:hover {
    background: rgba(220, 38, 38, 0.2);
  }

  .empty-msg {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
    text-align: center;
    line-height: 1.5;
    padding: 8px 0;
    margin: 0;
  }
</style>
