<template>
  <div class="bookmark-list" :class="{ 'no-animation': !needsAnimation }">
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
        <button @click="$emit('add')" class="btn-add">+ 添加书签</button>
      </div>
    </div>

    <div v-if="importing" class="import-progress">
      <div class="progress-header">
        <span class="progress-status">{{ importStatusText }}</span>
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

    <div v-if="loading" class="loading">加载中...</div>
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
            <button @click="$emit('edit', bookmark.id)" class="btn-action btn-edit">
              <span class="action-icon">✏️</span>
              编辑
            </button>
            <button @click="deleteBookmark(bookmark.id)" class="btn-action btn-delete">
              <span class="action-icon">🗑️</span>
              删除
            </button>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="totalPages > 1">
        <div class="pagination-info">
          共 {{ filteredBookmarks.length }} 条，第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div class="pagination-controls">
          <button @click="currentPage = 1" :disabled="currentPage === 1" class="page-btn">首页</button>
          <button @click="currentPage--" :disabled="currentPage === 1" class="page-btn">上一页</button>
          <div class="page-numbers">
            <button
              v-for="page in visiblePages"
              :key="page"
              @click="currentPage = page"
              class="page-btn"
              :class="{ active: currentPage === page }"
            >
              {{ page }}
            </button>
          </div>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="page-btn">下一页</button>
          <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="page-btn">末页</button>
        </div>
      </div>
    </template>

    <div v-if="toast.show" class="toast" :class="toast.type">
      <span class="toast-icon">{{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ' }}</span>
      <span class="toast-message">{{ toast.message }}</span>
      <button @click="toast.show = false" class="toast-close">×</button>
    </div>

    <div v-if="confirmDialog.show" class="confirm-overlay">
      <div class="confirm-dialog">
        <div class="confirm-icon">⚠️</div>
        <div class="confirm-message">{{ confirmDialog.message }}</div>
        <div class="confirm-actions">
          <button @click="cancelConfirm" class="confirm-btn cancel">取消</button>
          <button @click="executeConfirm" class="confirm-btn confirm">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useBookmarkStore } from '../../shared/store/bookmarkStore.js'

export default {
  name: 'BookmarkList',
  emits: ['edit', 'add'],
  setup() {
    const { bookmarks, categories, bookmarkApi, categoryApi, loadFromStorage } = useBookmarkStore()

    const loading = ref(false)
    const error = ref(null)
    const selectedBookmarks = ref([])
    const importing = ref(false)
    const importStatusText = ref('')
    const currentPage = ref(1)
    const pageSize = ref(10)
    const needsAnimation = ref(true)

    const searchKeyword = inject('searchKeyword', ref(''))
    const searchCategoryId = inject('searchCategoryId', ref(null))

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
      let result = [...bookmarks.value]

      if (searchCategoryId.value !== null) {
        result = result.filter(b => b.categoryId == searchCategoryId.value)
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

    const visiblePages = computed(() => {
      const pages = []
      const total = totalPages.value
      const current = currentPage.value
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

    const fetchBookmarks = async () => {
      loading.value = true
      error.value = null
      try {
        await loadFromStorage()
      } catch (err) {
        error.value = '获取书签失败'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    const getCategoryById = (id) => {
      if (!id) return null
      return categories.value.find(c => c.id === id)
    }

    const handleClick = async (id) => {
      try {
        await bookmarkApi.recordClick(id)
        const bookmark = bookmarks.value.find(b => b.id === id)
        if (bookmark) {
          bookmark.lastClickedAt = new Date().toISOString()
        }
      } catch (err) {
        console.error('记录点击失败', err)
      }
    }

    const deleteBookmark = async (id) => {
      showConfirm('确定要删除这个书签吗？', async () => {
        try {
          await bookmarkApi.delete(id)
          showToast('删除成功')
          const index = bookmarks.value.findIndex(b => b.id === id)
          if (index !== -1) {
            bookmarks.value.splice(index, 1)
          }
        } catch (err) {
          showToast('删除书签失败', 'error')
          console.error(err)
        }
      })
    }

    const deleteSelectedBookmarks = async () => {
      showConfirm(`确定要删除选中的 ${selectedBookmarks.value.length} 个书签吗？`, async () => {
        try {
          await bookmarkApi.deleteBatch(selectedBookmarks.value)
          selectedBookmarks.value = []
          showToast('批量删除成功')
          await fetchBookmarks()
        } catch (err) {
          showToast('批量删除失败', 'error')
          console.error(err)
        }
      })
    }

    const clearSearch = () => {
      searchKeyword.value = ''
      searchCategoryId.value = null
      currentPage.value = 1
    }

    const parseBookmarkFile = (htmlContent) => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlContent, 'text/html')
      const bookmarks = []
      const categoryMap = new Map()

      const parseNode = (node, currentCategory = null) => {
        // 处理分类标题 (H3)
        if (node.nodeName === 'H3' && node.hasAttribute('ADD_DATE')) {
          const categoryName = node.textContent.trim()
          // 跳过根目录"书签栏"
          if (categoryName && categoryName !== '书签栏' && categoryName !== 'Bookmarks' && categoryName !== '书签' && categoryName !== 'Bookmarks Bar') {
            currentCategory = categoryName
            categoryMap.set(categoryName, true)
          }
          // 获取相邻的 DL 元素（分类内容）
          const sibling = node.nextElementSibling
          if (sibling && sibling.nodeName === 'DL') {
            for (const child of sibling.childNodes || []) {
              parseNode(child, currentCategory)
            }
          }
          return // 处理完 H3 后不再遍历其 childNodes，避免重复
        }

        // 处理书签链接 (A)
        if (node.nodeName === 'A' && node.href) {
          const title = node.textContent.trim()
          if (title && node.href.startsWith('http')) {
            bookmarks.push({
              title,
              url: node.href,
              description: '',
              categoryName: currentCategory
            })
          }
        }

        // 处理 DT 元素，递归其子节点
        if (node.nodeName === 'DT') {
          for (const child of node.childNodes || []) {
            parseNode(child, currentCategory)
          }
        }
      }

      // 从根 DL 开始解析
      const dl = doc.querySelector('dl')
      if (dl) {
        for (const child of dl.childNodes || []) {
          parseNode(child, null)
        }
      }

      // 去重：基于 URL 去重
      const uniqueBookmarks = []
      const seenUrls = new Set()
      for (const bm of bookmarks) {
        if (!seenUrls.has(bm.url)) {
          seenUrls.add(bm.url)
          uniqueBookmarks.push(bm)
        }
      }

      return { bookmarks: uniqueBookmarks, categories: Array.from(categoryMap.keys()) }
    }

    const handleImport = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      importing.value = true
      importStatusText.value = '正在解析文件...'

      try {
        const content = await file.text()
        const { bookmarks: importedBookmarks, categories: categoryNames } = parseBookmarkFile(content)

        if (importedBookmarks.length === 0) {
          showToast('未找到有效的书签', 'error')
          importing.value = false
          return
        }

        importStatusText.value = `正在导入分类...`
        for (const name of categoryNames) {
          try {
            await categoryApi.create({ name, color: '#667eea' })
          } catch (err) {
            console.warn('分类创建失败（可能已存在）:', name)
          }
        }

        await loadFromStorage()
        const nameToIdMap = {}
        categories.value.forEach(c => {
          nameToIdMap[c.name] = c.id
        })

        importStatusText.value = `正在导入 ${importedBookmarks.length} 个书签...`
        const bookmarksWithCategoryId = importedBookmarks.map(b => ({
          title: b.title,
          url: b.url,
          description: b.description,
          categoryId: b.categoryName ? nameToIdMap[b.categoryName] || null : null
        }))

        await bookmarkApi.importBookmarks(bookmarksWithCategoryId)

        showToast(`成功导入 ${importedBookmarks.length} 个书签`)
        await fetchBookmarks()
      } catch (err) {
        showToast('导入失败: ' + err.message, 'error')
        console.error(err)
      } finally {
        importing.value = false
        importStatusText.value = ''
      }

      event.target.value = ''
    }

    const handleExport = async () => {
      try {
        await loadFromStorage()
        // 如果有勾选，则只导出勾选的书签；否则导出全部
        const bookmarkList = selectedBookmarks.value.length > 0
          ? bookmarks.value.filter(b => selectedBookmarks.value.includes(b.id))
          : bookmarks.value

        if (bookmarkList.length === 0) {
          showToast('没有可导出的书签', 'error')
          return
        }

        // 按分类分组书签
        const categoryMap = new Map()
        const uncategorized = []

        bookmarkList.forEach(bm => {
          if (bm.categoryId) {
            const category = categories.value.find(c => c.id === bm.categoryId)
            const catName = category ? category.name : '未分类'
            if (!categoryMap.has(catName)) {
              categoryMap.set(catName, [])
            }
            categoryMap.get(catName).push(bm)
          } else {
            uncategorized.push(bm)
          }
        })

        // 生成 Netscape Bookmark 格式的 HTML
        const escapeHtml = (str) => {
          return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
        }

        const generateBookmarkItem = (bm) => {
          const addDate = bm.createdAt ? Math.floor(new Date(bm.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000)
          return `           <DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${addDate}">${escapeHtml(bm.title)}</A>`
        }

        let htmlContent = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
      It will be read and overwritten.
      DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}" LAST_MODIFIED="${Math.floor(Date.now() / 1000)}" PERSONAL_TOOLBAR_FOLDER="true">书签栏</H3>
    <DL><p>
`

        // 导出有分类的书签
        categoryMap.forEach((bookmarks, categoryName) => {
          const addDate = Math.floor(Date.now() / 1000)
          htmlContent += `        <DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${addDate}">${escapeHtml(categoryName)}</H3>\n`
          htmlContent += `        <DL><p>\n`
          bookmarks.forEach(bm => {
            htmlContent += generateBookmarkItem(bm) + '\n'
          })
          htmlContent += `        </DL><p>\n`
        })

        // 导出未分类的书签
        if (uncategorized.length > 0) {
          const addDate = Math.floor(Date.now() / 1000)
          htmlContent += `        <DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${addDate}">未分类</H3>\n`
          htmlContent += `        <DL><p>\n`
          uncategorized.forEach(bm => {
            htmlContent += generateBookmarkItem(bm) + '\n'
          })
          htmlContent += `        </DL><p>\n`
        }

        htmlContent += `    </DL><p>
</DL><p>
`

        const blob = new Blob([htmlContent], { type: 'text/html; charset=UTF-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `bookmarks_${new Date().toISOString().split('T')[0]}.html`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)

        showToast(`成功导出 ${bookmarkList.length} 个书签`)
      } catch (err) {
        showToast('导出失败', 'error')
        console.error(err)
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
      fetchBookmarks()
      needsAnimation.value = true
    })

    return {
      bookmarks,
      categories,
      loading,
      error,
      selectedBookmarks,
      allSelected,
      hasSearch,
      filteredBookmarks,
      paginatedBookmarks,
      totalPages,
      currentPage,
      visiblePages,
      importing,
      importStatusText,
      toast,
      confirmDialog,
      needsAnimation,
      getCategoryById,
      handleClick,
      deleteBookmark,
      deleteSelectedBookmarks,
      toggleSelectAll,
      clearSearch,
      handleImport,
      handleExport,
      formatLastClicked,
      showConfirm,
      cancelConfirm,
      executeConfirm
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
  border: none;
  cursor: pointer;
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
}

.progress-status {
  font-size: 14px;
  color: #333;
  font-weight: 500;
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
  background: transparent;
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
  padding: 1.5rem;
  width: 90%;
  max-width: 360px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.confirm-icon {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 1rem;
}

.confirm-message {
  font-size: 15px;
  color: #333;
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
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn.cancel {
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.confirm-btn.cancel:hover {
  background-color: #e8e8e8;
}

.confirm-btn.confirm {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: #fff;
  border: none;
  box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
}

.confirm-btn.confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
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
