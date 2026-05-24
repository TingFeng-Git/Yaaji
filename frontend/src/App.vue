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
              placeholder="搜索书签..."
              class="search-input"
            />
            <SearchSelect
              v-model="searchCategoryId"
              :options="categories"
              placeholder="全部分类"
              :searchable-threshold="5"
            />
          </div>
        </div>
        <div class="header-right">
          <button @click="toggleTheme" class="theme-btn" :title="themeLabel">
            {{ themeEmoji }}
          </button>
          <button @click="mobileMenuOpen = !mobileMenuOpen" class="menu-toggle" :title="mobileMenuOpen ? '关闭菜单' : '打开菜单'">
            {{ mobileMenuOpen ? '✕' : '☰' }}
          </button>
          <router-link to="/categories" class="nav-link">分类管理</router-link>
          <router-link to="/" class="nav-link">书签列表</router-link>
          <span v-if="isAuthenticated" class="user-info">
            👤 {{ user?.username }}
          </span>
          <button v-if="isAuthenticated" @click="handleLogout" class="logout-btn">登出</button>
          <router-link v-else to="/login" class="nav-link">登录</router-link>
        </div>
      </div>
      <div v-if="mobileMenuOpen" class="mobile-menu-overlay" @click="mobileMenuOpen = false">
        <div class="mobile-menu" @click.stop>
          <router-link to="/" class="mobile-nav-link" @click="mobileMenuOpen = false">📌 书签列表</router-link>
          <router-link to="/categories" class="mobile-nav-link" @click="mobileMenuOpen = false">🏷️ 分类管理</router-link>
          <div class="mobile-menu-divider"></div>
          <button @click="toggleAutoDetect" class="mobile-menu-item auto-item">
            <span>{{ autoDetect ? '🔄 自动跟随季节' : '🔒 手动锁定主题' }}</span>
          </button>
          <div v-if="isAuthenticated" class="mobile-menu-divider"></div>
          <span v-if="isAuthenticated" class="mobile-user-info">👤 {{ user?.username }}</span>
          <button v-if="isAuthenticated" @click="handleLogout" class="mobile-menu-item logout-item">登出</button>
          <router-link v-else to="/login" class="mobile-nav-link" @click="mobileMenuOpen = false">登录</router-link>
        </div>
      </div>
    </header>
    <main class="main">
      <router-view v-slot="{ Component, route }">
        <transition :name="route.meta.transition || 'fade-slide'" mode="out-in">
          <keep-alive :include="['BookmarkList', 'BookmarkForm']">
            <component :is="Component" :search-keyword="searchKeyword" :search-category-id="searchCategoryId" />
          </keep-alive>
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script>
import { ref, provide, onMounted, computed } from 'vue'
import { categoryApi, authApi } from './services/api'
import { sharedState } from './store/sharedState'
import { authState } from './store/auth'
import SearchSelect from './components/SearchSelect.vue'
import { logger } from './services/logger'

const THEME_KEY = 'yaji_season'
const AUTO_KEY = 'yaji_season_auto'

const SEASONS = ['spring', 'summer', 'autumn', 'winter']
const SEASON_LABELS = {
  spring: '夏季',
  summer: '秋季',
  autumn: '冬季',
  winter: '春季'
}

