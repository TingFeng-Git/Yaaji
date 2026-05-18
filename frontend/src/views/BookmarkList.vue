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
          <div class="card-checkbox">
            <input
              type="checkbox"
              :value="bookmark.id"
              v-model="selectedBookmarks"
            />
          </div>
          <div class="card-content">
            <div class="card-header">
              <a :href="bookmark.url" target="_blank" class="card-title" @click="handleClick(bookmark.id)">
                {{ bookmark.title }}
              </a>
              <span v-if="getCategoryById(bookmark.categoryId)" 
                    class="category-tag" 
                    :style="{ backgroundColor: getCategoryById(bookmark.categoryId).color + '20', color: getCategoryById(bookmark.categoryId).color }">
                {{ getCategoryById(bookmark.categoryId).name }}
              </span>
              <span v-else class="category-tag none">未分类</span>
            </div>
            <a :href="bookmark.url" target="_blank" class="card-url" @click="handleClick(bookmark.id)">
              <span class="url-icon">🔗</span>
              {{ bookmark.url }}
            </a>
            <div class="card-meta">
              <span class="meta-time">
                <span class="meta-icon">🕐</span>
                {{ formatLastClicked(bookmark.lastClickedAt) }}
              </span>
              <span v-if="bookmark.description" class="meta-desc">{{ bookmark.description }}</span>
            </div>
          </div>
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
import { ref, computed, inject, onMounted, onActivated } from 'vue'
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
    const pageSize = ref(10)
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
        sharedState.bookmarks = response.data
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
        sharedState.categories = response.data
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
        await bookmarkApi.recordClick(id)
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
          await bookmarkApi.deleteBatch(selectedBookmarks.value)
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
        const response = await bookmarkApi.importBookmarks(file, (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          uploadProgress.value = percentCompleted
          importStatusText.value = '正在上传: ' + percentCompleted + '%'
        })

        const data = response.data
        if (data.taskId) {
          importStatus.value = 'parsing'
          importStatusText.value = '文件上传完成，等待解析...'
          uploadProgress.value = 100
          pollImportProgress(data.taskId)
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

    const pollImportProgress = async (taskId) => {
      const poll = async () => {
        try {
          const response = await bookmarkApi.getImportProgress(taskId)
          const progress = response.data

          importStatus.value = progress.status || 'importing'
          importProgress.value = progress.percent || 0
          importStatusText.value = progress.message || getStatusText(progress.status)
          importedCount.value = progress.current || 0

          if (progress.status === 'completed') {
            importProgress.value = 100
            importStatus.value = 'completed'
            importStatusText.value = progress.message || '导入完成'
            setTimeout(() => {
              importing.value = false
              uploadProgress.value = 0
              importProgress.value = 0
              showToast(progress.message || '导入成功', 'success')
              fetchBookmarks()
              fetchCategories()
            }, 500)
          } else if (progress.status === 'failed') {
            importing.value = false
            importStatus.value = 'failed'
            importStatusText.value = '导入失败: ' + (progress.message || '')
            showToast('导入失败: ' + (progress.message || ''), 'error')
          } else {
            setTimeout(poll, 1000)
          }
        } catch (err) {
          logger.error('Poll progress error:', err)
          setTimeout(poll, 1000)
        }
      }
      poll()
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
        const response = await bookmarkApi.exportBookmarks()
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        const contentDisposition = response.headers['content-disposition']
        let fileName = 'bookmarks.html'
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename=(.+)/)
          if (fileNameMatch.length === 2) fileName = fileNameMatch[1]
        }
        link.setAttribute('download', fileName)
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

    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleString()
    }

    onMounted(() => {
      if (sharedState.bookmarks.length === 0) {
        fetchBookmarks()
      }
      if (sharedState.categories.length === 0) {
        fetchCategories()
      }
      needsAnimation.value = true
    })

    onActivated(() => {
      initialLoading.value = false
      needsAnimation.value = false
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
      formatDate,
      needsAnimation
    }
  }
}
</script>

