<template>
  <div class="file-browser">
    <div class="browser-toolbar">
      <div class="toolbar-left">
        <div class="breadcrumb">
          <button class="breadcrumb-item" @click="navigateTo('/')">
            <i class="pi pi-home" />
          </button>
          <template v-for="(part, index) in pathParts" :key="index">
            <i class="pi pi-chevron-right breadcrumb-separator" />
            <button class="breadcrumb-item" @click="navigateTo(getPathUpTo(index))">
              {{ part }}
            </button>
          </template>
        </div>
        <label class="view-toggle" :class="{ active: showHiddenFiles }">
          <input v-model="showHiddenFiles" type="checkbox" />
          <i class="pi pi-eye" />
          Hidden
        </label>
        <div class="view-mode-toggle">
          <button
            class="view-mode-btn"
            :class="{ active: viewMode === 'list' }"
            title="List View"
            @click="viewMode = 'list'"
          >
            <i class="pi pi-list" />
          </button>
          <button
            class="view-mode-btn"
            :class="{ active: viewMode === 'grid' }"
            title="Grid View"
            @click="viewMode = 'grid'"
          >
            <i class="pi pi-th-large" />
          </button>
        </div>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-sm btn-secondary" @click="refreshFiles" :disabled="loading">
          <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
        </button>
        <button class="btn btn-sm btn-secondary" @click="showNewFolderModal = true">
          <i class="pi pi-folder-plus" />
          New Folder
        </button>
        <label class="btn btn-sm btn-primary upload-btn">
          <i class="pi pi-upload" />
          Upload
          <input type="file" multiple @change="handleFileSelect" hidden />
        </label>
      </div>
    </div>

    <div v-if="uploading" class="upload-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: uploadProgress + '%' }" />
      </div>
      <span class="progress-text">Uploading {{ uploadFileName }}...</span>
    </div>

    <div class="browser-content">
      <div v-if="loading && files.length === 0" class="loading-state">
        <i class="pi pi-spin pi-spinner" />
        <span>Loading files...</span>
      </div>

      <div v-else-if="error" class="error-state">
        <i class="pi pi-exclamation-triangle" />
        <p>{{ error }}</p>
        <button class="btn btn-sm btn-primary" @click="refreshFiles">Retry</button>
      </div>

      <div v-else-if="files.length === 0" class="empty-state">
        <i class="pi pi-folder-open" />
        <h3>No files yet</h3>
        <p>Upload files or create folders to get started</p>
        <label class="btn btn-primary upload-btn">
          <i class="pi pi-upload" />
          Upload Files
          <input type="file" multiple @change="handleFileSelect" hidden />
        </label>
      </div>

      <div v-else-if="viewMode === 'list'" class="file-list">
        <div class="file-list-header">
          <span class="col-name">Name</span>
          <span class="col-size">Size</span>
          <span class="col-modified">Modified</span>
          <span class="col-actions">Actions</span>
        </div>
        <div
          v-for="file in files"
          :key="file.path"
          class="file-item"
          :class="{ 'is-dir': file.is_dir, selected: selectedFiles.includes(file.path) }"
          @click="handleItemClick(file)"
          @dblclick="handleItemDblClick(file)"
        >
          <span class="col-name">
            <i :class="getFileIcon(file)" />
            <span class="file-name">{{ file.name }}</span>
            <span v-if="file.is_dir && file.child_count !== undefined" class="child-count">
              {{ file.child_count }} items
            </span>
          </span>
          <span class="col-size">
            {{ file.is_dir ? "-" : formatSize(file.size) }}
          </span>
          <span class="col-modified">
            {{ formatDate(file.mod_time) }}
          </span>
          <span class="col-actions" @click.stop>
            <button v-if="!file.is_dir && isTextFile(file)" class="action-btn" title="View" @click="viewFile(file)">
              <i class="pi pi-eye" />
            </button>
            <button
              v-if="!file.is_dir && isTextFile(file)"
              class="action-btn"
              title="Edit"
              @click="openFileEditor(file)"
            >
              <i class="pi pi-pencil" />
            </button>
            <button v-if="!file.is_dir" class="action-btn" title="Download" @click="downloadFile(file)">
              <i class="pi pi-download" />
            </button>
            <button class="action-btn delete" title="Delete" @click="confirmDelete(file)">
              <i class="pi pi-trash" />
            </button>
          </span>
        </div>
      </div>

      <div v-else class="file-grid">
        <div
          v-for="file in files"
          :key="file.path"
          class="grid-item"
          :class="{ 'is-dir': file.is_dir, selected: selectedFiles.includes(file.path) }"
          @click="handleItemClick(file)"
          @dblclick="handleItemDblClick(file)"
        >
          <div class="grid-item-icon">
            <i :class="getFileIcon(file)" />
          </div>
          <div class="grid-item-name">{{ file.name }}</div>
          <div class="grid-item-meta">
            {{
              file.is_dir
                ? file.child_count !== undefined
                  ? `${file.child_count} items`
                  : "Folder"
                : formatSize(file.size)
            }}
          </div>
          <div class="grid-item-actions" @click.stop>
            <button v-if="!file.is_dir && isTextFile(file)" class="action-btn" title="View" @click="viewFile(file)">
              <i class="pi pi-eye" />
            </button>
            <button
              v-if="!file.is_dir && isTextFile(file)"
              class="action-btn"
              title="Edit"
              @click="openFileEditor(file)"
            >
              <i class="pi pi-pencil" />
            </button>
            <button v-if="!file.is_dir" class="action-btn" title="Download" @click="downloadFile(file)">
              <i class="pi pi-download" />
            </button>
            <button class="action-btn delete" title="Delete" @click="confirmDelete(file)">
              <i class="pi pi-trash" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="filesInfo" class="browser-footer">
      <span>{{ filesInfo.file_count }} items</span>
      <span>{{ formatSize(filesInfo.total_size) }} total</span>
    </div>

    <Teleport to="body">
      <div v-if="showNewFolderModal" class="modal-overlay" @click.self="showNewFolderModal = false">
        <div class="modal-container small">
          <div class="modal-header">
            <h3>
              <i class="pi pi-folder-plus" />
              New Folder
            </h3>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Folder Name</label>
              <input
                v-model="newFolderName"
                type="text"
                class="form-input"
                placeholder="Enter folder name"
                @keyup.enter="createFolder"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showNewFolderModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="!newFolderName.trim() || creatingFolder" @click="createFolder">
              <i :class="creatingFolder ? 'pi pi-spin pi-spinner' : 'pi pi-check'" />
              Create
            </button>
          </div>
        </div>
      </div>

      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal-container small">
          <div class="modal-header danger">
            <h3>
              <i class="pi pi-exclamation-triangle" />
              Confirm Delete
            </h3>
          </div>
          <div class="modal-body">
            <p>
              Are you sure you want to delete
              <strong>{{ fileToDelete?.name }}</strong
              >?
            </p>
            <p v-if="fileToDelete?.is_dir" class="warning-text">This will delete all contents inside the folder.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDeleteModal = false">Cancel</button>
            <button class="btn btn-danger" :disabled="deleting" @click="deleteFile">
              <i :class="deleting ? 'pi pi-spin pi-spinner' : 'pi pi-trash'" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div v-if="showEditorModal" class="modal-overlay">
        <div class="modal-container editor-modal">
          <div class="modal-header">
            <h3>
              <i :class="viewOnly ? 'pi pi-eye' : 'pi pi-file-edit'" />
              {{ editingFile?.name }}
              <span v-if="viewOnly" class="view-only-badge">Read Only</span>
            </h3>
            <button class="close-btn" @click="closeFileEditor">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body editor-body">
            <div v-if="loadingFileContent" class="loading-editor">
              <i class="pi pi-spin pi-spinner" />
              Loading file...
            </div>
            <Codemirror
              v-else
              v-model="fileContent"
              :extensions="editorExtensions"
              :style="{ height: '100%' }"
              :disabled="viewOnly"
            />
          </div>
          <div class="modal-footer">
            <template v-if="viewOnly">
              <button class="btn btn-secondary" @click="closeFileEditor">Close</button>
              <button class="btn btn-primary" @click="viewOnly = false">
                <i class="pi pi-pencil" />
                Edit
              </button>
            </template>
            <template v-else>
              <span v-if="fileModified" class="modified-indicator">
                <i class="pi pi-circle-fill" />
                Modified
              </span>
              <button class="btn btn-secondary" @click="closeFileEditor">Cancel</button>
              <button class="btn btn-primary" :disabled="!fileModified || savingFile" @click="saveFile">
                <i :class="savingFile ? 'pi pi-spin pi-spinner' : 'pi pi-save'" />
                Save
              </button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { Codemirror } from "vue-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { filesApi, type FileInfo } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";

