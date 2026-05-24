<template>
  <div class="bookmark-list" :class="{ 'no-animation': !needsAnimation }">
    <RecentBookmarks />

    <div class="header-actions">
      <h2 class="section-title">我的书签</h2>
      <div class="header-buttons">
        <input
          type="file"
          ref="fileInput"
          accept=".html"
          style="display: none"
          @change="handleImport"
        />
        <button @click="$refs.fileInput.click()" class="btn-import" :disabled="importing">
          {{ importing ? '导入中...' : '导入' }}
        </button>
        <button @click="handleExport" class="btn-export">导出</button>
        <button
          v-if="selectedBookmarks.length > 0"
          @click="deleteSelectedBookmarks"
          class="btn-delete-batch"
        >
          批量删除 ({{ selectedBookmarks.length }})
        </button>
        <router-link to="/add" class="btn-add">+ 添加书签</router-link>
      </div>
    </div>

    <div v-if="importing || uploadProgress > 0 || importProgress > 0" class="import-progress">
      <div class="progress-header">
        <span class="progress-status">{{ importStatusText }}</span>
        <span class="progress-percent">{{ currentProgressPercent }}%</span>
      </div>
      <div class="progress-stages">
        <div class="stage" :class="{ active: importStatus === 'uploading', completed: ['parsing', 'importing', 'completed'].includes(importStatus) }">
          <div class="stage-bar">
            <div class="stage-fill" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <span class="stage-label">上传</span>
        </div>
        <div class="stage" :class="{ active: ['parsing', 'importing'].includes(importStatus), completed: importStatus === 'completed' }">
          <div class="stage-bar">
            <div class="stage-fill" :style="{ width: importProgress + '%' }"></div>
          </div>
          <span class="stage-label">导入</span>
        </div>
      </div>
      <div class="progress-details" v-if="importedCount > 0">
        已导入 {{ importedCount }} 个书签
      </div>
    </div>

    <div v-if="selectedBookmarks.length > 0" class="selection-info">
      已选择 {{ selectedBookmarks.length }} 项
      <button @click="selectedBookmarks = []" class="clear-selection">清除选择</button>
    </div>

    <div v-if="hasSearch" class="search-results-info">
      搜索到 {{ filteredBookmarks.length }} 个结果
      <button @click="clearSearch" class="clear-search">清除搜索</button>
    </div>

    <div v-if="initialLoading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="filteredBookmarks.length === 0 && !hasSearch" class="empty">暂无书签，请点击上方"添加书签"按钮创建</div>
    <div v-else-if="filteredBookmarks.length === 0 && hasSearch" class="empty">没有找到匹配的书签</div>
    <template v-else>
      <div class="select-all-bar">
        <label class="select-all-label">
          <input
            type="checkbox"
            :checked="allSelected"
            @change="toggleSelectAll"
          />
          <span>全选</span>
        </label>
        <span class="bookmark-count">共 {{ filteredBookmarks.length }} 个书签</span>
      </div>

      <div class="bookmark-cards">
        <div
          v-for="(bookmark, index) in paginatedBookmarks"
          :key="bookmark.id"
          class="bookmark-card"
          :style="{ animationDelay: index * 0.05 + 's' }"
        >
          <div class="card-top">
            <input
              type="checkbox"
              :value="bookmark.id"
              v-model="selectedBookmarks"
            />
            <span v-if="getCategoryById(bookmark.categoryId)"
                  class="category-tag"
                  :style="{ backgroundColor: getCategoryById(bookmark.categoryId).color + '20', color: getCategoryById(bookmark.categoryId).color }">
              {{ getCategoryById(bookmark.categoryId).name }}
            </span>
            <span v-else class="category-tag none">未分类</span>
          </div>

          <a :href="bookmark.url" target="_blank" class="card-title-link" @click="handleClick(bookmark.id)">
            {{ bookmark.title }}
          </a>

          <a :href="bookmark.url" target="_blank" class="card-url" @click="handleClick(bookmark.id)">
            <span class="url-icon">🔗</span>
            {{ bookmark.url }}
          </a>

          <p v-if="bookmark.description" class="card-desc">{{ bookmark.description }}</p>

          <div class="card-footer">
            <span class="meta-time">
              <span class="meta-icon">🕐</span>
              {{ formatLastClicked(bookmark.lastClickedAt) }}
            </span>
            <div class="card-actions">
              <router-link :to="`/edit/${bookmark.id}`" class="btn-action btn-edit">
                <span class="action-icon">✏️</span>
                编辑
              </router-link>
              <button @click="deleteBookmark(bookmark.id)" class="btn-action btn-delete">
                <span class="action-icon">🗑️</span>
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <Pagination v-model="currentPage" :total-pages="totalPages" :total-items="filteredBookmarks.length" />
    </template>

    <div v-if="toast.show" class="toast" :class="toast.type">
      <span class="toast-icon">{{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ' }}</span>
      <span class="toast-message">{{ toast.message }}</span>
      <button @click="toast.show = false" class="toast-close">×</button>
    </div>

    <ConfirmDialog :show="confirmDialog.show" :message="confirmDialog.message" @confirm="executeConfirm" @cancel="cancelConfirm" />
  </div>
</template>

<script>
import { ref, computed, inject, onMounted, onActivated, onUnmounted } from 'vue'
import { bookmarkApi, categoryApi } from '../services/api'
import { sharedState } from '../store/sharedState'
import RecentBookmarks from '../components/RecentBookmarks.vue'
import Pagination from '../components/Pagination.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { logger } from '../services/logger'

export default {
  name: 'BookmarkList',
  components: {
    RecentBookmarks,
    Pagination,
    ConfirmDialog,
  },
  setup() {
    const initialLoading = ref(sharedState.bookmarks.length === 0)
    const error = ref(null)
    const selectedBookmarks = ref([])
    const importing = ref(false)
    const uploadProgress = ref(0)
    const importProgress = ref(0)
    const importStatus = ref('uploading')
    const importStatusText = ref('等待上传...')
    const importedCount = ref(0)
    const currentPage = ref(1)

    const calculatePageSize = () => {
      const vh = window.innerHeight
      const headerEl = document.querySelector('.header')
      const headerH = headerEl ? headerEl.offsetHeight : 70
      const overhead = 64 + 48 + 64 + 52 + 90
      const cardH = 100
      const count = Math.floor((vh - headerH - overhead) / cardH)
      return Math.max(5, Math.min(30, count))
    }

    const pageSize = ref(calculatePageSize())

    const handleResize = () => {
      const newSize = calculatePageSize()
      if (newSize !== pageSize.value) {
        pageSize.value = newSize
        currentPage.value = 1
      }
    }

    const needsAnimation = ref(true)

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

    const currentProgressPercent = computed(() => {
      if (importStatus.value === 'uploading') {
        return Math.round(uploadProgress.value * 0.3)
      } else if (importStatus.value === 'parsing') {
        return Math.round(30 + importProgress.value * 0.2)
      } else if (importStatus.value === 'importing') {
        return Math.round(50 + importProgress.value * 0.5)
      } else if (importStatus.value === 'completed') {
        return 100
      }
      return 0
    })

    const searchKeyword = inject('searchKeyword')
    const searchCategoryId = inject('searchCategoryId')

    const allSelected = computed(() => {
      return paginatedBookmarks.value.length > 0 &&
             selectedBookmarks.value.length === paginatedBookmarks.value.length
    })

    const toggleSelectAll = () => {
      if (allSelected.value) {
        selectedBookmarks.value = []
      } else {
        selectedBookmarks.value = paginatedBookmarks.value.map(b => b.id)
      }
    }

    const hasSearch = computed(() => {
      return (searchKeyword.value && searchKeyword.value.trim() !== '') ||
             searchCategoryId.value !== null
    })

    const filteredBookmarks = computed(() => {
      let result = [...sharedState.bookmarks]

      if (searchCategoryId.value !== null) {
        result = result.filter(b => b.categoryId === searchCategoryId.value)
      }

      if (searchKeyword.value && searchKeyword.value.trim() !== '') {
        const keyword = searchKeyword.value.toLowerCase().trim()
        result = result.filter(b =>
          b.title.toLowerCase().includes(keyword) ||
          b.url.toLowerCase().includes(keyword) ||
          (b.description && b.description.toLowerCase().includes(keyword))
        )
      }

      result.sort((a, b) => {
        const timeA = a.lastClickedAt ? new Date(a.lastClickedAt).getTime() : 0
        const timeB = b.lastClickedAt ? new Date(b.lastClickedAt).getTime() : 0
        return timeB - timeA
      })

      return result
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredBookmarks.value.length / pageSize.value) || 1
    })

    const paginatedBookmarks = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredBookmarks.value.slice(start, end)
    })

    const fetchBookmarks = async () => {
      error.value = null
      try {
        const response = await bookmarkApi.getAll()
        sharedState.bookmarks = response
        initialLoading.value = false
        if (currentPage.value > totalPages.value) {
          currentPage.value = Math.max(1, totalPages.value)
        }
      } catch (err) {
        error.value = '获取书签失败'
        logger.error(err)
      }
    }

    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getAll()
        sharedState.categories = response
      } catch (err) {
        logger.error('获取分类失败', err)
      }
    }

    const getCategoryById = (id) => {
      if (!id) return null
      return sharedState.categories.find(c => c.id === id)
    }

    const handleClick = async (id) => {
      try {
        await bookmarkApi.click(id)
        const bookmark = sharedState.bookmarks.find(b => b.id === id)
        if (bookmark) {
          bookmark.lastClickedAt = new Date().toISOString()
        }
        sharedState.recentRefreshKey++
      } catch (err) {
        logger.error('记录点击失败', err)
      }
    }

    const deleteBookmark = async (id) => {
      showConfirm('确定要删除这个书签吗？', async () => {
        try {
          await bookmarkApi.delete(id)
          showToast('删除成功')
          // 直接从sharedState中删除对应的书签，避免重新加载数据导致页面闪烁
          const index = sharedState.bookmarks.findIndex(b => b.id === id)
          if (index !== -1) {
            sharedState.bookmarks.splice(index, 1)
          }
        } catch (err) {
          showToast('删除书签失败', 'error')
          logger.error(err)
        }
      })
    }

    const deleteSelectedBookmarks = async () => {
      showConfirm(`确定要删除选中的 ${selectedBookmarks.value.length} 个书签吗？`, async () => {
        try {
          await bookmarkApi.batchDelete(selectedBookmarks.value)
          selectedBookmarks.value = []
          showToast('批量删除成功')
          fetchBookmarks()
        } catch (err) {
          showToast('批量删除失败', 'error')
          logger.error(err)
        }
      })
    }

    const clearSearch = () => {
      searchKeyword.value = ''
      searchCategoryId.value = null
      currentPage.value = 1
    }

    const handleImport = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      importing.value = true
      uploadProgress.value = 0
      importProgress.value = 0
      importStatus.value = 'uploading'
      importStatusText.value = '正在上传文件...'
      importedCount.value = 0

      try {
        const response = await bookmarkApi.import(file)

        const data = response
        if (data.taskId) {
          const taskId = data.taskId
          importStatus.value = 'parsing'
          importStatusText.value = '文件上传完成，等待解析...'
          uploadProgress.value = 100

          // 轮询导入进度
          let pollCount = 0
          const poll = async () => {
            pollCount++
            try {
              const progress = await bookmarkApi.getProgress(taskId)
              importStatus.value = progress.status || 'importing'
              importProgress.value = progress.percent || 0
              importStatusText.value = progress.message || getStatusText(progress.status)
              importedCount.value = progress.current || 0

              if (progress.status === 'completed') {
                importProgress.value = 100
                importStatus.value = 'completed'
                importStatusText.value = progress.message || '导入完成'
                importing.value = false
                uploadProgress.value = 0
                importProgress.value = 0
                showToast(progress.message || '导入成功', 'success')
                await fetchBookmarks()
                await fetchCategories()
                return
              }

              if (progress.status === 'failed') {
                importing.value = false
                importStatus.value = 'failed'
                importStatusText.value = '导入失败: ' + (progress.message || '')
                showToast('导入失败: ' + (progress.message || ''), 'error')
                return
              }

              if (pollCount < 60) {
                setTimeout(poll, 1000)
              }
            } catch {
              if (pollCount < 60) {
                setTimeout(poll, 1000)
              }
            }
          }
          poll()
        } else {
          importStatus.value = 'completed'
          importStatusText.value = '导入完成'
          setTimeout(() => {
            importing.value = false
            uploadProgress.value = 0
            importProgress.value = 0
            showToast(data.message || '导入成功', 'success')
            fetchBookmarks()
            fetchCategories()
          }, 500)
        }
      } catch (err) {
        logger.error('Import error:', err)
        importing.value = false
        uploadProgress.value = 0
        importProgress.value = 0
        importStatus.value = 'failed'
        importStatusText.value = '导入失败'
        showToast('导入失败: ' + (err.message || ''), 'error')
      }
      event.target.value = ''
    }

    const getStatusText = (status) => {
      const statusMap = {
        'uploading': '正在上传...',
        'parsing': '正在解析...',
        'importing': '正在导入...',
        'completed': '导入完成',
        'failed': '导入失败'
      }
      return statusMap[status] || status
    }

    const handleExport = async () => {
      try {
        const blob = await bookmarkApi.export()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'bookmarks.html')
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } catch (err) {
        showToast('导出失败', 'error')
        logger.error(err)
      }
    }

    const formatLastClicked = (lastClickedAt) => {
      if (!lastClickedAt) return '从未访问'
      const date = new Date(lastClickedAt)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) return '刚刚'
      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      if (days < 7) return `${days}天前`
      return date.toLocaleDateString()
    }

    onMounted(() => {
      if (sharedState.bookmarks.length === 0) {
        fetchBookmarks()
      }
      if (sharedState.categories.length === 0) {
        fetchCategories()
      }
      needsAnimation.value = true
      window.addEventListener('resize', handleResize)
    })

    onActivated(() => {
      initialLoading.value = false
      needsAnimation.value = false
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    return {
      initialLoading,
      error,
      selectedBookmarks,
      allSelected,
      hasSearch,
      filteredBookmarks,
      paginatedBookmarks,
      totalPages,
      currentPage,

      importing,
      uploadProgress,
      importProgress,
      importStatus,
      importStatusText,
      importedCount,
      currentProgressPercent,
      toast,
      confirmDialog,
      showConfirm,
      cancelConfirm,
      executeConfirm,
      getCategoryById,
      handleClick,
      deleteBookmark,
      deleteSelectedBookmarks,
      toggleSelectAll,
      clearSearch,
      handleImport,
      handleExport,
      formatLastClicked,
      needsAnimation
    }
  }
}
</script>

