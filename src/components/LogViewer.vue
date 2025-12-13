<template>
  <div class="log-viewer" :class="{ fullscreen: isFullscreen }">
    <div class="log-toolbar">
      <div class="toolbar-left">
        <div v-if="showSearch" class="search-box">
          <i class="pi pi-search" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search logs..."
            @keyup.enter="searchNext"
            @keyup.shift.enter="searchPrevious"
          />
          <span v-if="searchResults" class="search-results">
            {{ searchResults }}
          </span>
          <button class="search-btn" title="Previous (Shift+Enter)" @click="searchPrevious">
            <i class="pi pi-chevron-up" />
          </button>
          <button class="search-btn" title="Next (Enter)" @click="searchNext">
            <i class="pi pi-chevron-down" />
          </button>
          <button class="search-btn" title="Close" @click="closeSearch">
            <i class="pi pi-times" />
          </button>
        </div>
        <slot name="filters" />
      </div>
      <div class="toolbar-right">
        <label class="follow-toggle" :class="{ active: autoScroll }">
          <input v-model="autoScroll" type="checkbox" />
          <i class="pi pi-arrow-down" />
          Follow
        </label>
        <button class="toolbar-btn" title="Search (Ctrl+F)" @click="toggleSearch">
          <i class="pi pi-search" />
        </button>
        <button class="toolbar-btn" title="Clear" @click="clearLogs">
          <i class="pi pi-trash" />
        </button>
        <button class="toolbar-btn" title="Download" @click="downloadLogs">
          <i class="pi pi-download" />
        </button>
        <button class="toolbar-btn" title="Refresh" :disabled="loading" @click="$emit('refresh')">
          <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
        </button>
        <button class="toolbar-btn" :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'" @click="toggleFullscreen">
          <i :class="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'" />
        </button>
      </div>
    </div>
    <div ref="terminalContainer" class="terminal-container" />
    <div v-if="!logs && !loading" class="empty-state">
      <i class="pi pi-file-edit" />
      <p>{{ emptyMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

const props = withDefaults(
  defineProps<{
    logs?: string;
    loading?: boolean;
    emptyMessage?: string;
    fileName?: string;
    theme?: "dark" | "light";
    fontSize?: number;
    lineHeight?: number;
  }>(),
  {
    logs: "",
    loading: false,
    emptyMessage: "No logs available",
    fileName: "logs.txt",
    theme: "dark",
    fontSize: 13,
    lineHeight: 1.4,
  },
);

defineEmits<{
  refresh: [];
}>();

const terminalContainer = ref<HTMLElement | null>(null);
const autoScroll = ref(true);
const showSearch = ref(false);
const searchQuery = ref("");
const searchResults = ref("");
const isFullscreen = ref(false);

let terminal: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let searchAddon: SearchAddon | null = null;
let resizeObserver: ResizeObserver | null = null;
let currentLogs = "";

const themeConfig = {
  dark: {
    background: "#1a1b26",
    foreground: "#a9b1d6",
    cursor: "#c0caf5",
    cursorAccent: "#1a1b26",
    selectionBackground: "#33467c",
    black: "#32344a",
    red: "#f7768e",
    green: "#9ece6a",
    yellow: "#e0af68",
    blue: "#7aa2f7",
    magenta: "#ad8ee6",
    cyan: "#449dab",
    white: "#787c99",
    brightBlack: "#444b6a",
    brightRed: "#ff7a93",
    brightGreen: "#b9f27c",
    brightYellow: "#ff9e64",
    brightBlue: "#7da6ff",
    brightMagenta: "#bb9af7",
    brightCyan: "#0db9d7",
    brightWhite: "#acb0d0",
  },
  light: {
    background: "#fafafa",
    foreground: "#383a42",
    cursor: "#526fff",
    cursorAccent: "#fafafa",
    selectionBackground: "#e5e5e6",
    black: "#383a42",
    red: "#e45649",
    green: "#50a14f",
    yellow: "#c18401",
    blue: "#4078f2",
    magenta: "#a626a4",
    cyan: "#0184bc",
    white: "#a0a1a7",
    brightBlack: "#4f525e",
    brightRed: "#e06c75",
    brightGreen: "#98c379",
    brightYellow: "#e5c07b",
    brightBlue: "#61afef",
    brightMagenta: "#c678dd",
    brightCyan: "#56b6c2",
    brightWhite: "#ffffff",
  },
};

const initTerminal = () => {
  if (!terminalContainer.value) return;

  terminal = new Terminal({
    cursorBlink: false,
    cursorStyle: "bar",
    disableStdin: true,
    fontSize: props.fontSize,
    lineHeight: props.lineHeight,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace",
    theme: themeConfig[props.theme],
    scrollback: 10000,
    convertEol: true,
    allowProposedApi: true,
  });

  fitAddon = new FitAddon();
  searchAddon = new SearchAddon();
  const webLinksAddon = new WebLinksAddon();

  terminal.loadAddon(fitAddon);
  terminal.loadAddon(searchAddon);
  terminal.loadAddon(webLinksAddon);

  terminal.open(terminalContainer.value);

  nextTick(() => {
    fitAddon?.fit();
  });

  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit();
  });
  resizeObserver.observe(terminalContainer.value);

  if (props.logs) {
    writeLogs(props.logs);
  }
};