const props = defineProps<{
  deploymentName: string;
}>();

const notifications = useNotificationsStore();

const currentPath = ref("/");
const files = ref<FileInfo[]>([]);
const filesInfo = ref<{ total_size: number; file_count: number } | null>(null);
const loading = ref(false);
const error = ref("");
const selectedFiles = ref<string[]>([]);

const uploading = ref(false);
const uploadProgress = ref(0);
const uploadFileName = ref("");

const showNewFolderModal = ref(false);
const newFolderName = ref("");
const creatingFolder = ref(false);

const showDeleteModal = ref(false);
const fileToDelete = ref<FileInfo | null>(null);
const deleting = ref(false);

const showHiddenFiles = ref(true);
const viewMode = ref<"list" | "grid">("list");

const showEditorModal = ref(false);
const editingFile = ref<FileInfo | null>(null);
const fileContent = ref("");
const originalContent = ref("");
const loadingFileContent = ref(false);
const savingFile = ref(false);
const viewOnly = ref(false);

const editorExtensions = [yaml(), oneDark];

const fileModified = computed(() => fileContent.value !== originalContent.value);

const pathParts = computed(() => {
  return currentPath.value.split("/").filter((p) => p.length > 0);
});

const getPathUpTo = (index: number) => {
  return "/" + pathParts.value.slice(0, index + 1).join("/");
};

