<template>
  <div class="templates-view">
    <div class="view-header">
      <div class="header-left">
        <div class="search-box">
          <i class="pi pi-search" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search templates..."
            class="search-input"
          />
        </div>
        <div class="filter-tabs">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="filter-tab"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>
      <div class="header-right">
        <button class="btn btn-secondary" :disabled="refreshing" @click="refreshTemplates">
          <i class="pi pi-refresh" :class="{ 'pi-spin': refreshing }" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading templates...</span>
    </div>

    <div v-else-if="filteredTemplates.length === 0" class="empty-state">
      <div class="empty-icon">
        <i class="pi pi-th-large" />
      </div>
      <h3>No templates found</h3>
      <p v-if="searchQuery">Try a different search term</p>
      <p v-else>No templates available in this category</p>
    </div>

    <div v-else class="templates-grid">
      <div
        v-for="template in filteredTemplates"
        :key="template.id"
        class="template-card"
        @click="deployTemplate(template)"
      >
        <div class="template-header">
          <div class="template-logo" :class="{ 'has-image': template.logo }">
            <img v-if="template.logo" :src="template.logo" :alt="template.name" />
            <i v-else :class="template.icon || 'pi pi-box'" />
          </div>
          <span class="template-category">{{ template.category }}</span>
        </div>
        <div class="template-body">
          <h3 class="template-name">{{ template.name }}</h3>
          <p class="template-desc">{{ template.description || "Ready to deploy" }}</p>
        </div>
        <div class="template-footer">
          <button class="deploy-btn">
            <i class="pi pi-play" />
            Deploy
          </button>
        </div>
      </div>
    </div>

    <NewDeploymentModal
      :visible="showDeployModal"
      :initial-template="selectedTemplate"
      @close="showDeployModal = false"
      @created="onDeploymentCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { templatesApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import NewDeploymentModal from "@/components/NewDeploymentModal.vue";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  logo?: string;
  category: string;
  priority?: number;
  content: string;
}

const notifications = useNotificationsStore();
const loading = ref(true);
const refreshing = ref(false);
const templates = ref<Template[]>([]);
const searchQuery = ref("");
const selectedCategory = ref("all");
const showDeployModal = ref(false);
const selectedTemplate = ref<Template | null>(null);

const categories = computed(() => {
  const cats = new Set<string>();
  templates.value.forEach((t) => {
    if (t.category) cats.add(t.category);
  });
  return [{ id: "all", label: "All" }, ...Array.from(cats).map((c) => ({ id: c, label: c }))];
});

const filteredTemplates = computed(() => {
  let result = templates.value;

  if (selectedCategory.value !== "all") {
    result = result.filter((t) => t.category === selectedCategory.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)),
    );
  }

  return result.sort((a, b) => (b.priority || 0) - (a.priority || 0));
});

const fetchTemplates = async () => {
  loading.value = true;
  try {
    const response = await templatesApi.list();
    templates.value = response.data.templates || [];
  } catch {
    templates.value = [];
    notifications.error("Error", "Failed to load templates");
  } finally {
    loading.value = false;
  }
};

const refreshTemplates = async () => {
  refreshing.value = true;
  try {
    const response = await templatesApi.refresh();
    notifications.success("Refreshed", `${response.data.count} templates updated`);
    await fetchTemplates();
  } catch {
    notifications.error("Error", "Failed to refresh templates");
  } finally {
    refreshing.value = false;
  }
};

const deployTemplate = (template: Template) => {
  selectedTemplate.value = template;
  showDeployModal.value = true;
};

const onDeploymentCreated = () => {
  showDeployModal.value = false;
  notifications.success("Deployed", "Deployment created successfully");
};

onMounted(() => {
  fetchTemplates();
});
</script>

<style scoped>
.templates-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  min-width: 240px;
}

.search-box i {
  color: #9ca3af;
  font-size: 0.875rem;
}

.search-input {
  border: none;
  outline: none;
  font-size: 0.875rem;
  color: #374151;
  width: 100%;
  background: transparent;
}

.search-input::placeholder {
  color: #9ca3af;
}

.filter-tabs {
  display: flex;
  gap: 0.25rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.25rem;
}

.filter-tab {
  padding: 0.375rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: capitalize;
}

.filter-tab:hover {
  background: #f3f4f6;
  color: #374151;
}

.filter-tab.active {
  background: #3b82f6;
  color: white;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.loading-state i {
  font-size: 2rem;
  color: #3b82f6;
  margin-bottom: 1rem;
}

.empty-icon {
  width: 64px;
  height: 64px;
  background: #f3f4f6;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.empty-icon i {
  font-size: 1.5rem;
  color: #9ca3af;
}

.empty-state h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.template-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.template-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.template-card:hover .deploy-btn {
  background: #3b82f6;
  color: white;
}

.template-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.template-logo {
  width: 48px;
  height: 48px;
  background: #f3f4f6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: #6b7280;
}

.template-logo.has-image {
  background: white;
  border: 1px solid #e5e7eb;
}

.template-logo img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.template-category {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.template-body {
  padding: 0 1rem;
  flex: 1;
}

.template-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.375rem 0;
}

.template-desc {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-footer {
  padding: 1rem;
  border-top: 1px solid #f3f4f6;
  margin-top: auto;
}

.deploy-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.deploy-btn i {
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: unset;
  }

  .filter-tabs {
    overflow-x: auto;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }
}
</style>