const detectSeason = () => {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export default {
  name: 'App',
  components: {
    SearchSelect
  },
  setup() {
    const searchKeyword = ref('')
    const searchCategoryId = ref(null)
    const mobileMenuOpen = ref(false)
    const isAuthenticated = computed(() => authState.isAuthenticated)
    const user = computed(() => authState.user)

    const autoDetect = ref(localStorage.getItem(AUTO_KEY) !== 'false')
    const currentTheme = ref(
      autoDetect.value ? detectSeason() : (localStorage.getItem(THEME_KEY) || detectSeason())
    )
    const themeLabel = computed(() => `切换到${SEASON_LABELS[currentTheme.value]}`)
    const themeEmoji = computed(() => {
      const emojiMap = {
        spring: '🌸',
        summer: '☀️',
        autumn: '🍂',
        winter: '❄️'
      }
      return emojiMap[currentTheme.value]
    })

    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme)
      if (!autoDetect.value) {
        localStorage.setItem(THEME_KEY, theme)
      }
      currentTheme.value = theme
    }

    const toggleTheme = () => {
      const currentIndex = SEASONS.indexOf(currentTheme.value)
      const nextIndex = (currentIndex + 1) % SEASONS.length
      applyTheme(SEASONS[nextIndex])
    }

    const toggleAutoDetect = () => {
      autoDetect.value = !autoDetect.value
      localStorage.setItem(AUTO_KEY, String(autoDetect.value))
      if (autoDetect.value) {
        applyTheme(detectSeason())
      }
    }

    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getAll()
        sharedState.categories = response
      } catch (err) {
        logger.error('获取分类失败', err)
      }
    }

    const handleLogout = async () => {
      await authApi.logout()
      logger.info('已登出')
      // 路由守卫会拦截，跳转到登录页
      window.location.href = '/login'
    }

    onMounted(() => {
      // 初始化主题
      applyTheme(currentTheme.value)

      if (isAuthenticated.value) {
        fetchCategories()
      }
    })

    provide('searchKeyword', searchKeyword)
    provide('searchCategoryId', searchCategoryId)

    return {
      searchKeyword,
      searchCategoryId,
      mobileMenuOpen,
      categories: computed(() => sharedState.categories),
      isAuthenticated,
      user,
      handleLogout,
      currentTheme,
      themeLabel,
      themeEmoji,
      toggleTheme,
      autoDetect,
      toggleAutoDetect
    }
  }
}
</script>

<style>
:root {
  /* 圆角 */
  --radius-sm: 3px;
  --radius-md: 6px;
  --radius-lg: 10px;

  /* 阴影 */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);

  --transition: 180ms ease;

  /* 字体 */
  --font-serif: 'Noto Serif SC', 'Source Han Serif CN', Georgia, serif;
  --font-sans:  'Noto Sans SC',  'PingFang SC', 'Microsoft YaHei', sans-serif;
}

[data-theme="spring"] {
  /* 颜色 */
  --color-bg:           #F4FAF2;
  --color-surface:      #FFFFFF;
  --color-ink:          #1A2A1A;
  --color-ink-secondary:#3C5A38;
  --color-ink-muted:    #7A9A74;
  --color-border:       #C2DFB8;
  --color-border-light: #D8EDD0;
  --color-accent:       #3D8B37;
  --color-accent-hover: #2E7229;
  --color-accent-bg:    #EAF5E7;
  --color-success-text: #2A7A40;
  --color-success-bg:   #EAF5EE;
  --color-warning-text: #8B6914;
  --color-warning-bg:   #FDF8EC;
  --color-tag-bg:       #D8EDD0;
}

[data-theme="summer"] {
  /* 颜色 */
  --color-bg:           #EFF7FC;
  --color-surface:      #FFFFFF;
  --color-ink:          #0F2535;
  --color-ink-secondary:#264A5E;
  --color-ink-muted:    #6090A8;
  --color-border:       #AACFE0;
  --color-border-light: #C8E3EE;
  --color-accent:       #1277A8;
  --color-accent-hover: #0E6090;
  --color-accent-bg:    #DDF0FA;
  --color-success-text: #1A7A50;
  --color-success-bg:   #E8F7F0;
  --color-warning-text: #8B6914;
  --color-warning-bg:   #FDF8EC;
  --color-tag-bg:       #C8E3EE;
}

[data-theme="autumn"] {
  /* 颜色 */
  --color-bg:           #FCF7F0;
  --color-surface:      #FFFFFF;
  --color-ink:          #2A1A08;
  --color-ink-secondary:#4A3018;
  --color-ink-muted:    #9A7A5A;
  --color-border:       #DEC09A;
  --color-border-light: #EED4B4;
  --color-accent:       #C05A18;
  --color-accent-hover: #A04810;
  --color-accent-bg:    #FDF0E0;
  --color-success-text: #2A7A40;
  --color-success-bg:   #EAF5EE;
  --color-warning-text: #8B6914;
  --color-warning-bg:   #FDF8EC;
  --color-tag-bg:       #EED4B4;
}

