<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { generateHexGrid, generateIrregularHexGrid } from '$lib/core/hex.js';
  import { getSavedMaps, deleteMap, formatSavedAt } from '$lib/core/storage.js';
  import { pendingMapConfig } from '$lib/stores/appStore.js';
  import HexPreview from '$lib/components/HexPreview.svelte';
  import MapSnapshot from '$lib/components/MapSnapshot.svelte';

  // ── Preset definitions ─────────────────────────────────────────────
  const PRESETS = [
    {
      id: 'standard',
      name: 'Standard Catan',
      description: 'Classic hexagonal board, radius 3 — 19 tiles',
      icon: '🏝️',
      hexes: generateHexGrid(2),
      gridRadius: 3,
      extensions: [],
      orientation: 'flat'
    },
    {
      id: '5-6player',
      name: '5-6 Player',
      description: 'Larger hexagonal board, radius 4 — 37 tiles',
      icon: '👥',
      hexes: generateIrregularHexGrid([4, 4, 3, 4, 4, 3]),
      gridRadius: 4,
      extensions: ['5-6player'],
      orientation: 'flat'
    },
    {
      id: 'seafarers-medium',
      name: 'Seafarers Medium',
      description: 'Irregular hexagon (5×4×4×5×4×4) — Seafarers Medium',
      icon: '⛵',
      hexes: generateIrregularHexGrid([5, 4, 4, 5, 4, 4]),
      gridRadius: 4,
      extensions: ['seafarers'],
      orientation: 'pointy'
    },
    {
      id: 'seafarers-large',
      name: 'Seafarers Large',
      description: 'Irregular hexagon (6×4×4×6×4×4) — Seafarers Large',
      icon: '🚢',
      hexes: generateIrregularHexGrid([6, 4, 4, 6, 4, 4]),
      gridRadius: 5,
      extensions: ['seafarers'],
      orientation: 'pointy'
    },
  ];

  // ── State ──────────────────────────────────────────────────────────
  let savedMaps = $state([]);
  let newMapName = $state('');
  let deletingId = $state(null);
  let carouselIndex = $state(0);

  function prevPreset() {
    carouselIndex = (carouselIndex - 1 + PRESETS.length) % PRESETS.length;
  }
  function nextPreset() {
    carouselIndex = (carouselIndex + 1) % PRESETS.length;
  }

  onMount(() => {
    savedMaps = getSavedMaps();
  });

  // ── Actions ────────────────────────────────────────────────────────

  function createMap(preset) {
    const name = newMapName.trim() || `${preset.name} — ${new Date().toLocaleDateString()}`;
    pendingMapConfig.set({
      type: 'new',
      name,
      preset: preset.id,
      gridRadius: preset.gridRadius ?? 3,
      extensions: preset.extensions ?? [],
      orientation: preset.orientation ?? 'flat',
      includePirate: preset.extensions?.includes('seafarers') ?? false
    });
    goto('/designer');
  }

  function openSavedMap(entry) {
    try {
      const loadedState = JSON.parse(entry.data);
      pendingMapConfig.set({ type: 'load', loadedState });
      goto('/designer');
    } catch {
      alert('Failed to load map — data may be corrupted.');
    }
  }
  // Note: extensions are embedded in loadedState.extensions (written by exportJSON),
  // so no extra field is needed here — applyConfig reads them from the parsed JSON.

  let importError = $state('');

  function handleImport() {
    importError = '';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = /** @type {HTMLInputElement} */ (e.target)?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const loadedState = JSON.parse(/** @type {string} */ (re.target?.result));
          pendingMapConfig.set({ type: 'load', loadedState });
          goto('/designer');
        } catch {
          importError = 'Invalid JSON file — could not parse the map.';
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function confirmDelete(id) {
    deletingId = id;
  }

  function doDelete(id) {
    deleteMap(id);
    savedMaps = getSavedMaps();
    deletingId = null;
  }
</script>

<div class="landing">
  <!-- Background hex pattern -->
  <div class="bg-pattern" aria-hidden="true">
    <svg width="100%" height="100%">
      <defs>
        <pattern id="hex-bg" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
          <polygon
            points="15,2 45,2 58,26 45,50 15,50 2,26"
            fill="none"
            stroke="rgba(99,102,241,0.07)"
            stroke-width="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-bg)" />
    </svg>
  </div>

  <!-- Header -->
  <header class="landing-header">
    <div class="logo">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40">
        <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#6366f1" stroke="#818cf8" stroke-width="1.5"/>
        <text x="16" y="22" text-anchor="middle" font-size="16">🏝️</text>
      </svg>
    </div>
    <div class="title-group">
      <h1>Catan Map Editor</h1>
      <p>Create and save custom board layouts</p>
    </div>
  </header>

  <main class="landing-main">
    <!-- New Map Section -->
    <section class="section">
      <h2 class="section-title">New Map</h2>

      <div class="name-input-row">
        <input
          class="name-input"
          type="text"
          bind:value={newMapName}
          placeholder="Map name (optional)"
          aria-label="New map name"
          maxlength="60"
        />
      </div>

      <div class="carousel">
        <button class="carousel-arrow" onclick={prevPreset} aria-label="Previous preset">‹</button>

        <div class="carousel-track">
          {#each PRESETS as preset, i}
            {@const rawOffset = i - carouselIndex}
            {@const n = PRESETS.length}
            {@const offset =
              rawOffset > n / 2 ? rawOffset - n : rawOffset < -n / 2 ? rawOffset + n : rawOffset}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              class="preset-card"
              class:active={offset === 0}
              class:adj={Math.abs(offset) === 1}
              style:--offset={offset}
              onclick={Math.abs(offset) === 1 ? () => (carouselIndex = i) : undefined}
            >
              <div class="preset-preview">
                <HexPreview hexes={preset.hexes} width={160} height={120} orientation={preset.orientation} />
              </div>
              <div class="preset-body">
                <div class="preset-name">
                  <span class="preset-icon">{preset.icon}</span>
                  {preset.name}
                </div>
                <p class="preset-desc">{preset.description}</p>

                <button class="create-btn" onclick={() => createMap(preset)}> Create map → </button>
              </div>
            </div>
          {/each}
        </div>

        <button class="carousel-arrow" onclick={nextPreset} aria-label="Next preset">›</button>
      </div>

      <div class="carousel-dots">
        {#each PRESETS as _, i}
          <button
            class="dot"
            class:active={i === carouselIndex}
            onclick={() => (carouselIndex = i)}
            aria-label="Go to preset {i + 1}"
          ></button>
        {/each}
      </div>
    </section>

    <!-- Saved Maps Section -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">
          Saved Maps
          {#if savedMaps.length > 0}
            <span class="count-badge">{savedMaps.length}</span>
          {/if}
        </h2>
        <button class="import-btn" onclick={handleImport}>
          <span class="import-icon">↑</span> Import JSON
        </button>
      </div>

      {#if importError}
        <p class="import-error">{importError}</p>
      {/if}

      {#if savedMaps.length === 0}
        <div class="empty-saves">
          <span>No saved maps yet.</span>
          <span class="empty-hint">Save a map from the designer to see it here.</span>
        </div>
      {:else}
        <div class="saved-list">
          {#each savedMaps as entry}
            <div class="saved-card" class:confirming={deletingId === entry.id}>
              <div class="saved-preview">
                {#if entry.colorSnapshot?.length}
                  <MapSnapshot
                    snapshot={entry.colorSnapshot}
                    width={72}
                    height={56}
                    orientation={entry.orientation ?? 'flat'}
                  />
                {:else}
                  <HexPreview
                    hexes={entry.gridMode === 'custom' ? [] : generateHexGrid(entry.gridRadius ?? 3)}
                    width={72}
                    height={56}
                    orientation={entry.orientation ?? 'flat'}
                  />
                {/if}
              </div>
              <div class="saved-info">
                <span class="saved-name">{entry.name}</span>
                <span class="saved-meta">
                  {formatSavedAt(entry.savedAt)} · {entry.hexCount ?? '?'} hexes
                  {#if entry.extensions?.length > 0}
                    · {entry.extensions.join(', ')}
                  {/if}
                </span>
              </div>

              {#if deletingId === entry.id}
                <div class="delete-confirm">
                  <span>Delete?</span>
                  <button class="confirm-yes" onclick={() => doDelete(entry.id)}>Yes</button>
                  <button class="confirm-no" onclick={() => (deletingId = null)}>No</button>
                </div>
              {:else}
                <div class="saved-actions">
                  <button class="open-btn" onclick={() => openSavedMap(entry)}>Open</button>
                  <button class="del-btn" onclick={() => confirmDelete(entry.id)}>🗑</button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </main>
</div>

<style>
  .landing {
    min-height: 100vh;
    width: 100%;
    background: #0a0a1a;
    color: #fff;
    font-family: system-ui, sans-serif;
    position: relative;
    overflow-y: auto;
  }

  .bg-pattern {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .landing-header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 36px 48px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .logo {
    display: flex;
    align-items: center;
  }

  .title-group h1 {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    background: linear-gradient(135deg, #c7d2fe 0%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .title-group p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.4);
    margin: 4px 0 0;
  }

  .landing-main {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 48px 64px;
    display: flex;
    flex-direction: column;
    gap: 48px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .count-badge {
    background: rgba(99, 102, 241, 0.25);
    color: #a5b4fc;
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 10px;
  }

  /* Name input */
  .name-input-row {
    display: flex;
    gap: 12px;
  }

  .name-input {
    width: 340px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    padding: 10px 14px;
    outline: none;
    transition: border-color 0.15s;
  }

  .name-input:focus {
    border-color: rgba(99, 102, 241, 0.6);
  }

  .name-input::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }

  /* Carousel */
  .carousel {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .carousel-arrow {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.7);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .carousel-arrow:hover {
    background: rgba(99, 102, 241, 0.25);
    color: #fff;
  }

  .carousel-track {
    flex: 1;
    position: relative;
    height: 320px;
    overflow: hidden;
  }

  .preset-card {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 62%;
    left: 19%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    /* translateX % = own width, so 110% slides by card + ~10% gap */
    transition:
      transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.35s,
      scale 0.35s,
      border-color 0.15s;
    transform: translateX(calc(var(--offset, 0) * 110%));
    opacity: 0;
    scale: 0.92;
    pointer-events: none;
  }

  .preset-card.active {
    opacity: 1;
    scale: 1;
    pointer-events: all;
    border-color: rgba(99, 102, 241, 0.35);
  }

  .preset-card.adj {
    opacity: 0.55;
    cursor: pointer;
    pointer-events: all;
  }

  .preset-card.adj:hover {
    opacity: 0.75;
  }

  .carousel-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding-top: 4px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    cursor: pointer;
    padding: 0;
    transition:
      background 0.2s,
      transform 0.2s;
  }

  .dot.active {
    background: #6366f1;
    transform: scale(1.3);
  }

  .preset-preview {
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .preset-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .preset-name {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .preset-icon {
    font-size: 18px;
  }

  .preset-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
    line-height: 1.5;
  }

.create-btn {
    margin-top: auto;
    padding-top: 8px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(139, 92, 246, 0.7));
    border: 1px solid rgba(99, 102, 241, 0.4);
    border-radius: 8px;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    padding: 9px 16px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
  }

  .create-btn:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9));
    transform: translateY(-1px);
  }

  /* Saved maps */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .import-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    font-weight: 600;
    padding: 7px 14px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .import-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.4);
    color: #a5b4fc;
  }

  .import-icon {
    font-size: 14px;
    font-weight: 700;
  }

  .import-error {
    font-size: 12px;
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 8px;
    padding: 8px 14px;
    margin: 0;
  }

  .empty-saves {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 24px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.35);
  }

  .empty-hint {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.2);
  }

  .saved-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .saved-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .saved-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .saved-card.confirming {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.05);
  }

  .saved-preview {
    flex-shrink: 0;
  }

  .saved-info {
    flex: 1;
    min-width: 0;
  }

  .saved-name {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .saved-meta {
    display: block;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
    margin-top: 2px;
  }

  .saved-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .open-btn {
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 7px;
    color: #a5b4fc;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    cursor: pointer;
    transition: all 0.1s;
  }

  .open-btn:hover {
    background: rgba(99, 102, 241, 0.35);
  }

  .del-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 7px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 14px;
    padding: 6px 10px;
    cursor: pointer;
    transition: all 0.1s;
  }

  .del-btn:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .delete-confirm {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .confirm-yes {
    background: rgba(239, 68, 68, 0.3);
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 6px;
    color: #fca5a5;
    font-size: 11px;
    padding: 4px 10px;
    cursor: pointer;
  }

  .confirm-no {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 11px;
    padding: 4px 10px;
    cursor: pointer;
  }
</style>
