<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { registry } from '$lib/core/registry.js';
  import { baseCatanExtension } from '$lib/plugins/base/index.js';
  import { seafarersExtension } from '$lib/plugins/seafarers/index.js';
  import { fiveSixPlayerExtension } from '$lib/plugins/5-6player/index.js';
  import { citiesAndKnightsExtension } from '$lib/plugins/cities-and-knights/index.js';
  import { mapStore, initPaletteCounts } from '$lib/stores/mapStore.js';
  import { pendingMapConfig } from '$lib/stores/appStore.js';
  import { saveMap } from '$lib/core/storage.js';
  import { generateHexGrid, generateIrregularHexGrid, hexKey } from '$lib/core/hex.js';
  import { notify } from '$lib/stores/notifications.js';

  import Toolbar from '$lib/components/Toolbar.svelte';
  import TilePalette from '$lib/components/TilePalette.svelte';
  import UnitsPanel from '$lib/components/UnitsPanel.svelte';
  import ExtensionPanel from '$lib/components/ExtensionPanel.svelte';
  import HexGrid from '$lib/components/HexGrid.svelte';
  import InfoPanel from '$lib/components/InfoPanel.svelte';
  import ToastTray from '$lib/components/ToastTray.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';

  let mapName = $state('New Map');
  let gridRadius = $state(3);
  let saveStatus = $state(/** @type {'idle' | 'saving' | 'saved'} */ ('idle'));

  // Auto-save dirty tracking
  let lastSavedRevision = $state(0);
  let changeRevision = $state(0);
  const isDirty = $derived(changeRevision !== lastSavedRevision);

  // Unsaved-changes modal
  let showUnsavedModal = $state(false);

  // ── Preset shape definitions ───────────────────────────────────────
  const PRESET_HEXES = {
    standard: generateHexGrid(2),
    '5-6player': generateHexGrid(3),
    'seafarers-medium': generateIrregularHexGrid([5, 4, 4, 5, 4, 4]),
    'seafarers-large': generateIrregularHexGrid([6, 4, 4, 6, 4, 4])
  };

  let autoSaveInterval;

  function handleBeforeUnload(e) {
    if (isDirty) {
      e.preventDefault();
    }
  }

  onMount(() => {
    // Register extensions (idempotent — safe to call multiple times)
    registry.registerExtension(baseCatanExtension);
    registry.registerExtension(seafarersExtension);
    registry.registerExtension(fiveSixPlayerExtension);
    registry.registerExtension(citiesAndKnightsExtension);
    refreshPalette();

    // Consume pending config from landing page
    const config = $pendingMapConfig;
    if (config) {
      pendingMapConfig.set(null);
      applyConfig(config);
    }

    // Sync local state from map store and track dirty changes
    const unsub = mapStore.subscribe((s) => {
      mapName = s.name;
      gridRadius = s.gridRadius;
      changeRevision++;
    });

    // Warn on browser close/refresh when unsaved
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Auto-save every 30s if there are unsaved changes
    autoSaveInterval = setInterval(() => {
      if (isDirty) {
        performSave(true);
      }
    }, 30000);

    return unsub;
  });

  onDestroy(() => {
    clearInterval(autoSaveInterval);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  function refreshPalette() {
    initPaletteCounts(registry.getAllTiles(), registry.getActiveCountModifiers());
  }

  function restoreExtensions(extensionIds = []) {
    for (const extId of extensionIds) {
      if (!registry.isExtensionActive(extId)) {
        registry.activateExtension(extId);
      }
    }
    refreshPalette();
  }

  function applyConfig(config) {
    if (config.type === 'new') {
      const presetHexes = PRESET_HEXES[config.preset] ?? generateHexGrid(3);
      mapStore.resetMap({
        name: config.name || 'New Map',
        gridMode: 'custom',
        customHexes: new Set(presetHexes.map((h) => hexKey(h.q, h.r))),
        gridRadius: config.gridRadius ?? 3,
        includePirate: config.includePirate ?? false,
        orientation: config.orientation ?? 'flat'
      });
      restoreExtensions(config.extensions ?? []);
    } else if (config.type === 'load' && config.loadedState) {
      const { extensions } = mapStore.importJSON(JSON.stringify(config.loadedState));
      restoreExtensions(extensions);
    }
  }

  function buildColorSnapshot(state) {
    const allTiles = registry.getAllTiles();
    const tileColors = new Map(allTiles.map((t) => [t.id, t.color]));
    const snapshot = [];
    for (const tile of state.tiles.values()) {
      const color = tileColors.get(tile.tileTypeId);
      if (color) snapshot.push({ q: tile.q, r: tile.r, color });
    }
    return snapshot;
  }

  function performSave(silent = false) {
    saveStatus = 'saving';
    const state = $mapStore;
    const activeExtensions = registry
      .getExtensions()
      .filter((e) => registry.isExtensionActive(e.id))
      .map((e) => e.id);
    const json = mapStore.exportJSON(state, activeExtensions);
    const colorSnapshot = buildColorSnapshot(state);
    saveMap(state, json, activeExtensions, colorSnapshot);
    lastSavedRevision = changeRevision;
    saveStatus = 'saved';
    if (!silent) notify('Map saved', 'success');
    setTimeout(() => (saveStatus = 'idle'), 2000);
  }

  function handleSave() {
    performSave(false);
  }

  function goHome() {
    if (isDirty) {
      showUnsavedModal = true;
    } else {
      goto('/');
    }
  }
</script>

<div class="app">
  <Toolbar bind:mapName bind:gridRadius {saveStatus} onsave={handleSave} onhome={goHome} />

  <div class="workspace">
    <aside class="sidebar">
      <TilePalette />
      <UnitsPanel />
      <ExtensionPanel />
    </aside>

    <main class="canvas-area">
      <HexGrid {gridRadius} hexSize={54} orientation="flat" />
      <InfoPanel />
    </main>
  </div>
</div>

<ToastTray />

{#if showUnsavedModal}
  <ConfirmModal
    title="Unsaved changes"
    message="You have unsaved changes. Leave without saving?"
    confirmLabel="Leave"
    extraLabel="Save & Leave"
    cancelLabel="Stay"
    danger={true}
    onconfirm={() => { showUnsavedModal = false; goto('/'); }}
    onextra={() => { performSave(false); showUnsavedModal = false; goto('/'); }}
    oncancel={() => (showUnsavedModal = false)}
  />
{/if}

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background: #0d0d1f;
    overflow: hidden;
  }

  .workspace {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    width: 220px;
    min-width: 220px;
    height: 100%;
    overflow: hidden;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
  }

  .canvas-area {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: radial-gradient(ellipse at center, #151530 0%, #0a0a1a 100%);
  }
</style>
