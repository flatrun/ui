<template>
  <div class="workspace-view">
    <header class="page-head">
      <div>
        <h1>{{ workspace?.name ?? "Workspace" }}</h1>
        <p v-if="workspace" class="sub">
          {{ workspace.personal ? "Personal workspace" : "Shared workspace" }} · you are {{ workspace.role }}
        </p>
      </div>
    </header>

    <p v-if="!workspace" class="empty">Pick a workspace from the switcher at the top to manage its members.</p>

    <template v-else>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <section class="block">
        <div class="block-head">
          <h2>Members</h2>
          <span class="count">{{ members.length }}</span>
        </div>
        <ul class="list">
          <li v-for="m in members" :key="m.user_id" class="item">
            <span class="avatar" aria-hidden="true">{{ m.username.charAt(0).toUpperCase() }}</span>
            <span class="who">
              <strong>{{ m.username }}</strong>
              <small v-if="m.email">{{ m.email }}</small>
            </span>
            <select
              v-if="canManage"
              class="form-input role-select"
              :value="m.role"
              :aria-label="`Role of ${m.username}`"
              @change="setRole(m, ($event.target as HTMLSelectElement).value as WorkspaceRole)"
            >
              <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
            </select>
            <span v-else class="role">{{ m.role }}</span>
            <button
              v-if="canManage"
              type="button"
              class="icon-btn"
              :aria-label="`Remove ${m.username}`"
              title="Remove"
              @click="removeMember(m)"
            >
              <Icon name="x" :size="14" />
            </button>
          </li>
        </ul>
        <form v-if="canManage" class="add" @submit.prevent="addMember">
          <input v-model="newUser" class="form-input" placeholder="Username" aria-label="Username to add" />
          <select v-model="newUserRole" class="form-input" aria-label="Role for the new member">
            <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
          </select>
          <button type="submit" class="btn btn-secondary" :disabled="!newUser.trim()">Add member</button>
        </form>
      </section>

      <section class="block">
        <SecretsPanel :scope="`workspace:${workspace.slug}`" :can-write="canManage" />
      </section>

      <section class="block">
        <div class="block-head">
          <h2>Secret managers</h2>
        </div>
        <SecretConnections :can-write="canManage" />
      </section>

      <section v-if="canManage" class="block">
        <div class="block-head">
          <h2>Invitations</h2>
          <span class="count">{{ invitations.length }}</span>
        </div>
        <p class="hint">
          An invitation link works for one week. The person accepts it while signed in as the user or email you invite.
        </p>
        <ul v-if="invitations.length" class="list">
          <li v-for="inv in invitations" :key="inv.id" class="item">
            <Icon name="mail" :size="14" class="muted" />
            <span class="who">
              <strong>{{ inv.invitee }}</strong>
              <small>{{ inv.role }} · expires {{ formatDate(inv.expires_at) }}</small>
            </span>
            <button type="button" class="btn btn-secondary btn-sm" @click="revoke(inv)">Revoke</button>
          </li>
        </ul>
        <div v-if="inviteToken" class="token">
          <span>Share this code with {{ lastInvitee }}. It is shown once.</span>
          <code>{{ inviteToken }}</code>
          <button type="button" class="btn btn-secondary btn-sm" @click="copyToken">
            {{ copied ? "Copied" : "Copy" }}
          </button>
        </div>
        <form class="add" @submit.prevent="invite">
          <input v-model="invitee" class="form-input" placeholder="Username or email" aria-label="Who to invite" />
          <select v-model="inviteRole" class="form-input" aria-label="Role for the invitation">
            <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
          </select>
          <button type="submit" class="btn btn-primary" :disabled="!invitee.trim()">Invite</button>
        </form>
      </section>

      <section class="block">
        <div class="block-head">
          <h2>Join a workspace</h2>
        </div>
        <form class="add" @submit.prevent="accept">
          <input v-model="acceptToken" class="form-input" placeholder="Invitation code" aria-label="Invitation code" />
          <button type="submit" class="btn btn-secondary" :disabled="!acceptToken.trim()">Join</button>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import SecretsPanel from "@/components/secrets/SecretsPanel.vue";
import SecretConnections from "@/components/secrets/SecretConnections.vue";
import { computed, ref, watch } from "vue";
import Icon from "@/components/base/Icon.vue";
import { workspacesApi, type WorkspaceInvitation, type WorkspaceMember } from "@/services/api";
import { useWorkspaceStore } from "@/stores/workspace";
import type { WorkspaceRole } from "@/types";

