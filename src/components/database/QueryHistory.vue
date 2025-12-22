<template>
  <div class="query-history">
    <div class="history-header">
      <div class="header-left">
        <h3>Query History</h3>
        <span class="history-count">{{ filteredHistory.length }} queries</span>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <Search :size="14" class="search-icon" />
          <input v-model="searchTerm" type="text" class="search-input" placeholder="Search queries..." />
        </div>
        <button v-if="history.length > 0" class="btn btn-danger-outline btn-sm" @click="showClearConfirm = true">
          <Trash2 :size="14" />
          Clear
        </button>
      </div>
    </div>

    <div class="history-tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
        All
        <span class="tab-count">{{ history.length }}</span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'favorites' }" @click="activeTab = 'favorites'">
        <Star :size="14" />
        Favorites
        <span class="tab-count">{{ favorites.length }}</span>
      </button>
    </div>

    <div v-if="displayedHistory.length === 0" class="empty-state">
      <History :size="32" />
      <p v-if="searchTerm">No queries match your search</p>
      <p v-else-if="activeTab === 'favorites'">No favorite queries yet</p>
      <p v-else>No query history</p>
    </div>

    <div v-else class="history-list">
      <div
        v-for="item in displayedHistory"
        :key="item.id"
        class="history-item"
        :class="{ error: !item.success }"
        @click="$emit('load-query', item.query)"
      >
        <div class="item-header">
          <div class="item-meta">
            <span class="item-database">{{ item.database }}</span>
            <span class="item-time">{{ formatTime(item.timestamp) }}</span>
          </div>
          <div class="item-actions">
            <button
              class="action-btn"
              :class="{ active: item.favorite }"
              title="Toggle favorite"
              @click.stop="toggleFavorite(item.id)"
            >
              <Star :size="14" :fill="item.favorite ? 'currentColor' : 'none'" />
            </button>
            <button class="action-btn delete" title="Delete" @click.stop="removeItem(item.id)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
        <div class="item-query">
          <code>{{ truncateQuery(item.query) }}</code>
        </div>
        <div class="item-footer">
          <span v-if="item.success" class="item-rows">
            <CheckCircle :size="12" />
            {{ item.rowCount ?? 0 }} rows
          </span>
          <span v-else class="item-error">
            <XCircle :size="12" />
            Failed
          </span>
          <span v-if="item.executionTime" class="item-duration"> {{ item.executionTime }}ms </span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showClearConfirm" class="modal-overlay" @click.self="showClearConfirm = false">
        <div class="modal-container modal-sm">
          <div class="modal-header danger">
            <h3>
              <Trash2 :size="20" />
              Clear History
            </h3>
            <button class="close-btn" @click="showClearConfirm = false">
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to clear all query history?</p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showClearConfirm = false">Cancel</button>
            <button class="btn btn-danger" @click="clearHistory">
              <Trash2 :size="14" />
              Clear All
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Search, Trash2, Star, History, CheckCircle, XCircle, X } from "lucide-vue-next";
import { useDatabaseStore } from "@/stores/database";

const props = defineProps<{
  connectionId: string;
}>();

defineEmits<{
  "load-query": [query: string];
}>();

const databaseStore = useDatabaseStore();

const searchTerm = ref("");
const activeTab = ref<"all" | "favorites">("all");
const showClearConfirm = ref(false);

const history = computed(() => databaseStore.getHistory(props.connectionId));
const favorites = computed(() => databaseStore.getFavorites(props.connectionId));

const filteredHistory = computed(() => {
  return databaseStore.searchHistory(props.connectionId, searchTerm.value);
});

const displayedHistory = computed(() => {
  const items = activeTab.value === "favorites" ? favorites.value : filteredHistory.value;
  if (activeTab.value === "favorites" && searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    return items.filter(
      (item) => item.query.toLowerCase().includes(term) || item.database.toLowerCase().includes(term),
    );
  }
  return items;
});

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}

function truncateQuery(query: string): string {
  const cleaned = query.replace(/\s+/g, " ").trim();
  if (cleaned.length > 150) return cleaned.substring(0, 150) + "...";
  return cleaned;
}

function toggleFavorite(itemId: string) {
  databaseStore.toggleFavorite(props.connectionId, itemId);
}

function removeItem(itemId: string) {
  databaseStore.removeFromHistory(props.connectionId, itemId);
}

function clearHistory() {
  databaseStore.clearHistory(props.connectionId);
  showClearConfirm.value = false;
}

onMounted(() => {
  databaseStore.loadHistoryFromStorage(props.connectionId);
});
</script>

<style scoped>
.query-history {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.header-left h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.history-count {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400);
  pointer-events: none;
}

.search-input {
  width: 200px;
  padding: var(--space-2) var(--space-3);
  padding-left: calc(var(--space-3) + 18px);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.history-tabs {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all var(--transition-base);
}

.tab-btn:hover {
  background: var(--color-gray-100);
}

.tab-btn.active {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.tab-count {
  font-size: var(--text-xs);
  padding: 0 var(--space-2);
  background: var(--color-gray-200);
  border-radius: var(--radius-full);
}

.tab-btn.active .tab-count {
  background: var(--color-primary-200);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--space-12);
  color: var(--color-gray-400);
}

.empty-state p {
  margin: var(--space-2) 0 0;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.history-item {
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.history-item:hover {
  border-color: var(--color-primary-300);
  box-shadow: var(--shadow-sm);
}

.history-item.error {
  border-left: 3px solid var(--color-danger-500);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.item-database {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
}

.item-time {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
}

.item-actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.history-item:hover .item-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  color: var(--color-gray-400);
  cursor: pointer;
  transition: all var(--transition-base);
}

.action-btn:hover {
  color: var(--color-gray-600);
}

.action-btn.active {
  color: var(--color-warning-500);
  border-color: var(--color-warning-200);
  background: var(--color-warning-50);
}

.action-btn.delete:hover {
  color: var(--color-danger-500);
  border-color: var(--color-danger-200);
  background: var(--color-danger-50);
}

.item-query {
  margin-bottom: var(--space-2);
}

.item-query code {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-700);
  line-height: 1.5;
  word-break: break-all;
}

.item-footer {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.item-rows,
.item-error {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
}

.item-rows {
  color: var(--color-success-600);
}

.item-error {
  color: var(--color-danger-600);
}

.item-duration {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-gray-400);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  width: 400px;
  max-width: 90vw;
}

.modal-sm {
  width: 360px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.modal-header.danger {
  background: var(--color-danger-50);
}

.modal-header.danger h3 {
  color: var(--color-danger-700);
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-lg);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  color: var(--color-gray-600);
  background: var(--color-gray-100);
}

.modal-body {
  padding: var(--space-4);
}

.modal-body p {
  margin: 0 0 var(--space-2) 0;
}

.warning-text {
  font-size: var(--text-sm);
  color: var(--color-danger-600);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--color-gray-200);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover {
  background: var(--color-gray-50);
}

.btn-danger {
  background: var(--color-danger-500);
  color: white;
}

.btn-danger:hover {
  background: var(--color-danger-600);
}

.btn-danger-outline {
  background: white;
  border: 1px solid var(--color-danger-200);
  color: var(--color-danger-600);
}

.btn-danger-outline:hover {
  background: var(--color-danger-50);
}

.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
}
</style>
