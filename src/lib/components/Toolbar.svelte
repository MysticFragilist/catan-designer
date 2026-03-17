<script>
  import { activeTool, mapStore, tileMode, initPaletteCounts, paletteCounts } from '../stores/mapStore.js';
  import { registry } from '../core/registry.js';
  import { generateHexGrid } from '../core/hex.js';
  import { get } from 'svelte/store';
  import ConfirmModal from './ConfirmModal.svelte';

  const MAIN_TOOLS = [
    { id: 'paint', icon: '🖌️', label: 'Paint', shortcut: 'P' },
    { id: 'select', icon: '🖱️', label: 'Select', shortcut: 'S' },
    { id: 'shape', icon: '✏️', label: 'Shape', shortcut: 'G' }
  ];

  let {
    mapName = $bindable(''),
    gridRadius = $bindable(3),
    saveStatus = 'idle',
    onsave = () => {},
    onhome = () => {}
  } = $props();

  const gridModeLabel = $derived($mapStore.gridMode === 'custom' ? 'custom' : `r=${gridRadius}`);

  const MARKER_SHORTCUTS = [
    { id: 'robber', shortcut: 'R' },
    { id: 'pirate', shortcut: 'T' }
  ];

  function handleExport() {
    const state = get(mapStore);
    const activeExtensions = registry
      .getExtensions()
      .filter((e) => registry.isExtensionActive(e.id))
      .map((e) => e.id);
    const json = mapStore.exportJSON(state, activeExtensions);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.name || 'catan-map'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = /** @type {HTMLInputElement} */ (e.target)?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        const json = re.target?.result;
        if (typeof json !== 'string') return;
        const { extensions } = mapStore.importJSON(json);
        for (const extId of extensions) {
          if (!registry.isExtensionActive(extId)) registry.activateExtension(extId);
        }
        initPaletteCounts(registry.getAllTiles(), registry.getActiveCountModifiers());
      };
      reader.readAsText(file);
    };
    input.click();
  }

  let showClearConfirm = $state(false);

  function handleClear() {
    mapStore.clearAll();
  }

  function handleKeydown(e) {
    if (e.target instanceof HTMLInputElement) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onsave();
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    const allTools = [...MAIN_TOOLS, ...MARKER_SHORTCUTS];
    const tool = allTools.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
    if (tool) activeTool.set(tool.id);
  }

  const saveLabel = $derived(
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save'
  );

  // ── Settings menu ─────────────────────────────────────────────────
  let settingsOpen = $state(false);
  let settingsMenuPos = $state({ left: 0, top: 0 });
  let settingsBtnEl = $state(/** @type {HTMLButtonElement | null} */ (null));

  function openSettings() {
    if (settingsBtnEl) {
      const rect = settingsBtnEl.getBoundingClientRect();
      settingsMenuPos = { left: rect.right - 220, top: rect.bottom + 6 };
    }
    settingsOpen = !settingsOpen;
  }

  function handleSaveFromSettings() {
    settingsOpen = false;
    onsave();
  }

  function handleImportFromSettings() {
    settingsOpen = false;
    handleImport();
  }

  function handleExportFromSettings() {
    settingsOpen = false;
    handleExport();
  }

  function handleClearFromSettings() {
    settingsOpen = false;
    showClearConfirm = true;
  }

  // ── Generation menu ───────────────────────────────────────────────
  let generationOpen = $state(false);
  let genMenuPos = $state({ left: 0, top: 0 });
  let genBtnEl = $state(/** @type {HTMLButtonElement | null} */ (null));

  const NON_NUMBER_TILES = new Set(['sea', 'desert', 'fog', 'pirate-lair']);
  const DICE_NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

  function openGeneration() {
    if (genBtnEl) {
      const rect = genBtnEl.getBoundingClientRect();
      genMenuPos = { left: rect.right - 220, top: rect.bottom + 6 };
    }
    generationOpen = !generationOpen;
  }

  function generateRandomNumbers() {
    const state = get(mapStore);
    for (const tile of state.tiles.values()) {
      if (NON_NUMBER_TILES.has(tile.tileTypeId)) continue;
      const num = DICE_NUMBERS[Math.floor(Math.random() * DICE_NUMBERS.length)];
      mapStore.setNumberToken(tile.q, tile.r, num);
    }
    generationOpen = false;
  }

  // ── Random map generation ─────────────────────────────────────────
  const SEA_TILES = new Set(['sea']);

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateRandomMap() {
    const state = get(mapStore);

    // Get all active hexes (works for both auto and custom grids)
    const hexList =
      state.gridMode === 'custom'
        ? Array.from(state.customHexes).map((k) => {
            const [q, r] = k.split(',').map(Number);
            return { q, r };
          })
        : generateHexGrid(state.gridRadius - 1);

    // Build resource pool from palette counts (skip sea and edge/vertex tiles)
    const counts = get(paletteCounts);
    const pool = [];
    for (const tile of registry.getAllTiles()) {
      if (tile.isEdgeTile || tile.isVertexTile || SEA_TILES.has(tile.id)) continue;
      const count = counts.get(tile.id) ?? 0;
      for (let i = 0; i < count; i++) pool.push(tile.id);
    }

    shuffle(pool);
    shuffle(hexList);

    mapStore.clearAll();
    for (let i = 0; i < hexList.length; i++) {
      // Resources first, fill remainder with sea
      const tileId = i < pool.length ? pool[i] : 'sea';
      mapStore.placeTile(hexList[i].q, hexList[i].r, tileId);
    }
    generationOpen = false;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<header class="toolbar">
  <!-- Back to home + map name -->
  <div class="toolbar-section">
    <button class="home-btn" onclick={onhome} title="Back to map list">🏝️</button>
    <input
      class="map-name-input"
      type="text"
      bind:value={mapName}
      onchange={() => mapStore.setName(mapName)}
      placeholder="Map name…"
      aria-label="Map name"
    />
  </div>

  <div class="toolbar-divider"></div>

  <!-- Main tools -->
  <div class="toolbar-section">
    {#each MAIN_TOOLS as tool}
      <button
        class="tool-btn"
        class:active={$activeTool === tool.id}
        class:shape-active={tool.id === 'shape' && $activeTool === 'shape'}
        onclick={() => activeTool.set(tool.id)}
        title="{tool.label} ({tool.shortcut})"
      >
        <span>{tool.icon}</span>
        <span class="tool-label">{tool.label}</span>
      </button>
    {/each}
  </div>

  <!-- Grid size — only shown when shape tool is active -->
  {#if $activeTool === 'shape'}
    <div class="toolbar-divider"></div>
    {#if $mapStore.gridMode === 'auto'}
      <div class="toolbar-section">
        <label class="grid-label">
          <span>Grid</span>
          <input
            type="range"
            min="1"
            max="7"
            bind:value={gridRadius}
            onchange={() => mapStore.setGridRadius(gridRadius)}
            class="grid-slider"
          />
          <span class="grid-value">{gridModeLabel}</span>
        </label>
      </div>
    {:else}
      <div class="toolbar-section">
        <span class="grid-custom-badge">✏️ Custom</span>
        <button
          class="action-btn"
          onclick={() => {
            mapStore.disableCustomGrid();
            activeTool.set('paint');
          }}
          title="Reset to auto grid">Reset shape</button
        >
      </div>
    {/if}
  {/if}

  <!-- Generation + Settings — float at far right -->
  <button
    bind:this={genBtnEl}
    class="float-btn generation-btn"
    class:open={generationOpen}
    onclick={openGeneration}
    title="Generation tools"
    style="right: 50px"
  >
    Generate
  </button>
  <button
    bind:this={settingsBtnEl}
    class="float-btn settings-btn"
    class:open={settingsOpen}
    onclick={openSettings}
    title="Settings"
    aria-label="Settings"
  >
    ⚙️
  </button>
</header>

{#if generationOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="generation-backdrop" onclick={() => (generationOpen = false)}></div>
  <div class="generation-menu" style="left: {genMenuPos.left}px; top: {genMenuPos.top}px;">
    <button class="gen-item" onclick={generateRandomNumbers}>
      <span class="gen-icon">🎲</span>
      <div class="gen-info">
        <span class="gen-label">Random Numbers</span>
        <span class="gen-desc">Assign dice numbers to all resource tiles</span>
      </div>
    </button>
    <button class="gen-item" onclick={generateRandomMap}>
      <span class="gen-icon">🗺️</span>
      <div class="gen-info">
        <span class="gen-label">Random Map</span>
        <span class="gen-desc">Place resources randomly, fill remainder with sea</span>
      </div>
    </button>
  </div>
{/if}

{#if showClearConfirm}
  <ConfirmModal
    title="Clear map"
    message="This will remove all placed tiles and ports. This cannot be undone."
    confirmLabel="Clear"
    danger={true}
    onconfirm={() => { handleClear(); showClearConfirm = false; }}
    oncancel={() => (showClearConfirm = false)}
  />
{/if}

{#if settingsOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="settings-backdrop" onclick={() => (settingsOpen = false)}></div>
  <div class="settings-menu" style="left: {settingsMenuPos.left}px; top: {settingsMenuPos.top}px;">
    <!-- Lock / Freeform toggle row -->
    <button
      class="gen-item lock-item"
      class:lock-active={$tileMode === 'locked'}
      onclick={() => tileMode.update((m) => (m === 'locked' ? 'freeform' : 'locked'))}
    >
      <span class="gen-icon">{$tileMode === 'locked' ? '🔒' : '🔓'}</span>
      <div class="gen-info">
        <span class="gen-label">{$tileMode === 'locked' ? 'Locked' : 'Freeform'}</span>
        <span class="gen-desc">{$tileMode === 'locked' ? 'Respects tile counts' : 'No placement limits'}</span>
      </div>
      <span class="lock-toggle-indicator" class:on={$tileMode === 'locked'}></span>
    </button>
    <div class="settings-divider"></div>
    <button
      class="gen-item"
      class:save-item-saved={saveStatus === 'saved'}
      onclick={handleSaveFromSettings}
      disabled={saveStatus === 'saving'}
    >
      <span class="gen-icon">{saveStatus === 'saved' ? '✓' : '💾'}</span>
      <div class="gen-info">
        <span class="gen-label">{saveLabel}</span>
        <span class="gen-desc">Save map to local storage</span>
      </div>
    </button>
    <div class="settings-divider"></div>
    <button class="gen-item" onclick={handleImportFromSettings}>
      <span class="gen-icon">📂</span>
      <div class="gen-info">
        <span class="gen-label">Import JSON</span>
        <span class="gen-desc">Load a map from a .json file</span>
      </div>
    </button>
    <button class="gen-item" onclick={handleExportFromSettings}>
      <span class="gen-icon">⬇️</span>
      <div class="gen-info">
        <span class="gen-label">Export JSON</span>
        <span class="gen-desc">Download map as a .json file</span>
      </div>
    </button>
    <div class="settings-divider"></div>
    <button class="gen-item danger-item" onclick={handleClearFromSettings}>
      <span class="gen-icon">🗑️</span>
      <div class="gen-info">
        <span class="gen-label">Clear Map</span>
        <span class="gen-desc">Remove all placed tiles</span>
      </div>
    </button>
  </div>
{/if}

<style>
  .toolbar {
    height: 52px;
    background: rgba(10, 10, 24, 0.98);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    display: flex;
    align-items: center;
    padding: 0 148px 0 12px;
    gap: 6px;
    flex-shrink: 0;
    overflow-x: auto;
    position: relative;
  }

  .toolbar-section {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .toolbar-divider {
    width: 1px;
    height: 26px;
    background: rgba(255, 255, 255, 0.08);
    margin: 0 4px;
    flex-shrink: 0;
  }

  .home-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: background 0.1s;
    line-height: 1;
  }

  .home-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .map-name-input {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    padding: 4px 10px;
    width: 160px;
    outline: none;
    transition: border-color 0.15s;
  }

  .map-name-input:focus {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.1s;
    white-space: nowrap;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .tool-btn.active {
    background: rgba(99, 102, 241, 0.3);
    border-color: rgba(99, 102, 241, 0.6);
    color: #fff;
  }

  .tool-btn.shape-active {
    background: rgba(234, 88, 12, 0.25);
    border-color: rgba(234, 88, 12, 0.5);
  }

  .tool-label {
    font-weight: 500;
  }

  .mode-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .mode-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .mode-toggle.locked {
    background: rgba(251, 191, 36, 0.1);
    border-color: rgba(251, 191, 36, 0.25);
    color: rgba(251, 191, 36, 0.9);
  }

  .mode-label {
    font-weight: 600;
  }

  .grid-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    font-weight: 500;
  }

  .grid-slider {
    width: 70px;
    accent-color: #6366f1;
  }

  .grid-value {
    color: rgba(255, 255, 255, 0.35);
    font-size: 10px;
    min-width: 44px;
  }

  .grid-custom-badge {
    font-size: 10px;
    color: rgba(234, 88, 12, 0.8);
    font-weight: 600;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.1s;
    white-space: nowrap;
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  /* Floating right buttons (generation + settings gear) */
  .float-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    height: 32px;
    min-width: 32px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .float-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .float-btn.open {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.4);
  }

  .generation-btn {
    padding: 0 12px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.02em;
  }

  .generation-btn.open {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.4);
    color: #fff;
  }

  .settings-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
  }

  .settings-menu {
    position: fixed;
    z-index: 101;
    background: #13131f;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 6px;
    width: 220px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .settings-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
    margin: 4px 6px;
  }

  .save-item-saved .gen-label {
    color: #86efac;
  }

  .danger-item:hover {
    background: rgba(220, 38, 38, 0.12) !important;
  }

  .danger-item .gen-label {
    color: rgba(252, 165, 165, 0.8);
  }

  .generation-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
  }

  .generation-menu {
    position: fixed;
    z-index: 101;
    background: #13131f;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 6px;
    min-width: 220px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .gen-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: none;
    border: none;
    border-radius: 7px;
    padding: 8px 10px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .gen-item:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .gen-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .gen-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .gen-label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
  }

  .gen-desc {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.35);
  }

  /* Lock toggle in settings */
  .lock-toggle-indicator {
    width: 28px;
    height: 15px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    position: relative;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .lock-toggle-indicator::after {
    content: '';
    display: block;
    width: 11px;
    height: 11px;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
  }

  .lock-toggle-indicator.on {
    background: #facc15;
  }

  .lock-toggle-indicator.on::after {
    transform: translateX(13px);
  }

  .lock-item {
    justify-content: space-between;
  }
</style>
