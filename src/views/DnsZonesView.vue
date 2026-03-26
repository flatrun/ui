<template>
  <div class="dns-view dns-zones-view">
    <div v-if="!serviceRunning" class="service-setup">
      <div class="setup-card">
        <div class="setup-header">
          <i class="pi pi-server" />
          <h2>{{ t("dns.zones.setup.title") }}</h2>
          <p>{{ t("dns.zones.setup.subtitle") }}</p>
        </div>

        <div class="setup-body">
          <div class="feature-list">
            <div class="feature-item">
              <i class="pi pi-check-circle" />
              <div>
                <strong>{{ t("dns.zones.setup.features.fullControl.title") }}</strong>
                <span>{{ t("dns.zones.setup.features.fullControl.description") }}</span>
              </div>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle" />
              <div>
                <strong>{{ t("dns.zones.setup.features.noDependencies.title") }}</strong>
                <span>{{ t("dns.zones.setup.features.noDependencies.description") }}</span>
              </div>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle" />
              <div>
                <strong>{{ t("dns.zones.setup.features.restApi.title") }}</strong>
                <span>{{ t("dns.zones.setup.features.restApi.description") }}</span>
              </div>
            </div>
          </div>

          <button class="btn btn-primary" :disabled="loading" @click="handleEnableService">
            <i v-if="loading" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-play" />
            {{ loading ? t("dns.zones.setup.actions.starting") : t("dns.zones.setup.actions.enable") }}
          </button>

          <p class="setup-note">
            <i class="pi pi-info-circle" />
            {{ t("dns.zones.setup.note") }}
          </p>
        </div>
      </div>
    </div>

    <div v-else class="zones-manager">
      <div class="manager-header">
        <div class="header-left">
          <div class="service-badge">
            <span class="status-dot online" />
            <span>{{ t("dns.zones.manager.powerDnsRunning") }}</span>
          </div>
        </div>
        <div class="header-right">
          <button class="btn btn-secondary btn-sm" @click="showSettingsModal = true">
            <i class="pi pi-cog" />
            {{ t("dns.common.settings") }}
          </button>
        </div>
      </div>

      <div v-if="!selectedZone" class="zones-list">
        <div class="section-header">
          <h3>
            <i class="pi pi-list" />
            {{ t("dns.common.zones") }}
          </h3>
          <div class="section-actions">
            <button class="btn btn-primary" @click="showCreateZoneModal = true">
              <i class="pi pi-plus" />
              {{ t("dns.zones.manager.actions.addZone") }}
            </button>
            <button class="btn btn-icon" :disabled="loading" @click="fetchZones">
              <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
            </button>
          </div>
        </div>

        <div v-if="loading && zones.length === 0" class="loading-state">
          <i class="pi pi-spin pi-spinner" />
          <span>{{ t("dns.zones.manager.loadingZones") }}</span>
        </div>

        <div v-else-if="zones.length === 0" class="empty-state">
          <i class="pi pi-inbox" />
          <span>{{ t("dns.zones.manager.emptyZones") }}</span>
          <button class="btn btn-primary btn-sm" @click="showCreateZoneModal = true">
            <i class="pi pi-plus" />
            {{ t("dns.zones.manager.actions.createFirstZone") }}
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
                <span class="zone-serial">{{ t("dns.zones.manager.serial", { value: zone.serial }) }}</span>
              </div>
            </div>
            <div class="zone-stats">
              <span class="zone-records">{{
                t("dns.zones.manager.recordsCount", { count: zone.rrsets?.length || 0 })
              }}</span>
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
              {{ t("dns.common.zones") }}
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
              {{ t("dns.zones.records.actions.addRecord") }}
            </button>
            <button class="btn btn-icon" :disabled="loading" @click="fetchRecords">
              <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
            </button>
          </div>
        </div>

        <div class="zone-details">
          <div class="detail-row">
            <span class="detail-label">{{ t("dns.zones.records.zoneType") }}</span>
            <span class="detail-value">{{ selectedZone.kind }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">{{ t("dns.zones.records.serial") }}</span>
            <span class="detail-value">{{ selectedZone.serial }}</span>
          </div>
          <div v-if="selectedZone.dnssec" class="detail-row">
            <span class="detail-label">{{ t("dns.zones.records.dnssec") }}</span>
            <span class="detail-value badge-success">{{ t("dns.common.enabled") }}</span>
          </div>
        </div>

        <div v-if="loading && records.length === 0" class="loading-state">
          <i class="pi pi-spin pi-spinner" />
          <span>{{ t("dns.zones.records.loadingRecords") }}</span>
        </div>

        <div v-else-if="records.length === 0" class="empty-state">
          <i class="pi pi-inbox" />
          <span>{{ t("dns.zones.records.emptyRecords") }}</span>
        </div>

        <div v-else class="records-table">
          <table>
            <thead>
              <tr>
                <th>{{ t("dns.common.type") }}</th>
                <th>{{ t("dns.common.name") }}</th>
                <th>{{ t("dns.common.content") }}</th>
                <th>{{ t("dns.common.ttl") }}</th>
                <th>{{ t("dns.common.actions") }}</th>
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
              {{ t("dns.zones.modal.zone.title") }}
            </h3>
            <button class="close-btn" @click="showCreateZoneModal = false">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="zone-name">{{ t("dns.zones.modal.zone.domainName") }}</label>
              <input
                id="zone-name"
                v-model="zoneForm.name"
                type="text"
                :placeholder="t('dns.zones.modal.zone.domainPlaceholder')"
              />
              <span class="hint">{{ t("dns.zones.modal.zone.domainHint") }}</span>
            </div>

            <div class="form-group">
              <label for="zone-type">{{ t("dns.zones.modal.zone.zoneType") }}</label>
              <select id="zone-type" v-model="zoneForm.kind">
                <option value="Native">{{ t("dns.zones.zoneKinds.native") }}</option>
                <option value="Master">{{ t("dns.zones.zoneKinds.master") }}</option>
                <option value="Slave">{{ t("dns.zones.zoneKinds.slave") }}</option>
              </select>
            </div>

            <div class="form-group">
              <label for="zone-nameservers">{{ t("dns.zones.modal.zone.nameservers") }}</label>
              <textarea
                id="zone-nameservers"
                v-model="zoneForm.nameservers"
                rows="3"
                :placeholder="t('dns.zones.modal.zone.nameserversPlaceholder')"
              />
              <span class="hint">{{ t("dns.zones.modal.zone.nameserversHint") }}</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="saving" @click="showCreateZoneModal = false">
              {{ t("dns.common.cancel") }}
            </button>
            <button class="btn btn-primary" :disabled="saving || !zoneForm.name" @click="handleCreateZone">
              <i v-if="saving" class="pi pi-spin pi-spinner" />
              {{ saving ? t("dns.zones.modal.zone.creating") : t("dns.zones.modal.zone.create") }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showCreateRecordModal || showEditRecordModal" class="modal-overlay" @click.self="closeRecordModals">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-file-edit" />
              {{ showEditRecordModal ? t("dns.zones.modal.record.editTitle") : t("dns.zones.modal.record.addTitle") }}
            </h3>
            <button class="close-btn" @click="closeRecordModals">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="record-type">{{ t("dns.common.type") }}</label>
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
              <label for="record-name">{{ t("dns.common.name") }}</label>
              <input
                id="record-name"
                v-model="recordForm.name"
                type="text"
                :placeholder="selectedZone?.name"
                :disabled="showEditRecordModal"
              />
              <span class="hint">{{ t("dns.zones.modal.record.nameHint") }}</span>
            </div>

            <div class="form-group">
              <label for="record-content">{{ t("dns.common.content") }}</label>
              <textarea
                id="record-content"
                v-model="recordForm.content"
                rows="2"
                :placeholder="t('dns.zones.modal.record.contentPlaceholder')"
              />
              <span class="hint">{{ t("dns.zones.modal.record.contentHint") }}</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="record-ttl">{{ t("dns.zones.modal.record.ttlSeconds") }}</label>
                <input
                  id="record-ttl"
                  v-model.number="recordForm.ttl"
                  type="number"
                  min="60"
                  max="604800"
                  :placeholder="t('dns.zones.modal.record.ttlPlaceholder')"
                />
                <span class="hint">{{ t("dns.zones.modal.record.ttlHint") }}</span>
              </div>

              <div v-if="recordForm.type === 'MX' || recordForm.type === 'SRV'" class="form-group">
                <label for="record-priority">{{ t("dns.common.priority") }}</label>
                <input
                  id="record-priority"
                  v-model.number="recordForm.priority"
                  type="number"
                  :placeholder="t('dns.zones.modal.record.priorityPlaceholder')"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="saving" @click="closeRecordModals">
              {{ t("dns.common.cancel") }}
            </button>
            <button class="btn btn-primary" :disabled="saving || !isRecordFormValid" @click="handleSaveRecord">
              <i v-if="saving" class="pi pi-spin pi-spinner" />
              {{
                saving ? t("dns.common.saving") : showEditRecordModal ? t("dns.common.update") : t("dns.common.create")
              }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-cog" />
              {{ t("dns.zones.modal.settings.title") }}
            </h3>
            <button class="close-btn" @click="showSettingsModal = false">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="settings-section">
              <h4>{{ t("dns.zones.modal.settings.serverInformation") }}</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">{{ t("dns.common.status") }}</span>
                  <span class="info-value">
                    <span class="status-badge online">{{ t("dns.zones.modal.settings.running") }}</span>
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t("dns.zones.modal.settings.listenAddress") }}</span>
                  <span class="info-value">0.0.0.0:53</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t("dns.zones.modal.settings.apiPort") }}</span>
                  <span class="info-value">8081</span>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h4>{{ t("dns.common.actions") }}</h4>
              <div class="action-buttons">
                <button class="btn btn-secondary" @click="handleRestartService">
                  <i class="pi pi-refresh" />
                  {{ t("dns.zones.modal.settings.restartService") }}
                </button>
                <button class="btn btn-danger" @click="handleDisableService">
                  <i class="pi pi-power-off" />
                  {{ t("dns.zones.modal.settings.disableDnsServer") }}
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showSettingsModal = false">{{ t("dns.common.close") }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmModal
      :visible="showDeleteModal"
      :title="t('dns.zones.confirm.deleteRecord.title')"
      :message="
        t('dns.zones.confirm.deleteRecord.message', {
          type: recordToDelete?.type || '',
          name: recordToDelete?.name || '',
        })
      "
      :warning="t('dns.zones.confirm.deleteRecord.warning')"
      variant="danger"
      :confirm-text="t('dns.common.delete')"
      :loading="deleting"
      @confirm="handleDeleteRecord"
      @cancel="showDeleteModal = false"
    />

    <ConfirmModal
      :visible="showDeleteZoneModal"
      :title="t('dns.zones.confirm.deleteZone.title')"
      :message="t('dns.zones.confirm.deleteZone.message', { name: zoneToDelete?.name || '' })"
      :warning="t('dns.zones.confirm.deleteZone.warning')"
      variant="danger"
      :confirm-text="t('dns.zones.confirm.deleteZone.confirm')"
      :loading="deleting"
      @confirm="handleDeleteZone"
      @cancel="showDeleteZoneModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useNotificationsStore } from "@/stores/notifications";
