<template>
  <div class="data-table-container">
    <div class="table-header">
      <div class="header-left">
        <div
          v-if="searchable"
          class="search-box"
        >
          <Search :size="16" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="search-input"
          >
        </div>
        <slot name="filters" />
      </div>
      <div class="header-right">
        <slot name="actions" />
        <div
          v-if="toggleable"
          class="view-toggle"
        >
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            <Grid3x3 :size="16" />
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
          >
            <List :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="loading && items.length === 0"
      class="loading-state"
    >
      <Loader2
        :size="48"
        class="spinning"
      />
      <span>{{ loadingText }}</span>
    </div>

    <div
      v-else-if="filteredItems.length === 0"
      class="empty-state"
    >
      <component
        :is="emptyIcon"
        v-if="emptyIcon && typeof emptyIcon !== 'string'"
        :size="48"
      />
      <i
        v-else-if="emptyIcon && typeof emptyIcon === 'string'"
        :class="emptyIcon"
      />
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyText }}</p>
      <slot name="empty-action" />
    </div>

    <template v-else>
      <div
        v-if="viewMode === 'table'"
        class="table-wrapper"
      >
        <table class="data-table">
          <thead>
            <tr>
              <th
                v-if="selectable"
                class="checkbox-col"
              >
                <input
                  v-model="selectAll"
                  type="checkbox"
                  @change="toggleSelectAll"
                >
              </th>
              <th
                v-for="column in columns"
                :key="column.key"
                :style="{ width: column.width }"
                :class="{ sortable: column.sortable }"
                @click="column.sortable && sortBy(column.key)"
              >
                {{ column.label }}
                <ArrowUp
                  v-if="
                    column.sortable &&
                      sortKey === column.key &&
                      sortDirection === 'asc'
                  "
                  :size="12"
                  class="sort-icon"
                />
                <ArrowDown
                  v-if="
                    column.sortable &&
                      sortKey === column.key &&
                      sortDirection === 'desc'
                  "
                  :size="12"
                  class="sort-icon"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in paginatedItems"
              :key="getItemKey(item)"
              :class="{ selected: selectedItems.includes(getItemKey(item)) }"
            >
              <td
                v-if="selectable"
                class="checkbox-col"
              >
                <input
                  v-model="selectedItems"
                  type="checkbox"
                  :value="getItemKey(item)"
                >
              </td>
              <td
                v-for="column in columns"
                :key="column.key"
              >
                <slot
                  :name="`cell-${column.key}`"
                  :item="item"
                  :value="getNestedValue(item, column.key)"
                >
                  {{ getNestedValue(item, column.key) }}
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-else
        class="grid-view"
      >
        <slot
          name="grid"
          :items="paginatedItems"
          :selected-items="selectedItems"
          :toggle-select="toggleSelect"
        />
      </div>

      <div
        v-if="totalPages > 1"
        class="pagination"
      >
        <div class="pagination-info">
          Showing {{ startIndex + 1 }}-{{ endIndex }} of
          {{ filteredItems.length }} items
        </div>
        <div class="pagination-controls">
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="currentPage = 1"
          >
            <ChevronsLeft :size="16" />
          </button>
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            <ChevronLeft :size="16" />
          </button>
          <div class="page-numbers">
            <button
              v-for="page in visiblePages"
              :key="page"
              class="page-btn"
              :class="{ active: page === currentPage }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
          </div>
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            <ChevronRight :size="16" />
          </button>
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="currentPage = totalPages"
          >
            <ChevronsRight :size="16" />
          </button>
        </div>
        <div class="page-size-selector">
          <select
            v-model="pageSize"
            class="page-size-select"
          >
            <option :value="10">
              10 / page
            </option>
            <option :value="25">
              25 / page
            </option>
            <option :value="50">
              50 / page
            </option>
            <option :value="100">
              100 / page
            </option>
          </select>
        </div>
      </div>
    </template>

    <div
      v-if="selectedItems.length > 0"
      class="bulk-actions"
    >
      <span class="selection-count">{{ selectedItems.length }} selected</span>
      <slot
        name="bulk-actions"
        :selected-items="selectedItems"
        :clear-selection="clearSelection"
      />
      <button
        class="btn btn-ghost"
        @click="clearSelection"
      >
        Clear selection
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  Search,
  Grid3x3,
  List,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-vue-next";

