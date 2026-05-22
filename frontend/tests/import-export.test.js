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
      { path: '/add', component: { template: '<div>Add</div>' } }
    ]
  })
}

describe('导入导出功能', () => {
  let router

  beforeEach(() => {
    router = createTestRouter()
    sharedState.bookmarks = []
    sharedState.categories = []
    vi.clearAllMocks()
    bookmarkApi.getRecent.mockResolvedValue(createMockResponse([]))
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mountComponent = () => {
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
      }
    })
  }

  describe('导入按钮', () => {
    it('应该显示导入按钮', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.btn-import').exists()).toBe(true)
      expect(wrapper.find('.btn-import').text()).toBe('导入')
    })

    it('应该有隐藏的文件输入框', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.exists()).toBe(true)
      expect(fileInput.attributes('accept')).toBe('.html')
    })
  })

  describe('导出按钮', () => {
    it('应该显示导出按钮', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.btn-export').exists()).toBe(true)
      expect(wrapper.find('.btn-export').text()).toBe('导出')
    })

    it('点击导出应调用API', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.exportBookmarks.mockResolvedValue({
        data: new Blob(['<html></html>'], { type: 'text/html' }),
        headers: { 'content-disposition': 'filename=bookmarks.html' }
      })
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-export').trigger('click')
      await flushPromises()
      expect(bookmarkApi.exportBookmarks).toHaveBeenCalled()
    })

    it('导出失败应显示错误提示', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.exportBookmarks.mockRejectedValue(createMockError('导出失败'))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-export').trigger('click')
      await flushPromises()
      expect(wrapper.find('.toast.error').exists()).toBe(true)
    })
  })

  describe('导入进度显示', () => {
    it('导入中应显示进度区域', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.importing = true
      await nextTick()
      expect(wrapper.find('.import-progress').exists()).toBe(true)
    })

    it('应该显示上传和导入阶段', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.importing = true
      await nextTick()
      const stages = wrapper.findAll('.stage')
      expect(stages.length).toBe(2)
    })

    it('应该显示进度百分比', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.importing = true
      wrapper.vm.uploadProgress = 50
      await nextTick()
      expect(wrapper.find('.progress-percent').exists()).toBe(true)
    })
  })

  describe('导入流程', () => {
    it('导入成功后应刷新书签列表', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.importBookmarks.mockResolvedValue(createMockResponse({
        message: '导入成功',
        importedCount: 5
      }))
      const wrapper = mountComponent()
      await flushPromises()
      const file = new File(['<html></html>'], 'bookmarks.html', { type: 'text/html' })
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', { value: [file] })
      await fileInput.trigger('change')
      await flushPromises()
      expect(bookmarkApi.importBookmarks).toHaveBeenCalled()
    })

    it('导入失败应显示错误提示', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.importBookmarks.mockRejectedValue(createMockError('导入失败'))
      const wrapper = mountComponent()
      await flushPromises()
      const file = new File(['<html></html>'], 'bookmarks.html', { type: 'text/html' })
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', { value: [file] })
      await fileInput.trigger('change')
      await flushPromises()
      expect(wrapper.find('.toast.error').exists()).toBe(true)
    })

    it('异步导入应轮询进度', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.importBookmarks.mockResolvedValue(createMockResponse({ taskId: 'task-123' }))
      bookmarkApi.getImportProgress
        .mockResolvedValueOnce(createMockResponse({ status: 'importing', percent: 50, current: 50, total: 100, message: '正在导入...' }))
        .mockResolvedValueOnce(createMockResponse({ status: 'completed', percent: 100, current: 100, total: 100, message: '导入完成' }))
      const wrapper = mountComponent()
      await flushPromises()
      const file = new File(['<html></html>'], 'bookmarks.html', { type: 'text/html' })
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', { value: [file] })
      await fileInput.trigger('change')
      await flushPromises()
      vi.advanceTimersByTime(1000)
      await flushPromises()
      expect(bookmarkApi.getImportProgress).toHaveBeenCalledWith('task-123')
    })
  })

  describe('批量删除', () => {
    it('选中书签后应显示批量删除按钮', async () => {
      sharedState.bookmarks = mockBookmarks
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      const checkbox = wrapper.find('.card-checkbox input')
      await checkbox.setValue(true)
      await nextTick()
      expect(wrapper.find('.btn-delete-batch').exists()).toBe(true)
      expect(wrapper.find('.btn-delete-batch').text()).toContain('批量删除')
    })

    it('点击批量删除应显示确认对话框', async () => {
      sharedState.bookmarks = mockBookmarks
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      const checkbox = wrapper.find('.card-checkbox input')
      await checkbox.setValue(true)
      await nextTick()
      await wrapper.find('.btn-delete-batch').trigger('click')
      expect(wrapper.find('.confirm-dialog').exists()).toBe(true)
    })

    it('确认批量删除应调用API', async () => {
      sharedState.bookmarks = [...mockBookmarks]
      sharedState.categories = mockCategories
      bookmarkApi.batchDelete.mockResolvedValue(createMockResponse(null))
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      const checkbox = wrapper.find('.card-checkbox input')
      await checkbox.setValue(true)
      await nextTick()
      await wrapper.find('.btn-delete-batch').trigger('click')
      await wrapper.find('.confirm-btn.confirm').trigger('click')
      await flushPromises()
      expect(bookmarkApi.batchDelete).toHaveBeenCalled()
    })
  })

  describe('文件输入重置', () => {
    it('导入完成后应重置文件输入', async () => {
      bookmarkApi.getAll.mockResolvedValue(createMockResponse([]))
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      bookmarkApi.importBookmarks.mockResolvedValue(createMockResponse({
        message: '导入成功',
        importedCount: 5
      }))
      const wrapper = mountComponent()
      await flushPromises()
      const file = new File(['<html></html>'], 'bookmarks.html', { type: 'text/html' })
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', { value: [file] })
      await fileInput.trigger('change')
      await flushPromises()
      expect(fileInput.element.value).toBe('')
    })
  })
})