const writeLogs = (logs: string) => {
  if (!terminal) return;

  const newContent = logs.startsWith(currentLogs) ? logs.slice(currentLogs.length) : logs;

  if (newContent !== logs) {
    terminal.write(newContent);
  } else {
    terminal.clear();
    terminal.write(logs);
  }

  currentLogs = logs;

  if (autoScroll.value) {
    terminal.scrollToBottom();
  }
};

const clearLogs = () => {
  if (terminal) {
    terminal.clear();
    currentLogs = "";
  }
};

const downloadLogs = () => {
  const blob = new Blob([currentLogs], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = props.fileName;
  a.click();
  URL.revokeObjectURL(url);
};

const toggleSearch = () => {
  showSearch.value = !showSearch.value;
  if (!showSearch.value) {
    searchQuery.value = "";
    searchResults.value = "";
  }
};

const closeSearch = () => {
  showSearch.value = false;
  searchQuery.value = "";
  searchResults.value = "";
};

const searchNext = () => {
  if (!searchAddon || !searchQuery.value) return;
  const found = searchAddon.findNext(searchQuery.value, {
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });
  updateSearchResults(found);
};

const searchPrevious = () => {
  if (!searchAddon || !searchQuery.value) return;
  const found = searchAddon.findPrevious(searchQuery.value, {
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });
  updateSearchResults(found);
};

const updateSearchResults = (found: boolean) => {
  searchResults.value = found ? "" : "No results";
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  nextTick(() => {
    fitAddon?.fit();
  });
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === "f") {
    e.preventDefault();
    showSearch.value = true;
  }
  if (e.key === "Escape" && showSearch.value) {
    closeSearch();
  }
  if (e.key === "Escape" && isFullscreen.value) {
    isFullscreen.value = false;
  }
};

watch(
  () => props.logs,
  (newLogs) => {
    if (newLogs) {
      writeLogs(newLogs);
    }
  },
);

watch(
  () => props.theme,
  (newTheme) => {
    if (terminal) {
      terminal.options.theme = themeConfig[newTheme];
    }
  },
);

onMounted(() => {
  initTerminal();
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  resizeObserver?.disconnect();
  terminal?.dispose();
});
</script>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-gray-950);
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
}

.log-viewer.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  border-radius: 0;
}

.log-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: #0d0e14;
  border-bottom: 1px solid #2a2e3d;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: #1a1b26;
  border: 1px solid #2a2e3d;
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
}

.search-box i {
  color: #565f89;
  font-size: var(--text-sm);
}

.search-box input {
  background: transparent;
  border: none;
  color: #a9b1d6;
  font-size: var(--text-sm);
  width: 180px;
  outline: none;
}

.search-box input::placeholder {
  color: #565f89;
}

.search-results {
  font-size: var(--text-xs);
  color: #f7768e;
  white-space: nowrap;
}

.search-btn {
  background: transparent;
  border: none;
  color: #565f89;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  transition: all var(--transition-base);
}

.search-btn:hover {
  color: #a9b1d6;
  background: #2a2e3d;
}

.follow-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: #565f89;
  cursor: pointer;
  transition: all var(--transition-base);
}

.follow-toggle input {
  display: none;
}

.follow-toggle:hover {
  color: #a9b1d6;
}

.follow-toggle.active {
  color: #9ece6a;
  background: rgba(158, 206, 106, 0.1);
}

.toolbar-btn {
  background: transparent;
  border: none;
  color: #565f89;
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

.toolbar-btn:hover:not(:disabled) {
  color: #a9b1d6;
  background: #2a2e3d;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.terminal-container {
  flex: 1;
  padding: var(--space-2);
  overflow: hidden;
}

.terminal-container :deep(.xterm) {
  height: 100%;
}

.terminal-container :deep(.xterm-viewport) {
  overflow-y: auto !important;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: #1a1b26;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: #2a2e3d;
  border-radius: 4px;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: #3b4261;
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #565f89;
  gap: var(--space-2);
}

.empty-state i {
  font-size: 2.5rem;
}

.empty-state p {
  margin: 0;
}
</style>
