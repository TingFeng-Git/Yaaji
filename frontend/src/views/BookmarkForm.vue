<template>
  <div class="bookmark-form">
    <div class="form-header">
      <h2>{{ isEdit ? '编辑书签' : '添加书签' }}</h2>
      <router-link to="/" class="btn-back">← 返回列表</router-link>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <form v-else @submit.prevent="saveBookmark" class="form">
      <div class="form-group">
        <label for="url">网址 URL <span class="required">*</span></label>
        <div class="url-input-wrapper">
          <input
            type="url"
            id="url"
            v-model="form.url"
            @blur="handleUrlBlur"
            required
            placeholder="请输入网站URL，例如: https://www.example.com"
          />
          <button type="button" @click="fetchTitle" class="btn-fetch" :disabled="fetchingTitle">
            {{ fetchingTitle ? '获取中...' : '获取标题' }}
          </button>
        </div>
        <span class="hint success" v-if="titleHint && !urlExists">{{ titleHint }}</span>
        <span class="hint warning" v-if="urlExists">⚠️ 该网址已存在于书签中</span>
      </div>
      <div class="form-group">
        <label for="title">标题 <span class="required">*</span></label>
        <input type="text" id="title" v-model="form.title" required placeholder="请输入书签标题" />
      </div>
      <div class="form-group">
        <label for="category">分类</label>
        <select id="category" v-model="form.categoryId">
          <option :value="null">未分类</option>
          <option v-for="category in sharedState.categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label for="description">描述</label>
        <textarea id="description" v-model="form.description" placeholder="请输入书签描述（可选）" rows="4"></textarea>
      </div>
      <div class="form-actions">
        <router-link to="/" class="btn-cancel">取消</router-link>
        <button type="submit" class="btn-save" :disabled="loading || urlExists">
          {{ isEdit ? '保存修改' : '添加书签' }}
        </button>
      </div>
    </form>

    <div v-if="toast.show" class="toast" :class="toast.type">
      <span class="toast-icon">{{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '⚠' }}</span>
      <span class="toast-message">{{ toast.message }}</span>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onActivated, computed } from 'vue'
import { useRouter } from 'vue-router'
import { bookmarkApi, categoryApi, urlApi } from '../services/api'
import { sharedState } from '../store/sharedState'
import { logger } from '../services/logger'

