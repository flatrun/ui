<template>
  <div class="images-view">
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ images.length }}</span>
        <span class="stat-label">Total Images</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ formatSize(totalSize) }}</span>
        <span class="stat-label">Total Size</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ unusedImages }}</span>
        <span class="stat-label">Unused</span>
      </div>
    </div>

    <DataTable
      :items="images"
      :columns="columns"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search images..."
      :search-fields="['tags', 'id']"
      :selectable="true"
      :toggleable="true"
      item-key="id"
      empty-icon="pi pi-image"
      empty-title="No Images Found"
      empty-text="Pull images from Docker Hub or build from Dockerfiles."
      loading-text="Loading images..."
      :default-page-size="25"
    >
      <template #actions>
        <button
          class="btn btn-primary"
          @click="showPullModal = true"
        >
          <i class="pi pi-download" />
          Pull Image
        </button>
        <button
          class="btn btn-secondary"
          :disabled="loading"
          @click="fetchImages"
        >
          <i
            class="pi pi-refresh"
            :class="{ 'pi-spin': loading }"
          />
          Refresh
        </button>
      </template>

      <template #cell-repository="{ item }">
        <span class="repo-name">{{ getImageName(item) }}</span>
      </template>

      <template #cell-tag="{ item }">
        <span
          v-for="tag in item.tags"
          :key="tag"
          class="tag-badge"
        >
          {{ getTagName(tag) }}
        </span>
        <span
          v-if="!item.tags?.length"
          class="no-tag"
        >&lt;none&gt;</span>
      </template>

      <template #cell-imageId="{ item }">
        <code class="image-id">{{ item.id.substring(7, 19) }}</code>
      </template>

      <template #cell-created="{ item }">
        {{ formatDate(item.created) }}
      </template>

      <template #cell-size="{ item }">
        {{ formatSize(item.size) }}
      </template>

      <template #cell-containers="{ item }">
        <span
          class="container-count"
          :class="{ used: item.containers > 0 }"
        >
          {{ item.containers }}
        </span>
      </template>

      <template #cell-actions="{ item }">
        <div class="table-actions">
          <button
            class="action-btn"
            title="Inspect"
            @click.stop="inspectImage(item.id)"
          >
            <i class="pi pi-info-circle" />
          </button>
          <button
            class="action-btn delete"
            :disabled="item.containers > 0"
            title="Remove"
            @click.stop="deleteImage(item.id)"
          >
            <i class="pi pi-trash" />
          </button>
        </div>
      </template>

      <template #grid="{ items, selectedItems, toggleSelect }">
        <div class="images-grid">
          <div
            v-for="image in items"
            :key="image.id"
            class="image-card"
            :class="{ selected: selectedItems.includes(image.id) }"
          >
            <div class="image-card-header">
              <input
                type="checkbox"
                :checked="selectedItems.includes(image.id)"
                class="image-checkbox"
                @change="toggleSelect(image.id)"
              >
              <div class="image-icon">
                <i class="pi pi-box" />
              </div>
              <div class="image-size">
                {{ formatSize(image.size) }}
              </div>
            </div>
            <div class="image-card-body">
              <h4 class="image-name">
                {{ getImageName(image) }}
              </h4>
              <div class="image-tags">
                <span
                  v-for="tag in image.tags"
                  :key="tag"
                  class="image-tag"
                >
                  {{ getTagName(tag) }}
                </span>
                <span
                  v-if="!image.tags?.length"
                  class="no-tag"
                >&lt;none&gt;</span>
              </div>
              <div class="image-meta">
                <span class="meta-item">
                  <i class="pi pi-calendar" />
                  {{ formatDate(image.created) }}
                </span>
                <span class="meta-item">
                  <i class="pi pi-box" />
                  {{ image.containers }} containers
                </span>
              </div>
            </div>
            <div class="image-card-actions">
              <button
                class="action-btn"
                title="Inspect"
                @click="inspectImage(image.id)"
              >
                <i class="pi pi-info-circle" />
              </button>
              <button
                class="action-btn"
                title="Create Container"
                @click="createContainer(image.id)"
              >
                <i class="pi pi-play" />
              </button>
              <button
                class="action-btn delete"
                title="Remove"
                :disabled="image.containers > 0"
                @click="deleteImage(image.id)"
              >
                <i class="pi pi-trash" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <template #bulk-actions="{ selectedItems, clearSelection }">
        <button
          class="btn btn-sm btn-danger"
          @click="bulkRemove(selectedItems, clearSelection)"
        >
          <i class="pi pi-trash" /> Remove
        </button>
      </template>
    </DataTable>

    <ConfirmModal
      :visible="showDeleteModal"
      title="Remove Image"
      message="Are you sure you want to remove this image?"
      warning="This action cannot be undone."
      variant="danger"
      confirm-text="Remove"
      :loading="deleting"
      @confirm="confirmDeleteImage"
      @cancel="showDeleteModal = false"
    />

    <ConfirmModal
      :visible="showBulkDeleteModal"
      title="Remove Images"
      :message="`Are you sure you want to remove ${bulkDeleteIds.length} images?`"
      warning="This action cannot be undone."
      variant="danger"
      confirm-text="Remove All"
      :loading="bulkDeleting"
      @confirm="confirmBulkRemove"
      @cancel="showBulkDeleteModal = false"
    />

    <Teleport to="body">
      <div
        v-if="showPullModal"
        class="modal-overlay"
        @click.self="showPullModal = false"
      >
        <div class="pull-modal modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-download" />
              Pull Image
            </h3>
            <button
              class="close-btn"
              @click="showPullModal = false"
            >
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Image Name</label>
              <input
                v-model="pullImageName"
                type="text"
                placeholder="nginx:latest"
                class="form-input"
              >
              <span class="form-hint">Format: repository:tag (e.g., nginx:latest, ubuntu:22.04)</span>
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              @click="showPullModal = false"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              :disabled="!pullImageName || pulling"
              @click="pullImage"
            >
              <i
                v-if="pulling"
                class="pi pi-spin pi-spinner"
              />
              {{ pulling ? "Pulling..." : "Pull Image" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { imagesApi } from "@/services/api";
import DataTable from "@/components/DataTable.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";

interface DockerImage {
  id: string;
  tags: string[];
  size: number;
  created: string;
  containers: number;
}

const images = ref<DockerImage[]>([]);
const loading = ref(false);
const showPullModal = ref(false);
const pullImageName = ref("");
const pulling = ref(false);

const showDeleteModal = ref(false);
const imageToDelete = ref<string | null>(null);
const deleting = ref(false);

const showBulkDeleteModal = ref(false);
const bulkDeleteIds = ref<string[]>([]);
const bulkDeleteClearFn = ref<(() => void) | null>(null);
const bulkDeleting = ref(false);

const columns = [
  { key: "repository", label: "Repository", sortable: true },
  { key: "tag", label: "Tag" },
  { key: "imageId", label: "Image ID" },
  { key: "created", label: "Created", sortable: true },
  { key: "size", label: "Size", sortable: true },
  { key: "containers", label: "Containers" },
  { key: "actions", label: "Actions", width: "100px" },
];

const totalSize = computed(() =>
  images.value.reduce((acc, img) => acc + img.size, 0),
);
const unusedImages = computed(
  () => images.value.filter((img) => img.containers === 0).length,
);

const fetchImages = async () => {
  loading.value = true;
  try {
    const response = await imagesApi.list();
    images.value = response.data.images || [];
  } catch (error) {
    console.error("Failed to fetch images:", error);
  } finally {
    loading.value = false;
  }
};

const getImageName = (image: DockerImage) => {
  if (!image.tags?.length) return "<none>";
  const tag = image.tags[0];
  const parts = tag.split(":");
  return parts[0];
};

const getTagName = (tag: string) => {
  const parts = tag.split(":");
  return parts[1] || "latest";
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

const deleteImage = (id: string) => {
  imageToDelete.value = id;
  showDeleteModal.value = true;
};

const confirmDeleteImage = async () => {
  if (!imageToDelete.value) return;
  deleting.value = true;
  try {
    await imagesApi.remove(imageToDelete.value);
    await fetchImages();
  } catch (error) {
    console.error("Failed to remove image:", error);
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
    imageToDelete.value = null;
  }
};

const bulkRemove = (ids: string[], clear: () => void) => {
  bulkDeleteIds.value = ids;
  bulkDeleteClearFn.value = clear;
  showBulkDeleteModal.value = true;
};

const confirmBulkRemove = async () => {
  bulkDeleting.value = true;
  try {
    for (const id of bulkDeleteIds.value) {
      try {
        await imagesApi.remove(id);
      } catch (error) {
        console.error(`Failed to remove image ${id}:`, error);
      }
    }
    if (bulkDeleteClearFn.value) bulkDeleteClearFn.value();
    await fetchImages();
  } finally {
    bulkDeleting.value = false;
    showBulkDeleteModal.value = false;
    bulkDeleteIds.value = [];
    bulkDeleteClearFn.value = null;
  }
};

const pullImage = async () => {
  if (!pullImageName.value) return;
  pulling.value = true;
  try {
    await imagesApi.pull(pullImageName.value);
    showPullModal.value = false;
    pullImageName.value = "";
    await fetchImages();
  } catch (error) {
    console.error("Failed to pull image:", error);
  } finally {
    pulling.value = false;
  }
};

const inspectImage = (id: string) => {
  console.log("Inspect image:", id);
};

const createContainer = (id: string) => {
  console.log("Create container from image:", id);
};

onMounted(() => {
  fetchImages();
});
</script>

<style scoped>
.images-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.stats-bar {
  display: flex;
  gap: var(--space-6);
  background: white;
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  text-transform: uppercase;
}

.repo-name {
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.tag-badge {
  font-size: var(--text-xs);
  background: var(--color-success-50);
  color: var(--color-success-700);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.no-tag {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  font-style: italic;
}

.image-id {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--color-gray-600);
}

.container-count {
  font-weight: var(--font-medium);
}

.container-count.used {
  color: var(--color-primary-600);
}

.table-actions {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: var(--color-gray-100);
  color: var(--color-gray-600);
  transition: all var(--transition-base);
}

.action-btn:hover:not(:disabled) {
  background: var(--color-gray-200);
  color: var(--color-gray-900);
}

.action-btn.delete {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.action-btn.delete:hover:not(:disabled) {
  background: var(--color-danger-100);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

.image-card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-200);
  overflow: hidden;
  transition: all var(--transition-base);
}

.image-card:hover {
  box-shadow: var(--shadow-md);
}

.image-card.selected {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.image-card-header {
  padding: var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-100);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.image-checkbox {
  cursor: pointer;
}

.image-icon {
  width: 40px;
  height: 40px;
  background: var(--color-info-50);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-icon i {
  font-size: var(--text-xl);
  color: var(--color-primary-500);
}

.image-size {
  margin-left: auto;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-gray-600);
  background: white;
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-sm);
}

.image-card-body {
  padding: var(--space-4);
}

.image-name {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0 0 var(--space-2) 0;
}

.image-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: var(--space-3);
}

.image-tag {
  font-size: var(--text-xs);
  background: var(--color-success-50);
  color: var(--color-success-700);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.image-meta {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.meta-item i {
  font-size: var(--text-md);
}

.image-card-actions {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  gap: 0.375rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-base);
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
}

.btn-danger {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.btn-danger:hover {
  background: var(--color-danger-100);
}

.pull-modal {
  max-width: 500px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  font-size: var(--text-md);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
}

.form-hint {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: 0.375rem;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: var(--color-gray-200);
}
</style>
