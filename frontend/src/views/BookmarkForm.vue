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
          form.value = response
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
          sharedState.categories = response
        } catch (err) {
          logger.error('获取分类失败', err)
        }
      }
    }

    const checkUrlExists = async (url) => {
      if (!url || isEdit.value) {
        urlExists.value = false
        return
      }
      try {
        const response = await bookmarkApi.checkUrl(url)
        urlExists.value = response.exists
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
        if (response.title && response.title.trim() !== '') {
          form.value.title = response.title
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
          if (response.exists) {
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
          sharedState.bookmarks.unshift(result)
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
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
  padding: 2rem;
  animation: fadeInUp 0.3s ease;
  font-family: var(--font-sans);
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
  border-bottom: 1px solid var(--color-border-light);
}

.form-header h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: 20px;
  font-weight: 600;
  font-family: var(--font-serif);
}

.btn-back {
  color: var(--color-accent);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color var(--transition);
  font-family: var(--font-sans);
}

.btn-back:hover {
  color: var(--color-accent-hover);
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  color: var(--color-ink-muted);
  font-size: 15px;
  font-family: var(--font-sans);
}

.error {
  color: var(--color-error-text);
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
  color: var(--color-ink);
  font-size: 14px;
  font-family: var(--font-sans);
}

.required {
  color: var(--color-error-text);
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
  background-color: var(--color-surface);
  color: var(--color-ink-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
  font-family: var(--font-sans);
}

.btn-fetch:hover:not(:disabled) {
  background-color: var(--color-bg);
  border-color: var(--color-border);
}

.btn-fetch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  font-size: 12px;
  color: var(--color-ink-muted);
  font-family: var(--font-sans);
}

.hint.success {
  color: var(--color-success-text);
}

.hint.warning {
  color: var(--color-accent);
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 15px;
  transition: all var(--transition);
  background-color: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-sans);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-border);
  background-color: var(--color-surface);
  box-shadow: 0 0 0 3px rgba(28,28,30,0.05);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: var(--color-ink-muted);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239A9A9E' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
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
  border-top: 1px solid var(--color-border-light);
}

.btn-cancel {
  padding: 0.875rem 1.5rem;
  background-color: var(--color-surface);
  color: var(--color-ink-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-sans);
}

.btn-cancel:hover {
  background-color: var(--color-bg);
  border-color: var(--color-border);
}

.btn-save {
  padding: 0.875rem 2rem;
  background: var(--color-ink);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-sans);
}

.btn-save:hover:not(:disabled) {
  background: var(--color-ink-secondary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .bookmark-form {
    padding: 1rem;
  }

  .form-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-cancel, .btn-save {
    width: 100%;
  }
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