const navigateTo = (path: string) => {
  currentPath.value = path;
  selectedFiles.value = [];
};

const fetchFiles = async () => {
  loading.value = true;
  error.value = "";
  try {
    const response = await filesApi.list(props.deploymentName, currentPath.value);
    let fileList = response.data.files || [];
    if (!showHiddenFiles.value) {
      fileList = fileList.filter((f) => !f.name.startsWith("."));
    }
    files.value = fileList;
  } catch (err: any) {
    error.value = err.response?.data?.error || err.message || "Failed to load files";
    files.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchFilesInfo = async () => {
  try {
    const response = await filesApi.getInfo(props.deploymentName);
    filesInfo.value = response.data;
  } catch {
    filesInfo.value = null;
  }
};

const refreshFiles = () => {
  fetchFiles();
  fetchFilesInfo();
};

const handleItemClick = (file: FileInfo) => {
  if (selectedFiles.value.includes(file.path)) {
    selectedFiles.value = selectedFiles.value.filter((p) => p !== file.path);
  } else {
    selectedFiles.value = [file.path];
  }
};

const handleItemDblClick = (file: FileInfo) => {
  if (file.is_dir) {
    currentPath.value = file.path;
    selectedFiles.value = [];
  }
};

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const fileList = input.files;
  if (!fileList || fileList.length === 0) return;

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    await uploadFile(file);
  }

  input.value = "";
  refreshFiles();
};

const uploadFile = async (file: File) => {
  uploading.value = true;
  uploadProgress.value = 0;
  uploadFileName.value = file.name;

  try {
    const targetPath = currentPath.value === "/" ? `/${file.name}` : `${currentPath.value}/${file.name}`;

    await filesApi.upload(props.deploymentName, targetPath, file);
    uploadProgress.value = 100;
    notifications.success("Upload Complete", `${file.name} uploaded successfully`);
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Upload failed";
    notifications.error("Upload Failed", msg);
  } finally {
    uploading.value = false;
    uploadFileName.value = "";
  }
};

const downloadFile = async (file: FileInfo) => {
  try {
    const response = await filesApi.download(props.deploymentName, file.path);
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Download failed";
    notifications.error("Download Failed", msg);
  }
};

const createFolder = async () => {
  if (!newFolderName.value.trim()) return;

  creatingFolder.value = true;
  try {
    const targetPath =
      currentPath.value === "/" ? `/${newFolderName.value}` : `${currentPath.value}/${newFolderName.value}`;

    await filesApi.createDir(props.deploymentName, targetPath);
    notifications.success("Folder Created", `${newFolderName.value} created successfully`);
    showNewFolderModal.value = false;
    newFolderName.value = "";
    refreshFiles();
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Failed to create folder";
    notifications.error("Error", msg);
  } finally {
    creatingFolder.value = false;
  }
};

const confirmDelete = (file: FileInfo) => {
  fileToDelete.value = file;
  showDeleteModal.value = true;
};

const deleteFile = async () => {
  if (!fileToDelete.value) return;

  deleting.value = true;
  try {
    await filesApi.delete(props.deploymentName, fileToDelete.value.path);
    notifications.success("Deleted", `${fileToDelete.value.name} deleted successfully`);
    showDeleteModal.value = false;
    fileToDelete.value = null;
    refreshFiles();
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Failed to delete";
    notifications.error("Delete Failed", msg);
  } finally {
    deleting.value = false;
  }
};