import ConfirmModal from "@/components/ConfirmModal.vue";
import { powerDnsApi, type PowerDNSZone, type PowerDNSRRSet } from "@/services/api";

const notifications = useNotificationsStore();
const { t } = useI18n();

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
    notifications.success(
      t("dns.zones.notifications.serverEnabledTitle"),
      t("dns.zones.notifications.serverEnabledDesc"),
    );
    await fetchZones();
  } catch (e: any) {
    notifications.error(
      t("dns.zones.notifications.enableFailedTitle"),
      e.response?.data?.error || e.message || t("dns.zones.notifications.enableFailedDesc"),
    );
  } finally {
    loading.value = false;
  }
};

const handleRestartService = async () => {
  loading.value = true;
  try {
    await powerDnsApi.restartService();
    notifications.success(
      t("dns.zones.notifications.serviceRestartedTitle"),
      t("dns.zones.notifications.serviceRestartedDesc"),
    );
  } catch (e: any) {
    notifications.error(
      t("dns.zones.notifications.restartFailedTitle"),
      e.response?.data?.error || t("dns.zones.notifications.restartFailedDesc"),
    );
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
    notifications.success(
      t("dns.zones.notifications.serverDisabledTitle"),
      t("dns.zones.notifications.serverDisabledDesc"),
    );
  } catch (e: any) {
    notifications.error(
      t("dns.zones.notifications.disableFailedTitle"),
      e.response?.data?.error || t("dns.zones.notifications.disableFailedDesc"),
    );
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
    notifications.error(
      t("dns.zones.notifications.loadFailedTitle"),
      e.response?.data?.error || e.message || t("dns.zones.notifications.loadZonesFailedDesc"),
    );
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
    notifications.error(
      t("dns.zones.notifications.loadFailedTitle"),
      e.response?.data?.error || e.message || t("dns.zones.notifications.loadRecordsFailedDesc"),
    );
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

    notifications.success(
      t("dns.zones.notifications.zoneCreatedTitle"),
      t("dns.zones.notifications.zoneCreatedDesc", { name: zoneForm.value.name }),
    );
    showCreateZoneModal.value = false;
    Object.assign(zoneForm.value, initialZoneFormState);
    await fetchZones();
  } catch (e: any) {
    notifications.error(
      t("dns.zones.notifications.createFailedTitle"),
      e.response?.data?.error || e.message || t("dns.zones.notifications.createZoneFailedDesc"),
    );
  } finally {
    saving.value = false;
  }
};