interface Column {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: any[];
    columns: Column[];
    itemKey?: string;
    loading?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    searchFields?: string[];
    selectable?: boolean;
    toggleable?: boolean;
    emptyIcon?: any;
    emptyTitle?: string;
    emptyText?: string;
    loadingText?: string;
    defaultPageSize?: number;
    defaultViewMode?: "table" | "grid";
  }>(),
  {
    itemKey: "id",
    loading: false,
    searchable: true,
    searchPlaceholder: "Search...",
    searchFields: () => [],
    selectable: false,
    toggleable: false,
    emptyIcon: undefined,
    emptyTitle: "No items found",
    emptyText: "There are no items to display.",
    loadingText: "Loading...",
    defaultPageSize: 25,
    defaultViewMode: "table",
  },
);

const emit = defineEmits(["update:selected", "row-click"]);

const searchQuery = ref("");
const currentPage = ref(1);
const pageSize = ref(props.defaultPageSize);
const selectedItems = ref<any[]>([]);
const selectAll = ref(false);
const viewMode = ref<"table" | "grid">(props.defaultViewMode);
const sortKey = ref("");
const sortDirection = ref<"asc" | "desc">("asc");

const getItemKey = (item: any) => {
  return item[props.itemKey];
};

const getNestedValue = (obj: any, path: string) => {
  return path.split(".").reduce((o, p) => o?.[p], obj);
};

const filteredItems = computed(() => {
  let result = [...props.items];

  if (searchQuery.value && props.searchFields.length > 0) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((item) =>
      props.searchFields.some((field) => {
        const value = getNestedValue(item, field);
        return value && String(value).toLowerCase().includes(query);
      }),
    );
  }

  if (sortKey.value) {
    result.sort((a, b) => {
      const aVal = getNestedValue(a, sortKey.value);
      const bVal = getNestedValue(b, sortKey.value);
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection.value === "asc" ? comparison : -comparison;
    });
  }

  return result;
});

const totalPages = computed(() =>
  Math.ceil(filteredItems.value.length / pageSize.value),
);
const startIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const endIndex = computed(() =>
  Math.min(startIndex.value + pageSize.value, filteredItems.value.length),
);

const paginatedItems = computed(() => {
  return filteredItems.value.slice(startIndex.value, endIndex.value);
});

const visiblePages = computed(() => {
  const pages: number[] = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push(-1); // ellipsis
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push(-1);
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push(-1);
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push(-1);
      pages.push(total);
    }
  }

  return pages.filter((p) => p !== -1);
});

const sortBy = (key: string) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDirection.value = "asc";
  }
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedItems.value = paginatedItems.value.map((item) => getItemKey(item));
  } else {
    selectedItems.value = [];
  }
};

const toggleSelect = (key: any) => {
  const index = selectedItems.value.indexOf(key);
  if (index === -1) {
    selectedItems.value.push(key);
  } else {
    selectedItems.value.splice(index, 1);
  }
};

const clearSelection = () => {
  selectedItems.value = [];
  selectAll.value = false;
};

watch(searchQuery, () => {
  currentPage.value = 1;
});

watch(pageSize, () => {
  currentPage.value = 1;
});

watch(selectedItems, () => {
  emit("update:selected", selectedItems.value);
});
</script>

<style scoped>
.data-table-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 1rem);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4, 1rem);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-4, 1rem);
  flex-wrap: wrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2, 0.5rem);
}

.search-box {
  position: relative;
}

.search-box i {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400, #9ca3af);
}

