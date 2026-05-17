import { ref, computed } from 'vue'

const STORAGE_KEYS = {
  BOOKMARKS: 'yaji_bookmarks',
  CATEGORIES: 'yaji_categories',
  SETTINGS: 'yaji_settings'
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

const storage = {
  async get(key) {
    const result = await chrome.storage.local.get(key)
    return result[key]
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value })
  },
  async remove(key) {
    await chrome.storage.local.remove(key)
  }
}

const bookmarks = ref([])
const categories = ref([])
const loading = ref(false)

const loadFromStorage = async () => {
  loading.value = true
  try {
    const [storedBookmarks, storedCategories] = await Promise.all([
      storage.get(STORAGE_KEYS.BOOKMARKS),
      storage.get(STORAGE_KEYS.CATEGORIES)
    ])

    if (Array.isArray(storedBookmarks)) {
      bookmarks.value = storedBookmarks
    } else if (storedBookmarks && typeof storedBookmarks === 'object') {
      bookmarks.value = Object.values(storedBookmarks)
    } else {
      bookmarks.value = []
    }

    if (Array.isArray(storedCategories)) {
      categories.value = storedCategories
    } else if (storedCategories && typeof storedCategories === 'object') {
      categories.value = Object.values(storedCategories)
    } else {
      categories.value = []
    }
  } finally {
    loading.value = false
  }
}

const saveBookmarks = async () => {
  await storage.set(STORAGE_KEYS.BOOKMARKS, bookmarks.value)
}

const saveCategories = async () => {
  await storage.set(STORAGE_KEYS.CATEGORIES, categories.value)
}

const bookmarkApi = {
  async getAll() {
    await loadFromStorage()
    return { data: bookmarks.value }
  },

  async getById(id) {
    await loadFromStorage()
    const bookmark = bookmarks.value.find(b => b.id === id)
    return { data: bookmark }
  },

  async checkUrl(url) {
    await loadFromStorage()
    const bookmarkList = Array.isArray(bookmarks.value) ? bookmarks.value : []
    const exists = bookmarkList.some(b => b.url === url)
    return { data: { exists } }
  },

  async create(bookmark) {
    await loadFromStorage()
    const newBookmark = {
      ...bookmark,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastClickedAt: null,
      clickCount: 0
    }
    bookmarks.value.unshift(newBookmark)
    await saveBookmarks()
    return { data: newBookmark }
  },

  async update(id, bookmark) {
    await loadFromStorage()
    const index = bookmarks.value.findIndex(b => b.id === id)
    if (index === -1) throw new Error('书签不存在')

    bookmarks.value[index] = {
      ...bookmarks.value[index],
      ...bookmark,
      id,
      updatedAt: new Date().toISOString()
    }
    await saveBookmarks()
    return { data: bookmarks.value[index] }
  },

  async recordClick(id) {
    await loadFromStorage()
    const index = bookmarks.value.findIndex(b => b.id === id)
    if (index !== -1) {
      bookmarks.value[index].lastClickedAt = new Date().toISOString()
      bookmarks.value[index].clickCount = (bookmarks.value[index].clickCount || 0) + 1
      await saveBookmarks()
    }
    return { data: { success: true } }
  },

  async delete(id) {
    await loadFromStorage()
    bookmarks.value = bookmarks.value.filter(b => b.id !== id)
    await saveBookmarks()
    return { data: { success: true } }
  },

  async deleteBatch(ids) {
    await loadFromStorage()
    bookmarks.value = bookmarks.value.filter(b => !ids.includes(b.id))
    await saveBookmarks()
    return { data: { success: true } }
  },

  async importBookmarks(bookmarkList) {
    await loadFromStorage()
    const newBookmarks = bookmarkList.map(b => ({
      ...b,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastClickedAt: b.lastClickedAt || null,
      clickCount: b.clickCount || 0
    }))
    bookmarks.value = [...newBookmarks, ...bookmarks.value]
    await saveBookmarks()
    return { data: { message: `成功导入 ${newBookmarks.length} 个书签` } }
  },

  async exportBookmarks() {
    await loadFromStorage()
    return { data: bookmarks.value }
  }
}

const categoryApi = {
  async getAll() {
    await loadFromStorage()
    return { data: categories.value }
  },

  async getById(id) {
    await loadFromStorage()
    const category = categories.value.find(c => c.id === id)
    return { data: category }
  },

  async create(category) {
    await loadFromStorage()
    const newCategory = {
      ...category,
      id: generateId(),
      createdAt: new Date().toISOString()
    }
    categories.value.push(newCategory)
    await saveCategories()
    return { data: newCategory }
  },

  async update(id, category) {
    await loadFromStorage()
    const index = categories.value.findIndex(c => c.id === id)
    if (index === -1) throw new Error('分类不存在')

    categories.value[index] = {
      ...categories.value[index],
      ...category,
      id
    }
    await saveCategories()
    return { data: categories.value[index] }
  },

  async delete(id) {
    await loadFromStorage()
    categories.value = categories.value.filter(c => c.id !== id)
    bookmarks.value.forEach(b => {
      if (b.categoryId === id) {
        b.categoryId = null
      }
    })
    await Promise.all([saveCategories(), saveBookmarks()])
    return { data: { success: true } }
  },

  async deleteBatch(ids) {
    await loadFromStorage()
    categories.value = categories.value.filter(c => !ids.includes(c.id))
    bookmarks.value.forEach(b => {
      if (ids.includes(b.categoryId)) {
        b.categoryId = null
      }
    })
    await Promise.all([saveCategories(), saveBookmarks()])
    return { data: { success: true } }
  },

  async deleteEmpty() {
    await loadFromStorage()
    const usedCategoryIds = new Set(bookmarks.value.map(b => b.categoryId).filter(Boolean))
    categories.value = categories.value.filter(c => usedCategoryIds.has(c.id))
    await saveCategories()
    return { data: { success: true } }
  }
}

const urlApi = {
  async getTitle(url) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getPageTitle',
        url
      })
      return { data: response.title || '' }
    } catch (err) {
      return { data: '' }
    }
  }
}

const bookmarkCount = computed(() => bookmarks.value.length)
const categoryCount = computed(() => categories.value.length)

export function useBookmarkStore() {
  return {
    bookmarks,
    categories,
    loading,
    bookmarkCount,
    categoryCount,
    bookmarkApi,
    categoryApi,
    urlApi,
    loadFromStorage
  }
}

export const sharedState = {
  bookmarks: [],
  categories: []
}