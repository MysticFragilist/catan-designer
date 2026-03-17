<script>
  import { notifications, dismiss } from '../stores/notifications.js';

  const TYPE_COLORS = {
    success: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', icon: '✓' },
    error:   { bg: 'rgba(239, 68, 68, 0.12)',  border: 'rgba(239, 68, 68, 0.3)',  icon: '✕' },
    info:    { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)', icon: 'ℹ' }
  };

  function style(type) {
    const c = TYPE_COLORS[type] ?? TYPE_COLORS.info;
    return `background: ${c.bg}; border-color: ${c.border};`;
  }

  function icon(type) {
    return (TYPE_COLORS[type] ?? TYPE_COLORS.info).icon;
  }
</script>

<div class="tray">
  {#each $notifications as n (n.id)}
    <div class="toast" style={style(n.type)} role="alert">
      <span class="toast-icon">{icon(n.type)}</span>
      <span class="toast-msg">{n.message}</span>
      <button class="toast-close" onclick={() => dismiss(n.id)} aria-label="Dismiss">✕</button>
    </div>
  {/each}
</div>

<style>
  .tray {
    position: fixed;
    bottom: 68px;
    right: 16px;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border: 1px solid transparent;
    border-radius: 8px;
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    max-width: 280px;
    pointer-events: all;
    animation: slide-in 0.2s ease;
  }

  @keyframes slide-in {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .toast-icon {
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.7);
  }

  .toast-msg {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.88);
    flex: 1;
    min-width: 0;
  }

  .toast-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.35);
    font-size: 11px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
    flex-shrink: 0;
    transition: color 0.1s;
  }

  .toast-close:hover {
    color: rgba(255, 255, 255, 0.7);
  }
</style>
