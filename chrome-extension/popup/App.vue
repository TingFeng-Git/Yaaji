<template>
  <div class="popup-container">
    <div class="popup-header">
      <span class="logo">📚</span>
      <h1>雅集</h1>
    </div>
    
    <div v-if="loading" class="loading">加载中...</div>
    
    <form v-else @submit.prevent="saveBookmark" class="bookmark-form">
      <div class="form-group">
        <input 
          type="url" 
          v-model="form.url" 
          placeholder="网址 URL"
          required
          class="form-input"
        />
      </div>
      
      <div class="form-group">
        <input 
          type="text" 
          v-model="form.title" 
          placeholder="标题"
          required
          class="form-input"
        />
      </div>
      
      <div class="form-group">
        <select v-model="form.categoryId" class="form-select">
          <option :value="null">选择分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="openOptions" class="btn-manage">
          管理书签
        </button>
        <button type="submit" class="btn-save" :disabled="saving">
          {{ saving ? '保存中...' : '添加书签' }}
        </button>
      </div>
    </form>

    <div v-if="recentBookmarks.length > 0" class="recent-section">
      <h3>最近访问</h3>
      <div class="recent-list">
        <a 
          v-for="bookmark in recentBookmarks" 
          :key="bookmark.id"
          :href="bookmark.url"
          target="_blank"
          class="recent-item"
          @click="recordClick(bookmark.id)"
        >
          <span class="recent-title">{{ bookmark.title }}</span>
          <span v-if="getCategoryById(bookmark.categoryId)" 
                class="recent-category"
                :style="{ backgroundColor: getCategoryById(bookmark.categoryId).color + '20', color: getCategoryById(bookmark.categoryId).color }">
            {{ getCategoryById(bookmark.categoryId).name }}
          </span>
        </a>
      </div>
    </div>

    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useBookmarkStore } from '../shared/store/bookmarkStore.js'

export default {
  name: 'PopupApp',
  setup() {
    const { bookmarks, categories, bookmarkApi, categoryApi, loadFromStorage } = useBookmarkStore()
    
    const loading = ref(true)
    const saving = ref(false)
    const form = ref({
      url: '',
      title: '',
      categoryId: null
    })

    const toast = ref({
      show: false,
      type: 'success',
      message: ''
    })

    const showToast = (message, type = 'success') => {
      toast.value = { show: true, type, message }
      setTimeout(() => {
        toast.value.show = false
      }, 2000)
    }

    const recentBookmarks = ref([])

    const getCurrentTab = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        return tab
      } catch (err) {
        console.error('获取当前标签页失败', err)
        return null
      }
    }

    const initForm = async () => {
      const tab = await getCurrentTab()
      if (tab) {
        form.value.url = tab.url || ''
        form.value.title = tab.title || ''
      }
    }

    const getCategoryById = (id) => {
      if (!id) return null
      return categories.value.find(c => c.id === id)
    }

    const saveBookmark = async () => {
      if (!form.value.url || !form.value.title) {
        showToast('请填写完整信息', 'error')
        return
      }

      saving.value = true
      try {
        const checkResult = await bookmarkApi.checkUrl(form.value.url)
        if (checkResult.data.exists) {
          showToast('该网址已存在', 'error')
          saving.value = false
          return
        }

        await bookmarkApi.create({
          title: form.value.title,
          url: form.value.url,
          description: '',
          categoryId: form.value.categoryId
        })

        showToast('添加成功！')
        form.value.title = ''
        form.value.url = ''
        form.value.categoryId = null
        
        // 重新加载数据
        await loadFromStorage()
        updateRecentBookmarks()
        
        // 重新获取当前页面信息
        setTimeout(() => {
          initForm()
        }, 500)
      } catch (err) {
        showToast('添加失败', 'error')
        console.error(err)
      } finally {
        saving.value = false
      }
    }

    const recordClick = async (id) => {
      try {
        await bookmarkApi.recordClick(id)
      } catch (err) {
        console.error('记录点击失败', err)
      }
    }

    const openOptions = () => {
      chrome.runtime.openOptionsPage()
      window.close()
    }

    const updateRecentBookmarks = () => {
      recentBookmarks.value = [...bookmarks.value]
        .sort((a, b) => {
          const timeA = a.lastClickedAt ? new Date(a.lastClickedAt).getTime() : 0
          const timeB = b.lastClickedAt ? new Date(b.lastClickedAt).getTime() : 0
          return timeB - timeA
        })
        .slice(0, 5)
    }

    onMounted(async () => {
      await loadFromStorage()
      await initForm()
      updateRecentBookmarks()
      loading.value = false
    })

    return {
      loading,
      saving,
      form,
      categories,
      recentBookmarks,
      toast,
      getCategoryById,
      saveBookmark,
      recordClick,
      openOptions
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  width: 360px;
  min-height: 200px;
}

.popup-container {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100%;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.popup-header .logo {
  font-size: 24px;
}

.popup-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #fff;
  font-size: 14px;
}

.bookmark-form {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn-manage {
  flex: 1;
  padding: 10px 16px;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-manage:hover {
  background: #e8e8e8;
}

.btn-save {
  flex: 2;
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.recent-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
}

.recent-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.recent-item:hover {
  background: #f0f2f5;
  transform: translateX(4px);
}

.recent-title {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.recent-category {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.toast {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  animation: slideUp 0.3s ease;
  z-index: 10000;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.toast.success {
  background: #43e97b;
  color: #fff;
}

.toast.error {
  background: #e74c3c;
  color: #fff;
}
</style>
