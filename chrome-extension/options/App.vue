<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <span class="logo-icon">📚</span>
          <h1>雅集</h1>
        </div>
        <div class="header-center">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              v-model="searchKeyword"
              @input="handleSearch"
              placeholder="搜索书签..."
              class="search-input"
            />
            <select v-model="searchCategoryId" @change="handleSearch" class="category-select">
              <option :value="null">全部分类</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="header-right">
          <button @click="currentView = 'categories'" class="nav-link" :class="{ active: currentView === 'categories' }">分类管理</button>
          <button @click="currentView = 'list'" class="nav-link" :class="{ active: currentView === 'list' }">书签列表</button>
        </div>
      </div>
    </header>
    <main class="main">
      <BookmarkList
        v-if="currentView === 'list'"
        @edit="handleEdit"
        @add="currentView = 'add'"
      />
      <CategoryManager
        v-else-if="currentView === 'categories'"
      />
      <BookmarkForm
        v-else-if="currentView === 'add' || currentView === 'edit'"
        :edit-id="editId"
        @saved="handleSaved"
        @cancel="currentView = 'list'"
      />
    </main>
  </div>
</template>

<script>
import { ref, onMounted, provide } from 'vue'
import { useBookmarkStore } from '../shared/store/bookmarkStore.js'
import BookmarkList from './views/BookmarkList.vue'
import CategoryManager from './views/CategoryManager.vue'
import BookmarkForm from './views/BookmarkForm.vue'

export default {
  name: 'App',
  components: {
    BookmarkList,
    CategoryManager,
    BookmarkForm
  },
  setup() {
    const { categories, loadFromStorage } = useBookmarkStore()
    const searchKeyword = ref('')
    const searchCategoryId = ref(null)
    const currentView = ref('list')
    const editId = ref(null)

    provide('searchKeyword', searchKeyword)
    provide('searchCategoryId', searchCategoryId)

    const handleSearch = () => {
    }

    const handleEdit = (id) => {
      editId.value = id
      currentView.value = 'edit'
    }

    const handleSaved = () => {
      currentView.value = 'list'
      editId.value = null
    }

    onMounted(async () => {
      await loadFromStorage()
    })

    return {
      searchKeyword,
      searchCategoryId,
      currentView,
      editId,
      categories,
      handleSearch,
      handleEdit,
      handleSaved
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
  line-height: 1.6;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 1.75rem;
}

.header h1 {
  font-size: 1.35rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.header-center {
  flex: 1;
  max-width: 500px;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 10px;
  padding: 0.375rem 0.75rem;
  gap: 0.5rem;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.search-box:focus-within {
  background: #fff;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  font-size: 1rem;
  opacity: 0.5;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
  color: #333;
}

.search-input::placeholder {
  color: #999;
}

.category-select {
  border: none;
  background: transparent;
  font-size: 13px;
  color: #666;
  outline: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.category-select:hover {
  background: rgba(102, 126, 234, 0.1);
}

.header-right {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.nav-link {
  color: #555;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  cursor: pointer;
}

.nav-link:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.nav-link.active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.main {
  align-self: flex-start;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 768px) {
  .header-content {
    padding: 0.875rem 1rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .header-left {
    order: 1;
  }

  .header-right {
    order: 2;
  }

  .header-center {
    order: 3;
    max-width: 100%;
    width: 100%;
  }

  .logo-icon {
    font-size: 1.5rem;
  }

  .header h1 {
    font-size: 1.15rem;
  }

  .nav-link {
    font-size: 13px;
    padding: 0.4rem 0.6rem;
  }

  .main {
    padding: 1rem;
  }
}
</style>