const store = useWorkspaceStore();
const roles: WorkspaceRole[] = ["member", "admin", "owner"];

const members = ref<WorkspaceMember[]>([]);
const invitations = ref<WorkspaceInvitation[]>([]);
const error = ref("");
const newUser = ref("");
const newUserRole = ref<WorkspaceRole>("member");
const invitee = ref("");
const inviteRole = ref<WorkspaceRole>("member");
const inviteToken = ref("");
const lastInvitee = ref("");
const copied = ref(false);
const acceptToken = ref("");

const workspace = computed(() => store.current);
const canManage = computed(() => workspace.value?.role === "owner" || workspace.value?.role === "admin");

function message(e: any, fallback: string) {
  return e?.response?.data?.error || fallback;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function load() {
  const slug = workspace.value?.slug;
  members.value = [];
  invitations.value = [];
  inviteToken.value = "";
  if (!slug) return;
  error.value = "";
  try {
    members.value = (await workspacesApi.members(slug)).data.items ?? [];
    if (canManage.value) invitations.value = (await workspacesApi.invitations(slug)).data.items ?? [];
  } catch (e) {
    error.value = message(e, "Could not load the workspace");
  }
}

async function run(action: () => Promise<unknown>, fallback: string) {
  error.value = "";
  try {
    await action();
    await load();
    return true;
  } catch (e) {
    error.value = message(e, fallback);
    return false;
  }
}

async function addMember() {
  const slug = workspace.value!.slug;
  if (
    await run(() => workspacesApi.addMember(slug, newUser.value.trim(), newUserRole.value), "Could not add the member")
  ) {
    newUser.value = "";
  }
}

function setRole(m: WorkspaceMember, role: WorkspaceRole) {
  const slug = workspace.value!.slug;
  return run(() => workspacesApi.setRole(slug, m.user_id, role), "Could not change the role");
}

function removeMember(m: WorkspaceMember) {
  const slug = workspace.value!.slug;
  return run(() => workspacesApi.removeMember(slug, m.user_id), "Could not remove the member");
}

async function invite() {
  const slug = workspace.value!.slug;
  error.value = "";
  try {
    const res = await workspacesApi.invite(slug, invitee.value.trim(), inviteRole.value);
    lastInvitee.value = res.data.invitation.invitee;
    invitee.value = "";
    invitations.value = (await workspacesApi.invitations(slug)).data.items ?? [];
    inviteToken.value = res.data.token;
    copied.value = false;
  } catch (e) {
    error.value = message(e, "Could not create the invitation");
  }
}

function revoke(inv: WorkspaceInvitation) {
  const slug = workspace.value!.slug;
  return run(() => workspacesApi.revokeInvitation(slug, inv.id), "Could not revoke the invitation");
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(inviteToken.value);
    copied.value = true;
  } catch {
    copied.value = false;
  }
}

async function accept() {
  error.value = "";
  try {
    await workspacesApi.accept(acceptToken.value.trim());
    acceptToken.value = "";
    await store.load();
  } catch (e) {
    error.value = message(e, "Could not join the workspace");
  }
}

watch(() => workspace.value?.slug, load, { immediate: true });
</script>

<style scoped>
.workspace-view {
  display: flex;
  max-width: 760px;
  flex-direction: column;
  gap: var(--space-5);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}

.page-head h1 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.sub,
.hint {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.hint {
  margin: 0 0 var(--space-3);
}

.empty {
  color: var(--text-muted);
}

.error {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--status-failed);
  border-radius: var(--radius-sm);
  color: var(--status-failed);
  font-size: var(--text-sm);
}

.block {
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.block-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.block-head h2 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.count {
  color: var(--text-subtle);
  font-size: var(--text-sm);
}

.list {
  margin: 0 0 var(--space-3);
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-subtle);
}

.item:first-child {
  border-top: 0;
}

.avatar {
  display: inline-grid;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  place-items: center;
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.who {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.who small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.role {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.role-select {
  width: auto;
}

.muted {
  color: var(--text-muted);
}

.icon-btn {
  display: inline-grid;
  width: var(--control-h-sm);
  height: var(--control-h-sm);
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
}

.icon-btn:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.add {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.add input {
  min-width: 180px;
  flex: 1;
}

.add select {
  width: auto;
}

.token {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.token code {
  overflow-wrap: anywhere;
  font-family: var(--font-mono);
}
</style>
