import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import CategoryManager from '../src/views/CategoryManager.vue'
import { sharedState } from '../src/store/sharedState'
import { categoryApi } from '../src/services/api'
import { createMockResponse, createMockError, mockCategories } from './setup'

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
      { path: '/categories', component: CategoryManager }
    ]
  })
}

describe('CategoryManager', () => {
  let router

  beforeEach(() => {
    router = createTestRouter()
    sharedState.categories = []
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mountComponent = () => {
    return mount(CategoryManager, {
      global: {
        plugins: [router]
      }
    })
  }

  describe('初始加载', () => {
    it('应该显示加载状态', async () => {
      sharedState.categories = []
      categoryApi.getAll.mockReturnValue(new Promise(() => {}))
      const wrapper = mountComponent()
      await nextTick()
      expect(wrapper.vm.loading).toBe(true)
    })

    it('应该在挂载时获取分类', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse(mockCategories))
      mountComponent()
      await flushPromises()
      expect(categoryApi.getAll).toHaveBeenCalled()
    })

    it('获取失败时应显示错误信息', async () => {
      categoryApi.getAll.mockRejectedValue(createMockError('获取分类失败'))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.find('.error').text()).toContain('获取分类失败')
    })

    it('分类列表为空时应显示空状态', async () => {
      categoryApi.getAll.mockResolvedValue(createMockResponse([]))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.empty').exists()).toBe(true)
      expect(wrapper.find('.empty').text()).toContain('暂无分类')
    })
  })

  describe('分类列表渲染', () => {
    beforeEach(async () => {
      sharedState.categories = mockCategories
    })

    it('应该渲染分类列表', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const items = wrapper.findAll('.category-item')
      expect(items.length).toBe(mockCategories.length)
    })

    it('应该显示分类名称', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const names = wrapper.findAll('.category-name')
      expect(names[0].text()).toBe('开发工具')
    })

    it('应该显示分类颜色', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const colorSpans = wrapper.findAll('.category-color')
      expect(colorSpans[0].attributes('style')).toContain('background-color')
    })

    it('每个分类应该有编辑和删除按钮', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const editBtns = wrapper.findAll('.btn-edit')
      const deleteBtns = wrapper.findAll('.btn-delete')
      expect(editBtns.length).toBe(mockCategories.length)
      expect(deleteBtns.length).toBe(mockCategories.length)
    })
  })

  describe('添加分类', () => {
    it('点击添加按钮应打开模态框', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-add-category').trigger('click')
      expect(wrapper.find('.modal').exists()).toBe(true)
      expect(wrapper.find('.modal h3').text()).toBe('添加分类')
    })

    it('模态框应包含表单字段', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-add-category').trigger('click')
      expect(wrapper.find('.form-group input').exists()).toBe(true)
    })

    it('应该显示颜色选择器', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-add-category').trigger('click')
      expect(wrapper.find('.color-picker').exists()).toBe(true)
      const colorOptions = wrapper.findAll('.color-option')
      expect(colorOptions.length).toBeGreaterThan(0)
    })

    it('提交表单应调用创建API', async () => {
      sharedState.categories = [...mockCategories]
      categoryApi.create.mockResolvedValue(createMockResponse({ id: 4, name: '新分类', color: '#667eea' }))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-add-category').trigger('click')
      await wrapper.find('.form-group input').setValue('新分类')
      await wrapper.find('.form').trigger('submit')
      await flushPromises()
      expect(categoryApi.create).toHaveBeenCalled()
    })

    it('点击取消应关闭模态框', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-add-category').trigger('click')
      expect(wrapper.find('.modal').exists()).toBe(true)
      await wrapper.find('.btn-cancel').trigger('click')
      await nextTick()
      expect(wrapper.find('.modal').exists()).toBe(false)
    })
  })

  describe('编辑分类', () => {
    it('点击编辑按钮应打开编辑模态框', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-edit').trigger('click')
      expect(wrapper.find('.modal').exists()).toBe(true)
      expect(wrapper.find('.modal h3').text()).toBe('编辑分类')
    })

    it('编辑模态框应预填充分类数据', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-edit').trigger('click')
      expect(wrapper.find('.form-group input').element.value).toBe('开发工具')
    })

    it('提交编辑应调用更新API', async () => {
      sharedState.categories = [...mockCategories]
      categoryApi.update.mockResolvedValue(createMockResponse({ ...mockCategories[0], name: '更新名称' }))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-edit').trigger('click')
      await wrapper.find('.form-group input').setValue('更新名称')
      await wrapper.find('.form').trigger('submit')
      await flushPromises()
      expect(categoryApi.update).toHaveBeenCalled()
    })
  })

  describe('删除分类', () => {
    it('点击删除按钮应显示确认对话框', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-delete').trigger('click')
      expect(wrapper.find('.confirm-dialog').exists()).toBe(true)
      expect(wrapper.find('.confirm-message').text()).toContain('确定要删除')
    })

    it('确认删除应调用API', async () => {
      sharedState.categories = [...mockCategories]
      categoryApi.delete.mockResolvedValue(createMockResponse(null))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-delete').trigger('click')
      await wrapper.find('.confirm-btn.confirm').trigger('click')
      await flushPromises()
      expect(categoryApi.delete).toHaveBeenCalledWith(1)
    })

    it('取消删除应关闭对话框', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-delete').trigger('click')
      await wrapper.find('.confirm-btn.cancel').trigger('click')
      await nextTick()
      expect(wrapper.find('.confirm-dialog').exists()).toBe(false)
    })
  })

  describe('搜索功能', () => {
    it('应该显示搜索输入框', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.search-input').exists()).toBe(true)
    })

    it('输入搜索关键词应过滤分类', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.search-input').setValue('开发')
      await nextTick()
      const items = wrapper.findAll('.category-item')
      expect(items.length).toBe(1)
    })

    it('搜索无结果时应显示空状态', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.search-input').setValue('不存在的分类')
      await nextTick()
      expect(wrapper.find('.empty').exists()).toBe(true)
      expect(wrapper.find('.empty').text()).toContain('没有找到匹配的分类')
    })

    it('清除搜索应显示所有分类', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.search-input').setValue('开发')
      await nextTick()
      expect(wrapper.findAll('.category-item').length).toBe(1)
      await wrapper.find('.clear-search').trigger('click')
      await nextTick()
      expect(wrapper.findAll('.category-item').length).toBe(mockCategories.length)
    })
  })

  describe('批量选择', () => {
    it('应该显示复选框', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      const checkboxes = wrapper.findAll('.category-checkbox input')
      expect(checkboxes.length).toBe(mockCategories.length)
    })

    it('选中分类应显示选择信息', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      const checkbox = wrapper.find('.category-checkbox input')
      await checkbox.setValue(true)
      await nextTick()
      expect(wrapper.find('.selection-info').exists()).toBe(true)
    })

    it('应该有批量删除按钮', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      const checkbox = wrapper.find('.category-checkbox input')
      await checkbox.setValue(true)
      await nextTick()
      expect(wrapper.find('.btn-delete-batch').exists()).toBe(true)
    })
  })

  describe('删除空分类', () => {
    it('应该有删除空分类按钮', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.btn-delete-empty').exists()).toBe(true)
    })

    it('点击删除空分类应显示确认对话框', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.find('.btn-delete-empty').trigger('click')
      expect(wrapper.find('.confirm-dialog').exists()).toBe(true)
    })
  })

  describe('分页功能', () => {
    it('分类数量超过pageSize时应显示分页', async () => {
      const manyCategories = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `分类 ${i + 1}`,
        color: '#667eea',
        createdAt: '2024-01-15T10:00:00'
      }))
      sharedState.categories = manyCategories
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.pagination').exists()).toBe(true)
    })

    it('分类数量少于pageSize时不应显示分页', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.pagination').exists()).toBe(false)
    })
  })

  describe('标题', () => {
    it('应该显示"分类管理"标题', async () => {
      sharedState.categories = mockCategories
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.section-title').text()).toBe('分类管理')
    })
  })
})