export default {
  name: 'BookmarkForm',
  props: {
    id: {
      type: String,
      default: null
    }
  },
  setup(props) {
    const router = useRouter()
    const form = ref({
      title: '',
      url: '',
      description: '',
      categoryId: null
    })
    const loading = ref(false)
    const error = ref(null)
    const fetchingTitle = ref(false)
    const titleHint = ref('')
    const urlExists = ref(false)
    const existingBookmark = ref(null)

    const toast = ref({
      show: false,
      type: 'success',
      message: ''
    })

    const resetForm = () => {
      form.value = {
        title: '',
        url: '',
        description: '',
        categoryId: null
      }
      urlExists.value = false
      existingBookmark.value = null
      titleHint.value = ''
      error.value = null
    }

    const showToast = (message, type = 'success') => {
      toast.value = { show: true, type, message }
      setTimeout(() => {
        toast.value.show = false
      }, 3000)
    }

    const isEdit = computed(() => !!props.id)

    const fetchBookmark = async () => {
      if (isEdit.value) {
        loading.value = true
        error.value = null
        try {
          const response = await bookmarkApi.getById(props.id)
          form.value = response.data
        } catch (err) {
          error.value = '获取书签信息失败'
          logger.error(err)
        } finally {
          loading.value = false
        }
      }
    }

    const fetchCategories = async () => {
      if (sharedState.categories.length === 0) {
        try {
          const response = await categoryApi.getAll()
          sharedState.categories = response.data
        } catch (err) {
          logger.error('获取分类失败', err)
        }
      }
    }

    const checkUrlExists = async (url) => {
      if (!url || isEdit.value) {
        urlExists.value = false
        existingBookmark.value = null
        return
      }
      try {
        const response = await bookmarkApi.checkUrl(url)
        urlExists.value = response.data.exists
        existingBookmark.value = response.data.bookmark || null
      } catch (err) {
        logger.error('检查URL失败', err)
      }
    }

    const handleUrlBlur = async () => {
      const url = form.value.url
      if (!url) {
        titleHint.value = ''
        return
      }
      await checkUrlExists(url)
      if (!urlExists.value) {
        fetchTitle()
      }
    }

    const fetchTitle = async () => {
      const url = form.value.url
      if (!url) {
        titleHint.value = ''
        return
      }

      if (form.value.title && form.value.title.trim() !== '') {
        return
      }

      fetchingTitle.value = true
      titleHint.value = '正在获取网站标题...'
      try {
        const response = await urlApi.getTitle(url)
        if (response.data.title && response.data.title.trim() !== '') {
          form.value.title = response.data.title
          titleHint.value = '已自动获取标题'
        } else {
          titleHint.value = '未能获取标题，请手动输入'
        }
      } catch (err) {
        titleHint.value = '获取标题失败，请手动输入'
        logger.error(err)
      } finally {
        fetchingTitle.value = false
        setTimeout(() => {
          titleHint.value = ''
        }, 3000)
      }
    }

    const saveBookmark = async () => {
      if (!isEdit.value) {
        // 直接调用后端API检查URL是否存在，不依赖前端缓存
        try {
          const response = await bookmarkApi.checkUrl(form.value.url)
          if (response.data.exists) {
            showToast('该网址已存在，无法重复添加', 'error')
            return
          }
        } catch (err) {
          logger.error('检查URL失败', err)
          showToast('检查URL失败，请重试', 'error')
          return
        }
      }

      loading.value = true
      error.value = null
      try {
        const data = {
          title: form.value.title,
          url: form.value.url,
          description: form.value.description,
          categoryId: form.value.categoryId
        }
        if (isEdit.value) {
          await bookmarkApi.update(props.id, data)
          const index = sharedState.bookmarks.findIndex(b => b.id === parseInt(props.id))
          if (index !== -1) {
            sharedState.bookmarks[index] = { ...sharedState.bookmarks[index], ...data }
          }
        } else {
          const result = await bookmarkApi.create(data)
          sharedState.bookmarks.unshift(result.data)
        }
        router.push('/')
      } catch (err) {
        error.value = '保存书签失败'
        logger.error(err)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      if (!isEdit.value) {
        resetForm()
      }
      fetchBookmark()
      fetchCategories()
    })

    onActivated(() => {
      if (!isEdit.value) {
        resetForm()
      }
    })

    return {
      form,
      sharedState,
      loading,
      error,
      isEdit,
      fetchingTitle,
      titleHint,
      urlExists,
      existingBookmark,
      toast,
      resetForm,
      handleUrlBlur,
      fetchTitle,
      saveBookmark
    }
  }
}
</script>

<style scoped>
.bookmark-form {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 2rem;
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

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e8e8e8;
}

.form-header h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
  font-weight: 600;
}

.btn-back {
  color: #667eea;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

.btn-back:hover {
  color: #764ba2;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 15px;
}

.error {
  color: #e74c3c;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.required {
  color: #e74c3c;
}

.url-input-wrapper {
  display: flex;
  gap: 0.5rem;
}

.url-input-wrapper input {
  flex: 1;
}

.btn-fetch {
  padding: 0.75rem 1rem;
  background-color: #f5f5f5;
  color: #667eea;
  border: 1px solid #667eea;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-fetch:hover:not(:disabled) {
  background-color: #667eea;
  color: #fff;
}

.btn-fetch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  font-size: 12px;
  color: #999;
}

.hint.success {
  color: #43e97b;
}

.hint.warning {
  color: #f5576c;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 0.875rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s ease;
  background-color: #fafafa;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #aaa;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  padding-right: 2.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e8e8e8;
}

.btn-cancel {
  padding: 0.875rem 1.5rem;
  background-color: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background-color: #f5f5f5;
  border-color: #ccc;
}

.btn-save {
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
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

.toast.warning {
  border-left: 4px solid #f5576c;
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

.toast.warning .toast-icon {
  color: #f5576c;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  color: #333;
}

@media (max-width: 768px) {
  .bookmark-form {
    padding: 1.5rem;
  }

  .form-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .form-header h2 {
    font-size: 18px;
  }

  .url-input-wrapper {
    flex-direction: column;
  }

  .btn-fetch {
    width: 100%;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    padding: 0.75rem;
    font-size: 14px;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .btn-cancel,
  .btn-save {
    width: 100%;
    text-align: center;
    padding: 0.875rem 1rem;
  }

  .toast {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
  }
}
</style>
