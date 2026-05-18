import { reactive } from 'vue'

export const sharedState = reactive({
  bookmarks: [],
  categories: [],
  recentRefreshKey: 0
})