<template>
  <div class="bookmark-list">
    <div class="header-actions">
      <div class="header-left">
        <h2 class="section-title">我的书签</h2>
      </div>
      <div class="header-buttons">
        <router-link to="/categories" class="btn-categories">分类管理</router-link>
        <router-link to="/add" class="btn-add">+ 添加书签</router-link>
      </div>
    </div>

    <div class="filter-bar" v-if="categories.length > 0">
      <button
        class="filter-btn"
        :class="{ active: selectedCategoryId === null }"
        @click="selectedCategoryId = null"
      >全部</button>
      <button
        v-for="category in categories"
        :key="category.id"
        class="filter-btn"
        :class="{ active: selectedCategoryId === category.id }"
        :style="{ '--category-color': category.color }"
        @click="selectedCategoryId = category.id"
      >
        <span class="filter-dot" :style="{ backgroundColor: category.color }"></span>
        {{ category.name }}
      </button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="filteredBookmarks.length === 0" class="empty">暂无书签，请点击上方"添加书签"按钮创建</div>
    <div v-else class="table-container">
      <table class="bookmark-table">
        <thead>
          <tr>
            <th class="col-title">标题</th>
            <th class="col-url">URL</th>
            <th class="col-category">分类</th>
            <th class="col-desc">描述</th>
            <th class="col-time">创建时间</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bookmark in filteredBookmarks" :key="bookmark.id">
            <td class="cell-title">{{ bookmark.title }}</td>
            <td class="cell-url">
              <a :href="bookmark.url" target="_blank" class="link-url">{{ bookmark.url }}</a>
            </td>
            <td class="cell-category">
              <span v-if="getCategoryById(bookmark.categoryId)" class="category-tag" :style="{ backgroundColor: getCategoryById(bookmark.categoryId).color + '20', color: getCategoryById(bookmark.categoryId).color }">
                {{ getCategoryById(bookmark.categoryId).name }}
              </span>
              <span v-else class="category-tag none">未分类</span>
            </td>
            <td class="cell-desc">{{ bookmark.description || '-' }}</td>
            <td class="cell-time">{{ formatDate(bookmark.createdAt) }}</td>
            <td class="cell-actions">
              <router-link :to="`/edit/${bookmark.id}`" class="btn-action btn-edit">编辑</router-link>
              <button @click="deleteBookmark(bookmark.id)" class="btn-action btn-delete">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { bookmarkApi, categoryApi } from '../services/api'

export default {
  name: 'BookmarkList',
  setup() {
    const bookmarks = ref([])
    const categories = ref([])
    const loading = ref(false)
    const error = ref(null)
    const selectedCategoryId = ref(null)

    const filteredBookmarks = computed(() => {
      if (selectedCategoryId.value === null) {
        return bookmarks.value
      }
      return bookmarks.value.filter(b => b.categoryId === selectedCategoryId.value)
    })

    const fetchBookmarks = async () => {
      loading.value = true
      error.value = null
      try {
        const response = await bookmarkApi.getAll()
        bookmarks.value = response.data
      } catch (err) {
        error.value = '获取书签失败'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getAll()
        categories.value = response.data
      } catch (err) {
        console.error('获取分类失败', err)
      }
    }

    const getCategoryById = (id) => {
      if (!id) return null
      return categories.value.find(c => c.id === id)
    }

    const deleteBookmark = async (id) => {
      if (confirm('确定要删除这个书签吗？')) {
        try {
          await bookmarkApi.delete(id)
          fetchBookmarks()
        } catch (err) {
          error.value = '删除书签失败'
          console.error(err)
        }
      }
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleString()
    }

    onMounted(() => {
      fetchBookmarks()
      fetchCategories()
    })

    return {
      bookmarks,
      categories,
      loading,
      error,
      selectedCategoryId,
      filteredBookmarks,
      getCategoryById,
      deleteBookmark,
      formatDate
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
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-categories {
  padding: 0.6rem 1rem;
  background-color: #f5f5f5;
  color: #666;
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-categories:hover {
  background-color: #e8e8e8;
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

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e8e8e8;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.2s;
}

.filter-btn:hover {
  background-color: #e8e8e8;
}

.filter-btn.active {
  background-color: var(--category-color, #667eea);
  border-color: var(--category-color, #667eea);
  color: #fff;
}

.filter-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.filter-btn.active .filter-dot {
  background-color: #fff !important;
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

.table-container {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.bookmark-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background-color: #fff;
}

.bookmark-table th {
  background-color: #f8f9fa;
  color: #333;
  font-weight: 600;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid #e8e8e8;
  white-space: nowrap;
}

.bookmark-table td {
  padding: 1rem;
  border-bottom: 1px solid #e8e8e8;
  vertical-align: middle;
}

.bookmark-table tbody tr {
  transition: background-color 0.2s ease;
}

.bookmark-table tbody tr:hover {
  background-color: #f8f9fa;
}

.bookmark-table tbody tr:last-child td {
  border-bottom: none;
}

.col-title { width: 15%; }
.col-url { width: 25%; }
.col-category { width: 10%; }
.col-desc { width: 20%; }
.col-time { width: 15%; }
.col-actions { width: 15%; text-align: center; }

.cell-title {
  font-weight: 500;
  color: #333;
}

.cell-url {
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-url {
  color: #667eea;
  text-decoration: none;
  transition: color 0.2s;
}

.link-url:hover {
  color: #764ba2;
  text-decoration: underline;
}

.cell-category {
  white-space: nowrap;
}

.category-tag {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.category-tag.none {
  background-color: #f0f0f0;
  color: #999;
}

.cell-desc {
  color: #666;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-time {
  color: #999;
  font-size: 13px;
  white-space: nowrap;
}

.cell-actions {
  text-align: center;
  white-space: nowrap;
}

.btn-action {
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  margin: 0 2px;
}

.btn-edit {
  background-color: #fff;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-edit:hover {
  background-color: #667eea;
  color: #fff;
}

.btn-delete {
  background-color: #fff;
  color: #e74c3c;
  border: 1px solid #e74c3c;
}

.btn-delete:hover {
  background-color: #e74c3c;
  color: #fff;
}

@media (max-width: 768px) {
  .bookmark-list {
    padding: 1rem;
  }

  .header-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-buttons {
    width: 100%;
    justify-content: space-between;
  }

  .table-container {
    font-size: 13px;
  }

  .bookmark-table th,
  .bookmark-table td {
    padding: 0.75rem 0.5rem;
  }

  .col-desc,
  .cell-desc,
  .col-time,
  .cell-time {
    display: none;
  }
}
</style>