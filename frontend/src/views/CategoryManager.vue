<template>
  <div class="category-manager">
    <div class="header-actions">
      <h2 class="section-title">分类管理</h2>
      <div class="header-buttons">
        <button @click="deleteEmptyCategories" class="btn-delete-empty">🗑️ 删除空分类</button>
        <button @click="showAddModal = true" class="btn-add-category">+ 添加分类</button>
      </div>
    </div>

    <div v-if="hasSearch || selectedCategories.length > 0" class="toolbar">
      <div v-if="selectedCategories.length > 0" class="selection-info">
        已选择 {{ selectedCategories.length }} 项
        <button @click="selectedCategories = []" class="clear-selection">清除选择</button>
        <button @click="deleteSelectedCategories" class="btn-delete-batch">批量删除</button>
      </div>
      <div v-if="hasSearch" class="search-info">
        共 {{ filteredCategories.length }} 个分类
        <button @click="clearSearch" class="clear-search">清除搜索</button>
      </div>
    </div>

    <div class="search-bar">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索分类..."
        class="search-input"
      />
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="filteredCategories.length === 0 && !hasSearch" class="empty">暂无分类，请点击"添加分类"创建</div>
    <div v-else-if="filteredCategories.length === 0 && hasSearch" class="empty">没有找到匹配的分类</div>
    <div v-else class="category-list">
      <div
        v-for="(category, index) in paginatedCategories"
        :key="category.id"
        class="category-item"
        :class="{ selected: selectedCategories.includes(category.id) }"
        :style="{ animationDelay: index * 0.05 + 's' }"
      >
        <div class="category-checkbox">
          <input
            type="checkbox"
            :value="category.id"
            v-model="selectedCategories"
          />
        </div>
        <div class="category-info">
          <span class="category-color" :style="{ backgroundColor: category.color }"></span>
          <span class="category-name">{{ category.name }}</span>
        </div>
        <div class="category-actions">
          <button @click="editCategory(category)" class="btn-action btn-edit">编辑</button>
          <button @click="deleteCategory(category.id)" class="btn-action btn-delete">删除</button>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button @click="prevPage" :disabled="currentPage === 1" class="page-btn prev">‹</button>
      <button
        v-for="(page, index) in visiblePages"
        :key="index"
        @click="goToPage(page)"
        class="page-btn"
        :class="{ active: page === currentPage, ellipsis: page === '...' }"
        :disabled="page === '...'"
      >{{ page }}</button>
      <button @click="nextPage" :disabled="currentPage === totalPages" class="page-btn next">›</button>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ showEditModal ? '编辑分类' : '添加分类' }}</h3>
        <form @submit.prevent="saveCategory" class="form">
          <div class="form-group">
            <label>分类名称</label>
            <input v-model="form.name" type="text" required placeholder="请输入分类名称" />
          </div>
          <div class="form-group">
            <label>颜色</label>
            <div class="color-picker">
              <button
                v-for="color in colorOptions"
                :key="color"
                type="button"
                class="color-option"
                :class="{ selected: form.color === color }"
                :style="{ backgroundColor: color }"
                @click="form.color = color"
              ></button>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn-cancel">取消</button>
            <button type="submit" class="btn-save">保存</button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog :show="confirmDialog.show" :message="confirmDialog.message" @confirm="executeConfirm" @cancel="cancelConfirm" />

    <div v-if="toast.show" class="toast" :class="toast.type">
      <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '✕' }}</span>
      <span class="toast-message">{{ toast.message }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { categoryApi } from '../services/api'
import { sharedState } from '../store/sharedState'
import { logger } from '../services/logger'
import ConfirmDialog from '../components/ConfirmDialog.vue'

export default {
  name: 'CategoryManager',
  components: {
    ConfirmDialog,
  },
  setup() {
    const loading = ref(false)
    const error = ref(null)
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const form = ref({ id: null, name: '', color: '#667eea' })
    const searchKeyword = ref('')
    const selectedCategories = ref([])
    const currentPage = ref(1)
    const pageSize = ref(10)

    const toast = ref({
      show: false,
      type: 'success',
      message: ''
    })

    const confirmDialog = ref({
      show: false,
      message: '',
      onConfirm: null
    })

    const showConfirm = (message, onConfirm) => {
      confirmDialog.value = { show: true, message, onConfirm }
    }

    const cancelConfirm = () => {
      confirmDialog.value.show = false
    }

    const executeConfirm = () => {
      if (confirmDialog.value.onConfirm) {
        confirmDialog.value.onConfirm()
      }
      confirmDialog.value.show = false
    }

    const showToast = (message, type = 'success') => {
      toast.value = { show: true, type, message }
      setTimeout(() => {
        toast.value.show = false
      }, 3000)
    }

    const colorOptions = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#fa709a', '#fee140', '#a8edea'
    ]

    const hasSearch = computed(() => {
      return searchKeyword.value && searchKeyword.value.trim() !== ''
    })

    const filteredCategories = computed(() => {
      if (!searchKeyword.value.trim()) {
        return sharedState.categories
      }
      const keyword = searchKeyword.value.toLowerCase().trim()
      return sharedState.categories.filter(cat =>
        cat.name.toLowerCase().includes(keyword)
      )
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredCategories.value.length / pageSize.value) || 1
    })

    const paginatedCategories = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredCategories.value.slice(start, end)
    })

    const visiblePages = computed(() => {
      const pages = []
      const total = totalPages.value
      const current = currentPage.value
      if (total <= 5) {
        for (let i = 1; i <= total; i++) pages.push(i)
      } else {
        if (current <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i)
          pages.push('...')
          pages.push(total)
        } else if (current >= total - 2) {
          pages.push(1)
          pages.push('...')
          for (let i = total - 3; i <= total; i++) pages.push(i)
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = current - 1; i <= current + 1; i++) pages.push(i)
          pages.push('...')
          pages.push(total)
        }
      }
      return pages
    })

    const fetchCategories = async () => {
      loading.value = true
      error.value = null
      try {
        const response = await categoryApi.getAll()
        sharedState.categories = response
      } catch (err) {
        error.value = '获取分类失败'
        logger.error(err)
      } finally {
        loading.value = false
      }
    }

    const clearSearch = () => {
      searchKeyword.value = ''
    }

    const goToPage = (page) => {
      if (page === '...' || page < 1 || page > totalPages.value) return
      currentPage.value = page
    }

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
      }
    }

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
      }
    }

    const editCategory = (category) => {
      form.value = { ...category }
      showEditModal.value = true
    }

    const deleteCategory = (id) => {
      showConfirm('确定要删除这个分类吗？', async () => {
        try {
          await categoryApi.delete(id)
          const index = sharedState.categories.findIndex(c => c.id === id)
          if (index !== -1) {
            sharedState.categories.splice(index, 1)
          }
          selectedCategories.value = selectedCategories.value.filter(cid => cid !== id)
          showToast('删除成功')
        } catch (err) {
          const message = err.message || '删除分类失败'
          showToast(message, 'error')
          logger.error(err)
        }
      })
    }

    const deleteSelectedCategories = () => {
      showConfirm(`确定要删除选中的 ${selectedCategories.value.length} 个分类吗？`, async () => {
        try {
          await categoryApi.batchDelete(selectedCategories.value)
          sharedState.categories = sharedState.categories.filter(
            c => !selectedCategories.value.includes(c.id)
          )
          selectedCategories.value = []
          showToast('批量删除成功')
        } catch (err) {
          const message = err.message || '批量删除失败'
          showToast(message, 'error')
          logger.error(err)
        }
      })
    }

    const deleteEmptyCategories = () => {
      showConfirm('确定要删除所有没有书签的分类吗？', async () => {
        try {
          const response = await categoryApi.deleteEmpty()
          const count = response.deletedCount
          await fetchCategories()
          selectedCategories.value = []
          showToast(count > 0 ? `已删除 ${count} 个空分类` : '没有空分类需要删除')
        } catch (err) {
          const message = err.message || '删除空分类失败'
          showToast(message, 'error')
          logger.error(err)
        }
      })
    }

    const saveCategory = async () => {
      try {
        if (showEditModal.value) {
          await categoryApi.update(form.value.id, form.value)
          const index = sharedState.categories.findIndex(c => c.id === form.value.id)
          if (index !== -1) {
            sharedState.categories[index] = { ...form.value }
          }
          showToast('修改成功')
        } else {
          const response = await categoryApi.create(form.value)
          sharedState.categories.push(response)
          showToast('添加成功')
        }
        closeModal()
      } catch (err) {
        showToast('保存分类失败', 'error')
        logger.error(err)
      }
    }

    const closeModal = () => {
      showAddModal.value = false
      showEditModal.value = false
      form.value = { id: null, name: '', color: '#667eea' }
    }

    watch(searchKeyword, () => {
      currentPage.value = 1
    })

    onMounted(() => {
      if (sharedState.categories.length === 0) {
        fetchCategories()
      }
    })

    return {
      sharedState,
      loading,
      error,
      showAddModal,
      showEditModal,
      form,
      colorOptions,
      toast,
      confirmDialog,
      showConfirm,
      cancelConfirm,
      executeConfirm,
      editCategory,
      deleteCategory,
      deleteSelectedCategories,
      deleteEmptyCategories,
      saveCategory,
      closeModal,
      searchKeyword,
      selectedCategories,
      hasSearch,
      filteredCategories,
      clearSearch,
      currentPage,
      totalPages,
      paginatedCategories,
      visiblePages,
      goToPage,
      nextPage,
      prevPage
    }
  }
}</script>

