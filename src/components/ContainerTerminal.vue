<template>
  <div class="container-terminal">
    <div ref="terminalRef" class="terminal-element" />
    <div v-if="connectionStatus !== 'connected'" class="terminal-overlay">
      <div class="overlay-content">
        <i v-if="connectionStatus === 'connecting'" class="pi pi-spin pi-spinner" />
        <i v-else-if="connectionStatus === 'error'" class="pi pi-exclamation-circle" />
        <i v-else class="pi pi-desktop" />
        <p>{{ statusMessage }}</p>
        <button
          v-if="connectionStatus === 'disconnected' || connectionStatus === 'error'"
          class="btn btn-primary"
          @click="connect"
        >
          Connect
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

const props = defineProps<{
  containerId: string;
}>();

const emit = defineEmits<{
  (e: "connected"): void;
  (e: "disconnected"): void;
  (e: "error", message: string): void;
}>();

const terminalRef = ref<HTMLElement | null>(null);
const connectionStatus = ref<"disconnected" | "connecting" | "connected" | "error">("disconnected");
const statusMessage = ref("Click Connect to open terminal");

let terminal: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let socket: WebSocket | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
let lastRows = 0;
let lastCols = 0;

const getWebSocketUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const apiUrl = import.meta.env.VITE_API_URL || "";

  if (apiUrl.startsWith("http")) {
    const url = new URL(apiUrl);
    return `${protocol}//${url.host}/api/containers/${props.containerId}/exec`;
  }

  return `${protocol}//${window.location.host}/api/containers/${props.containerId}/exec`;
};

let authenticated = false;

const connect = () => {
  if (connectionStatus.value === "connecting" || connectionStatus.value === "connected") {
    return;
  }

  connectionStatus.value = "connecting";
  statusMessage.value = "Connecting...";
  authenticated = false;

  socket = new WebSocket(getWebSocketUrl());
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    // Send first-message auth
    const token = localStorage.getItem("auth_token");
    if (token) {
      socket?.send(JSON.stringify({ type: "auth", token }));
      statusMessage.value = "Authenticating...";
    } else {
      // No token, assume auth is disabled
      authenticated = true;
      connectionStatus.value = "connected";
      statusMessage.value = "";
      emit("connected");
      if (terminal) {
        terminal.focus();
      }
    }
  };

  socket.onmessage = (event) => {
    // Convert ArrayBuffer to string if needed
    let data: string;
    if (event.data instanceof ArrayBuffer) {
      data = new TextDecoder().decode(event.data);
    } else {
      data = event.data;
    }

    if (!authenticated) {
      // Check for auth response
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "auth_success") {
          authenticated = true;
          connectionStatus.value = "connected";
          statusMessage.value = "";
          emit("connected");
          if (terminal) {
            terminal.focus();
            // Send initial terminal size
            socket?.send(
              JSON.stringify({
                type: "resize",
                rows: terminal.rows,
                cols: terminal.cols,
              }),
            );
          }
          return;
        }
      } catch {
        // Not JSON, might be an error message before auth
      }
      // If we get data before auth_success, show as error
      if (terminal) {
        terminal.write(data);
      }
      return;
    }

    if (terminal) {
      terminal.write(data);
    }
  };

  socket.onclose = () => {
    connectionStatus.value = "disconnected";
    statusMessage.value = "Connection closed. Click Connect to reconnect.";
    authenticated = false;
    emit("disconnected");
  };

  socket.onerror = () => {
    connectionStatus.value = "error";
    statusMessage.value = "Connection failed. Check if container is running.";
    authenticated = false;
    emit("error", "WebSocket connection failed");
  };
};

const disconnect = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};

const initTerminal = () => {
  if (!terminalRef.value) return;

  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: '"Fira Code", "Cascadia Code", Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: "#1a1b26",
      foreground: "#c0caf5",
      cursor: "#c0caf5",
      selectionBackground: "#33467c",
      black: "#15161e",
      red: "#f7768e",
      green: "#9ece6a",
      yellow: "#e0af68",
      blue: "#7aa2f7",
      magenta: "#bb9af7",
      cyan: "#7dcfff",
      white: "#a9b1d6",
      brightBlack: "#414868",
      brightRed: "#f7768e",
      brightGreen: "#9ece6a",
      brightYellow: "#e0af68",
      brightBlue: "#7aa2f7",
      brightMagenta: "#bb9af7",
      brightCyan: "#7dcfff",
      brightWhite: "#c0caf5",
    },
  });

  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new WebLinksAddon());

  terminal.open(terminalRef.value);
  fitAddon.fit();

  terminal.onData((data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  });

  resizeObserver = new ResizeObserver(() => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
      if (fitAddon && terminal) {
        fitAddon.fit();
        // Only send resize if dimensions actually changed
        if (terminal.rows !== lastRows || terminal.cols !== lastCols) {
          lastRows = terminal.rows;
          lastCols = terminal.cols;
          if (socket && socket.readyState === WebSocket.OPEN && authenticated) {
            socket.send(
              JSON.stringify({
                type: "resize",
                rows: terminal.rows,
                cols: terminal.cols,
              }),
            );
          }
        }
      }
    }, 100);
  });
  resizeObserver.observe(terminalRef.value);
};

watch(
  () => props.containerId,
  (newId, oldId) => {
    if (newId !== oldId) {
      disconnect();
      connectionStatus.value = "disconnected";
      statusMessage.value = "Click Connect to open terminal";
      if (terminal) {
        terminal.clear();
      }
    }
  },
);

onMounted(() => {
  initTerminal();
});

onUnmounted(() => {
  disconnect();
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  if (terminal) {
    terminal.dispose();
  }
});

defineExpose({
  connect,
  disconnect,
});
</script>

<style scoped>
.container-terminal {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: #1a1b26;
  border-radius: 8px;
  overflow: hidden;
}

.terminal-element {
  width: 100%;
  height: 100%;
  padding: 8px;
}

.terminal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 27, 38, 0.95);
}

.overlay-content {
  text-align: center;
  color: #c0caf5;
}

.overlay-content i {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
}

.overlay-content .pi-exclamation-circle {
  color: #f7768e;
}

.overlay-content p {
  margin-bottom: 1rem;
  opacity: 0.8;
}

.overlay-content .btn {
  margin-top: 0.5rem;
}
</style>
