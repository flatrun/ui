<template>
  <div class="certificates-view">
    <DataTable
      :items="certificates"
      :columns="columns"
      item-key="domain"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search certificates..."
      :search-fields="['domain', 'issuer', 'status']"
      :toggleable="true"
      default-view-mode="grid"
      empty-icon="pi pi-shield"
      empty-title="No Certificates Found"
      empty-text="SSL certificates will appear here once configured in your nginx deployment."
      loading-text="Loading certificates..."
    >
      <template #actions>
        <button class="btn btn-icon" @click="fetchCertificates" :disabled="loading">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }"></i>
        </button>
      </template>

      <template #cell-domain="{ item }">
        <div class="domain-cell">
          <i class="pi pi-lock"></i>
          {{ item.domain }}
        </div>
      </template>

      <template #cell-status="{ item }">
        <span class="status-badge" :class="item.status">
          {{ item.status }}
        </span>
      </template>

      <template #cell-days_left="{ item }">
        <span class="days-left" :class="daysLeftClass(item.days_left)">
          {{ item.days_left }} days
        </span>
      </template>

      <template #cell-not_before="{ item }">
        {{ formatDate(item.not_before) }}
      </template>

      <template #cell-not_after="{ item }">
        {{ formatDate(item.not_after) }}
      </template>

      <template #grid="{ items }">
        <div class="certificates-grid">
          <div
            v-for="cert in items"
            :key="cert.domain"
            class="cert-card"
            :class="cert.status"
          >
            <div class="cert-header">
              <div class="cert-status">
                <span class="status-badge" :class="cert.status">
                  <i :class="statusIcon(cert.status)"></i>
                  {{ cert.status }}
                </span>
              </div>
              <div class="cert-domain">
                <i class="pi pi-lock"></i>
                <span>{{ cert.domain }}</span>
              </div>
            </div>

            <div class="cert-body">
              <div class="cert-info-grid">
                <div class="info-item">
                  <span class="info-label">Issuer</span>
                  <span class="info-value">{{ cert.issuer }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Days Left</span>
                  <span class="info-value days-left" :class="daysLeftClass(cert.days_left)">
                    {{ cert.days_left }} days
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Valid From</span>
                  <span class="info-value">{{ formatDate(cert.not_before) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Expires</span>
                  <span class="info-value">{{ formatDate(cert.not_after) }}</span>
                </div>
              </div>
            </div>

            <div class="cert-footer">
              <div class="cert-path">
                <i class="pi pi-folder"></i>
                <span>{{ cert.path }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <div v-if="certificates.length > 0" class="certificates-summary">
      <div class="summary-card">
        <div class="summary-icon valid">
          <i class="pi pi-check-circle"></i>
        </div>
        <div class="summary-info">
          <span class="summary-count">{{ validCount }}</span>
          <span class="summary-label">Valid</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon expiring">
          <i class="pi pi-exclamation-circle"></i>
        </div>
        <div class="summary-info">
          <span class="summary-count">{{ expiringCount }}</span>
          <span class="summary-label">Expiring Soon</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon expired">
          <i class="pi pi-times-circle"></i>
        </div>
        <div class="summary-info">
          <span class="summary-count">{{ expiredCount }}</span>
          <span class="summary-label">Expired</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { certificatesApi } from '@/services/api'
import { useNotificationsStore } from '@/stores/notifications'
import DataTable from '@/components/DataTable.vue'
import type { Certificate } from '@/types'

const notifications = useNotificationsStore()
const certificates = ref<Certificate[]>([])
const loading = ref(false)

const columns = [
  { key: 'domain', label: 'Domain', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'issuer', label: 'Issuer', sortable: true },
  { key: 'days_left', label: 'Days Left', sortable: true },
  { key: 'not_before', label: 'Valid From', sortable: true },
  { key: 'not_after', label: 'Expires', sortable: true }
]

const validCount = computed(() => certificates.value.filter(c => c.status === 'valid').length)
const expiringCount = computed(() => certificates.value.filter(c => c.status === 'expiring').length)
const expiredCount = computed(() => certificates.value.filter(c => c.status === 'expired').length)

const fetchCertificates = async () => {
  loading.value = true

  try {
    const response = await certificatesApi.list()
    certificates.value = response.data.certificates || []
  } catch (e: any) {
    notifications.error('Error', 'Failed to load certificates')
  } finally {
    loading.value = false
  }
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'valid':
      return 'pi pi-check'
    case 'expiring':
      return 'pi pi-exclamation-triangle'
    case 'expired':
      return 'pi pi-times'
    default:
      return 'pi pi-question'
  }
}

const daysLeftClass = (days: number) => {
  if (days <= 0) return 'critical'
  if (days <= 30) return 'warning'
  return 'good'
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  fetchCertificates()
})
</script>

<style scoped>
.certificates-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-icon {
  padding: 0.625rem;
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}

.btn-icon:hover:not(:disabled) {
  background: #f9fafb;
  color: #374151;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.domain-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #1f2937;
}

.domain-cell i {
  color: #22c55e;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.valid {
  background: #dcfce7;
  color: #166534;
}

.status-badge.expiring {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.expired {
  background: #fee2e2;
  color: #991b1b;
}

.days-left.good {
  color: #16a34a;
  font-weight: 500;
}

.days-left.warning {
  color: #d97706;
  font-weight: 500;
}

.days-left.critical {
  color: #dc2626;
  font-weight: 500;
}

.certificates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.cert-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.3s ease;
}

.cert-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.cert-card.expiring {
  border-color: #fbbf24;
}

.cert-card.expired {
  border-color: #ef4444;
}

.cert-header {
  padding: 1.25rem;
  border-bottom: 1px solid #f3f4f6;
}

.cert-status {
  margin-bottom: 0.75rem;
}

.cert-domain {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  word-break: break-all;
}

.cert-domain i {
  color: #22c55e;
}

.cert-body {
  padding: 1.25rem;
}

.cert-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.info-value {
  font-size: 0.875rem;
  color: #1f2937;
  font-weight: 500;
}

.cert-footer {
  padding: 1rem 1.25rem;
  background: #f9fafb;
}

.cert-path {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
  font-family: 'SF Mono', 'Fira Code', monospace;
  word-break: break-all;
}

.certificates-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.summary-icon.valid {
  background: #dcfce7;
  color: #16a34a;
}

.summary-icon.expiring {
  background: #fef3c7;
  color: #d97706;
}

.summary-icon.expired {
  background: #fee2e2;
  color: #dc2626;
}

.summary-info {
  display: flex;
  flex-direction: column;
}

.summary-count {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.summary-label {
  font-size: 0.875rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .certificates-grid {
    grid-template-columns: 1fr;
  }
}
</style>