<style scoped>
.bookmark-list {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  animation: fadeInUp 0.3s ease;
  font-family: var(--font-sans);
}

.bookmark-list.no-animation {
  animation: none;
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

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0;
  font-family: var(--font-sans);
}

.btn-add {
  display: inline-block;
  padding: 0.6rem 1rem;
  background: var(--color-ink);
  color: #fff;
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-sans);
}

.btn-add:hover {
  background: var(--color-ink-secondary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.header-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-import, .btn-export, .btn-delete-batch {
  display: inline-block;
  padding: 0.6rem 1rem;
  color: #fff;
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition);
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
}

.btn-import {
  background: #9B59B6;
  box-shadow: var(--shadow-sm);
}

.btn-import:hover:not(:disabled) {
  background: #8E44AD;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-export {
  background: #3498DB;
  box-shadow: var(--shadow-sm);
}

.btn-export:hover {
  background: #2980B9;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-delete-batch {
  background: var(--color-accent);
  box-shadow: var(--shadow-sm);
}

.btn-delete-batch:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.import-progress {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
  background-color: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.progress-status {
  font-size: 14px;
  color: var(--color-ink);
  font-weight: 500;
  font-family: var(--font-sans);
}

.progress-percent {
  font-size: 16px;
  color: var(--color-accent);
  font-weight: 700;
  font-family: var(--font-sans);
}

.progress-stages {
  display: flex;
  gap: 1.5rem;
}

.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stage-bar {
  height: 10px;
  background-color: var(--color-border-light);
  border-radius: 5px;
  overflow: hidden;
}

.stage-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 5px;
}

.stage.active .stage-fill {
  background: var(--color-accent);
  animation: pulse 1.5s infinite;
}

.stage.completed .stage-fill {
  background: var(--color-success-text);
}

.stage:not(.active):not(.completed) .stage-fill {
  background: var(--color-border);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.stage-label {
  font-size: 12px;
  color: var(--color-ink-muted);
  text-align: center;
  font-family: var(--font-sans);
}

.stage.active .stage-label {
  color: var(--color-accent);
  font-weight: 500;
}

.stage.completed .stage-label {
  color: var(--color-success-text);
  font-weight: 500;
}

.progress-details {
  width: 100%;
  margin-top: 0.5rem;
  font-size: 13px;
  color: var(--color-ink-muted);
  text-align: center;
  font-family: var(--font-sans);
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--color-warning-bg);
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-size: 14px;
  color: var(--color-warning-text);
  font-family: var(--font-sans);
}

.clear-selection {
  padding: 0.3rem 0.75rem;
  background-color: #fff;
  color: var(--color-warning-text);
  border: 1px solid var(--color-warning-text);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  transition: all var(--transition);
  font-family: var(--font-sans);
}

.clear-selection:hover {
  background-color: var(--color-warning-text);
  color: #fff;
}

.search-results-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--color-accent-bg);
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-size: 14px;
  color: var(--color-accent);
  font-family: var(--font-sans);
}

