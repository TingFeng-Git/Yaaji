<template>
  <div class="search-select" ref="selectRef">
    <div v-if="!isDropdownOpen && useNativeSelect" class="native-select-wrapper">
      <select
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value)"
        class="native-select"
      >
        <option :value="null">{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.id"
          :value="option.id"
        >
          {{ option.name }}
        </option>
      </select>
    </div>

    <template v-else>
      <div
        class="select-trigger"
        :class="{ open: isDropdownOpen }"
        @click="toggleDropdown"
      >
        <span class="select-value">
          {{ selectedLabel || placeholder }}
        </span>
        <span class="select-arrow">▼</span>
      </div>

      <div v-if="isDropdownOpen" class="dropdown-panel">
        <div v-if="showSearch" class="search-input-wrapper">
          <input
            ref="searchInputRef"
            v-model="searchText"
            type="text"
            class="search-input"
            placeholder="搜索..."
            @keydown.down.prevent="navigateDown"
            @keydown.up.prevent="navigateUp"
            @keydown.enter.prevent="selectHighlighted"
            @keydown.esc="closeDropdown"
          />
        </div>

        <div class="options-list" ref="optionsListRef">
          <div
            v-for="(option, index) in filteredOptions"
            :key="option.id"
            class="option-item"
            :class="{
              selected: option.id === modelValue,
              highlighted: index === highlightedIndex
            }"
            @click="selectOption(option)"
            @mouseenter="highlightedIndex = index"
          >
            {{ option.name }}
          </div>

          <div v-if="filteredOptions.length === 0" class="no-results">
            未找到匹配项
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

export default {
  name: 'SearchSelect',
  props: {
    modelValue: {
      type: [String, Number, null],
      default: null
    },
    options: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: '请选择'
    },
    searchableThreshold: {
      type: Number,
      default: 5
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const selectRef = ref(null)
    const searchInputRef = ref(null)
    const optionsListRef = ref(null)
    const isDropdownOpen = ref(false)
    const searchText = ref('')
    const highlightedIndex = ref(-1)

    const showSearch = computed(() => {
      return props.options.length > props.searchableThreshold
    })

    const useNativeSelect = computed(() => {
      return props.options.length <= props.searchableThreshold
    })

    const filteredOptions = computed(() => {
      if (!searchText.value.trim()) {
        return props.options
      }
      const keyword = searchText.value.toLowerCase().trim()
      return props.options.filter(opt =>
        opt.name.toLowerCase().includes(keyword)
      )
    })

    const selectedLabel = computed(() => {
      if (props.modelValue === null) return null
      const option = props.options.find(opt => opt.id === props.modelValue)
      return option ? option.name : null
    })

    const toggleDropdown = () => {
      if (isDropdownOpen.value) {
        closeDropdown()
      } else {
        openDropdown()
      }
    }

    const openDropdown = async () => {
      isDropdownOpen.value = true
      highlightedIndex.value = -1
      searchText.value = ''
      if (showSearch.value) {
        await nextTick()
        searchInputRef.value?.focus()
      }
    }

    const closeDropdown = () => {
      isDropdownOpen.value = false
      searchText.value = ''
    }

    const selectOption = (option) => {
      emit('update:modelValue', option.id)
      closeDropdown()
    }

    const navigateDown = () => {
      if (highlightedIndex.value < filteredOptions.value.length - 1) {
        highlightedIndex.value++
        scrollToHighlighted()
      }
    }

    const navigateUp = () => {
      if (highlightedIndex.value > 0) {
        highlightedIndex.value--
        scrollToHighlighted()
      }
    }

    const selectHighlighted = () => {
      if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredOptions.value.length) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
    }

    const scrollToHighlighted = () => {
      nextTick(() => {
        const list = optionsListRef.value
        const items = list?.querySelectorAll('.option-item')
        if (items && items[highlightedIndex.value]) {
          items[highlightedIndex.value].scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
          })
        }
      })
    }

    const handleClickOutside = (event) => {
      if (selectRef.value && !selectRef.value.contains(event.target)) {
        closeDropdown()
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    watch(isDropdownOpen, (open) => {
      if (!open) {
        searchText.value = ''
        highlightedIndex.value = -1
      }
    })

    return {
      selectRef,
      searchInputRef,
      optionsListRef,
      isDropdownOpen,
      searchText,
      highlightedIndex,
      showSearch,
      useNativeSelect,
      filteredOptions,
      selectedLabel,
      toggleDropdown,
      selectOption,
      navigateDown,
      navigateUp,
      selectHighlighted,
      closeDropdown
    }
  }
}
</script>

<style scoped>
.search-select {
  position: relative;
  width: 100%;
}

.native-select-wrapper {
  width: 100%;
}

.native-select {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  outline: none;
  border-left: 1px solid #ddd;
  margin-left: 0.25rem;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  border-left: 1px solid #ddd;
  margin-left: 0.25rem;
  user-select: none;
}

.select-trigger:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.select-trigger.open {
  background-color: rgba(0, 0, 0, 0.05);
}

.select-value {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.select-arrow {
  font-size: 8px;
  color: #999;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.select-trigger.open .select-arrow {
  transform: rotate(180deg);
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.search-input-wrapper {
  padding: 0.5rem;
  border-bottom: 1px solid #e8e8e8;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #667eea;
}

.options-list {
  max-height: 200px;
  overflow-y: auto;
}

.option-item {
  padding: 0.625rem 0.75rem;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background-color 0.15s;
}

.option-item:hover,
.option-item.highlighted {
  background-color: #f5f5f5;
}

.option-item.selected {
  background-color: rgba(102, 126, 234, 0.1);
  color: #667eea;
  font-weight: 500;
}

.no-results {
  padding: 1rem;
  text-align: center;
  font-size: 13px;
  color: #999;
}

@media (max-width: 768px) {
  .dropdown-panel {
    left: -0.5rem;
    right: -0.5rem;
  }
}
</style>