const handleDeleteZone = async () => {
  if (!zoneToDelete.value) return;

  deleting.value = true;
  try {
    await powerDnsApi.deleteZone(zoneToDelete.value.id);
    notifications.success(
      t("dns.zones.notifications.zoneDeletedTitle"),
      t("dns.zones.notifications.zoneDeletedDesc", { name: zoneToDelete.value.name }),
    );
    await fetchZones();
  } catch (e: any) {
    notifications.error(
      t("dns.zones.notifications.deleteFailedTitle"),
      e.response?.data?.error || t("dns.zones.notifications.deleteZoneFailedDesc"),
    );
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

    notifications.success(
      showEditRecordModal.value
        ? t("dns.zones.notifications.recordUpdatedTitle")
        : t("dns.zones.notifications.recordCreatedTitle"),
      t("dns.zones.notifications.recordSavedDesc"),
    );
    closeRecordModals();
    await fetchRecords();
  } catch (e: any) {
    notifications.error(
      t("dns.zones.notifications.saveFailedTitle"),
      e.response?.data?.error || e.message || t("dns.zones.notifications.saveRecordFailedDesc"),
    );
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
    notifications.success(
      t("dns.zones.notifications.recordDeletedTitle"),
      t("dns.zones.notifications.recordDeletedDesc"),
    );
    await fetchRecords();
  } catch (e: any) {
    notifications.error(
      t("dns.zones.notifications.deleteFailedTitle"),
      e.response?.data?.error || t("dns.zones.notifications.deleteRecordFailedDesc"),
    );
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