const getFileIcon = (file: FileInfo): string => {
  if (file.is_dir) return "pi pi-folder";

  const ext = file.name.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    jpg: "pi pi-image",
    jpeg: "pi pi-image",
    png: "pi pi-image",
    gif: "pi pi-image",
    svg: "pi pi-image",
    webp: "pi pi-image",
    pdf: "pi pi-file-pdf",
    doc: "pi pi-file-word",
    docx: "pi pi-file-word",
    xls: "pi pi-file-excel",
    xlsx: "pi pi-file-excel",
    txt: "pi pi-file",
    md: "pi pi-file",
    json: "pi pi-code",
    js: "pi pi-code",
    ts: "pi pi-code",
    html: "pi pi-code",
    css: "pi pi-code",
    yml: "pi pi-code",
    yaml: "pi pi-code",
    env: "pi pi-cog",
    zip: "pi pi-file-archive",
    tar: "pi pi-file-archive",
    gz: "pi pi-file-archive",
  };

  return iconMap[ext || ""] || "pi pi-file";
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const textExtensions = [
  "txt",
  "md",
  "json",
  "js",
  "ts",
  "jsx",
  "tsx",
  "html",
  "css",
  "scss",
  "yaml",
  "yml",
  "xml",
  "env",
  "sh",
  "bash",
  "py",
  "rb",
  "php",
  "go",
  "rs",
  "toml",
  "ini",
  "conf",
  "cfg",
  "log",
  "sql",
  "dockerfile",
  "gitignore",
  "editorconfig",
];

const isTextFile = (file: FileInfo): boolean => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const baseName = file.name.toLowerCase();
  return (
    textExtensions.includes(ext) ||
    baseName === "dockerfile" ||
    baseName === ".gitignore" ||
    baseName === ".env" ||
    baseName === ".editorconfig" ||
    baseName.startsWith(".env")
  );
};

const viewFile = async (file: FileInfo) => {
  viewOnly.value = true;
  editingFile.value = file;
  showEditorModal.value = true;
  loadingFileContent.value = true;
  fileContent.value = "";
  originalContent.value = "";

  try {
    const response = await filesApi.getContent(props.deploymentName, file.path);
    fileContent.value = response.data;
    originalContent.value = response.data;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Failed to load file";
    notifications.error("Error", msg);
    showEditorModal.value = false;
  } finally {
    loadingFileContent.value = false;
  }
};

const openFileEditor = async (file: FileInfo) => {
  viewOnly.value = false;
  editingFile.value = file;
  showEditorModal.value = true;
  loadingFileContent.value = true;
  fileContent.value = "";
  originalContent.value = "";

  try {
    const response = await filesApi.getContent(props.deploymentName, file.path);
    fileContent.value = response.data;
    originalContent.value = response.data;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Failed to load file";
    notifications.error("Error", msg);
    showEditorModal.value = false;
  } finally {
    loadingFileContent.value = false;
  }
};

const closeFileEditor = () => {
  if (!viewOnly.value && fileModified.value) {
    if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
      return;
    }
  }
  showEditorModal.value = false;
  editingFile.value = null;
  fileContent.value = "";
  originalContent.value = "";
  viewOnly.value = false;
};

const saveFile = async () => {
  if (!editingFile.value) return;

  savingFile.value = true;
  try {
    const blob = new Blob([fileContent.value], { type: "text/plain" });
    const file = new File([blob], editingFile.value.name);
    await filesApi.upload(props.deploymentName, editingFile.value.path, file);
    originalContent.value = fileContent.value;
    notifications.success("Saved", `${editingFile.value.name} saved successfully`);
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Failed to save file";
    notifications.error("Save Failed", msg);
  } finally {
    savingFile.value = false;
  }
};

watch(currentPath, () => {
  fetchFiles();
});

watch(showHiddenFiles, () => {
  fetchFiles();
});

onMounted(() => {
  refreshFiles();
});
</script>

<style scoped>
.file-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
}

.browser-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.breadcrumb-item {
  background: none;
  border: none;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-gray-600);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.breadcrumb-item:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-900);
}

.breadcrumb-separator {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.view-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
  user-select: none;
}

.view-toggle:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.view-toggle.active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

.view-toggle input[type="checkbox"] {
  display: none;
}

.view-toggle i {
  font-size: var(--text-sm);
}

