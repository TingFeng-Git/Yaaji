import { createRouter, createWebHistory } from 'vue-router'
import { authState } from '../store/auth'

const routes = [
  {
    path: '/login',
    name: 'Auth',
    component: () => import('../views/AuthPage.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    name: 'BookmarkList',
    component: () => import('../views/BookmarkList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/add',
    name: 'AddBookmark',
    component: () => import('../views/BookmarkForm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/edit/:id',
    name: 'EditBookmark',
    component: () => import('../views/BookmarkForm.vue'),
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/categories',
    name: 'CategoryManager',
    component: () => import('../views/CategoryManager.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !authState.isAuthenticated) {
    next({ name: 'Auth' })
  } else if (to.meta.requiresGuest && authState.isAuthenticated) {
    next({ name: 'BookmarkList' })
  } else {
    next()
  }
})

export default router