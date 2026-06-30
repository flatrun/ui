<template>
  <div class="marketplace-view">
    <div class="marketplace-banner">
      <div class="banner-content">
        <h2>App Marketplace</h2>
        <p>Deploy curated apps and stacks to Flatrun in one click</p>
      </div>
      <Icon name="layout-grid" :size="40" class="banner-decoration" />
    </div>

    <div class="view-header">
      <div class="search-box">
        <Icon name="search" :size="16" class="search-icon" />
        <input v-model="searchQuery" type="text" placeholder="Search apps..." class="search-input" />
      </div>
      <div class="category-filters">
        <button class="category-btn" :class="{ active: selectedCategory === 'all' }" @click="selectedCategory = 'all'">
          All
        </button>
        <button
          v-for="cat in categories"
          :key="cat.slug"
          class="category-btn"
          :class="{ active: selectedCategory === cat.slug }"
          :style="selectedCategory === cat.slug && cat.color ? { background: cat.color, borderColor: cat.color } : {}"
          @click="selectedCategory = cat.slug"
        >
          {{ cat.name }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="apps-grid">
      <div v-for="n in 6" :key="n" class="app-card app-card--skeleton">
        <div class="skeleton-icon" />
        <div class="skeleton-line skeleton-line--title" />
        <div class="skeleton-line" />
        <div class="skeleton-line skeleton-line--short" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="state-panel">
      <div class="state-art state-art--error">
        <Icon name="cloud-off" :size="40" />
      </div>
      <h3>Couldn't reach the marketplace</h3>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="load">
        <Icon name="refresh-cw" :size="16" />
        Retry
      </button>
    </div>

    <!-- Empty (no matches) -->
    <div v-else-if="filteredApps.length === 0" class="state-panel">
      <div class="state-art state-art--empty">
        <Icon name="search-x" :size="40" />
      </div>
      <h3>No apps match your search</h3>
      <p>Try a different term or clear the category filter.</p>
    </div>

    <!-- Grid -->
    <div v-else class="apps-grid">
      <div v-for="app in filteredApps" :key="app.slug" class="app-card">
        <div class="app-card-top">
          <div
            class="app-logo"
            :style="{ background: tint(app), color: app.category?.color || 'var(--color-primary-600)' }"
          >
            <img v-if="app.logo" :src="app.logo" :alt="app.name" @error="onLogoError(app.slug)" />
            <Icon v-else name="package" :size="22" />
          </div>
          <span v-if="app.is_official" class="badge badge--official">
            <Icon name="badge-check" :size="12" />
            Official
          </span>
          <span v-else-if="app.is_verified" class="badge badge--verified">
            <Icon name="shield-check" :size="12" />
            Verified
          </span>
          <Icon v-if="app.is_featured" name="star" :size="14" class="featured-star" />
        </div>

        <h3 class="app-name">{{ app.name }}</h3>
        <p class="app-description">{{ app.description }}</p>

        <div class="app-meta">
          <span class="meta-item"><Icon name="download" :size="13" /> {{ formatCount(app.downloads_count) }}</span>
          <span class="meta-item"><Icon name="star" :size="13" /> {{ formatCount(app.stars_count) }}</span>
          <span v-if="app.latest_version" class="app-version">v{{ app.latest_version }}</span>
        </div>

        <div class="app-card-footer">
          <button v-if="isInstalled(app)" class="btn btn-installed" @click="openDeployment(app)">
            <Icon name="check" :size="15" />
            Installed
          </button>
          <button v-else class="btn btn-primary" @click="openInstall(app)">
            <Icon name="download" :size="15" />
            Install
          </button>
        </div>
      </div>
    </div>

    <!-- Install modal -->
    <Teleport to="body">
      <div v-if="installTarget" class="modal-overlay" @click.self="closeInstall">
        <div class="install-modal">
          <div class="modal-header">
            <h3>Deploy {{ installTarget.name }}</h3>
            <button class="icon-btn" @click="closeInstall"><Icon name="x" :size="18" /></button>
          </div>
          <div class="modal-body">
            <p class="modal-note">
              This downloads the template and creates a new deployment. Pick a name (it must be unique).
            </p>
            <label class="field-label">Deployment name</label>
            <input v-model="installName" type="text" class="text-input" placeholder="my-app" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="installing" @click="closeInstall">Cancel</button>
            <button class="btn btn-primary" :disabled="installing || !installName.trim()" @click="confirmInstall">
              <Icon v-if="installing" name="loader-circle" spin :size="15" />
              <Icon v-else name="download" :size="15" />
              {{ installing ? "Deploying…" : "Deploy" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import { marketplaceApi, type MarketplaceTemplate, type MarketplaceCategory } from "@/services/marketplace";
import { deploymentsApi } from "@/services/api";
import { useDeploymentsStore } from "@/stores/deployments";
import { useNotificationsStore } from "@/stores/notifications";

const router = useRouter();
const deploymentsStore = useDeploymentsStore();
const notifications = useNotificationsStore();

const apps = ref<MarketplaceTemplate[]>([]);
const categories = ref<MarketplaceCategory[]>([]);
const loading = ref(true);
const error = ref("");
const searchQuery = ref("");
const selectedCategory = ref("all");
const brokenLogos = ref<Set<string>>(new Set());

const installTarget = ref<MarketplaceTemplate | null>(null);
const installName = ref("");
const installing = ref(false);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [tpl, cat] = await Promise.all([marketplaceApi.templates({ per_page: 60 }), marketplaceApi.categories()]);
    apps.value = tpl.data.data;
    categories.value = cat.data.data;
    if (!deploymentsStore.deployments.length) await deploymentsStore.fetchDeployments();
  } catch (e: any) {
    error.value = e?.message || "The marketplace service is unavailable.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);

// Matched by slug, since installing defaults the deployment name to the slug.
function isInstalled(app: MarketplaceTemplate): boolean {
  return deploymentsStore.deployments.some((d) => d.name === app.slug);
}

const filteredApps = computed(() => {
  let result = apps.value;
  if (selectedCategory.value !== "all") {
    result = result.filter((a) => a.category?.slug === selectedCategory.value);
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }
  return [...result].sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
});

function tint(app: MarketplaceTemplate): string {
  const c = app.category?.color;
  return c ? `${c}1a` : "var(--surface-sunken)";
}

function onLogoError(slug: string) {
  brokenLogos.value.add(slug);
  apps.value = apps.value.map((a) => (a.slug === slug ? { ...a, logo: null } : a));
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n ?? 0);
}

function openDeployment(app: MarketplaceTemplate) {
  router.push(`/deployments/${app.slug}`);
}

function openInstall(app: MarketplaceTemplate) {
  installTarget.value = app;
  installName.value = app.slug;
}

function closeInstall() {
  if (installing.value) return;
  installTarget.value = null;
  installName.value = "";
}

async function confirmInstall() {
  if (!installTarget.value) return;
  const app = installTarget.value;
  const name = installName.value.trim();
  installing.value = true;
  try {
    const payload = await marketplaceApi.download(app.slug);
    await deploymentsApi.create({ name, compose_content: payload.data.content });
    await deploymentsStore.fetchDeployments();
    notifications.success("Deployed", `${app.name} was deployed as "${name}".`);
    installTarget.value = null;
    router.push(`/deployments/${name}`);
  } catch (e: any) {
    notifications.error("Install failed", e?.response?.data?.error || e?.message || "Could not deploy the template.");
  } finally {
    installing.value = false;
  }
}
</script>

<style scoped>
.marketplace-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.marketplace-banner {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, #8b5cf6 100%);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.banner-content h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin: 0;
}

.banner-content p {
  font-size: var(--text-sm);
  opacity: 0.9;
  margin: 0;
}

.banner-decoration {
  opacity: 0.25;
}

.view-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-subtle);
}