.toolbar-actions {
  display: flex;
  gap: var(--space-2);
}

.upload-btn {
  cursor: pointer;
}

.upload-progress {
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary-50);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--color-primary-100);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary-500);
  transition: width 0.3s;
}

.progress-text {
  font-size: var(--text-sm);
  color: var(--color-primary-700);
  white-space: nowrap;
}

.browser-content {
  flex: 1;
  overflow: auto;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  text-align: center;
  color: var(--color-gray-500);
  gap: var(--space-3);
}

.loading-state i,
.error-state i,
.empty-state i {
  font-size: 3rem;
  color: var(--color-gray-300);
}

.empty-state h3 {
  margin: 0;
  color: var(--color-gray-700);
}

.empty-state p {
  margin: 0;
}

.file-list {
  display: flex;
  flex-direction: column;
}

.file-list-header {
  display: grid;
  grid-template-columns: 1fr 100px 180px 100px;
  padding: var(--space-2) var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-600);
}

.file-item {
  display: grid;
  grid-template-columns: 1fr 100px 180px 100px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-gray-100);
  cursor: pointer;
  transition: background var(--transition-base);
}

.file-item:hover {
  background: var(--color-gray-50);
}

.file-item.selected {
  background: var(--color-primary-50);
}

.file-item.is-dir {
  font-weight: var(--font-medium);
}

.col-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
}

.col-name i {
  color: var(--color-gray-400);
  font-size: 1.1rem;
}

.file-item.is-dir .col-name i {
  color: var(--color-warning-500);
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.child-count {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  font-weight: var(--font-normal);
}

.col-size,
.col-modified {
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
}

.col-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.action-btn {
  width: 28px;
  height: 28px;
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

.action-btn:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-900);
}

.action-btn.delete {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.action-btn.delete:hover {
  background: var(--color-danger-100);
}

.browser-footer {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-container {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  max-width: 90vw;
  animation: slideIn 0.2s ease;
}

.modal-container.small {
  width: 400px;
}

.modal-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.modal-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
}

.modal-header.danger h3 {
  color: var(--color-danger-600);
}

.modal-body {
  padding: var(--space-4);
}

.modal-body p {
  margin: 0 0 var(--space-2) 0;
}

.warning-text {
  color: var(--color-warning-600);
  font-size: var(--text-sm);
}

.modal-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.form-group {
  margin-bottom: var(--space-3);
}

.form-group label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-1);
}

.form-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-md);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
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

.btn-secondary {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn-danger {
  background: var(--color-danger-500);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-600);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.view-mode-toggle {
  display: flex;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-left: var(--space-2);
}

.view-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  background: white;
  color: var(--color-gray-400);
  cursor: pointer;
  transition: all var(--transition-base);
}

.view-mode-btn:first-child {
  border-right: 1px solid var(--color-gray-200);
}

.view-mode-btn:hover {
  color: var(--color-gray-600);
  background: var(--color-gray-50);
}

.view-mode-btn.active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
  padding: var(--space-4);
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
}

.grid-item:hover {
  background: var(--color-gray-50);
  border-color: var(--color-gray-300);
}

.grid-item.selected {
  background: var(--color-primary-50);
  border-color: var(--color-primary-300);
}

.grid-item.is-dir {
  background: var(--color-gray-50);
}

.grid-item-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-2);
  color: var(--color-gray-400);
}

.grid-item.is-dir .grid-item-icon {
  color: var(--color-warning-500);
}

.grid-item-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
  text-align: center;
  word-break: break-word;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.grid-item-meta {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: var(--space-1);
}

.grid-item-actions {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.grid-item:hover .grid-item-actions {
  opacity: 1;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.editor-modal {
  width: 90vw;
  max-width: 1200px;
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.editor-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-modal .modal-header h3 {
  flex: 1;
}

.close-btn {
  background: none;
  border: none;
  padding: var(--space-2);
  cursor: pointer;
  color: var(--color-gray-500);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.close-btn:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.editor-body {
  flex: 1;
  overflow: hidden;
  padding: 0 !important;
}

.loading-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--space-2);
  color: var(--color-gray-500);
}

.loading-editor i {
  font-size: 2rem;
}

.modified-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-warning-500);
  font-size: var(--text-sm);
  margin-right: auto;
}

.modified-indicator i {
  font-size: 8px;
}

.view-only-badge {
  margin-left: var(--space-2);
  padding: 2px 8px;
  background: var(--color-info-100);
  color: var(--color-info-700);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
}

.editor-modal .modal-footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
