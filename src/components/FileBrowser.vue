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
        <label v-if="!mountAvailable" class="view-toggle" :class="{ active: !hideSystemFolders }">
          <input v-model="hideSystemFolders" type="checkbox" />
          <i class="pi pi-shield" />
          Hide system
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
        <button class="btn btn-sm btn-secondary" @click="showNewFileModal = true">
          <i class="pi pi-file-plus" />
          New File
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

    <div v-else-if="busy && files.length > 0" class="busy-indicator" aria-hidden="true">
      <div class="busy-bar" />
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
            <div class="action-menu-wrap">
              <button class="action-btn" title="More" @click.stop="toggleRowMenu(file.path)">
                <i class="pi pi-ellipsis-v" />
              </button>
              <div v-if="rowMenuOpenFor === file.path" class="action-menu" @click.stop>
                <button
                  v-if="mountAvailable"
                  class="menu-item"
                  :class="{ 'is-mounted': fileMounts(file).length > 0 }"
                  @click="onMenuAction('mount', file)"
                >
                  <i class="pi pi-link" />
                  <span>{{ fileMounts(file).length > 0 ? "Edit mount" : "Add compose mount" }}</span>
                </button>
                <button class="menu-item" @click="onMenuAction('permissions', file)">
                  <i class="pi pi-key" />
                  <span>Permissions</span>
                </button>
                <button class="menu-item danger" @click="onMenuAction('delete', file)">
                  <i class="pi pi-trash" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
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
            <div class="action-menu-wrap">
              <button class="action-btn" title="More" @click.stop="toggleRowMenu(file.path)">
                <i class="pi pi-ellipsis-v" />
              </button>
              <div v-if="rowMenuOpenFor === file.path" class="action-menu" @click.stop>
                <button
                  v-if="mountAvailable"
                  class="menu-item"
                  :class="{ 'is-mounted': fileMounts(file).length > 0 }"
                  @click="onMenuAction('mount', file)"
                >
                  <i class="pi pi-link" />
                  <span>{{ fileMounts(file).length > 0 ? "Edit mount" : "Add compose mount" }}</span>
                </button>
                <button class="menu-item" @click="onMenuAction('permissions', file)">
                  <i class="pi pi-key" />
                  <span>Permissions</span>
                </button>
                <button class="menu-item danger" @click="onMenuAction('delete', file)">
                  <i class="pi pi-trash" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
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

      <div v-if="showNewFileModal" class="modal-overlay" @click.self="showNewFileModal = false">
        <div class="modal-container small">
          <div class="modal-header">
            <h3>
              <i class="pi pi-file-plus" />
              New File
            </h3>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>File Name</label>
              <input
                v-model="newFileName"
                type="text"
                class="form-input"
                placeholder=".env"
                @keyup.enter="createFile"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showNewFileModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="!newFileName.trim() || creatingFile" @click="createFile">
              <i :class="creatingFile ? 'pi pi-spin pi-spinner' : 'pi pi-check'" />
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

      <div v-if="showMountModal" class="modal-overlay" @click.self="showMountModal = false">
        <div class="modal-container small">
          <div class="modal-header">
            <h3>
              <i class="pi pi-link" />
              Add Compose Mount
            </h3>
          </div>
          <div class="modal-body">
            <div class="mount-source">
              <span>Host path</span>
              <code>{{ mountSourcePath }}</code>
            </div>
            <div class="form-group">
              <label>Service</label>
              <select v-model="mountServiceName" class="form-input">
                <option v-for="service in mountServiceOptions" :key="service" :value="service">
                  {{ service }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Container path</label>
              <input
                v-model="mountTargetPath"
                type="text"
                class="form-input"
                placeholder="/app/storage"
                @keyup.enter="confirmMount"
              />
            </div>
            <label class="checkbox-label">
              <input v-model="mountReadOnly" type="checkbox" />
              <span>Read only</span>
            </label>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showMountModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="!mountTargetPath.trim()" @click="confirmMount">
              <i class="pi pi-check" />
              Add Mount
            </button>
          </div>
        </div>
      </div>

      <div v-if="showPermissionsModal" class="modal-overlay" @click.self="showPermissionsModal = false">
        <div class="modal-container small">
          <div class="modal-header">
            <h3>
              <i class="pi pi-key" />
              Permissions
            </h3>
          </div>
          <div class="modal-body">
            <div class="mount-source">
              <span>Path</span>
              <code>{{ permissionsFile?.path }}</code>
            </div>
            <div class="permissions-grid">
              <div class="permissions-grid-header">
                <span />
                <span>Read</span>
                <span>Write</span>
                <span>Execute</span>
              </div>
              <template v-for="who in ['owner', 'group', 'other'] as const" :key="who">
                <span class="perm-row-label">{{ who }}</span>
                <label class="perm-cell"
                  ><input v-model="permissionsBits[who].r" type="checkbox" @change="updatePermissionsMode"
                /></label>
                <label class="perm-cell"
                  ><input v-model="permissionsBits[who].w" type="checkbox" @change="updatePermissionsMode"
                /></label>
                <label class="perm-cell"
                  ><input v-model="permissionsBits[who].x" type="checkbox" @change="updatePermissionsMode"
                /></label>
              </template>
            </div>
            <div class="permissions-summary">
              <code>{{ permissionsModeOctal }}</code>
              <span class="permissions-help">Symbolic permissions in octal form (e.g. 755)</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showPermissionsModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="savingPermissions" @click="savePermissions">
              <i class="pi pi-check" />
              {{ savingPermissions ? "Saving..." : "Apply" }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showEditorModal" class="modal-overlay">
        <div class="modal-container editor-modal" :class="{ 'with-assist': assistOpen }">
          <div class="modal-header">
            <h3>
              <i :class="viewOnly ? 'pi pi-eye' : 'pi pi-file-edit'" />
              {{ editingFile?.name }}
              <span v-if="viewOnly" class="view-only-badge">Read Only</span>
            </h3>
            <button
              v-if="editingFile"
              class="assist-toggle"
              :class="{ active: assistOpen }"
              :title="assistOpen ? 'Hide assistant' : 'Ask the assistant'"
              @click="toggleAssist"
            >
              <Icon name="bot" :size="15" />
              <span>Ask the assistant</span>
            </button>
            <button class="close-btn" @click="closeFileEditor">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body editor-split">
            <div class="editor-pane">
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
            <InlineAssist v-if="assistOpen" class="assist-pane" @close="closeAssist" />
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
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { Codemirror } from "vue-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { configApi, createDeploymentFileApi, type FileBrowserApi, type FileInfo } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { toComposeRelativePath, type ComposeMount } from "@/utils/compose";
import Icon from "@/components/base/Icon.vue";
import InlineAssist from "@/components/ai/InlineAssist.vue";
import { useAssistStore, type AssistContext } from "@/stores/assist";

const props = withDefaults(
  defineProps<{
    deploymentName?: string;
    api?: FileBrowserApi;
    serviceNames?: string[];
    mounts?: ComposeMount[];
    enableMount?: boolean;
    initialPath?: string;
  }>(),
  {
    enableMount: false,
    initialPath: "/",
  },
);

const fileApi = computed<FileBrowserApi>(() => {
  if (props.api) return props.api;
  if (props.deploymentName) return createDeploymentFileApi(props.deploymentName);
  throw new Error("FileBrowser requires either an `api` prop or a `deploymentName`");
});

const mountAvailable = computed(() => props.enableMount && !!props.deploymentName);

const emit = defineEmits<{
  mountCompose: [
    mount: {
      sourcePath: string;
      targetPath: string;
      serviceName: string;
      readOnly: boolean;
      isDirectory: boolean;
      name: string;
    },
  ];
}>();

const notifications = useNotificationsStore();

const currentPath = ref(props.initialPath || "/");
const files = ref<FileInfo[]>([]);
const filesInfo = ref<{ total_size: number; file_count: number } | null>(null);
const loading = ref(true);
const error = ref("");
const selectedFiles = ref<string[]>([]);

const uploading = ref(false);
const uploadProgress = ref(0);
const uploadFileName = ref("");

const showNewFolderModal = ref(false);
const newFolderName = ref("");
const creatingFolder = ref(false);
const showNewFileModal = ref(false);
const newFileName = ref("");
const creatingFile = ref(false);

const showDeleteModal = ref(false);
const fileToDelete = ref<FileInfo | null>(null);
const deleting = ref(false);

const showMountModal = ref(false);
const fileToMount = ref<FileInfo | null>(null);
const mountServiceName = ref("");
const mountTargetPath = ref("");
const mountReadOnly = ref(false);

const rowMenuOpenFor = ref<string | null>(null);

const toggleRowMenu = (path: string) => {
  rowMenuOpenFor.value = rowMenuOpenFor.value === path ? null : path;
};

const onMenuAction = (action: "mount" | "permissions" | "delete", file: FileInfo) => {
  rowMenuOpenFor.value = null;
  if (action === "mount") openMountModal(file);
  else if (action === "permissions") openPermissionsModal(file);
  else if (action === "delete") confirmDelete(file);
};

const onDocumentClick = () => {
  if (rowMenuOpenFor.value !== null) rowMenuOpenFor.value = null;
};

const showPermissionsModal = ref(false);
const permissionsFile = ref<FileInfo | null>(null);
const savingPermissions = ref(false);
const permissionsBits = reactive({
  owner: { r: false, w: false, x: false },
  group: { r: false, w: false, x: false },
  other: { r: false, w: false, x: false },
});
const permissionsModeNumber = ref(0);
const permissionsModeOctal = computed(() => {
  const n = permissionsModeNumber.value;
  return "0" + ((n >> 6) & 7) + ((n >> 3) & 7) + (n & 7);
});

const showHiddenFiles = ref(true);
const hideSystemFolders = ref(true);

const loadShowHiddenSetting = async () => {
  try {
    const response = await configApi.get("files.show_hidden");
    const value = response.data.entry?.value;
    if (typeof value === "boolean") {
      showHiddenFiles.value = value;
    }
  } catch {
    // Keep the default when the setting cannot be loaded
  }
};

const SYSTEM_FOLDER_NAMES = new Set(["proc", "sys", "dev", "boot", "run", "lost+found", "var", "tmp", "snap"]);
const viewMode = ref<"list" | "grid">("list");

const showEditorModal = ref(false);
const editingFile = ref<FileInfo | null>(null);
const fileContent = ref("");
const originalContent = ref("");
const loadingFileContent = ref(false);
const savingFile = ref(false);

const busy = computed(
  () =>
    loading.value ||
    uploading.value ||
    creatingFolder.value ||
    creatingFile.value ||
    deleting.value ||
    savingPermissions.value ||
    loadingFileContent.value ||
    savingFile.value,
);
const viewOnly = ref(false);

const editorExtensions = [yaml(), oneDark];

const fileModified = computed(() => fileContent.value !== originalContent.value);

const editorAssistContext = computed<AssistContext>(() => ({
  scope: "system",
  subject: editingFile.value?.path || editingFile.value?.name || "file",
  seedContext: fileContent.value,
}));

const assistStore = useAssistStore();
const assistOpen = ref(false);
const toggleAssist = () => {
  if (assistOpen.value) {
    closeAssist();
    return;
  }
  assistStore.embedded = true;
  assistStore.open(editorAssistContext.value);
  assistOpen.value = true;
};
const closeAssist = () => {
  assistOpen.value = false;
  assistStore.close();
};

const mountServiceOptions = computed(() => {
  const names = props.serviceNames?.filter(Boolean) || [];
  return names.length > 0 ? names : [props.deploymentName];
});

const mountSourcePath = computed(() => {
  if (!fileToMount.value) return "";
  return toComposeRelativePath(fileToMount.value.path);
});

const mountsBySource = computed(() => {
  const grouped = new Map<string, ComposeMount[]>();
  for (const mount of props.mounts || []) {
    const list = grouped.get(mount.source);
    if (list) list.push(mount);
    else grouped.set(mount.source, [mount]);
  }
  return grouped;
});

const fileMounts = (file: FileInfo): ComposeMount[] => {
  return mountsBySource.value.get(toComposeRelativePath(file.path)) || [];
};

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
    const response = await fileApi.value.list(currentPath.value);
    let fileList = response.data.files || [];
    if (!showHiddenFiles.value) {
      fileList = fileList.filter((f) => !f.name.startsWith("."));
    }
    if (!mountAvailable.value && hideSystemFolders.value && currentPath.value === "/") {
      fileList = fileList.filter((f) => !(f.is_dir && SYSTEM_FOLDER_NAMES.has(f.name)));
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
    const response = await fileApi.value.getInfo();
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

    await fileApi.value.upload(targetPath, file);
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
    const response = await fileApi.value.download(file.path);
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

    await fileApi.value.createDir(targetPath);
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

const createFile = async () => {
  if (!newFileName.value.trim()) return;

  creatingFile.value = true;
  try {
    const targetPath =
      currentPath.value === "/" ? `/${newFileName.value}` : `${currentPath.value}/${newFileName.value}`;

    await fileApi.value.createFile(targetPath);
    notifications.success("File Created", `${newFileName.value} created successfully`);
    showNewFileModal.value = false;
    newFileName.value = "";
    refreshFiles();
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Failed to create file";
    notifications.error("Error", msg);
  } finally {
    creatingFile.value = false;
  }
};

const confirmDelete = (file: FileInfo) => {
  fileToDelete.value = file;
  showDeleteModal.value = true;
};

const parsePermissionsMode = (permissions: string | undefined, isDir: boolean): number => {
  if (!permissions) return isDir ? 0o755 : 0o644;
  const symbolic = permissions.length === 10 ? permissions.slice(1) : permissions;
  if (symbolic.length === 9) {
    let n = 0;
    if (symbolic[0] === "r") n |= 0o400;
    if (symbolic[1] === "w") n |= 0o200;
    if (symbolic[2] === "x") n |= 0o100;
    if (symbolic[3] === "r") n |= 0o040;
    if (symbolic[4] === "w") n |= 0o020;
    if (symbolic[5] === "x") n |= 0o010;
    if (symbolic[6] === "r") n |= 0o004;
    if (symbolic[7] === "w") n |= 0o002;
    if (symbolic[8] === "x") n |= 0o001;
    return n;
  }
  const numeric = parseInt(permissions, 8);
  if (!Number.isNaN(numeric)) return numeric & 0o777;
  return isDir ? 0o755 : 0o644;
};

const setPermissionsBitsFromNumber = (n: number) => {
  permissionsBits.owner.r = !!(n & 0o400);
  permissionsBits.owner.w = !!(n & 0o200);
  permissionsBits.owner.x = !!(n & 0o100);
  permissionsBits.group.r = !!(n & 0o040);
  permissionsBits.group.w = !!(n & 0o020);
  permissionsBits.group.x = !!(n & 0o010);
  permissionsBits.other.r = !!(n & 0o004);
  permissionsBits.other.w = !!(n & 0o002);
  permissionsBits.other.x = !!(n & 0o001);
  permissionsModeNumber.value = n;
};

const updatePermissionsMode = () => {
  let n = 0;
  if (permissionsBits.owner.r) n |= 0o400;
  if (permissionsBits.owner.w) n |= 0o200;
  if (permissionsBits.owner.x) n |= 0o100;
  if (permissionsBits.group.r) n |= 0o040;
  if (permissionsBits.group.w) n |= 0o020;
  if (permissionsBits.group.x) n |= 0o010;
  if (permissionsBits.other.r) n |= 0o004;
  if (permissionsBits.other.w) n |= 0o002;
  if (permissionsBits.other.x) n |= 0o001;
  permissionsModeNumber.value = n;
};

const openPermissionsModal = (file: FileInfo) => {
  permissionsFile.value = file;
  setPermissionsBitsFromNumber(parsePermissionsMode((file as any).permissions, file.is_dir));
  showPermissionsModal.value = true;
};

const savePermissions = async () => {
  if (!permissionsFile.value) return;
  savingPermissions.value = true;
  try {
    await fileApi.value.chmod(permissionsFile.value.path, permissionsModeNumber.value);
    notifications.success("Permissions Updated", `${permissionsFile.value.name} is now ${permissionsModeOctal.value}`);
    showPermissionsModal.value = false;
    refreshFiles();
  } catch (err: any) {
    notifications.error("Update Failed", err.response?.data?.error || err.message || "Could not change permissions");
  } finally {
    savingPermissions.value = false;
  }
};

const openMountModal = (file: FileInfo) => {
  fileToMount.value = file;
  mountServiceName.value = mountServiceOptions.value[0] || props.deploymentName || "";
  mountTargetPath.value = file.path;
  mountReadOnly.value = !file.is_dir;
  showMountModal.value = true;
};

const confirmMount = () => {
  if (!fileToMount.value || !mountTargetPath.value.trim()) return;

  emit("mountCompose", {
    sourcePath: mountSourcePath.value,
    targetPath: mountTargetPath.value.trim(),
    serviceName: mountServiceName.value,
    readOnly: mountReadOnly.value,
    isDirectory: fileToMount.value.is_dir,
    name: fileToMount.value.name,
  });
  showMountModal.value = false;
  fileToMount.value = null;
};

const deleteFile = async () => {
  if (!fileToDelete.value) return;

  deleting.value = true;
  try {
    await fileApi.value.delete(fileToDelete.value.path);
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
    const response = await fileApi.value.getContent(file.path);
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
    const response = await fileApi.value.getContent(file.path);
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
  if (assistOpen.value) closeAssist();
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
    await fileApi.value.upload(editingFile.value.path, file);
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

watch(hideSystemFolders, () => {
  refreshFiles();
});

watch(showHiddenFiles, () => {
  fetchFiles();
});

onMounted(async () => {
  await loadShowHiddenSetting();
  refreshFiles();
  document.addEventListener("click", onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
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
  border-bottom: 1px solid var(--border);
  background: var(--surface-sunken);
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
  color: var(--text-muted);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.breadcrumb-item:hover {
  background: var(--border);
  color: var(--text);
}

.breadcrumb-separator {
  font-size: var(--text-xs);
  color: var(--text-subtle);
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
  color: var(--text-muted);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
  user-select: none;
}

.view-toggle:hover {
  background: var(--surface-inset);
  color: var(--text);
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

.busy-indicator {
  height: 2px;
  background: var(--surface-inset);
  overflow: hidden;
}

.busy-bar {
  height: 100%;
  width: 30%;
  background: var(--color-primary-500);
  animation: busy-slide 1s linear infinite;
}

@keyframes busy-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
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
  color: var(--text-muted);
  gap: var(--space-3);
}

.loading-state i,
.error-state i,
.empty-state i {
  font-size: 3rem;
  color: var(--border);
}

.empty-state h3 {
  margin: 0;
  color: var(--text);
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
  grid-template-columns: 1fr 100px 180px 116px;
  padding: var(--space-2) var(--space-4);
  background: var(--surface-sunken);
  border-bottom: 1px solid var(--border);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-muted);
}

.file-item {
  display: grid;
  grid-template-columns: 1fr 100px 180px 116px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background var(--transition-base);
}

.file-item:hover {
  background: var(--surface-sunken);
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
  color: var(--text-subtle);
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
  color: var(--text-subtle);
  font-weight: var(--font-normal);
}

.col-size,
.col-modified {
  color: var(--text-muted);
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
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: var(--surface-inset);
  color: var(--text-muted);
  transition: all var(--transition-base);
}

.action-btn:hover {
  background: var(--border);
  color: var(--text);
}

.action-btn.is-mounted {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.action-menu-wrap {
  position: relative;
  display: inline-flex;
}

.action-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 10;
  min-width: 180px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: var(--space-1);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text);
  cursor: pointer;
  text-align: left;
}

.menu-item:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.menu-item.danger {
  color: var(--color-danger-600);
}

.menu-item.danger:hover {
  background: var(--color-danger-50);
}

.menu-item.is-mounted {
  color: var(--color-success-700);
}

.menu-item .pi {
  font-size: var(--text-sm);
  width: 16px;
}

.action-btn.is-mounted:hover {
  background: var(--color-success-100);
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
  border-top: 1px solid var(--border);
  background: var(--surface-sunken);
  font-size: var(--text-sm);
  color: var(--text-muted);
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
  background: var(--surface-raised);
  border: 1px solid var(--border);
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
  border-bottom: 1px solid var(--border);
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

.mount-source {
  display: grid;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.mount-source span {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text);
}

.mount-source code {
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--surface-inset);
  color: var(--text);
  word-break: break-all;
}

.permissions-grid {
  display: grid;
  grid-template-columns: 80px repeat(3, 1fr);
  gap: var(--space-2);
  align-items: center;
  margin: var(--space-3) 0 var(--space-2);
}

.permissions-grid-header {
  display: contents;
}

.permissions-grid-header span {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  text-align: center;
}

.perm-row-label {
  font-size: var(--text-sm);
  color: var(--text);
  text-transform: capitalize;
}

.perm-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.permissions-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border);
}

.permissions-summary code {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  padding: var(--space-1) var(--space-2);
  background: var(--surface-inset);
  color: var(--text);
  border-radius: var(--radius-sm);
}

.permissions-help {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text);
  cursor: pointer;
}

.modal-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--border);
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
  color: var(--text);
  margin-bottom: var(--space-1);
}

.form-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
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
  background: var(--surface-inset);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border);
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
  border: 1px solid var(--border);
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
  background: var(--surface);
  color: var(--text-subtle);
  cursor: pointer;
  transition: all var(--transition-base);
}

