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
  background-color: rgba(0, 0, 0, 0.5);
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
  background-color: #fff;
  border-radius: 12px;
  padding: 2rem;
  min-width: 320px;
  max-width: 420px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
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
  color: #333;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.confirm-btn {
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.confirm-btn.cancel {
  background-color: #f5f5f5;
  color: #666;
}

.confirm-btn.cancel:hover {
  background-color: #e8e8e8;
}

.confirm-btn.confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.confirm-btn.confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>
