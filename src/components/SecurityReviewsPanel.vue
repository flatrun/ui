<template>
  <BaseCard title="Security reviews" icon="shield-check">
    <template #actions>
      <BaseButton size="sm" icon="refresh-cw" :loading="busy" @click="refresh">Refresh</BaseButton>
    </template>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading">Loading profile and review coverage...</p>
    <template v-else-if="state">
      <div class="status-row">
        <span class="status">Profile: {{ state.status }}</span>
        <span v-if="state.approval">Approved {{ new Date(state.approval.approved_at).toLocaleString() }}</span>
      </div>
      <p class="notice">Reviews report evidence and coverage. Missing evidence does not mean an application is safe.</p>
      <ul v-if="warnings.length">
        <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
      </ul>
      <p v-if="!state.profile">
        No security profile is configured. Create a proposal to define the approved commands and scope.
      </p>
      <div class="actions">
        <BaseButton v-if="canWrite && !state.profile" :disabled="busy" @click="openEditor">Create profile</BaseButton>
        <BaseButton
          v-if="canWrite && assistantAvailable && auth.hasPermission('deployments:read')"
          :disabled="busy"
          @click="generate"
        >
          Create with agent
        </BaseButton>
        <BaseButton v-if="canWrite && auth.hasPermission('templates:read')" :disabled="busy" @click="importTemplate">
          Check source template for profile
        </BaseButton>
        <BaseButton v-if="canWrite && state.profile" :disabled="busy" @click="openEditor">Edit profile</BaseButton>
        <BaseButton v-if="canApprove && canWrite && state.profile" :disabled="busy" @click="proposeCurrent"
          >Review approval</BaseButton
        >
      </div>
      <div v-if="canApprove" class="actions">
        <BaseButton v-for="ready in readyProposals" :key="ready.id" :disabled="busy" @click="proposal = ready"
          >Review {{ ready.source }} proposal {{ ready.id.slice(0, 8) }}</BaseButton
        >
      </div>
      <p v-if="reports.some((report) => report.delivery_status === 'failed')" class="error">
        Monitoring finding: off-host delivery failed.
      </p>
      <p
        v-if="findings.some((finding) => finding.concern === 'monitoring' && finding.status !== 'closed')"
        class="error"
      >
        Monitoring findings require review. Collection or evidence may be incomplete.
      </p>
      <details v-if="state.profile">
        <summary>Profile and approved scope</summary>
        <pre>{{ pretty(state.profile) }}</pre>
      </details>
      <div v-if="canRun && state.status === 'approved'" class="actions">
        <BaseField label="Run mode">
          <BaseSelect v-model="mode"
            ><option value="incremental">Incremental</option>
            <option value="retrospective">Retrospective</option>
            <option value="full">Full</option></BaseSelect
          >
        </BaseField>
        <BaseButton :disabled="busy" @click="run">Run review</BaseButton>
      </div>
      <p>Schedule targets are UTC. Achievable intervals depend on measured capacity.</p>
      <div class="table-scroll">
        <table>
          <caption>
            Required coverage
          </caption>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Service</th>
              <th>Status</th>
              <th>Evidence gap</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in coverage" :key="index">
              <td>{{ row.concern }}</td>
              <td>{{ row.service || "Unavailable" }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template v-if="canReadReports">
        <h4>Unresolved findings</h4>
        <p v-if="!findings.length">No unresolved findings are recorded. Unknown coverage remains unresolved.</p>
        <div v-for="finding in findings" :key="finding.id" class="finding">
          <p>
            {{ finding.classification }}: {{ finding.concern }} ({{ finding.signal }}). Observed
            {{ finding.occurrences }} time(s).
          </p>
          <BaseButton v-if="canReadEvidence" size="sm" @click="readFinding(finding)"
            >Read restricted evidence</BaseButton
          >
          <BaseButton
            v-if="canApprove"
            size="sm"
            @click="
              closingFinding = finding;
              closureReason = '';
            "
            >Close with reason</BaseButton
          >
        </div>
        <BaseButton v-if="moreFindings" :disabled="busy" @click="loadMoreFindings">Load more findings</BaseButton>
        <h4>Scheduled and manual runs</h4>
        <p v-if="!reports.length">No reviews have run. An approved profile is required before collection can start.</p>
        <div v-else class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Requested</th>
                <th>Mode</th>
                <th>Collection</th>
                <th>Model</th>
                <th>Findings</th>
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="report in reports" :key="report.id">
                <td>{{ new Date(report.requested_at).toLocaleString() }}</td>
                <td>{{ report.mode }}</td>
                <td>{{ report.status }}</td>
                <td>{{ report.model_status }}</td>
                <td>{{ report.findings.length }}</td>
                <td><BaseButton size="sm" @click="selectedReport = report">View report</BaseButton></td>
              </tr>
            </tbody>
          </table>
        </div>
        <BaseButton v-if="moreReports" :disabled="busy" @click="loadMoreReports">Load more runs</BaseButton>
      </template>
    </template>
  </BaseCard>
  <BaseModal :visible="editing" title="Edit security profile" size="xl" @close="editing = false">
    <BaseField label="Profile JSON" hint="Saving creates a draft. Approval is a separate action."
      ><BaseTextarea v-model="editor" :rows="22"
    /></BaseField>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template #footer><BaseButton :disabled="busy" @click="save">Save draft</BaseButton></template>
  </BaseModal>
  <BaseModal :visible="Boolean(proposal)" title="Review security proposal" size="xl" @close="proposal = null">
    <template v-if="proposal">
      <p v-if="proposal.status !== 'ready'">Proposal status: {{ proposal.status }}. {{ proposal.error }}</p>
      <p>
        Source: {{ proposal.source }}. Approval authorizes the exact commands, images, scope, policy, schedule and
        budget below.
      </p>
      <p>Deployment revision: {{ proposal.deployment_revision }}</p>
      <details>
        <summary>Resolved services and retained mounts</summary>
        <pre>{{ pretty(resolvedScope) }}</pre>
      </details>
      <p v-if="proposal.deployment_revision !== revision" class="error">
        Deployment scope changed. Refresh the proposal before approval.
      </p>
      <div v-if="proposal.status === 'ready'" class="comparison">
        <div>
          <h4>Current profile</h4>
          <pre>{{ pretty(state?.profile) }}</pre>
        </div>
        <div>
          <h4>Proposed profile</h4>
          <pre>{{ pretty(proposal.profile) }}</pre>
        </div>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </template>
    <template #footer
      ><BaseButton
        v-if="canApprove"
        variant="primary"
        :disabled="busy || proposal?.status !== 'ready' || proposal?.deployment_revision !== revision"
        @click="approve"
        >Approve exact revision</BaseButton
      >
      <p v-else>Owner approval is required.</p></template
    >
  </BaseModal>
  <BaseModal :visible="Boolean(closingFinding)" title="Close security finding" @close="closingFinding = null">
    <p>Closure records an owner decision. It does not change the application or suppress a new observation.</p>
    <BaseField label="Reason"><BaseTextarea v-model="closureReason" :rows="4" /></BaseField>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template #footer
      ><BaseButton :disabled="busy || !closureReason.trim()" @click="closeFinding">Record closure</BaseButton></template
    >
  </BaseModal>
  <BaseModal
    :visible="Boolean(selectedReport)"
    title="Security report"
    size="xl"
    @close="
      selectedReport = null;
      evidence = null;
    "
  >
    <template v-if="selectedReport">
      <p v-if="selectedReport.delivery_status === 'failed'" class="error">
        Monitoring finding: off-host delivery failed.
      </p>
      <BaseButton v-if="canApprove" :disabled="busy" @click="toggleHold">{{
        selectedReport.hold ? "Release incident hold" : "Place incident hold"
      }}</BaseButton>
      <p v-if="selectedReport.model_assessment">{{ selectedReport.model_assessment.summary }}</p>
      <p>
        Collection: {{ selectedReport.status }}. Model: {{ selectedReport.model_status }}. Off-host delivery:
        {{ selectedReport.delivery_status }}.
      </p>
      <ul>
        <li v-for="limitation in selectedReport.limitations" :key="limitation">{{ limitation }}</li>
      </ul>
      <p v-if="!selectedReport.findings.length">
        No findings were recorded in the collected evidence. Unknown coverage remains unresolved.
      </p>
      <div v-for="finding in selectedReport.findings" :key="finding.id" class="finding">
        <p>{{ finding.classification }}: {{ finding.concern }} ({{ finding.signal }})</p>
        <BaseButton v-if="canReadEvidence" size="sm" @click="loadEvidence(finding.evidence_id)"
          >Read restricted evidence</BaseButton
        >
      </div>
      <pre v-if="evidence">{{ pretty(evidence) }}</pre>
      <details>
        <summary>Coverage details</summary>
        <pre>{{ pretty(selectedReport.coverage) }}</pre>
      </details>
    </template>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import BaseCard from "./base/BaseCard.vue";
import BaseButton from "./base/BaseButton.vue";
import BaseModal from "./base/BaseModal.vue";
import BaseField from "./base/BaseField.vue";
import BaseSelect from "./base/BaseSelect.vue";
import BaseTextarea from "./base/BaseTextarea.vue";
import { useAuthStore } from "@/stores/auth";
import {
  securityReviewsApi,
  type ProfileState,
  type SecurityProfile,
  type SecurityProposal,
  type SecurityReport,
  type CoverageRow,
  type SecurityFinding,
} from "@/services/securityReviews";

const props = defineProps<{ name: string; accessKey?: string }>();
const auth = useAuthStore();
const state = ref<ProfileState | null>(null);
const suggestedProfile = ref<SecurityProfile | null>(null);
const revision = ref("");
const resolvedScope = ref<unknown[]>([]);
const reports = ref<SecurityReport[]>([]);
const moreReports = ref(false);
const readyProposals = ref<SecurityProposal[]>([]);
const assistantAvailable = ref(false);
const findings = ref<SecurityFinding[]>([]);
const moreFindings = ref(false);
const closingFinding = ref<SecurityFinding | null>(null);
const closureReason = ref("");
const discoveryCoverage = ref<CoverageRow[]>([]);
const warnings = ref<string[]>([]);
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const mode = ref("incremental");
const proposal = ref<SecurityProposal | null>(null);
let proposalTimer: ReturnType<typeof setTimeout> | undefined;
const selectedReport = ref<SecurityReport | null>(null);
const evidence = ref<unknown>(null);
const editing = ref(false);
const editor = ref("");
const scope = computed(() => props.accessKey || props.name);
const canWrite = computed(
  () => auth.hasPermission("security_profiles:write") && auth.canAccessDeployment(scope.value, "write"),
);
const canApprove = computed(
  () => auth.hasPermission("security_profiles:approve") && auth.canAccessDeployment(scope.value, "admin"),
);
const canReadReports = computed(() => auth.hasPermission("security_reviews:read"));
const canRun = computed(
  () =>
    canReadReports.value &&
    auth.hasPermission("security_reviews:run") &&
    auth.canAccessDeployment(scope.value, "write"),
);
const canReadEvidence = computed(() => canReadReports.value && auth.hasPermission("security_evidence:read"));
const coverage = computed(() =>
  reports.value[0]?.coverage?.length ? reports.value[0].coverage : discoveryCoverage.value,
);
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
function message(e: unknown) {
  return (
    (e as { response?: { data?: { error?: string } } }).response?.data?.error ||
    (e instanceof Error ? e.message : "Security operation failed")
  );
}
async function action(fn: () => Promise<void>) {
  busy.value = true;
  error.value = "";
  try {
    await fn();
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
async function refresh() {
  await action(async () => {
    const result = await securityReviewsApi.profile(props.name);
    state.value = result.data.state;
    readyProposals.value = result.data.ready_proposals || [];
    assistantAvailable.value = result.data.assistant_available === true;
    suggestedProfile.value = result.data.suggested_profile;
    revision.value = result.data.discovery.revision;
    resolvedScope.value = result.data.discovery.services || [];
    discoveryCoverage.value = result.data.discovery.coverage;
    warnings.value = result.data.warnings;
    if (canReadReports.value) {
      reports.value = (await securityReviewsApi.reports(props.name)).data.reports;
      moreReports.value = reports.value.length === 20;
      findings.value = (await securityReviewsApi.findings(props.name)).data.findings;
      moreFindings.value = findings.value.length === 100;
    }
  });
  loading.value = false;
}
function openEditor() {
  editor.value = pretty(state.value?.profile || suggestedProfile.value);
  editing.value = true;
}
async function save() {
  await action(async () => {
    await securityReviewsApi.save(props.name, state.value?.revision || "", JSON.parse(editor.value) as SecurityProfile);
    editing.value = false;
  });
  if (!error.value) await refresh();
}
async function generate() {
  await action(async () => {
    proposal.value = (await securityReviewsApi.generate(props.name, state.value?.revision || "")).data.proposal;
    if (proposal.value.status === "queued") pollProposal(proposal.value.id, props.name);
  });
}
function pollProposal(id: string, name: string) {
  proposalTimer = setTimeout(async () => {
    if (proposal.value?.id !== id || props.name !== name) return;
    try {
      const next = (await securityReviewsApi.proposal(name, id)).data.proposal;
      if (proposal.value?.id !== id || props.name !== name) return;
      proposal.value = next;
      if (next.status === "queued" || next.status === "running") pollProposal(id, name);
    } catch (e) {
      error.value = message(e);
    }
  }, 1000);
}
onUnmounted(() => {
  clearTimeout(proposalTimer);
  proposal.value = null;
});
async function importTemplate() {
  await action(async () => {
    proposal.value = (await securityReviewsApi.import(props.name, state.value?.revision || "")).data.proposal;
  });
}
async function proposeCurrent() {
  if (!state.value?.profile) return;
  await action(async () => {
    proposal.value = (
      await securityReviewsApi.propose(props.name, state.value!.revision, state.value!.profile!)
    ).data.proposal;
  });
}
async function approve() {
  if (!proposal.value) return;
  await action(async () => {
    await securityReviewsApi.approve(props.name, proposal.value!);
    proposal.value = null;
  });
  if (!error.value) await refresh();
}
async function run() {
  if (!state.value) return;
  await action(async () => {
    await securityReviewsApi.run(props.name, mode.value, state.value!.revision, revision.value);
  });
  if (!error.value) await refresh();
}
async function loadEvidence(id: string) {
  if (!selectedReport.value) return;
  await action(async () => {
    evidence.value = (await securityReviewsApi.evidence(props.name, selectedReport.value!.id, id)).data.evidence;
  });
}
async function toggleHold() {
  if (!selectedReport.value) return;
  await action(async () => {
    const next = !selectedReport.value!.hold;
    await securityReviewsApi.hold(props.name, selectedReport.value!.id, next);
    selectedReport.value!.hold = next;
  });
}
async function loadMoreReports() {
  await action(async () => {
    const next = (await securityReviewsApi.reports(props.name, reports.value.length)).data.reports;
    reports.value.push(...next);
    moreReports.value = next.length === 20;
  });
}
async function loadMoreFindings() {
  await action(async () => {
    const next = (await securityReviewsApi.findings(props.name, findings.value.length)).data.findings;
    findings.value.push(...next);
    moreFindings.value = next.length === 100;
  });
}
async function closeFinding() {
  if (!closingFinding.value) return;
  await action(async () => {
    await securityReviewsApi.closeFinding(props.name, closingFinding.value!.id, closureReason.value);
    closingFinding.value = null;
  });
  if (!error.value) await refresh();
}
async function readFinding(finding: SecurityFinding) {
  await action(async () => {
    selectedReport.value = (await securityReviewsApi.report(props.name, finding.run_id)).data.report;
    evidence.value = (await securityReviewsApi.evidence(props.name, finding.run_id, finding.evidence_id)).data.evidence;
  });
}
watch(
  () => props.name,
  () => {
    state.value = null;
    resolvedScope.value = [];
    proposal.value = null;
    selectedReport.value = null;
    evidence.value = null;
    reports.value = [];
    readyProposals.value = [];
    moreReports.value = false;
    assistantAvailable.value = false;
    findings.value = [];
    moreFindings.value = false;
    closingFinding.value = null;
    suggestedProfile.value = null;
    loading.value = true;
    void refresh();
  },
  { immediate: true },
);
</script>

<style scoped>
p,
li {
  color: var(--text-muted);
}
.status-row,
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.status,
.notice {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}
.error {
  color: var(--color-danger-700);
}
.table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text);
}
th,
td {
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
caption {
  text-align: left;
  font-weight: var(--font-semibold);
  padding: var(--space-3) 0;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  padding: var(--space-3);
  background: var(--surface-sunken);
  color: var(--text);
  max-height: 60vh;
  overflow: auto;
}
.comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.comparison > div {
  min-width: 0;
}
.finding {
  padding: var(--space-3);
  border-bottom: 1px solid var(--border);
}
@media (max-width: 640px) {
  .comparison {
    grid-template-columns: 1fr;
  }
  .actions :deep(button) {
    width: 100%;
  }
}
</style>
