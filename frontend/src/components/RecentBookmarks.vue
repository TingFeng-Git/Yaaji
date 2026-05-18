<template>
  <div class="recent-bookmarks" v-if="recentBookmarks.length > 0">
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

    const fetchRecentBookmarks = async () => {
      try {
        const response = await bookmarkApi.getRecent(3)
        recentBookmarks.value = response.data
      } catch (err) {
        logger.error('获取最近访问书签失败', err)
      }
    }

    const getCategoryById = (id) => {
      if (!id) return null
      return sharedState.categories.find(c => c.id === id)
    }

    const recordClick = async (id) => {
      try {
        await bookmarkApi.recordClick(id)
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
      getCategoryById,
      recordClick,
      formatLastClicked
    }
  }
}
</script>

<style scoped>
.recent-bookmarks {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
}

.recent-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.recent-icon {
  font-size: 18px;
}

.recent-count {
  font-size: 13px;
  color: #999;
  background-color: #f5f5f5;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
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
  background-color: #f8f9fa;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.recent-item:hover {
  background-color: #f0f5ff;
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateX(4px);
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
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-item-url {
  font-size: 12px;
  color: #667eea;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
}

.recent-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .recent-bookmarks {
    padding: 1rem;
  }

  .recent-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .recent-item-meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
