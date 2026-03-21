import { createRouter, createWebHistory } from 'vue-router'
import BookmarkList from '../views/BookmarkList.vue'
import BookmarkForm from '../views/BookmarkForm.vue'
import CategoryManager from '../views/CategoryManager.vue'

const routes = [
  {
    path: '/',
    name: 'BookmarkList',
    component: BookmarkList
  },
  {
    path: '/add',
    name: 'AddBookmark',
    component: BookmarkForm
  },
  {
    path: '/edit/:id',
    name: 'EditBookmark',
    component: BookmarkForm,
    props: true
  },
  {
    path: '/categories',
    name: 'CategoryManager',
    component: CategoryManager
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router