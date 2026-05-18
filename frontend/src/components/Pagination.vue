<template>
  <div class="pagination" v-if="totalPages > 1">
    <div class="pagination-info">
      共 {{ totalItems }} 条，第 {{ modelValue }} / {{ totalPages }} 页
    </div>
    <div class="pagination-controls">
      <button @click="goToPage(1)" :disabled="modelValue === 1" class="page-btn">首页</button>
      <button @click="goToPage(modelValue - 1)" :disabled="modelValue === 1" class="page-btn">上一页</button>
      <div class="page-numbers">
        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          class="page-btn"
          :class="{ active: modelValue === page }"
        >
          {{ page }}
        </button>
      </div>
      <button @click="goToPage(modelValue + 1)" :disabled="modelValue === totalPages" class="page-btn">下一页</button>
      <button @click="goToPage(totalPages)" :disabled="modelValue === totalPages" class="page-btn">末页</button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'Pagination',
  props: {
    modelValue: { type: Number, required: true },
    totalPages: { type: Number, required: true },
    totalItems: { type: Number, default: 0 },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const visiblePages = computed(() => {
      const pages = []
      const total = props.totalPages
      const current = props.modelValue
      let start = Math.max(1, current - 2)
      let end = Math.min(total, current + 2)

      if (end - start < 4) {
        if (start === 1) {
          end = Math.min(total, start + 4)
        } else {
          start = Math.max(1, end - 4)
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      return pages
    })

    const goToPage = (page) => {
      if (page >= 1 && page <= props.totalPages) {
        emit('update:modelValue', page)
      }
    }

    return { visiblePages, goToPage }
  },
}
</script>

<style scoped>
.pagination {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e8e8e8;
}

.pagination-info {
  text-align: center;
  font-size: 14px;
  color: #666;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid #e0e0e0;
  background-color: #fff;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  min-width: 36px;
}

.page-btn:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: #fff;
}
</style>
