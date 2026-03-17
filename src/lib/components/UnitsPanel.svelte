<script>
  import { activeTool, mapStore } from '../stores/mapStore.js';
  import { registry, extensionListStore } from '../core/registry.js';

  let open = $state(true);

  const showPirate = $derived(
    (() => {
      const _ = $extensionListStore;
      return registry.isExtensionActive('seafarers');
    })()
  );

  function activateUnit(toolId) {
    if (toolId === 'pirate') mapStore.setIncludePirate(true);
    activeTool.set(toolId);
  }
</script>

<div class="panel" class:collapsed={!open}>
  <button class="panel-header" onclick={() => (open = !open)}>
    <span class="panel-title">Units</span>
    <span class="chevron" class:open>›</span>
  </button>

  {#if open}
    <div class="panel-content">
      <button
        class="unit-item"
        class:active={$activeTool === 'robber'}
        onclick={() => activateUnit('robber')}
      >
        <span class="unit-icon">🏴</span>
        <div class="unit-info">
          <span class="unit-label">Robber</span>
          <span class="unit-desc">Place on any land hex · R</span>
        </div>
      </button>

      {#if showPirate}
        <button
          class="unit-item"
          class:active={$activeTool === 'pirate'}
          onclick={() => activateUnit('pirate')}
        >
          <span class="unit-icon">☠️</span>
          <div class="unit-info">
            <span class="unit-label">Pirate</span>
            <span class="unit-desc">Place on any sea hex · T</span>
          </div>
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .panel {
    flex-shrink: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
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

  .panel-content {
    padding: 2px 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .unit-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    text-align: left;
    transition: all 0.1s;
  }

  .unit-item:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .unit-item.active {
    background: rgba(220, 38, 38, 0.15);
    border-color: rgba(220, 38, 38, 0.4);
  }

  .unit-icon {
    font-size: 20px;
    line-height: 1;
    flex-shrink: 0;
  }

  .unit-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .unit-label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
  }

  .unit-desc {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
  }
</style>