.search-input {
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-md, 6px);
  font-size: var(--text-md, 0.875rem);
  width: 280px;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: 0 0 0 var(--ring-width, 2px)
    var(--ring-color, rgba(59, 130, 246, 0.1));
}

.view-toggle {
  display: flex;
  background: var(--color-gray-100, #f3f4f6);
  padding: 0.25rem;
  border-radius: var(--radius-md, 6px);
}

.toggle-btn {
  padding: 0.375rem 0.625rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  color: var(--color-gray-500, #6b7280);
  transition: all var(--transition-base, 200ms ease);
}

.toggle-btn.active {
  background: white;
  color: var(--color-gray-900, #111827);
  box-shadow: var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.05));
}

.table-wrapper {
  background: white;
  border-radius: var(--radius-lg, 8px);
  border: 1px solid var(--color-gray-200, #e5e7eb);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: var(--color-gray-50, #f9fafb);
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: var(--text-sm, 0.75rem);
  font-weight: var(--font-semibold, 600);
  color: var(--color-gray-500, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable:hover {
  color: var(--color-gray-700, #374151);
}

.data-table th i {
  margin-left: 0.25rem;
  font-size: 0.625rem;
}

.data-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-gray-100, #f3f4f6);
  font-size: var(--text-md, 0.875rem);
  color: var(--color-gray-700, #374151);
}

.data-table tr:hover {
  background: var(--color-gray-50, #f9fafb);
}

.data-table tr.selected {
  background: var(--color-primary-50, #eff6ff);
}

.checkbox-col {
  width: 40px;
}

.grid-view {
  display: grid;
  gap: var(--space-4, 1rem);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-lg, 8px);
  border: 1px solid var(--color-gray-200, #e5e7eb);
}

.pagination-info {
  font-size: var(--text-base, 0.8125rem);
  color: var(--color-gray-500, #6b7280);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  background: white;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--text-base, 0.8125rem);
  color: var(--color-gray-600, #4b5563);
  transition: all var(--transition-fast, 150ms ease);
}

.page-btn:hover:not(:disabled) {
  background: var(--color-gray-50, #f9fafb);
  border-color: var(--color-gray-300, #d1d5db);
}

.page-btn.active {
  background: var(--color-primary-500, #3b82f6);
  border-color: var(--color-primary-500, #3b82f6);
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-size-selector {
  display: flex;
  align-items: center;
}

.page-size-select {
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--text-base, 0.8125rem);
  color: var(--color-gray-600, #4b5563);
  background: white;
  cursor: pointer;
}

.bulk-actions {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-gray-800, #1f2937);
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-lg, 8px);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: var(--shadow-xl, 0 10px 25px rgba(0, 0, 0, 0.3));
  z-index: var(--z-sticky, 100);
}

.selection-count {
  font-size: var(--text-md, 0.875rem);
  padding-right: 0.75rem;
  border-right: 1px solid var(--color-gray-600, #4b5563);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
  background: white;
  border-radius: var(--radius-lg, 8px);
  text-align: center;
  gap: 1rem;
}

.loading-state i,
.empty-state i {
  font-size: 3rem;
  color: var(--color-gray-400, #9ca3af);
}

.empty-state h3 {
  font-size: var(--text-3xl, 1.25rem);
  color: var(--color-gray-700, #374151);
  margin: 0;
}

.empty-state p {
  color: var(--color-gray-500, #6b7280);
  margin: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-md, 6px);
  font-weight: var(--font-medium, 500);
  font-size: var(--text-base, 0.8125rem);
  cursor: pointer;
  transition: all var(--transition-base, 200ms ease);
  border: none;
}

.btn-ghost {
  background: transparent;
  color: var(--color-gray-400, #9ca3af);
}

.btn-ghost:hover {
  color: white;
}

.sort-icon {
  display: inline-block;
  margin-left: 0.25rem;
  vertical-align: middle;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