[data-theme="winter"] {
  /* 颜色 */
  --color-bg:           #F4F7FC;
  --color-surface:      #FFFFFF;
  --color-ink:          #12192A;
  --color-ink-secondary:#2E3E52;
  --color-ink-muted:    #7A8FA8;
  --color-border:       #C0CEDC;
  --color-border-light: #D8E2EE;
  --color-accent:       #2D5FA0;
  --color-accent-hover: #1E4A88;
  --color-accent-bg:    #E4EDFC;
  --color-success-text: #1A6A4A;
  --color-success-bg:   #E8F5EE;
  --color-warning-text: #8B6914;
  --color-warning-bg:   #FDF8EC;
  --color-tag-bg:       #D8E2EE;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  line-height: 1.6;
  color: var(--color-ink);
  background: var(--color-bg);
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
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
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
  font-family: var(--font-serif);
  color: var(--color-ink);
  letter-spacing: -0.5px;
}

.header-center {
  flex: 1;
  max-width: 500px;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 0.375rem 0.75rem;
  gap: 0.5rem;
  border: 1px solid var(--color-border-light);
  transition: all var(--transition);
}

.search-box:focus-within {
  background: var(--color-surface);
  border-color: var(--color-border);
  box-shadow: 0 0 0 3px rgba(28,28,30,0.05);
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
  color: var(--color-ink);
  font-family: var(--font-sans);
}

.search-input::placeholder {
  color: var(--color-ink-muted);
}

.header-right {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
  align-items: center;
}

.nav-link {
  color: var(--color-ink-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  transition: all var(--transition);
  border-bottom: 2px solid transparent;
}

.nav-link:hover {
  color: var(--color-accent);
}

.nav-link.router-link-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.user-info {
  color: var(--color-ink-secondary);
  font-size: 14px;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
}

.logout-btn {
  color: var(--color-accent);
  font-size: 14px;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  transition: all var(--transition);
  background: transparent;
  border: 1px solid var(--color-border);
  cursor: pointer;
  font-family: var(--font-sans);
}

.logout-btn:hover {
  background: var(--color-accent-bg);
}

.theme-btn {
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1rem;
  transition: all var(--transition);
  line-height: 1;
}

.theme-btn:hover {
  background: var(--color-tag-bg);
}

.menu-toggle {
  display: none;
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1rem;
  transition: all var(--transition);
  line-height: 1;
  font-family: var(--font-sans);
  color: var(--color-ink);
  font-weight: 600;
}

.menu-toggle:hover {
  background: var(--color-tag-bg);
}

.mobile-menu-overlay {
  position: fixed;
  top: 100%;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99;
  animation: fadeIn 0.2s ease;
}

.mobile-menu {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-md);
  animation: slideDown 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-nav-link {
  display: block;
  padding: 0.875rem 1rem;
  color: var(--color-ink-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid var(--color-border-light);
  transition: all var(--transition);
  font-family: var(--font-sans);
}

.mobile-nav-link:hover {
  background: var(--color-bg);
  color: var(--color-accent);
}

.mobile-nav-link.router-link-active {
  background: var(--color-accent-bg);
  color: var(--color-accent);
}

.mobile-menu-item {
  display: block;
  padding: 0.875rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-ink-secondary);
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-sans);
}

.mobile-menu-item:hover {
  background: var(--color-bg);
  color: var(--color-accent);
}

.mobile-menu-item.auto-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-menu-item.logout-item {
  color: var(--color-accent);
}

.mobile-menu-item.logout-item:hover {
  background: var(--color-accent-bg);
}

.mobile-menu-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 0.25rem 0;
}

.mobile-user-info {
  display: block;
  padding: 0.75rem 1rem;
  color: var(--color-ink-muted);
  font-size: 13px;
  font-family: var(--font-sans);
  border-bottom: 1px solid var(--color-border-light);
}

.auto-btn {
  padding: 0.3rem 0.55rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-ink-muted);
  transition: all var(--transition);
  font-family: var(--font-sans);
  letter-spacing: 0.3px;
}

.auto-btn:hover {
  background: var(--color-tag-bg);
  color: var(--color-ink-secondary);
}

.main {
  align-self: flex-start;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
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
    gap: 0.5rem;
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
    display: none;
  }

  .user-info {
    display: none;
  }

  .logout-btn {
    display: none;
  }

  .auto-btn {
    display: none;
  }

  .menu-toggle {
    display: block;
  }

  .main {
    padding: 1rem;
  }
}
</style>