.search-input {
  padding: var(--space-2) var(--space-3) var(--space-2) 2.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-md);
  width: 260px;
  background: var(--surface);
  color: var(--text);
}

.search-input::placeholder {
  color: var(--text-subtle);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.category-filters {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.category-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-base);
}

.category-btn:hover {
  color: var(--text);
}

.category-btn.active {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: white;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
  gap: var(--space-4);
}

.app-card {
  background: var(--surface-raised);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition: all var(--transition-base);
}

.app-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-300, var(--border));
}

.app-card-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.app-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.app-logo img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-xs);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
}

.badge--official {
  background: var(--color-info-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
}

.badge--verified {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.featured-star {
  color: var(--color-warning-500);
  margin-left: auto;
}

.app-name {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--text);
  margin: var(--space-1) 0 0 0;
}

.app-description {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.1em;
}

.app-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: auto;
  padding-top: var(--space-1);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.app-version {
  margin-left: auto;
  font-size: var(--text-xs);
  background: var(--surface-inset);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.app-card-footer {
  margin-top: var(--space-2);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  border: 1px solid transparent;
  width: 100%;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn-installed {
  background: var(--color-success-50);
  color: var(--color-success-700);
  border-color: var(--color-success-200, transparent);
}

.btn-installed:hover {
  background: var(--color-success-100, var(--color-success-50));
}

.btn-secondary {
  background: var(--surface-inset);
  color: var(--text);
  width: auto;
}

.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-12) var(--space-6);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.state-art {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-art--empty {
  background: var(--color-info-50, #eff6ff);
  color: var(--color-primary-500);
}

.state-art--error {
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-500, #ef4444);
}

.state-panel h3 {
  margin: 0;
  font-size: var(--text-xl);
  color: var(--text);
}

.state-panel p {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-md);
}

.state-panel .btn {
  width: auto;
  margin-top: var(--space-2);
}

/* Skeleton */
.app-card--skeleton {
  pointer-events: none;
}

.skeleton-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--surface-inset);
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-line {
  height: 0.7rem;
  border-radius: var(--radius-sm);
  background: var(--surface-inset);
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-line--title {
  width: 60%;
  height: 0.9rem;
}

.skeleton-line--short {
  width: 40%;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-icon,
  .skeleton-line {
    animation: none;
  }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.install-modal {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--text);
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
}

.modal-body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.modal-note {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.field-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text);
}

.text-input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-md);
  background: var(--surface);
  color: var(--text);
}

.text-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-subtle);
}
</style>
