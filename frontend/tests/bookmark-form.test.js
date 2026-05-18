import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import BookmarkForm from '../src/views/BookmarkForm.vue'
import { sharedState } from '../src/store/sharedState'
import { bookmarkApi, categoryApi, urlApi } from '../src/services/api'
import { createMockResponse, createMockError, mockBookmarks, mockCategories } from './setup'

vi.mock('../src/services/api', () => ({
  bookmarkApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getRecent: vi.fn(),
    checkUrl: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    recordClick: vi.fn(),
    delete: vi.fn(),
    deleteBatch: vi.fn(),
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
    deleteBatch: vi.fn(),
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
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/add', component: BookmarkForm },
      { path: '/edit/:id', component: BookmarkForm, props: true }
    ]
  })
}

describe('BookmarkForm', () => {
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

  const mountComponent = (props = {}) => {
    return mount(BookmarkForm, {
      props,
      global: {
        plugins: [router],
        stubs: {
          'router-link': {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    })
  }

  describe('添加模式', () => {
    it('应该显示"添加书签"标题', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('h2').text()).toBe('添加书签')
    })

    it('应该显示表单字段', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('#url').exists()).toBe(true)
      expect(wrapper.find('#title').exists()).toBe(true)
      expect(wrapper.find('#category').exists()).toBe(true)
      expect(wrapper.find('#description').exists()).toBe(true)
    })

    it('URL和标题字段应为必填', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('#url').attributes('required')).toBeDefined()
      expect(wrapper.find('#title').attributes('required')).toBeDefined()
    })

    it('应该显示获取标题按钮', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.btn-fetch').exists()).toBe(true)
    })

    it('应该显示分类选项', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse(mockCategories))
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      const options = wrapper.findAll('#category option')
      expect(options.length).toBe(mockCategories.length + 1)
    })

    it('应该有取消按钮链接到首页', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.btn-cancel').exists()).toBe(true)
    })

    it('应该有保存按钮', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.btn-save').exists()).toBe(true)
      expect(wrapper.find('.btn-save').text()).toBe('添加书签')
    })
  })

  describe('编辑模式', () => {
    it('应该显示"编辑书签"标题', async () => {
      bookmarkApi.getById.mockResolvedValue(createMockResponse(mockBookmarks[0]))
      categoryApi.getAll.mockResolvedValue(createMockResponse(mockCategories))
      const wrapper = mountComponent({ id: '1' })
      await flushPromises()
      expect(wrapper.find('h2').text()).toBe('编辑书签')
    })

    it('应该加载现有书签数据', async () => {
      bookmarkApi.getById.mockResolvedValue(createMockResponse(mockBookmarks[0]))
      categoryApi.getAll.mockResolvedValue(createMockResponse(mockCategories))
      const wrapper = mountComponent({ id: '1' })
      await flushPromises()
      expect(bookmarkApi.getById).toHaveBeenCalledWith('1')
    })

    it('加载失败应显示错误信息', async () => {
      bookmarkApi.getById.mockRejectedValue(createMockError('获取书签信息失败'))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent({ id: '1' })
      await flushPromises()
      expect(wrapper.find('.error').exists()).toBe(true)
    })

    it('应该显示"保存修改"按钮', async () => {
      bookmarkApi.getById.mockResolvedValue(createMockResponse(mockBookmarks[0]))
      categoryApi.getAll.mockResolvedValue(createMockResponse(mockCategories))
      const wrapper = mountComponent({ id: '1' })
      await flushPromises()
      expect(wrapper.find('.btn-save').text()).toBe('保存修改')
    })
  })

  describe('URL检查', () => {
    it('URL输入框失焦时应检查URL是否存在', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.checkUrl.mockResolvedValue(createMockResponse({ exists: false }))
      urlApi.getTitle.mockResolvedValue(createMockResponse({ title: 'Test Title' }))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('#url').setValue('https://example.com')
      await wrapper.find('#url').trigger('blur')
      await flushPromises()
      expect(bookmarkApi.checkUrl).toHaveBeenCalled()
    })

    it('URL已存在时应显示警告', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.checkUrl.mockResolvedValue(createMockResponse({ exists: true, bookmark: mockBookmarks[0] }))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('#url').setValue('https://example.com/1')
      await wrapper.find('#url').trigger('blur')
      await flushPromises()
      expect(wrapper.find('.hint.warning').exists()).toBe(true)
    })
  })

  describe('获取标题', () => {
    it('点击获取标题按钮应调用API', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      urlApi.getTitle.mockResolvedValue(createMockResponse({ title: 'Fetched Title' }))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('#url').setValue('https://example.com')
      await wrapper.find('.btn-fetch').trigger('click')
      await flushPromises()
      expect(urlApi.getTitle).toHaveBeenCalledWith('https://example.com')
    })

    it('获取标题成功应填充标题字段', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      urlApi.getTitle.mockResolvedValue(createMockResponse({ title: 'Fetched Title' }))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('#url').setValue('https://example.com')
      await wrapper.find('.btn-fetch').trigger('click')
      await flushPromises()
      expect(wrapper.find('#title').element.value).toBe('Fetched Title')
    })

    it('获取标题失败应显示提示', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      urlApi.getTitle.mockRejectedValue(createMockError('获取标题失败'))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('#url').setValue('https://example.com')
      await wrapper.find('.btn-fetch').trigger('click')
      await flushPromises()
      expect(wrapper.find('.hint').text()).toContain('获取标题失败')
    })
  })

  describe('表单提交', () => {
    it('提交新书签应调用创建API', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.checkUrl.mockResolvedValue(createMockResponse({ exists: false }))
      bookmarkApi.create.mockResolvedValue(createMockResponse(mockBookmarks[0]))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('#url').setValue('https://new-site.com')
      await wrapper.find('#title').setValue('New Site')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(bookmarkApi.create).toHaveBeenCalled()
    })

    it('提交编辑应调用更新API', async () => {
      bookmarkApi.getById.mockResolvedValue(createMockResponse(mockBookmarks[0]))
      categoryApi.getAll.mockResolvedValue(createMockResponse(mockCategories))
      bookmarkApi.update.mockResolvedValue(createMockResponse(mockBookmarks[0]))
      const wrapper = mountComponent({ id: '1' })
      await flushPromises()
      await wrapper.find('#title').setValue('Updated Title')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(bookmarkApi.update).toHaveBeenCalled()
    })

    it('URL已存在时不应提交', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.checkUrl.mockResolvedValue(createMockResponse({ exists: true }))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('#url').setValue('https://existing.com')
      await wrapper.find('#title').setValue('Test')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(bookmarkApi.create).not.toHaveBeenCalled()
    })
  })

  describe('返回链接', () => {
    it('应该有返回列表链接', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.btn-back').exists()).toBe(true)
      expect(wrapper.find('.btn-back').text()).toContain('返回列表')
    })
  })
})
