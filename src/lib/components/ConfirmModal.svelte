<script>
  let {
    title = 'Are you sure?',
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    extraLabel = '',
    onconfirm = () => {},
    oncancel = () => {},
    onextra = null
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={oncancel}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <h3 class="modal-title">{title}</h3>
    {#if message}
      <p class="modal-msg">{message}</p>
    {/if}
    <div class="modal-actions">
      <button class="btn cancel" onclick={oncancel}>{cancelLabel}</button>
      {#if onextra && extraLabel}
        <button class="btn extra" onclick={onextra}>{extraLabel}</button>
      {/if}
      <button class="btn confirm" class:danger onclick={onconfirm}>{confirmLabel}</button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
  }

  .modal {
    background: #16162a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 24px;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  }

  .modal-title {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.92);
  }

  .modal-msg {
    margin: 0 0 20px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .btn {
    padding: 7px 16px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s;
  }

  .btn.cancel {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.65);
  }

  .btn.cancel:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .btn.extra {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.4);
    color: rgba(180, 182, 255, 0.9);
  }

  .btn.extra:hover {
    background: rgba(99, 102, 241, 0.25);
  }

  .btn.confirm {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }

  .btn.confirm:hover {
    background: rgba(255, 255, 255, 0.16);
  }

  .btn.confirm.danger {
    background: rgba(220, 38, 38, 0.15);
    border-color: rgba(220, 38, 38, 0.4);
    color: rgba(252, 165, 165, 0.9);
  }

  .btn.confirm.danger:hover {
    background: rgba(220, 38, 38, 0.25);
  }
</style>