<style scoped>
.category-manager {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 1.5rem;
  animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-buttons {
  display: flex;
  gap: 0.75rem;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0;
}

.btn-add-category {
  padding: 0.6rem 1rem;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: var(--shadow-sm);
}

.btn-add-category:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-delete-empty {
  padding: 0.6rem 1rem;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: var(--shadow-sm);
}

.btn-delete-empty:hover {
  background: #c0392b;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.selection-info, .search-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  background-color: var(--color-warning-bg);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-warning-text);
}

.search-info {
  background-color: var(--color-accent-bg);
  color: var(--color-accent);
}

.clear-selection, .clear-search {
  padding: 0.25rem 0.6rem;
  background-color: #fff;
  border: 1px solid currentColor;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  transition: all var(--transition);
}

.clear-selection:hover, .clear-search:hover {
  background-color: currentColor;
  color: #fff;
}

.btn-delete-batch {
  padding: 0.25rem 0.6rem;
  background-color: #e74c3c;
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all var(--transition);
}

.btn-delete-batch:hover {
  background-color: #c0392b;
}

.search-bar {
  margin-bottom: 1rem;
}

.search-bar .search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  transition: all var(--transition);
  background-color: var(--color-bg);
  color: var(--color-ink);
}

.search-bar .search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(28,28,30,0.05);
}

