import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import BookmarkList from '../src/views/BookmarkList.vue'
import { sharedState } from '../src/store/sharedState'
import { bookmarkApi, categoryApi } from '../src/services/api'
import { createMockResponse, createMockError, mockBookmarks, mockCategories } from './setup'

vi.mock('../src/services/api', () => ({
  bookmarkApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getRecent: vi.fn(),
    checkUrl: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    click: vi.fn(),
    delete: vi.fn(),
    batchDelete: vi.fn(),
    importBookmarks: vi.fn(),
    getImportProgress: vi.fn(),
    exportBookmarks: vi.fn()
  },
  categoryApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    batchDelete: vi.fn(),
    deleteEmpty: vi.fn()
  },
  urlApi: {
    getTitle: vi.fn()
  }
}))

const createTestRouter = () => {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: BookmarkList },
      { path: '/add', component: { template: '<div>Add</div>' } },
      { path: '/edit/:id', component: { template: '<div>Edit</div>' } }
    ]
  })
}

describe('BookmarkList', () => {
  let router

  beforeEach(() => {
    router = createTestRouter()
    sharedState.bookmarks = []
    sharedState.categories = []
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mountComponent = (options = {}) => {
    return mount(BookmarkList, {
      global: {
        plugins: [router],
        provide: {
          searchKeyword: { value: '' },
          searchCategoryId: { value: null }
        },
        stubs: {
          'router-link': {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      },
      ...options
    })
  }

  describe('初始加载', () => {
    it('应该显示加载状态', () => {
      bookmarkApi.getAll.mockReturnValue(new Promise(() => {}))
      categoryApi.getAll.mockReturnValue(new Promise(() => {}))
      bookmarkApi.getRecent.mockReturnValue(new Promise(() => {}))
      const wrapper = mountComponent()
      expect(wrapper.find('.loading').exists()).toBe(true)
    })

    it('应该在挂载时获取书签和分类', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse(mockBookmarks))
      categoryApi.getAll.mockResolvedValue(createMockResponse(mockCategories))
      bookmarkApi.getRecent.mockResolvedValue(createMockResponse([]))
      mountComponent()
      await flushPromises()
      expect(bookmarkApi.getAll).toHaveBeenCalled()
      expect(categoryApi.getAll).toHaveBeenCalled()
    })

    it('获取失败时应显示错误信息', async () => {
      bookmarkApi.getAll.mockRejectedValue(createMockError('获取书签失败'))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.getRecent.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.initialLoading = false
      await nextTick()
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.find('.error').text()).toContain('获取书签失败')
    })
  })

  describe('书签列表渲染', () => {
    beforeEach(() => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse(mockBookmarks))
      categoryApi.getAll.mockResolvedValue(createMockResponse(mockCategories))
    })

    it('应该渲染书签卡片', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const cards = wrapper.findAll('.bookmark-card')
      expect(cards.length).toBe(mockBookmarks.length)
    })

    it('应该显示书签标题', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const titles = wrapper.findAll('.card-title')
      expect(titles[0].text()).toBe('Test Bookmark 1')
    })

    it('应该显示书签URL', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const urls = wrapper.findAll('.card-url')
      expect(urls[0].text()).toContain('https://example.com/1')
    })

    it('应该显示分类标签', async () => {
      sharedState.categories = mockCategories
      sharedState.bookmarks = mockBookmarks
      const wrapper = mountComponent()
      await flushPromises()
      const tags = wrapper.findAll('.category-tag:not(.none)')
      expect(tags.length).toBeGreaterThan(0)
    })

    it('未分类书签应显示"未分类"标签', async () => {
      sharedState.categories = mockCategories
      sharedState.bookmarks = [mockBookmarks[2]]
      const wrapper = mountComponent()
      await flushPromises()
      const noneTag = wrapper.find('.category-tag.none')
      expect(noneTag.exists()).toBe(true)
      expect(noneTag.text()).toBe('未分类')
    })

    it('书签列表为空时应显示空状态', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.empty').exists()).toBe(true)
      expect(wrapper.find('.empty').text()).toContain('暂无书签')
    })
  })

  describe('分页功能', () => {
    it('应该显示分页控件当书签数量超过pageSize', async () => {
      const manyBookmarks = Array.from({ length: 15 }, (_, i) => ({
        ...mockBookmarks[0],
        id: i + 1,
        title: `Bookmark ${i + 1}`,
        url: `https://example.com/${i + 1}`
      }))
      bookmarkApi.getAll.mockResolvedValue(createMockResponse(manyBookmarks))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.pagination').exists()).toBe(true)
    })

    it('书签数量少于pageSize时不应显示分页', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse(mockBookmarks))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.pagination').exists()).toBe(false)
    })
  })

  describe('选择功能', () => {
    beforeEach(async () => {
      sharedState.bookmarks = mockBookmarks
      sharedState.categories = mockCategories
    })

    it('应该能够选择单个书签', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const checkboxes = wrapper.findAll('.card-checkbox input')
      await checkboxes[0].setValue(true)
      expect(wrapper.vm.selectedBookmarks).toContain(1)
    })

    it('应该显示批量删除按钮当有选中书签时', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const checkboxes = wrapper.findAll('.card-checkbox input')
      await checkboxes[0].setValue(true)
      await nextTick()
      expect(wrapper.find('.btn-delete-batch').exists()).toBe(true)
    })

    it('应该显示选择信息', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const checkboxes = wrapper.findAll('.card-checkbox input')
      await checkboxes[0].setValue(true)
      await nextTick()
      expect(wrapper.find('.selection-info').exists()).toBe(true)
      expect(wrapper.find('.selection-info').text()).toContain('已选择 1 项')
    })
  })

  describe('删除功能', () => {
    beforeEach(async () => {
      sharedState.bookmarks = [...mockBookmarks]
      sharedState.categories = mockCategories
    })

    it('点击删除按钮应显示确认对话框', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const deleteBtn = wrapper.find('.btn-delete')
      await deleteBtn.trigger('click')
      expect(wrapper.find('.confirm-dialog').exists()).toBe(true)
      expect(wrapper.find('.confirm-message').text()).toContain('确定要删除')
    })

    it('确认删除应调用API', async () => {
      bookmarkApi.delete.mockResolvedValue(createMockResponse(null))
      const wrapper = mountComponent()
      await flushPromises()
      const deleteBtn = wrapper.find('.btn-delete')
      await deleteBtn.trigger('click')
      const confirmBtn = wrapper.find('.confirm-btn.confirm')
      await confirmBtn.trigger('click')
      await flushPromises()
      expect(bookmarkApi.delete).toHaveBeenCalledWith(1)
    })

    it('取消删除应关闭对话框', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const deleteBtn = wrapper.find('.btn-delete')
      await deleteBtn.trigger('click')
      const cancelBtn = wrapper.find('.confirm-btn.cancel')
      await cancelBtn.trigger('click')
      await nextTick()
      expect(wrapper.find('.confirm-dialog').exists()).toBe(false)
    })
  })

  describe('编辑链接', () => {
    it('每个书签应该有编辑链接', async () => {
      sharedState.bookmarks = mockBookmarks
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      const editLinks = wrapper.findAll('.btn-edit')
      expect(editLinks.length).toBe(mockBookmarks.length)
    })
  })

  describe('添加书签链接', () => {
    it('应该有添加书签按钮', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      const addLink = wrapper.find('.btn-add')
      expect(addLink.exists()).toBe(true)
      expect(addLink.text()).toContain('添加书签')
    })
  })

  describe('响应式设计', () => {
    it('应该在小屏幕上调整布局', async () => {
      sharedState.bookmarks = mockBookmarks
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.bookmark-list').exists()).toBe(true)
      expect(wrapper.find('.bookmark-cards').exists()).toBe(true)
    })
  })

  describe('全选功能', () => {
    beforeEach(async () => {
      sharedState.bookmarks = mockBookmarks
      sharedState.categories = mockCategories
    })

    it('应该显示全选复选框', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.select-all-label input').exists()).toBe(true)
    })

    it('点击全选应选中当前页所有书签', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const selectAll = wrapper.find('.select-all-label input')
      await selectAll.setValue(true)
      expect(wrapper.vm.selectedBookmarks.length).toBe(mockBookmarks.length)
    })
  })

  describe('时间格式化', () => {
    it('应该正确格式化最近访问时间', async () => {
      sharedState.bookmarks = mockBookmarks
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      const timeElements = wrapper.findAll('.meta-time')
      expect(timeElements.length).toBeGreaterThan(0)
    })

    it('未访问的书签应显示"从未访问"', async () => {
      sharedState.bookmarks = [mockBookmarks[1]]
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      const timeElement = wrapper.find('.meta-time')
      expect(timeElement.text()).toContain('从未访问')
    })
  })
})
