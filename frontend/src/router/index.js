import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'BookmarkList',
    component: () => import('../views/BookmarkList.vue')
  },
  {
    path: '/add',
    name: 'AddBookmark',
    component: () => import('../views/BookmarkForm.vue')
  },
  {
    path: '/edit/:id',
    name: 'EditBookmark',
    component: () => import('../views/BookmarkForm.vue'),
    props: true
  },
  {
    path: '/categories',
    name: 'CategoryManager',
    component: () => import('../views/CategoryManager.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router