.loading, .error, .empty {
  text-align: center;
  padding: 3rem;
  color: var(--color-ink-muted);
  font-size: 15px;
}

.error {
  color: #e74c3c;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background-color: var(--color-bg);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition: all var(--transition);
  animation: cardFadeIn 0.4s ease forwards;
  opacity: 0;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.category-item:hover {
  background-color: var(--color-border-light);
  transform: translateX(4px);
}

.category-item.selected {
  background-color: var(--color-accent-bg);
  border-color: var(--color-accent);
}

.category-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.category-checkbox {
  flex-shrink: 0;
  margin-right: 0.75rem;
}

.category-checkbox input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.category-color {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.category-name {
  font-weight: 500;
  color: var(--color-ink);
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-action {
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all var(--transition);
  min-height: 32px;
}

.btn-edit {
  background-color: var(--color-surface);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}

.btn-edit:hover {
  background-color: var(--color-accent);
  color: #fff;
}

.btn-delete {
  background-color: var(--color-surface);
  color: #e74c3c;
  border: 1px solid #e74c3c;
}

.btn-delete:hover {
  background-color: #e74c3c;
  color: #fff;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-light);
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 0.5rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-ink-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition);
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.page-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.ellipsis {
  border: none;
  cursor: default;
}

.page-btn.ellipsis:hover {
  color: var(--color-ink-secondary);
}

.page-btn.prev,
.page-btn.next {
  font-size: 18px;
  font-weight: bold;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal h3 {
  margin: 0 0 1.5rem 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-ink);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--color-ink);
  font-size: 14px;
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  transition: all var(--transition);
  background-color: var(--color-bg);
  color: var(--color-ink);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(28,28,30,0.05);
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition);
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: var(--color-ink);
  box-shadow: 0 0 0 2px var(--color-surface);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-cancel {
  padding: 0.6rem 1.25rem;
  background-color: var(--color-bg);
  color: var(--color-ink-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-cancel:hover {
  background-color: var(--color-border-light);
}

.btn-save {
  padding: 0.6rem 1.25rem;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: var(--shadow-sm);
}

.btn-save:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

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

.confirm-dialog {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  width: 90%;
  max-width: 360px;
  box-shadow: var(--shadow-lg);
  animation: scaleIn 0.2s ease;
}

.confirm-icon {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 1rem;
}

.confirm-message {
  font-size: 15px;
  color: var(--color-ink);
  text-align: center;
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
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.confirm-btn.cancel {
  background-color: var(--color-bg);
  color: var(--color-ink-secondary);
  border: 1px solid var(--color-border-light);
}

.confirm-btn.cancel:hover {
  background-color: var(--color-border-light);
}

.confirm-btn.confirm {
  background: #e74c3c;
  color: #fff;
  border: none;
  box-shadow: var(--shadow-sm);
}

.confirm-btn.confirm:hover {
  background: #c0392b;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 9999;
  animation: slideIn 0.3s ease;
  max-width: 400px;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast.success {
  border-left: 4px solid #43e97b;
}

.toast.error {
  border-left: 4px solid #e74c3c;
}

.toast-icon {
  font-size: 1.25rem;
  font-weight: bold;
}

.toast.success .toast-icon {
  color: #43e97b;
}

.toast.error .toast-icon {
  color: #e74c3c;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  color: var(--color-ink);
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .category-item {
    padding: 0.875rem 1rem;
  }

  .btn-action {
    min-height: 40px;
  }

  .toast {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
  }
}
</style>
