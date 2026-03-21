<template>
  <div class="category-manager">
    <div class="header-actions">
      <h2 class="section-title">分类管理</h2>
      <div class="header-buttons">
        <router-link to="/" class="btn-back">← 返回书签列表</router-link>
        <button @click="showAddModal = true" class="btn-add-category">+ 添加分类</button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="categories.length === 0" class="empty">暂无分类，请点击"添加分类"创建</div>
    <div v-else class="category-list">
      <div v-for="category in categories" :key="category.id" class="category-item">
        <div class="category-info">
          <span class="category-color" :style="{ backgroundColor: category.color }"></span>
          <span class="category-name">{{ category.name }}</span>
        </div>
        <div class="category-actions">
          <button @click="editCategory(category)" class="btn-action btn-edit">编辑</button>
          <button @click="deleteCategory(category.id)" class="btn-action btn-delete">删除</button>
        </div>
      </div>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ showEditModal ? '编辑分类' : '添加分类' }}</h3>
        <form @submit.prevent="saveCategory" class="form">
          <div class="form-group">
            <label>分类名称</label>
            <input v-model="form.name" type="text" required placeholder="请输入分类名称" />
          </div>
          <div class="form-group">
            <label>颜色</label>
            <div class="color-picker">
              <button
                v-for="color in colorOptions"
                :key="color"
                type="button"
                class="color-option"
                :class="{ selected: form.color === color }"
                :style="{ backgroundColor: color }"
                @click="form.color = color"
              ></button>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn-cancel">取消</button>
            <button type="submit" class="btn-save">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { categoryApi } from '../services/api'

export default {
  name: 'CategoryManager',
  setup() {
    const categories = ref([])
    const loading = ref(false)
    const error = ref(null)
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const form = ref({ id: null, name: '', color: '#667eea' })

    const colorOptions = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#fa709a', '#fee140', '#fa709a', '#a8edea'
    ]

    const fetchCategories = async () => {
      loading.value = true
      error.value = null
      try {
        const response = await categoryApi.getAll()
        categories.value = response.data
      } catch (err) {
        error.value = '获取分类失败'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    const editCategory = (category) => {
      form.value = { ...category }
      showEditModal.value = true
    }

    const deleteCategory = async (id) => {
      if (confirm('确定要删除这个分类吗？')) {
        try {
          await categoryApi.delete(id)
          fetchCategories()
        } catch (err) {
          error.value = '删除分类失败'
          console.error(err)
        }
      }
    }

    const saveCategory = async () => {
      try {
        if (showEditModal.value) {
          await categoryApi.update(form.value.id, form.value)
        } else {
          await categoryApi.create(form.value)
        }
        closeModal()
        fetchCategories()
      } catch (err) {
        error.value = '保存分类失败'
        console.error(err)
      }
    }

    const closeModal = () => {
      showAddModal.value = false
      showEditModal.value = false
      form.value = { id: null, name: '', color: '#667eea' }
    }

    onMounted(fetchCategories)

    return {
      categories,
      loading,
      error,
      showAddModal,
      showEditModal,
      form,
      colorOptions,
      editCategory,
      deleteCategory,
      saveCategory,
      closeModal
    }
  }
}
</script>

<style scoped>
.category-manager {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.btn-back {
  padding: 0.6rem 1rem;
  background-color: #f5f5f5;
  color: #666;
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-back:hover {
  background-color: #e8e8e8;
}

.btn-add-category {
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-category:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.loading, .error, .empty {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 15px;
}

.error {
  color: #e74c3c;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  transition: all 0.2s;
}

.category-item:hover {
  background-color: #f0f2f5;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.category-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

.category-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.category-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-edit {
  background-color: #fff;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-edit:hover {
  background-color: #667eea;
  color: #fff;
}

.btn-delete {
  background-color: #fff;
  color: #e74c3c;
  border: 1px solid #e74c3c;
}

.btn-delete:hover {
  background-color: #e74c3c;
  color: #fff;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 1.5rem 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: #333;
  box-shadow: 0 0 0 2px #fff;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-cancel {
  padding: 0.6rem 1.25rem;
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background-color: #e8e8e8;
}

.btn-save {
  padding: 0.6rem 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-buttons {
    width: 100%;
    justify-content: space-between;
  }

  .category-item {
    padding: 0.875rem 1rem;
  }
}
</style>