.clear-search {
  padding: 0.3rem 0.75rem;
  background-color: #fff;
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  transition: all var(--transition);
  font-family: var(--font-sans);
}

.clear-search:hover {
  background-color: var(--color-accent);
  color: #fff;
}

.loading, .error, .empty {
  text-align: center;
  padding: 3rem;
  color: var(--color-ink-muted);
  font-size: 15px;
  font-family: var(--font-sans);
}

.error {
  color: var(--color-error-text);
}

.select-all-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--color-bg);
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-family: var(--font-sans);
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-ink-secondary);
}

.select-all-label input {
  cursor: pointer;
}

.bookmark-count {
  font-size: 13px;
  color: var(--color-ink-muted);
  font-family: var(--font-sans);
}

.bookmark-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.bookmark-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.25rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
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

.bookmark-card:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-top input {
  cursor: pointer;
}

.card-title-link {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-ink);
  text-decoration: none;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color var(--transition);
  font-family: var(--font-sans);
}

.card-title-link:hover {
  color: var(--color-accent);
}

.category-tag {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  background-color: var(--color-tag-bg);
  font-family: var(--font-sans);
  flex-shrink: 0;
}

.category-tag.none {
  background-color: var(--color-tag-bg);
  color: var(--color-ink-muted);
}

.card-url {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 12px;
  color: var(--color-ink-muted);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-sans);
  transition: color var(--transition);
}