.view-mode-btn:first-child {
  border-right: 1px solid var(--border);
}

.view-mode-btn:hover {
  color: var(--text-muted);
  background: var(--surface-sunken);
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
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
}

.grid-item:hover {
  background: var(--surface-sunken);
  border-color: var(--border);
}

.grid-item.selected {
  background: var(--color-primary-50);
  border-color: var(--color-primary-300);
}

.grid-item.is-dir {
  background: var(--surface-sunken);
}

.grid-item-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-2);
  color: var(--text-subtle);
}

.grid-item.is-dir .grid-item-icon {
  color: var(--color-warning-500);
}

.grid-item-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text);
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
  color: var(--text-muted);
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
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.close-btn:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.editor-split {
  flex: 1;
  overflow: hidden;
  padding: 0 !important;
  display: flex;
  min-height: 0;
}

.editor-pane {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.assist-pane {
  width: 340px;
  flex-shrink: 0;
}

.editor-modal.with-assist {
  width: 94vw;
  max-width: 1480px;
}

.assist-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  margin-right: 0.5rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  flex-shrink: 0;
}

.assist-toggle:hover {
  border-color: var(--accent);
}

.assist-toggle.active {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

@media (max-width: 720px) {
  .editor-split {
    flex-direction: column;
  }
  .assist-pane {
    width: 100%;
    height: 45%;
  }
}

.loading-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--space-2);
  color: var(--text-muted);
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
