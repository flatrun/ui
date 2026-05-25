<template>
  <div class="system-terminal-view">
    <div class="view-header">
      <div class="header-content">
        <h1>System Terminal</h1>
        <p class="subtitle">Host shell governed by global terminal protection settings</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" :disabled="connected || connecting" @click="connect">
          <i :class="connecting ? 'pi pi-spin pi-spinner' : 'pi pi-desktop'" />
          Connect
        </button>
        <button class="btn btn-secondary" :disabled="!connected" @click="disconnect">
          <i class="pi pi-times" />
          Disconnect
        </button>
      </div>
    </div>

    <div class="terminal-card">
      <div ref="terminalRef" class="terminal-element" />
      <div v-if="!connected" class="terminal-overlay">
        <div class="overlay-content">
          <i :class="connecting ? 'pi pi-spin pi-spinner' : error ? 'pi pi-exclamation-circle' : 'pi pi-desktop'" />
          <p>{{ error || (connecting ? "Connecting..." : "Click Connect to open system terminal") }}</p>
        </div>
      </div>
    </div>

    <div class="terminal-note">
      <i class="pi pi-shield" />
      <span>Command restrictions are configured in Settings → Terminal.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

const terminalRef = ref<HTMLElement | null>(null);
const connected = ref(false);
const connecting = ref(false);
const error = ref("");

let terminal: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let socket: WebSocket | null = null;
let commandBuffer = "";

const getWebSocketUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const apiUrl = import.meta.env.VITE_API_URL || "";
  if (apiUrl.startsWith("http")) {
    const url = new URL(apiUrl);
    return `${protocol}//${url.host}/api/system/terminal`;
  }
  return `${protocol}//${window.location.host}/api/system/terminal`;
};

const initTerminal = () => {
  if (!terminalRef.value) return;
  terminal = new Terminal({
    cursorBlink: true,
    convertEol: true,
    fontSize: 14,
    fontFamily: '"Fira Code", "Cascadia Code", Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: "#111827",
      foreground: "#e5e7eb",
      cursor: "#f9fafb",
      selectionBackground: "#374151",
    },
  });
  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new WebLinksAddon());
  terminal.open(terminalRef.value);
  fitAddon.fit();

  terminal.onData((data) => {
    if (!connected.value || !socket || socket.readyState !== WebSocket.OPEN) return;
    for (const char of data) {
      if (char === "\r") {
        terminal?.write("\r\n");
        socket.send(JSON.stringify({ type: "command", command: commandBuffer }));
        commandBuffer = "";
      } else if (char === "\u007f") {
        if (commandBuffer.length > 0) {
          commandBuffer = commandBuffer.slice(0, -1);
          terminal?.write("\b \b");
        }
      } else if (char >= " ") {
        commandBuffer += char;
        terminal?.write(char);
      }
    }
  });
};

const connect = () => {
  if (connected.value || connecting.value) return;
  connecting.value = true;
  error.value = "";

  socket = new WebSocket(getWebSocketUrl());
  socket.onopen = () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      socket?.send(JSON.stringify({ type: "auth", token }));
    }
  };
  socket.onmessage = (event) => {
    let data: any;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    if (data.type === "auth_success") {
      connected.value = true;
      connecting.value = false;
      terminal?.clear();
      terminal?.focus();
      return;
    }
    if (data.type === "output") {
      terminal?.write(data.data || "");
      return;
    }
    if (data.type === "error") {
      error.value = data.message || "System terminal error";
      terminal?.write(`\r\n\x1b[31m${error.value}\x1b[0m\r\n`);
    }
  };
  socket.onerror = () => {
    error.value = "Failed to connect to system terminal";
    connecting.value = false;
  };
  socket.onclose = () => {
    connected.value = false;
    connecting.value = false;
  };
};

const disconnect = () => {
  socket?.close();
  socket = null;
};

onMounted(() => {
  initTerminal();
});

onUnmounted(() => {
  disconnect();
  terminal?.dispose();
});
</script>

<style scoped>
.system-terminal-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
}

.header-content h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.terminal-card {
  position: relative;
  min-height: 560px;
  background: #111827;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid #1f2937;
}

.terminal-element {
  width: 100%;
  height: 560px;
  padding: 0.75rem;
}

.terminal-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.82);
  color: #e5e7eb;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.terminal-note {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: #6b7280;
  font-size: 0.875rem;
}
</style>
