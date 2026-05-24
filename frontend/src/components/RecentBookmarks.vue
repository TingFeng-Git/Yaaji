<template>
  <div v-if="recentBookmarks.length > 0 || loading || error" class="recent-bookmarks">
    <div v-if="loading" class="loading">加载最近访问...</div>
    <div v-else-if="error" class="error-recent">加载失败: {{ error }}</div>
    <div v-else>
      <div class="recent-header">
        <h3 class="recent-title">
          <span class="recent-icon">🕐</span>
          最近访问
        </h3>
        <span class="recent-count">{{ recentBookmarks.length }} 个</span>
      </div>
      <div class="recent-list">
        <a
          v-for="bookmark in recentBookmarks"
          :key="bookmark.id"
          :href="bookmark.url"
          target="_blank"
          class="recent-item"
          @click="recordClick(bookmark.id)"
        >
          <div class="recent-item-content">
            <span class="recent-item-title">{{ bookmark.title }}</span>
            <span class="recent-item-url">{{ bookmark.url }}</span>
          </div>
          <div class="recent-item-meta">
            <span v-if="getCategoryById(bookmark.categoryId)"
                  class="recent-category"
                  :style="{ backgroundColor: getCategoryById(bookmark.categoryId).color + '20', color: getCategoryById(bookmark.categoryId).color }">
              {{ getCategoryById(bookmark.categoryId).name }}
            </span>
            <span class="recent-time">{{ formatLastClicked(bookmark.lastClickedAt) }}</span>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { bookmarkApi } from '../services/api'
import { sharedState } from '../store/sharedState'
import { logger } from '../services/logger'

export default {
  name: 'RecentBookmarks',
  setup() {
    const recentBookmarks = ref([])
    const loading = ref(true)
    const error = ref(null)

    const fetchRecentBookmarks = async () => {
      loading.value = true
      error.value = null
      try {
        const response = await bookmarkApi.getRecent(3)
        recentBookmarks.value = response || []
      } catch (err) {
        error.value = err.message || '获取最近访问失败'
        recentBookmarks.value = []
      } finally {
        loading.value = false
      }
    }

    const getCategoryById = (id) => {
      if (!id) return null
      return sharedState.categories.find(c => c.id === id)
    }

    const recordClick = async (id) => {
      try {
        await bookmarkApi.click(id)
        const bookmark = recentBookmarks.value.find(b => b.id === id)
        if (bookmark) {
          bookmark.lastClickedAt = new Date().toISOString()
        }
        sharedState.recentRefreshKey++
      } catch (err) {
        logger.error('记录点击失败', err)
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
      fetchRecentBookmarks()
    })

    watch(() => sharedState.recentRefreshKey, () => {
      fetchRecentBookmarks()
    })

    return {
      recentBookmarks,
      loading,
      error,
      getCategoryById,
      recordClick,
      formatLastClicked
    }
  }
}
</script>

<style scoped>
.recent-bookmarks {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
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

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border-light);
}

.recent-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0;
  font-family: var(--font-sans);
}

.recent-icon {
  font-size: 18px;
}

.recent-count {
  font-size: 13px;
  color: var(--color-ink-muted);
  background-color: var(--color-tag-bg);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-family: var(--font-sans);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  background-color: var(--color-bg);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all var(--transition);
  border: 1px solid transparent;
  font-family: var(--font-sans);
}

.recent-item:hover {
  background-color: var(--color-border-light);
  border-color: var(--color-border);
}

.recent-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.recent-item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-sans);
}

.recent-item-url {
  font-size: 12px;
  color: var(--color-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-sans);
}

.recent-item-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.recent-category {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  background-color: var(--color-tag-bg);
  font-family: var(--font-sans);
}

.recent-time {
  font-size: 12px;
  color: var(--color-ink-muted);
  white-space: nowrap;
  font-family: var(--font-sans);
}

.loading, .error-recent, .empty-recent {
  text-align: center;
  padding: 2rem;
  color: var(--color-ink-muted);
  font-size: 14px;
  font-family: var(--font-sans);
}

.error-recent {
  color: var(--color-error-text);
}

@media (max-width: 768px) {
  .recent-bookmarks {
    padding: 1rem;
  }

  .recent-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    overflow: hidden;
  }

  .recent-item-content {
    width: 100%;
    min-width: 0;
  }

  .recent-item-meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
