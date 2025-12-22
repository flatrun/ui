<template>
  <div class="templates-view">
    <div class="view-header">
      <div class="header-left">
        <div class="search-box">
          <i class="pi pi-search" />
          <input v-model="searchQuery" type="text" placeholder="Search templates..." class="search-input" />
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
      <div v-for="template in filteredTemplates" :key="template.id" class="template-card">
        <div class="template-header">
          <div class="template-logo" :class="{ 'has-image': template.logo }">
            <img v-if="template.logo" :src="template.logo" :alt="template.name" />
            <i v-else :class="template.icon || 'pi pi-box'" />
          </div>
          <div class="template-actions">
            <span class="template-category">{{ getCategoryLabel(template.category) }}</span>
            <div class="dropdown">
              <button class="menu-btn" @click.stop="toggleMenu(template.id)">
                <i class="pi pi-ellipsis-v" />
              </button>
              <div v-if="openMenuId === template.id" class="dropdown-menu">
                <button @click.stop="viewDetails(template)">
                  <i class="pi pi-eye" />
                  View Details
                </button>
                <button @click.stop="deployTemplate(template)">
                  <i class="pi pi-play" />
                  Deploy
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="template-body" @click="deployTemplate(template)">
          <h3 class="template-name">{{ template.name }}</h3>
          <p class="template-desc">{{ template.description || "Ready to deploy" }}</p>
        </div>
        <div class="template-footer">
          <button class="deploy-btn" @click="deployTemplate(template)">
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

    <!-- Template Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click.self="closeDetails">
      <div class="modal-content details-modal">
        <div class="modal-header">
          <div class="modal-title-row">
            <div class="template-logo-lg" :class="{ 'has-image': detailsTemplate?.logo }">
              <img v-if="detailsTemplate?.logo" :src="detailsTemplate.logo" :alt="detailsTemplate.name" />
              <i v-else :class="detailsTemplate?.icon || 'pi pi-box'" />
            </div>
            <div>
              <h2>{{ detailsTemplate?.name }}</h2>
              <span class="template-category">{{ getCategoryLabel(detailsTemplate?.category || "") }}</span>
            </div>
          </div>
          <button class="btn-icon" @click="closeDetails">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="modal-body">
          <p class="template-description">{{ detailsTemplate?.description }}</p>

          <div class="details-tabs">
            <button class="tab-btn" :class="{ active: activeTab === 'compose' }" @click="activeTab = 'compose'">
              docker-compose.yml
            </button>
            <button class="tab-btn" :class="{ active: activeTab === 'metadata' }" @click="activeTab = 'metadata'">
              metadata.yml
            </button>
          </div>

          <div class="code-block">
            <pre v-if="activeTab === 'compose'">{{ detailsTemplate?.content }}</pre>
            <pre v-else>{{ formatMetadata(detailsTemplate) }}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeDetails">Close</button>
          <button class="btn btn-primary" @click="deployFromDetails">
            <i class="pi pi-play" />
            Deploy
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { templatesApi, type TemplateCategory } from "@/services/api";
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
const apiCategories = ref<TemplateCategory[]>([]);
const searchQuery = ref("");
const selectedCategory = ref("all");
const showDeployModal = ref(false);
const selectedTemplate = ref<Template | null>(null);
const openMenuId = ref<string | null>(null);
const showDetailsModal = ref(false);
const detailsTemplate = ref<Template | null>(null);
const activeTab = ref<"compose" | "metadata">("compose");

const categories = computed(() => {
  const baseCategories = [{ id: "all", label: "All" }];
  if (apiCategories.value.length > 0) {
    return [
      ...baseCategories,
      ...apiCategories.value
        .filter((c) => templates.value.some((t) => t.category === c.id))
        .sort((a, b) => b.priority - a.priority)
        .map((c) => ({ id: c.id, label: c.name })),
    ];
  }
  const cats = new Set<string>();
  templates.value.forEach((t) => {
    if (t.category) cats.add(t.category);
  });
  return [...baseCategories, ...Array.from(cats).map((c) => ({ id: c, label: c }))];
});

const getCategoryLabel = (categoryId: string) => {
  const cat = apiCategories.value.find((c) => c.id === categoryId);
  return cat?.name || categoryId;
};

const filteredTemplates = computed(() => {
  let result = templates.value;

  if (selectedCategory.value !== "all") {
    result = result.filter((t) => t.category === selectedCategory.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (t) => t.name.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)),
    );
  }

  return result.sort((a, b) => (b.priority || 0) - (a.priority || 0));
});

const fetchTemplates = async () => {
  loading.value = true;
  try {
    const [templatesRes, categoriesRes] = await Promise.all([templatesApi.list(), templatesApi.categories()]);
    templates.value = templatesRes.data.templates || [];
    apiCategories.value = categoriesRes.data.categories || [];
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

const toggleMenu = (templateId: string) => {
  openMenuId.value = openMenuId.value === templateId ? null : templateId;
};

const closeMenus = () => {
  openMenuId.value = null;
};

const viewDetails = (template: Template) => {
  detailsTemplate.value = template;
  showDetailsModal.value = true;
  activeTab.value = "compose";
  openMenuId.value = null;
};

const closeDetails = () => {
  showDetailsModal.value = false;
  detailsTemplate.value = null;
};

const deployFromDetails = () => {
  if (detailsTemplate.value) {
    selectedTemplate.value = detailsTemplate.value;
    showDetailsModal.value = false;
    showDeployModal.value = true;
  }
};

const formatMetadata = (template: Template | null) => {
  if (!template) return "";
  return `name: ${template.name}
description: ${template.description || ""}
icon: ${template.icon || "pi pi-box"}
logo: ${template.logo || ""}
category: ${template.category}
priority: ${template.priority || 0}`;
};

const deployTemplate = (template: Template) => {
  openMenuId.value = null;
  selectedTemplate.value = template;
  showDeployModal.value = true;
};

const onDeploymentCreated = () => {
  showDeployModal.value = false;
  notifications.success("Deployed", "Deployment created successfully");
};

onMounted(() => {
  fetchTemplates();
  document.addEventListener("click", closeMenus);
});

onUnmounted(() => {
  document.removeEventListener("click", closeMenus);
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
  border-radius: 4px;
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
  border-radius: 4px;
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
  border-radius: 4px;
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
  border-radius: 4px;
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
  border-radius: 4px;
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
  border-radius: 4px;
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
  border-radius: 4px;
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
  border-radius: 4px;
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

.template-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown {
  position: relative;
}

.menu-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
}

.menu-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  z-index: 100;
  overflow: hidden;
}

.dropdown-menu button {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s;
}

.dropdown-menu button:hover {
  background: #f3f4f6;
}

.dropdown-menu button i {
  font-size: 0.75rem;
  color: #6b7280;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 4px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.details-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.template-logo-lg {
  width: 56px;
  height: 56px;
  background: #f3f4f6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #6b7280;
}

.template-logo-lg.has-image {
  background: white;
  border: 1px solid #e5e7eb;
}

.template-logo-lg img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.modal-title-row h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e5e7eb;
  color: #374151;
}

.details-modal .modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.template-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0 0 1.25rem 0;
  line-height: 1.6;
}

.details-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
  background: #f3f4f6;
  padding: 0.25rem;
  border-radius: 4px;
}

.tab-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #374151;
}

.tab-btn.active {
  background: white;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.code-block {
  background: #1f2937;
  border-radius: 4px;
  padding: 1rem;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: #e5e7eb;
  white-space: pre-wrap;
  word-break: break-word;
}

.details-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}
</style>
