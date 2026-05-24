<template>
  <div v-if="show" class="confirm-overlay" @click.self="$emit('cancel')">
    <div class="confirm-dialog">
      <div class="confirm-icon">⚠️</div>
      <div class="confirm-message">{{ message }}</div>
      <div class="confirm-actions">
        <button @click="$emit('cancel')" class="confirm-btn cancel">取消</button>
        <button @click="$emit('confirm')" class="confirm-btn confirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfirmDialog',
  props: {
    show: { type: Boolean, default: false },
    message: { type: String, default: '' },
  },
  emits: ['confirm', 'cancel'],
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(28, 28, 30, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.confirm-dialog {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 2rem;
  min-width: 320px;
  max-width: 420px;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: dialogIn 0.2s ease;
}

@keyframes dialogIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.confirm-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.confirm-message {
  font-size: 15px;
  color: var(--color-ink);
  margin-bottom: 1.5rem;
  line-height: 1.5;
  font-family: var(--font-sans);
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.confirm-btn {
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition);
  font-family: var(--font-sans);
}

.confirm-btn.cancel {
  background-color: var(--color-tag-bg);
  color: var(--color-ink-secondary);
  border: 1px solid var(--color-border-light);
}

.confirm-btn.cancel:hover {
  background-color: var(--color-border-light);
}

.confirm-btn.confirm {
  background: var(--color-accent);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.confirm-btn.confirm:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>
