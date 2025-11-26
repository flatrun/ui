<template>
  <div class="marketplace-view">
    <div class="view-header">
      <div class="header-left">
        <div class="search-box">
          <i class="pi pi-search" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search apps..."
            class="search-input"
          />
        </div>
        <div class="category-filters">
          <button
            v-for="cat in categories"
            :key="cat.value"
            class="category-btn"
            :class="{ active: selectedCategory === cat.value }"
            @click="selectedCategory = cat.value"
          >
            <i :class="cat.icon" />
            {{ cat.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="marketplace-banner">
      <div class="banner-content">
        <h2>App Marketplace</h2>
        <p>Extend Flatrun with powerful apps and integrations</p>
      </div>
      <div class="banner-decoration">
        <i class="pi pi-shopping-bag" />
      </div>
    </div>

    <div class="apps-grid">
      <div v-for="app in filteredApps" :key="app.id" class="app-card">
        <div class="app-card-header">
          <div class="app-icon" :class="app.category">
            <i :class="app.icon" />
          </div>
          <div v-if="app.featured" class="featured-badge">
            <i class="pi pi-star-fill" />
            Featured
          </div>
        </div>
        <div class="app-card-body">
          <h3 class="app-name">
            {{ app.name }}
          </h3>
          <p class="app-description">
            {{ app.description }}
          </p>
          <div class="app-meta">
            <span class="app-author">
              <i class="pi pi-user" />
              {{ app.author }}
            </span>
            <span class="app-version">v{{ app.version }}</span>
          </div>
          <div class="app-tags">
            <span v-for="tag in app.tags" :key="tag" class="app-tag">
              {{ tag }}
            </span>
          </div>
        </div>
        <div class="app-card-footer">
          <button class="btn btn-primary" :disabled="app.installed">
            <i :class="app.installed ? 'pi pi-check' : 'pi pi-download'" />
            {{ app.installed ? "Installed" : "Install" }}
          </button>
          <button class="btn btn-secondary">
            <i class="pi pi-info-circle" />
            Details
          </button>
        </div>
      </div>
    </div>

    <div v-if="filteredApps.length === 0" class="empty-state">
      <i class="pi pi-search" />
      <h3>No Apps Found</h3>
      <p>Try adjusting your search or filters.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface MarketplaceApp {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  icon: string;
  category: string;
  tags: string[];
  featured: boolean;
  installed: boolean;
}

const searchQuery = ref("");
const selectedCategory = ref("all");

const categories = [
  { value: "all", label: "All", icon: "pi pi-th-large" },
  { value: "cms", label: "CMS", icon: "pi pi-globe" },
  { value: "database", label: "Database", icon: "pi pi-database" },
  { value: "email", label: "Email", icon: "pi pi-envelope" },
  { value: "security", label: "Security", icon: "pi pi-shield" },
  { value: "backup", label: "Backup", icon: "pi pi-save" },
  { value: "monitoring", label: "Monitoring", icon: "pi pi-chart-line" },
];

const apps = ref<MarketplaceApp[]>([
  {
    id: "wordpress-toolkit",
    name: "WordPress Toolkit",
    description:
      "Complete WordPress management: one-click installs, staging, cloning, security hardening, and automated updates.",
    author: "WhileSmart",
    version: "3.0.0",
    icon: "pi pi-globe",
    category: "cms",
    tags: ["wordpress", "cms", "staging", "security"],
    featured: true,
    installed: false,
  },
  {
    id: "laravel-toolkit",
    name: "Laravel Toolkit",
    description:
      "Laravel deployment automation with Composer, Artisan commands, queue workers, and scheduler management.",
    author: "WhileSmart",
    version: "2.0.0",
    icon: "pi pi-code",
    category: "cms",
    tags: ["laravel", "php", "composer", "artisan"],
    featured: true,
    installed: false,
  },
  {
    id: "database-manager",
    name: "Database Manager",
    description:
      "phpMyAdmin and pgAdmin integration with automated backups, user management, and query optimization.",
    author: "WhileSmart",
    version: "2.5.0",
    icon: "pi pi-database",
    category: "database",
    tags: ["mysql", "postgres", "phpmyadmin", "pgadmin"],
    featured: true,
    installed: false,
  },
  {
    id: "mail-server",
    name: "Mail Server",
    description:
      "Full-featured mail server with SMTP, IMAP, POP3, spam filtering, DKIM, and webmail interface.",
    author: "WhileSmart",
    version: "1.0.0",
    icon: "pi pi-envelope",
    category: "email",
    tags: ["email", "smtp", "imap", "spam"],
    featured: true,
    installed: false,
  },
  {
    id: "backup-manager",
    name: "Backup Manager",
    description:
      "Automated backups with scheduling, retention policies, incremental backups, and cloud storage integration.",
    author: "WhileSmart",
    version: "1.0.0",
    icon: "pi pi-save",
    category: "backup",
    tags: ["backup", "restore", "scheduled", "s3"],
    featured: false,
    installed: true,
  },
  {
    id: "ssl-manager",
    name: "SSL Certificate Manager",
    description:
      "Automated SSL certificate management with Let's Encrypt, wildcard support, and auto-renewal.",
    author: "WhileSmart",
    version: "2.0.0",
    icon: "pi pi-lock",
    category: "security",
    tags: ["ssl", "tls", "letsencrypt", "wildcard"],
    featured: false,
    installed: false,
  },
  {
    id: "firewall-manager",
    name: "Firewall Manager",
    description:
      "Advanced firewall rules, fail2ban integration, IP blocking, and intrusion detection.",
    author: "WhileSmart",
    version: "1.2.0",
    icon: "pi pi-shield",
    category: "security",
    tags: ["firewall", "fail2ban", "security", "ids"],
    featured: false,
    installed: false,
  },
  {
    id: "dns-manager",
    name: "DNS Manager",
    description:
      "Complete DNS zone management with record templates, DNSSEC support, and bulk operations.",
    author: "WhileSmart",
    version: "1.5.0",
    icon: "pi pi-sitemap",
    category: "cms",
    tags: ["dns", "zones", "dnssec", "records"],
    featured: false,
    installed: false,
  },
  {
    id: "resource-monitor",
    name: "Resource Monitor",
    description:
      "Real-time CPU, memory, disk, and network monitoring with alerts and historical graphs.",
    author: "WhileSmart",
    version: "1.8.0",
    icon: "pi pi-chart-line",
    category: "monitoring",
    tags: ["monitoring", "alerts", "graphs", "metrics"],
    featured: false,
    installed: false,
  },
]);

const filteredApps = computed(() => {
  let result = apps.value;

  if (selectedCategory.value !== "all") {
    result = result.filter((app) => app.category === selectedCategory.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (app) =>
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  return result.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });
});
</script>

<style scoped>
.marketplace-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.search-box {
  position: relative;
}

.search-box i {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400);
}

.search-input {
  padding: var(--space-2) var(--space-3) var(--space-2) 2.25rem;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  width: 280px;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.category-filters {
  display: flex;
  gap: 0.375rem;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem var(--space-3);
  border: 1px solid var(--color-gray-200);
  background: white;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--color-gray-500);
  cursor: pointer;
  transition: all var(--transition-base);
}

.category-btn:hover {
  border-color: var(--color-gray-300);
  color: var(--color-gray-700);
}

.category-btn.active {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: white;
}

.marketplace-banner {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, #8b5cf6 100%);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.banner-content h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin: 0 0 var(--space-2) 0;
}

.banner-content p {
  font-size: var(--text-xl);
  opacity: 0.9;
  margin: 0;
}

.banner-decoration {
  font-size: 4rem;
  opacity: 0.2;
  position: absolute;
  right: var(--space-8);
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-5);
}

