<template>
  <div class="backup-restore-panel">
    <div class="coming-soon-overlay">
      <div class="coming-soon-content">
        <div class="coming-soon-icon">
          <HardDrive :size="48" />
        </div>
        <h2>Backup & Restore</h2>
        <p>Database backup and restore functionality is coming soon.</p>
        <span class="coming-soon-badge">Planned Feature</span>
      </div>
    </div>

    <div class="preview-content" aria-hidden="true">
      <div class="panel-section">
        <div class="section-header">
          <h3>
            <Download :size="18" />
            Create Backup
          </h3>
        </div>
        <div class="section-content">
          <p class="section-desc">Create a backup of your database that can be restored later.</p>
          <div class="backup-options">
            <label class="option-label disabled">
              <input type="checkbox" disabled checked />
              <span>Include table structure</span>
            </label>
            <label class="option-label disabled">
              <input type="checkbox" disabled checked />
              <span>Include data</span>
            </label>
            <label class="option-label disabled">
              <input type="checkbox" disabled />
              <span>Include stored procedures</span>
            </label>
          </div>
          <button class="btn btn-primary" disabled>
            <Download :size="14" />
            Create Backup
          </button>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-header">
          <h3>
            <Upload :size="18" />
            Restore Backup
          </h3>
        </div>
        <div class="section-content">
          <p class="section-desc">Restore your database from a previously created backup file.</p>
          <div class="upload-area disabled">
            <Upload :size="32" />
            <p>Drop backup file here or click to browse</p>
            <span class="upload-hint">Supports .sql files</span>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-header">
          <h3>
            <History :size="18" />
            Backup History
          </h3>
        </div>
        <div class="section-content">
          <div class="empty-history">
            <Archive :size="24" />
            <p>No backups yet</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HardDrive, Download, Upload, History, Archive } from "lucide-vue-next";

defineProps<{
  database?: string;
}>();
</script>

<style scoped>
.backup-restore-panel {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.coming-soon-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  z-index: 10;
}

.coming-soon-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-8);
}

.coming-soon-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50));
  color: var(--color-primary-500);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-4);
}

.coming-soon-content h2 {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.coming-soon-content p {
  margin: 0 0 var(--space-4) 0;
  color: var(--color-gray-600);
  max-width: 300px;
}

.coming-soon-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background: var(--color-info-100);
  color: var(--color-info-700);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
}

.preview-content {
  padding: var(--space-6);
  filter: blur(2px);
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
}

.panel-section {
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  overflow: hidden;
}

.section-header {
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.section-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
}

.section-content {
  padding: var(--space-4);
}

.section-desc {
  margin: 0 0 var(--space-4) 0;
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.backup-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.option-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-gray-700);
}

.option-label.disabled {
  opacity: 0.5;
}

.option-label input {
  width: 16px;
  height: 16px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  border: 2px dashed var(--color-gray-300);
  border-radius: var(--radius-lg);
  color: var(--color-gray-400);
}

.upload-area.disabled {
  opacity: 0.5;
}

.upload-area p {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
}

.upload-hint {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  color: var(--color-gray-400);
}

.empty-history p {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
