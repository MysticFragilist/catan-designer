<script>
  import { registry, extensionListStore } from '../core/registry.js';
  import { initPaletteCounts } from '../stores/mapStore.js';

  let open = $state(true);

  function toggleExtension(extensionId) {
    if (registry.isExtensionActive(extensionId)) {
      registry.deactivateExtension(extensionId);
    } else {
      registry.activateExtension(extensionId);
    }
    initPaletteCounts(registry.getAllTiles(), registry.getActiveCountModifiers());
  }
</script>

<div class="extension-panel" class:collapsed={!open}>
  <button class="panel-header" onclick={() => (open = !open)}>
    <span class="panel-title">Extensions</span>
    <span class="chevron" class:open>›</span>
  </button>

  {#if open}
  <div class="extension-list">
    {#each $extensionListStore as ext}
      {@const isActive = registry.isExtensionActive(ext.id)}
      <div class="extension-item" class:active={isActive}>
        <div class="ext-header">
          <span class="ext-icon">{ext.icon || '🧩'}</span>
          <div class="ext-info">
            <span class="ext-name">{ext.name}</span>
            {#if ext.description}
              <span class="ext-desc">{ext.description}</span>
            {/if}
          </div>
          <button
            class="toggle-btn"
            class:on={isActive}
            onclick={() => toggleExtension(ext.id)}
            aria-label="{isActive ? 'Disable' : 'Enable'} {ext.name}"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>

        {#if isActive}
          <div class="ext-tile-count">
            {ext.tiles.length} tile type{ext.tiles.length !== 1 ? 's' : ''}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  {/if}
</div>

<style>
  .extension-panel {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }

  .panel-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.4);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    transition: color 0.15s;
  }

  .panel-header:hover {
    color: rgba(255, 255, 255, 0.7);
  }

  .panel-title {
    color: rgba(255, 255, 255, 0.4);
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

  .extension-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 12px 12px;
  }

  .extension-item {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 10px;
    transition: border-color 0.15s;
  }

  .extension-item.active {
    border-color: rgba(99, 102, 241, 0.3);
  }

  .ext-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ext-icon {
    font-size: 18px;
    line-height: 1;
    flex-shrink: 0;
  }

  .ext-info {
    flex: 1;
    min-width: 0;
  }

  .ext-name {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ext-desc {
    display: block;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.35);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .toggle-btn {
    width: 34px;
    height: 18px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 9px;
    padding: 2px;
    cursor: pointer;
    transition: background 0.2s;
    position: relative;
    flex-shrink: 0;
  }

  .toggle-btn.on {
    background: #6366f1;
  }

  .toggle-knob {
    display: block;
    width: 14px;
    height: 14px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s;
    position: absolute;
    top: 2px;
    left: 2px;
  }

  .toggle-btn.on .toggle-knob {
    transform: translateX(16px);
  }

  .ext-tile-count {
    font-size: 10px;
    color: rgba(99, 102, 241, 0.7);
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
</style>
