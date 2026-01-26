<template>
  <div class="dns-view dns-zones-view">
    <div v-if="!serviceRunning" class="service-setup">
      <div class="setup-card">
        <div class="setup-header">
          <i class="pi pi-server" />
          <h2>DNS Server</h2>
          <p>Host your own authoritative DNS server with PowerDNS</p>
        </div>

        <div class="setup-body">
          <div class="feature-list">
            <div class="feature-item">
              <i class="pi pi-check-circle" />
              <div>
                <strong>Full DNS Control</strong>
                <span>Manage A, AAAA, CNAME, MX, TXT, and more record types</span>
              </div>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle" />
              <div>
                <strong>No External Dependencies</strong>
                <span>Your DNS records stay on your server</span>
              </div>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle" />
              <div>
                <strong>REST API</strong>
                <span>Programmatic access for automation</span>
              </div>
            </div>
          </div>

          <button class="btn btn-primary" :disabled="loading" @click="handleEnableService">
            <i v-if="loading" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-play" />
            {{ loading ? "Starting..." : "Enable DNS Server" }}
          </button>

          <p class="setup-note">
            <i class="pi pi-info-circle" />
            This will deploy PowerDNS as an infrastructure service
          </p>
        </div>
      </div>
    </div>

    <div v-else class="zones-manager">
      <div class="manager-header">
        <div class="header-left">
          <div class="service-badge">
            <span class="status-dot online" />
            <span>PowerDNS Running</span>
          </div>
        </div>
        <div class="header-right">
          <button class="btn btn-secondary btn-sm" @click="showSettingsModal = true">
            <i class="pi pi-cog" />
            Settings
          </button>
        </div>
      </div>

      <div v-if="!selectedZone" class="zones-list">
        <div class="section-header">
          <h3>
            <i class="pi pi-list" />
            DNS Zones
          </h3>
          <div class="section-actions">
            <button class="btn btn-primary" @click="showCreateZoneModal = true">
              <i class="pi pi-plus" />
              Add Zone
            </button>
            <button class="btn btn-icon" :disabled="loading" @click="fetchZones">
              <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
            </button>
          </div>
        </div>

        <div v-if="loading && zones.length === 0" class="loading-state">
          <i class="pi pi-spin pi-spinner" />
          <span>Loading zones...</span>
        </div>

        <div v-else-if="zones.length === 0" class="empty-state">
          <i class="pi pi-inbox" />
          <span>No DNS zones configured</span>
          <button class="btn btn-primary btn-sm" @click="showCreateZoneModal = true">
            <i class="pi pi-plus" />
            Create Your First Zone
          </button>
        </div>

        <div v-else class="zones-grid">
          <div v-for="zone in zones" :key="zone.id" class="zone-card" @click="selectZone(zone)">
            <div class="zone-info">
              <div class="zone-name">
                <i class="pi pi-globe" />
                {{ zone.name }}
              </div>
              <div class="zone-meta">
                <span class="zone-type">{{ zone.kind }}</span>
                <span class="zone-serial">Serial: {{ zone.serial }}</span>
              </div>
            </div>
            <div class="zone-stats">
              <span class="zone-records">{{ zone.rrsets?.length || 0 }} records</span>
              <i class="pi pi-chevron-right" />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="records-section">
        <div class="section-header">
          <div class="breadcrumb">
            <button class="breadcrumb-btn" @click="clearZone">
              <i class="pi pi-arrow-left" />
              Zones
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">
              <i class="pi pi-globe" />
              {{ selectedZone.name }}
            </span>
          </div>
          <div class="section-actions">
            <button class="btn btn-primary" @click="showCreateRecordModal = true">
              <i class="pi pi-plus" />
              Add Record
            </button>
            <button class="btn btn-icon" :disabled="loading" @click="fetchRecords">
              <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
            </button>
          </div>
        </div>

        <div class="zone-details">
          <div class="detail-row">
            <span class="detail-label">Zone Type</span>
            <span class="detail-value">{{ selectedZone.kind }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Serial</span>
            <span class="detail-value">{{ selectedZone.serial }}</span>
          </div>
          <div v-if="selectedZone.dnssec" class="detail-row">
            <span class="detail-label">DNSSEC</span>
            <span class="detail-value badge-success">Enabled</span>
          </div>
        </div>

        <div v-if="loading && records.length === 0" class="loading-state">
          <i class="pi pi-spin pi-spinner" />
          <span>Loading records...</span>
        </div>

        <div v-else-if="records.length === 0" class="empty-state">
          <i class="pi pi-inbox" />
          <span>No records found</span>
        </div>

        <div v-else class="records-table">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Content</th>
                <th>TTL</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="`${record.name}-${record.type}`">
                <td>
                  <span class="record-type" :class="record.type.toLowerCase()">
                    {{ record.type }}
                  </span>
                </td>
                <td class="record-name">{{ record.name }}</td>
                <td class="record-content">
                  <div v-for="(rec, idx) in record.records" :key="idx" class="content-line">
                    {{ rec.content }}
                  </div>
                </td>
                <td>{{ formatTTL(record.ttl) }}</td>
                <td class="actions-cell">
                  <button class="btn-icon-sm" @click="editRecord(record)">
                    <i class="pi pi-pencil" />
                  </button>
                  <button class="btn-icon-sm danger" @click="confirmDeleteRecord(record)">
                    <i class="pi pi-trash" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateZoneModal" class="modal-overlay" @click.self="showCreateZoneModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-globe" />
              Create DNS Zone
            </h3>
            <button class="close-btn" @click="showCreateZoneModal = false">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="zone-name">Domain Name</label>
              <input id="zone-name" v-model="zoneForm.name" type="text" placeholder="example.com" />
              <span class="hint">Enter the domain name for this zone</span>
            </div>

            <div class="form-group">
              <label for="zone-type">Zone Type</label>
              <select id="zone-type" v-model="zoneForm.kind">
                <option value="Native">Native</option>
                <option value="Master">Master</option>
                <option value="Slave">Slave</option>
              </select>
            </div>

            <div class="form-group">
              <label for="zone-nameservers">Nameservers</label>
              <textarea
                id="zone-nameservers"
                v-model="zoneForm.nameservers"
                rows="3"
                placeholder="ns1.example.com&#10;ns2.example.com"
              />
              <span class="hint">One nameserver per line</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="saving" @click="showCreateZoneModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="saving || !zoneForm.name" @click="handleCreateZone">
              <i v-if="saving" class="pi pi-spin pi-spinner" />
              {{ saving ? "Creating..." : "Create Zone" }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showCreateRecordModal || showEditRecordModal" class="modal-overlay" @click.self="closeRecordModals">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-file-edit" />
              {{ showEditRecordModal ? "Edit Record" : "Add DNS Record" }}
            </h3>
            <button class="close-btn" @click="closeRecordModals">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="record-type">Type</label>
              <select id="record-type" v-model="recordForm.type" :disabled="showEditRecordModal">
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="CNAME">CNAME</option>
                <option value="MX">MX</option>
                <option value="TXT">TXT</option>
                <option value="NS">NS</option>
                <option value="SRV">SRV</option>
                <option value="CAA">CAA</option>
                <option value="PTR">PTR</option>
              </select>
            </div>

            <div class="form-group">
              <label for="record-name">Name</label>
              <input
                id="record-name"
                v-model="recordForm.name"
                type="text"
                :placeholder="selectedZone?.name"
                :disabled="showEditRecordModal"
              />
              <span class="hint">Use @ for the root domain, or enter subdomain</span>
            </div>

            <div class="form-group">
              <label for="record-content">Content</label>
              <textarea
                id="record-content"
                v-model="recordForm.content"
                rows="2"
                placeholder="IP address or hostname"
              />
              <span class="hint">For multiple values, enter one per line</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="record-ttl">TTL (seconds)</label>
                <input
                  id="record-ttl"
                  v-model.number="recordForm.ttl"
                  type="number"
                  min="60"
                  max="604800"
                  placeholder="3600"
                />
                <span class="hint">Time-to-live (60s - 7 days). Common: 300 (5min), 3600 (1hr)</span>
              </div>

              <div v-if="recordForm.type === 'MX' || recordForm.type === 'SRV'" class="form-group">
                <label for="record-priority">Priority</label>
                <input id="record-priority" v-model.number="recordForm.priority" type="number" placeholder="10" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="saving" @click="closeRecordModals">Cancel</button>
            <button class="btn btn-primary" :disabled="saving || !isRecordFormValid" @click="handleSaveRecord">
              <i v-if="saving" class="pi pi-spin pi-spinner" />
              {{ saving ? "Saving..." : showEditRecordModal ? "Update" : "Create" }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-cog" />
              DNS Server Settings
            </h3>
            <button class="close-btn" @click="showSettingsModal = false">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="settings-section">
              <h4>Server Information</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Status</span>
                  <span class="info-value">
                    <span class="status-badge online">Running</span>
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Listen Address</span>
                  <span class="info-value">0.0.0.0:53</span>
                </div>
                <div class="info-item">
                  <span class="info-label">API Port</span>
                  <span class="info-value">8081</span>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h4>Actions</h4>
              <div class="action-buttons">
                <button class="btn btn-secondary" @click="handleRestartService">
                  <i class="pi pi-refresh" />
                  Restart Service
                </button>
                <button class="btn btn-danger" @click="handleDisableService">
                  <i class="pi pi-power-off" />
                  Disable DNS Server
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showSettingsModal = false">Close</button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmModal
      :visible="showDeleteModal"
      title="Delete Record"
      :message="`Are you sure you want to delete this ${recordToDelete?.type} record for ${recordToDelete?.name}?`"
      warning="This action cannot be undone."
      variant="danger"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="handleDeleteRecord"
      @cancel="showDeleteModal = false"
    />

    <ConfirmModal
      :visible="showDeleteZoneModal"
      title="Delete Zone"
      :message="`Are you sure you want to delete the zone ${zoneToDelete?.name}?`"
      warning="All records in this zone will be permanently deleted."
      variant="danger"
      confirm-text="Delete Zone"
      :loading="deleting"
      @confirm="handleDeleteZone"
      @cancel="showDeleteZoneModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useNotificationsStore } from "@/stores/notifications";
import ConfirmModal from "@/components/ConfirmModal.vue";
import { powerDnsApi, type PowerDNSZone, type PowerDNSRRSet } from "@/services/api";

const notifications = useNotificationsStore();

const serviceRunning = ref(false);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);

const zones = ref<PowerDNSZone[]>([]);
const selectedZone = ref<PowerDNSZone | null>(null);
const records = ref<PowerDNSRRSet[]>([]);

const showCreateZoneModal = ref(false);
const showCreateRecordModal = ref(false);
const showEditRecordModal = ref(false);
const showDeleteModal = ref(false);
const showDeleteZoneModal = ref(false);
const showSettingsModal = ref(false);

const recordToDelete = ref<PowerDNSRRSet | null>(null);
const recordToEdit = ref<PowerDNSRRSet | null>(null);
const zoneToDelete = ref<PowerDNSZone | null>(null);

const initialZoneFormState = { name: "", kind: "Native", nameservers: "" };
const initialRecordFormState = { type: "A", name: "", content: "", ttl: 3600, priority: 0 };

const zoneForm = ref({ ...initialZoneFormState });

const recordForm = ref({
  type: "A",
  name: "",
  content: "",
  ttl: 3600,
  priority: 0,
});

const isRecordFormValid = computed(() => {
  return recordForm.value.type && recordForm.value.name && recordForm.value.content;
});

const formatTTL = (ttl: number) => {
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m`;
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h`;
  return `${Math.floor(ttl / 86400)}d`;
};

const getRecordFullName = (recordName: string, zoneName: string) => {
  const trimmed = recordName.trim();
  if (trimmed === "@" || trimmed === "") return zoneName;
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.${zoneName}`;
};

const checkServiceStatus = async () => {
  loading.value = true;
  try {
    const response = await powerDnsApi.getStatus();
    serviceRunning.value = response.data.running;
    if (serviceRunning.value) {
      await fetchZones();
    }
  } catch {
    serviceRunning.value = false;
  } finally {
    loading.value = false;
  }
};

const handleEnableService = async () => {
  loading.value = true;
  try {
    await powerDnsApi.enableService();
    serviceRunning.value = true;
    notifications.success("DNS Server Enabled", "PowerDNS service is now running");
    await fetchZones();
  } catch (e: any) {
    notifications.error("Enable Failed", e.response?.data?.error || e.message || "Failed to enable DNS server");
  } finally {
    loading.value = false;
  }
};

const handleRestartService = async () => {
  loading.value = true;
  try {
    await powerDnsApi.restartService();
    notifications.success("Service Restarted", "PowerDNS service has been restarted");
  } catch (e: any) {
    notifications.error("Restart Failed", e.response?.data?.error || "Failed to restart service");
  } finally {
    loading.value = false;
    showSettingsModal.value = false;
  }
};

const handleDisableService = async () => {
  loading.value = true;
  try {
    await powerDnsApi.disableService();
    serviceRunning.value = false;
    zones.value = [];
    selectedZone.value = null;
    notifications.success("DNS Server Disabled", "PowerDNS service has been stopped");
  } catch (e: any) {
    notifications.error("Disable Failed", e.response?.data?.error || "Failed to disable service");
  } finally {
    loading.value = false;
    showSettingsModal.value = false;
  }
};

const fetchZones = async () => {
  loading.value = true;
  try {
    const response = await powerDnsApi.listZones();
    zones.value = response.data.zones || [];
  } catch (e: any) {
    notifications.error("Load Failed", e.response?.data?.error || e.message || "Failed to load zones");
  } finally {
    loading.value = false;
  }
};

const selectZone = async (zone: PowerDNSZone) => {
  selectedZone.value = zone;
  await fetchRecords();
};

const clearZone = () => {
  selectedZone.value = null;
  records.value = [];
};

const fetchRecords = async () => {
  if (!selectedZone.value) return;

  loading.value = true;
  try {
    const response = await powerDnsApi.getZone(selectedZone.value.id);
    records.value = response.data.rrsets || [];
  } catch (e: any) {
    notifications.error("Load Failed", e.response?.data?.error || e.message || "Failed to load records");
  } finally {
    loading.value = false;
  }
};

const handleCreateZone = async () => {
  saving.value = true;

  try {
    const nameservers = zoneForm.value.nameservers
      .split("\n")
      .map((ns) => ns.trim())
      .filter((ns) => ns);

    await powerDnsApi.createZone({
      name: zoneForm.value.name.endsWith(".") ? zoneForm.value.name : zoneForm.value.name + ".",
      kind: zoneForm.value.kind,
      nameservers,
    });

    notifications.success("Zone Created", `DNS zone ${zoneForm.value.name} has been created`);
    showCreateZoneModal.value = false;
    Object.assign(zoneForm.value, initialZoneFormState);
    await fetchZones();
  } catch (e: any) {
    notifications.error("Create Failed", e.response?.data?.error || e.message || "Failed to create zone");
  } finally {
    saving.value = false;
  }
};

const handleDeleteZone = async () => {
  if (!zoneToDelete.value) return;

  deleting.value = true;
  try {
    await powerDnsApi.deleteZone(zoneToDelete.value.id);
    notifications.success("Zone Deleted", `DNS zone ${zoneToDelete.value.name} has been deleted`);
    await fetchZones();
  } catch (e: any) {
    notifications.error("Delete Failed", e.response?.data?.error || "Failed to delete zone");
  } finally {
    deleting.value = false;
    showDeleteZoneModal.value = false;
    zoneToDelete.value = null;
  }
};

const editRecord = (record: PowerDNSRRSet) => {
  recordToEdit.value = record;
  const isRootRecord = selectedZone.value && record.name === selectedZone.value.name;
  recordForm.value = {
    type: record.type,
    name: isRootRecord ? "@" : record.name,
    content: record.records.map((r) => r.content).join("\n"),
    ttl: record.ttl,
    priority: 0,
  };
  showEditRecordModal.value = true;
};

const confirmDeleteRecord = (record: PowerDNSRRSet) => {
  recordToDelete.value = record;
  showDeleteModal.value = true;
};

const handleSaveRecord = async () => {
  if (!selectedZone.value) return;

  saving.value = true;

  try {
    const contents = recordForm.value.content
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c);

    const formattedContents = contents.map((content) => {
      if (["MX", "SRV"].includes(recordForm.value.type) && recordForm.value.priority != null) {
        return `${recordForm.value.priority} ${content}`;
      }
      return content;
    });

    const rrset: PowerDNSRRSet = {
      name: getRecordFullName(recordForm.value.name, selectedZone.value.name),
      type: recordForm.value.type,
      ttl: recordForm.value.ttl,
      changetype: "REPLACE",
      records: formattedContents.map((content) => ({
        content,
        disabled: false,
      })),
    };

    await powerDnsApi.updateRecords(selectedZone.value.id, [rrset]);

    notifications.success(showEditRecordModal.value ? "Record Updated" : "Record Created", "DNS record has been saved");
    closeRecordModals();
    await fetchRecords();
  } catch (e: any) {
    notifications.error("Save Failed", e.response?.data?.error || e.message || "Failed to save record");
  } finally {
    saving.value = false;
  }
};

const handleDeleteRecord = async () => {
  if (!selectedZone.value || !recordToDelete.value) return;

  deleting.value = true;
  try {
    const rrset: PowerDNSRRSet = {
      name: recordToDelete.value.name,
      type: recordToDelete.value.type,
      ttl: 0,
      changetype: "DELETE",
      records: [],
    };

    await powerDnsApi.updateRecords(selectedZone.value.id, [rrset]);
    notifications.success("Record Deleted", "DNS record has been deleted");
    await fetchRecords();
  } catch (e: any) {
    notifications.error("Delete Failed", e.response?.data?.error || "Failed to delete record");
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
    recordToDelete.value = null;
  }
};

const closeRecordModals = () => {
  showCreateRecordModal.value = false;
  showEditRecordModal.value = false;
  recordToEdit.value = null;
  Object.assign(recordForm.value, initialRecordFormState);
};

onMounted(() => {
  checkServiceStatus();
});
</script>

<style src="@/assets/dns-shared.css"></style>
<style scoped>
/* Layout */
.dns-zones-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Service Setup */
.service-setup {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem 0;
}

.setup-card {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  width: 100%;
  max-width: 600px;
  overflow: hidden;
}

.setup-header {
  padding: 2rem;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
}

.setup-header i {
  font-size: 3rem;
  color: #6366f1;
  margin-bottom: 1rem;
}

.setup-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.setup-header p {
  color: #6b7280;
  margin: 0;
}

.setup-body {
  padding: 1.5rem;
}

/* Feature List */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feature-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: var(--radius-sm);
}

.feature-item i {
  color: #22c55e;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.feature-item div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.feature-item strong {
  color: #1f2937;
  font-weight: 600;
}

.feature-item span {
  color: #6b7280;
  font-size: 0.875rem;
}

.setup-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  color: #6b7280;
  font-size: 0.8125rem;
}

/* Zones Manager */
.zones-manager {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
}

.manager-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.service-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #dcfce7;
  border-radius: var(--radius-sm);
  font-weight: 600;
  color: #166534;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.zones-list,
.records-section {
  padding: 1.5rem;
}

/* Zone-specific styles */
.zone-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.zone-type {
  padding: 0.125rem 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  font-weight: 500;
}

.zone-stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #6b7280;
}

.zone-details {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
}

.detail-value {
  font-weight: 600;
  color: #1f2937;
}

.badge-success {
  color: #166534;
}

/* Content line for multi-value records */
.content-line {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Settings Modal */
.settings-section {
  margin-bottom: 1.5rem;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.info-value {
  font-weight: 500;
  color: #1f2937;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.online {
  background: #dcfce7;
  color: #166534;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .zone-details {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
