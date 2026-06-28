<template>
  <div class="system-terminal-view">
    <div class="view-header">
      <div class="header-content">
        <h1>System Terminal</h1>
        <p class="subtitle">Host shell governed by global terminal protection settings</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" :disabled="connected" @click="terminalRef?.connect()">
          <i class="pi pi-desktop" />
          Connect
        </button>
        <button class="btn btn-secondary" :disabled="!connected" @click="terminalRef?.disconnect()">
          <i class="pi pi-times" />
          Disconnect
        </button>
      </div>
    </div>

    <div class="terminal-card">
      <ContainerTerminal
        ref="terminalRef"
        ws-path="/api/system/terminal/interactive"
        @connected="connected = true"
        @disconnected="connected = false"
      />
    </div>

    <div class="terminal-note">
      <i class="pi pi-shield" />
      <span>Command restrictions are configured in Settings → Terminal.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ContainerTerminal from "@/components/ContainerTerminal.vue";

const terminalRef = ref<InstanceType<typeof ContainerTerminal> | null>(null);
const connected = ref(false);
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
  background: var(--surface-raised);
  padding: 1.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.header-content h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.terminal-card {
  position: relative;
  min-height: 560px;
  height: 560px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid #1f2937;
}

.terminal-note {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}
</style>