.app-card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-200);
  overflow: hidden;
  transition: all var(--transition-base);
  display: flex;
  flex-direction: column;
}

.app-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-1px);
}

.app-card-header {
  padding: var(--space-5);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-100);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.app-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-3xl);
}

.app-icon.cms {
  background: var(--color-info-50);
  color: var(--color-primary-600);
}

.app-icon.backup {
  background: var(--color-success-50);
  color: var(--color-success-600);
}

.app-icon.monitoring {
  background: #e0e7ff;
  color: #4338ca;
}

.app-icon.security {
  background: var(--color-warning-50);
  color: var(--color-warning-600);
}

.app-icon.database {
  background: #fae8ff;
  color: #a855f7;
}

.app-icon.email {
  background: #fce7f3;
  color: #db2777;
}

.featured-badge {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  background: var(--color-warning-50);
  color: var(--color-warning-700);
  padding: var(--space-1) 0.625rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
}

.featured-badge i {
  font-size: var(--text-xs);
  color: var(--color-warning-500);
}

.app-card-body {
  padding: var(--space-5);
  flex: 1;
}

.app-name {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0 0 var(--space-2) 0;
}

.app-description {
  font-size: var(--text-md);
  color: var(--color-gray-500);
  line-height: 1.5;
  margin: 0 0 var(--space-4) 0;
}

.app-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.app-author {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.app-author i {
  font-size: var(--text-md);
}

.app-version {
  font-size: var(--text-xs);
  background: var(--color-gray-100);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--color-gray-600);
}

.app-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.app-tag {
  font-size: var(--text-xs);
  background: #e0e7ff;
  color: #4338ca;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.app-card-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  gap: var(--space-2);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-base);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
  flex: 1;
  justify-content: center;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-primary:disabled {
  background: var(--color-success-50);
  color: var(--color-success-700);
  cursor: default;
}

.btn-secondary {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.btn-secondary:hover {
  background: var(--color-gray-200);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-12);
  background: white;
  border-radius: var(--radius-lg);
  text-align: center;
  gap: var(--space-4);
}

.empty-state i {
  font-size: 3rem;
  color: var(--color-gray-400);
}

.empty-state h3 {
  font-size: var(--text-3xl);
  color: var(--color-gray-700);
  margin: 0;
}

.empty-state p {
  color: var(--color-gray-500);
  margin: 0;
}
</style>