.card-url:hover {
  color: var(--color-accent);
  text-decoration: underline;
}

.url-icon {
  font-size: 10px;
  flex-shrink: 0;
}

.card-desc {
  font-size: 13px;
  color: var(--color-ink-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  font-family: var(--font-sans);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border-light);
  gap: 0.5rem;
}

.meta-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 12px;
  color: var(--color-ink-muted);
  font-family: var(--font-sans);
  flex-shrink: 0;
}

.meta-icon {
  font-size: 10px;
}

.card-actions {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all var(--transition);
  text-decoration: none;
  background: var(--color-surface);
  font-family: var(--font-sans);
}

.action-icon {
  font-size: 10px;
}

.btn-edit {
  color: var(--color-ink-secondary);
}

.btn-edit:hover {
  background-color: var(--color-bg);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.btn-delete {
  color: var(--color-accent);
}

.btn-delete:hover {
  background-color: var(--color-accent-bg);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background-color: var(--color-ink);
  color: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 9999;
  animation: slideIn 0.3s ease;
  max-width: 400px;
  font-family: var(--font-sans);
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
  border-left: 4px solid var(--color-success-text);
}

.toast.error {
  border-left: 4px solid var(--color-error-text);
}

.toast.info {
  border-left: 4px solid var(--color-accent);
}

.toast-icon {
  font-size: 1.25rem;
  font-weight: bold;
}

.toast-message {
  flex: 1;
  font-size: 14px;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.toast-close:hover {
  color: #fff;
}

@media (max-width: 768px) {
  .bookmark-list {
    padding: 1rem;
  }

  .header-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .header-buttons {
    width: 100%;
    flex-wrap: wrap;
  }

  .bookmark-cards {
    grid-template-columns: 1fr;
  }

  .bookmark-card {
    padding: 1rem;
  }

  .card-top {
    flex-wrap: wrap;
  }

  .card-title-link {
    font-size: 14px;
  }

  .card-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .card-actions {
    width: 100%;
  }

  .btn-action {
    flex: 1;
  }

  .toast {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
  }
}
</style>