<style scoped>
.bookmark-list {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  animation: fadeInUp 0.3s ease;
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
  color: #333;
  margin: 0;
}

.btn-add {
  display: inline-block;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-add:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.header-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-import, .btn-export {
  display: inline-block;
  padding: 0.6rem 1rem;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-import {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
}

.btn-import:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
}

.btn-export {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  box-shadow: 0 2px 8px rgba(79, 172, 254, 0.3);
}

.btn-export:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 172, 254, 0.4);
}

.import-progress {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.progress-status {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.progress-percent {
  font-size: 16px;
  color: #667eea;
  font-weight: 700;
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
  background-color: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
}

.stage-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 5px;
}

.stage.active .stage-fill {
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  animation: pulse 1.5s infinite;
}

.stage.completed .stage-fill {
  background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%);
}

.stage:not(.active):not(.completed) .stage-fill {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.stage-label {
  font-size: 12px;
  color: #999;
  text-align: center;
}

.stage.active .stage-label {
  color: #4facfe;
  font-weight: 500;
}

.stage.completed .stage-label {
  color: #43e97b;
  font-weight: 500;
}

.progress-details {
  width: 100%;
  margin-top: 0.5rem;
  font-size: 13px;
  color: #999;
  text-align: center;
}

.btn-delete-batch {
  display: inline-block;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
}

.btn-delete-batch:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: #fff3e0;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 14px;
  color: #e65100;
}

.clear-selection {
  padding: 0.3rem 0.75rem;
  background-color: #fff;
  color: #e65100;
  border: 1px solid #e65100;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.clear-selection:hover {
  background-color: #e65100;
  color: #fff;
}

.search-results-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: #f0f5ff;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 14px;
  color: #667eea;
}

.clear-search {
  padding: 0.3rem 0.75rem;
  background-color: #fff;
  color: #667eea;
  border: 1px solid #667eea;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.clear-search:hover {
  background-color: #667eea;
  color: #fff;
}

.loading, .error, .empty {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 15px;
}

.error {
  color: #e74c3c;
}

.select-all-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.select-all-label input {
  cursor: pointer;
}

.bookmark-count {
  font-size: 13px;
  color: #999;
}

.bookmark-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.bookmark-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  transition: all 0.2s ease;
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
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.card-checkbox {
  padding-top: 0.25rem;
}

.card-checkbox input {
  cursor: pointer;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  text-decoration: none;
  transition: color 0.2s;
  word-break: break-word;
}

.card-title:hover {
  color: #667eea;
}

.category-tag {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.category-tag.none {
  background-color: #f0f0f0;
  color: #999;
}

.card-url {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 12px;
  color: #667eea;
  text-decoration: none;
  margin-bottom: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-url:hover {
  color: #764ba2;
  text-decoration: underline;
}

.url-icon {
  font-size: 10px;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 12px;
  color: #999;
}

.meta-icon {
  font-size: 10px;
}

.meta-desc {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  text-decoration: none;
}

.action-icon {
  font-size: 10px;
}

.btn-edit {
  background-color: #f5f5f5;
  color: #667eea;
}

.btn-edit:hover {
  background-color: #667eea;
  color: #fff;
}

.btn-delete {
  background-color: #f5f5f5;
  color: #e74c3c;
}

.btn-delete:hover {
  background-color: #e74c3c;
  color: #fff;
}

.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
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

.toast.info {
  border-left: 4px solid #4facfe;
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

.toast.info .toast-icon {
  color: #4facfe;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.toast-close:hover {
  color: #333;
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
    padding: 0.875rem;
  }

  .card-actions {
    flex-direction: row;
    width: 100%;
    margin-top: 0.75rem;
  }

  .btn-action {
    flex: 1;
  }

  .pagination-controls {
    gap: 0.25rem;
  }

  .page-btn {
    padding: 0.3rem 0.5rem;
    font-size: 12px;
    min-width: 32px;
  }

  .toast {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
  }
}
</style>
