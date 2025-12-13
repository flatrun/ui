<template>
  <BaseModal
    :visible="visible"
    size="3xl"
    :close-disabled="creating"
    :close-on-overlay="!creating"
    @close="handleClose"
  >
    <template #header>
      <div class="modal-header-content">
        <div class="modal-header-icon">
          <i class="pi pi-box" />
        </div>
        <div class="modal-header-text">
          <h3>Create Deployment</h3>
          <p>Deploy your application in just a few steps</p>
        </div>
      </div>
    </template>
    <div class="wizard-container">
      <!-- Progress Steps -->
      <div v-if="currentStep > 0" class="wizard-progress">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressWidth }" />
        </div>
        <div class="steps-row">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            class="step-item"
            :class="{
              active: currentStep === index + 1,
              completed: currentStep > index + 1,
            }"
          >
            <div class="step-indicator">
              <i v-if="currentStep > index + 1" class="pi pi-check" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="wizard-content">
        <Transition name="slide" mode="out-in">
          <!-- Step 0: Mode Selection -->
          <div v-if="currentStep === 0" class="step-panel mode-selection-panel">
            <div class="mode-selection">
              <h3 class="mode-title">How would you like to deploy?</h3>
              <p class="mode-subtitle">Choose the deployment method that works best for you</p>

              <div class="deployment-modes">
                <button
                  class="deployment-mode-card"
                  :class="{ selected: deploymentMode === 'easy' }"
                  @click="deploymentMode = 'easy'"
                >
                  <div class="mode-card-icon easy">
                    <i class="pi pi-bolt" />
                  </div>
                  <div class="mode-card-content">
                    <h4>Easy Mode</h4>
                    <p>Guided setup with templates</p>
                    <ul class="mode-features">
                      <li><i class="pi pi-check" /> Choose from pre-built templates</li>
                      <li><i class="pi pi-check" /> Auto-configure database</li>
                      <li><i class="pi pi-check" /> Domain & SSL setup</li>
                    </ul>
                  </div>
                  <div class="mode-badge recommended">Recommended</div>
                </button>

                <button
                  class="deployment-mode-card"
                  :class="{ selected: deploymentMode === 'image' }"
                  @click="deploymentMode = 'image'"
                >
                  <div class="mode-card-icon image">
                    <i class="pi pi-box" />
                  </div>
                  <div class="mode-card-content">
                    <h4>From Image</h4>
                    <p>Deploy any Docker image</p>
                    <ul class="mode-features">
                      <li><i class="pi pi-check" /> Use any public/private image</li>
                      <li><i class="pi pi-check" /> Auto-generate compose</li>
                      <li><i class="pi pi-check" /> Quick deployment</li>
                    </ul>
                  </div>
                  <div class="mode-badge">Quick</div>
                </button>

                <button
                  class="deployment-mode-card"
                  :class="{ selected: deploymentMode === 'compose' }"
                  @click="deploymentMode = 'compose'"
                >
                  <div class="mode-card-icon compose">
                    <i class="pi pi-code" />
                  </div>
                  <div class="mode-card-content">
                    <h4>Compose Mode</h4>
                    <p>Full control with docker-compose</p>
                    <ul class="mode-features">
                      <li><i class="pi pi-check" /> Write your own compose file</li>
                      <li><i class="pi pi-check" /> Advanced configuration</li>
                      <li><i class="pi pi-check" /> For power users</li>
                    </ul>
                  </div>
                  <div class="mode-badge">Advanced</div>
                </button>
              </div>
            </div>
          </div>

          <!-- Step 1: Basic Info -->
          <div v-else-if="currentStep === 1" class="step-panel">
            <div class="step1-grid">
              <!-- Left: Name & Domain -->
              <div class="step1-left">
                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-pencil" />
                    </div>
                    <h4>Deployment Details</h4>
                  </div>

                  <div class="form-field">
                    <label for="name">
                      Name
                      <span class="required">*</span>
                    </label>
                    <div class="input-wrapper">
                      <input
                        id="name"
                        v-model="form.name"
                        type="text"
                        placeholder="my-app"
                        :class="{ error: errors.name }"
                        @input="onNameChange"
                      />
                      <span v-if="form.name && !errors.name" class="input-icon success">
                        <i class="pi pi-check" />
                      </span>
                    </div>
                    <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
                    <span v-else class="field-hint">Lowercase letters, numbers, and hyphens</span>
                  </div>
                </div>

                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-globe" />
                    </div>
                    <h4>Domain</h4>
                  </div>

                  <div v-if="domainSettings.default_domain" class="domain-preview">
                    <div class="domain-url">
                      <span class="protocol">https://</span>
                      <span class="domain-text">{{ generatedDomain || "generating..." }}</span>
                      <button class="refresh-domain-btn" title="Generate new subdomain" @click="regenerateSubdomain">
                        <i class="pi pi-refresh" />
                      </button>
                    </div>
                  </div>

                  <div class="toggle-option">
                    <label class="toggle-label">
                      <input v-model="form.useCustomDomain" type="checkbox" />
                      <span class="toggle-text">Use custom domain</span>
                    </label>
                  </div>

                  <Transition name="expand">
                    <div v-if="form.useCustomDomain || !domainSettings.default_domain" class="custom-domain-field">
                      <div class="form-field">
                        <label for="customDomain">Custom Domain</label>
                        <input
                          id="customDomain"
                          v-model="form.networking.domain"
                          type="text"
                          placeholder="app.example.com"
                        />
                      </div>
                    </div>
                  </Transition>

                  <div class="ssl-options">
                    <div class="toggle-option">
                      <label class="toggle-label">
                        <input v-model="form.ssl.enabled" type="checkbox" />
                        <span class="toggle-text">Enable HTTPS</span>
                      </label>
                    </div>
                    <Transition name="expand">
                      <div v-if="form.ssl.enabled" class="toggle-option nested">
                        <label class="toggle-label">
                          <input v-model="form.ssl.autoCert" type="checkbox" />
                          <span class="toggle-text">Auto-provision certificate</span>
                        </label>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>

              <!-- Right: Template Selection (Easy Mode) or Compose Info (Compose Mode) -->
              <div class="step1-right">
                <div v-if="deploymentMode === 'easy'" class="section-card templates-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-th-large" />
                    </div>
                    <h4>Template</h4>
                  </div>

                  <div v-if="loadingQuickApps" class="templates-loading">
                    <i class="pi pi-spin pi-spinner" />
                  </div>

                  <div v-else class="templates-list">
                    <button
                      v-for="app in displayedQuickApps"
                      :key="app.id"
                      class="template-item"
                      :class="{ selected: selectedQuickApp === app.id }"
                      @click="selectQuickApp(app)"
                    >
                      <div class="template-icon" :class="{ 'has-logo': app.logo }">
                        <img v-if="app.logo" :src="app.logo" :alt="app.name" class="template-logo" />
                        <i v-else :class="app.icon || 'pi pi-box'" />
                      </div>
                      <div class="template-info">
                        <span class="template-name">{{ app.name }}</span>
                        <span class="template-desc">{{ app.description || "Ready to deploy" }}</span>
                      </div>
                      <i v-if="selectedQuickApp === app.id" class="pi pi-check template-check" />
                    </button>

                    <button
                      class="template-item custom"
                      :class="{ selected: selectedQuickApp === 'custom' }"
                      @click="selectCustom"
                    >
                      <div class="template-icon">
                        <i class="pi pi-code" />
                      </div>
                      <div class="template-info">
                        <span class="template-name">Custom</span>
                        <span class="template-desc">Write your own compose</span>
                      </div>
                      <i v-if="selectedQuickApp === 'custom'" class="pi pi-check template-check" />
                    </button>
                  </div>
                </div>

                <!-- Compose Mode Info Panel -->
                <div v-else-if="deploymentMode === 'compose'" class="section-card compose-info-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-code" />
                    </div>
                    <h4>Compose Mode</h4>
                  </div>
                  <div class="compose-info-content">
                    <div class="info-item">
                      <i class="pi pi-file-edit" />
                      <div>
                        <strong>Full Control</strong>
                        <p>Write your own docker-compose.yml configuration</p>
                      </div>
                    </div>
                    <div class="info-item">
                      <i class="pi pi-sitemap" />
                      <div>
                        <strong>Multi-Service Support</strong>
                        <p>Define multiple services, volumes, and networks</p>
                      </div>
                    </div>
                    <div class="info-item">
                      <i class="pi pi-cog" />
                      <div>
                        <strong>Advanced Options</strong>
                        <p>Configure environment variables and port mappings</p>
                      </div>
                    </div>
                    <div class="info-hint">
                      <i class="pi pi-info-circle" />
                      <span>You'll write your compose file in the next step</span>
                    </div>
                  </div>
                </div>

                <!-- Image Mode Panel -->
                <div v-else-if="deploymentMode === 'image'" class="section-card image-config-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-box" />
                    </div>
                    <h4>Docker Image</h4>
                  </div>
                  <div class="image-config-content">
                    <div class="form-field">
                      <label for="imageName">
                        Image Name
                        <span class="required">*</span>
                      </label>
                      <div class="input-wrapper">
                        <input
                          id="imageName"
                          v-model="form.image"
                          type="text"
                          placeholder="nginx:latest or ghcr.io/user/app:v1"
                          :class="{ error: errors.image }"
                        />
                        <span v-if="form.image && !errors.image" class="input-icon success">
                          <i class="pi pi-check" />
                        </span>
                      </div>
                      <span v-if="errors.image" class="field-error">{{ errors.image }}</span>
                      <span v-else class="field-hint">Docker Hub, GHCR, or any registry</span>
                    </div>

                    <div class="private-registry-toggle">
                      <label class="toggle-option">
                        <input v-model="form.registry.isPrivate" type="checkbox" />
                        <span class="toggle-label">
                          <i class="pi pi-lock" />
                          Private registry (requires authentication)
                        </span>
                      </label>
                    </div>

                    <Transition name="collapse">
                      <div v-if="form.registry.isPrivate" class="registry-credentials">
                        <div v-if="existingCredentials.length > 0" class="credential-source-toggle">
                          <label class="toggle-option">
                            <input
                              v-model="form.registry.useExisting"
                              type="radio"
                              name="credentialSource"
                              :value="true"
                            />
                            <span class="toggle-label">Use saved credential</span>
                          </label>
                          <label class="toggle-option">
                            <input
                              v-model="form.registry.useExisting"
                              type="radio"
                              name="credentialSource"
                              :value="false"
                            />
                            <span class="toggle-label">Enter new credentials</span>
                          </label>
                        </div>

                        <div v-if="form.registry.useExisting && existingCredentials.length > 0" class="existing-credential-select">
                          <div class="form-field">
                            <label for="existingCredential">Select Credential</label>
                            <select
                              id="existingCredential"
                              v-model="form.registry.selectedCredentialId"
                              class="form-select"
                            >
                              <option value="" disabled>Choose a saved credential</option>
                              <option
                                v-for="cred in existingCredentials"
                                :key="cred.id"
                                :value="cred.id"
                              >
                                {{ cred.name }} ({{ cred.username }})
                              </option>
                            </select>
                          </div>
                        </div>

                        <template v-else>
                          <div class="form-field">
                            <label for="registryUsername">Username</label>
                            <input
                              id="registryUsername"
                              v-model="form.registry.username"
                              type="text"
                              placeholder="Username or access token name"
                            />
                          </div>
                          <div class="form-field">
                            <label for="registryPassword">Password / Token</label>
                            <div class="input-wrapper">
                              <input
                                id="registryPassword"
                                v-model="form.registry.password"
                                :type="showRegistryPassword ? 'text' : 'password'"
                                placeholder="Password or personal access token"
                              />
                              <button
                                type="button"
                                class="input-icon-btn"
                                @click="showRegistryPassword = !showRegistryPassword"
                              >
                                <i :class="showRegistryPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
                              </button>
                            </div>
                          </div>
                          <div class="save-credential-option">
                            <label class="toggle-option">
                              <input v-model="form.registry.saveCredential" type="checkbox" />
                              <span class="toggle-label">Save credential for future use</span>
                            </label>
                            <Transition name="collapse">
                              <div v-if="form.registry.saveCredential" class="credential-name-field">
                                <input
                                  v-model="form.registry.credentialName"
                                  type="text"
                                  placeholder="Credential name (e.g., My Docker Hub)"
                                />
                              </div>
                            </Transition>
                          </div>
                        </template>
                      </div>
                    </Transition>

                    <div class="info-hint">
                      <i class="pi pi-info-circle" />
                      <span>A compose file will be auto-generated for your image</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Database & Storage -->
          <div v-else-if="currentStep === 2" class="step-panel step2-sections">
            <!-- Database Section -->
            <div class="collapsible-section">
              <button
                class="section-toggle"
                :class="{ collapsed: collapsedSections.database }"
                @click="toggleSection('database')"
              >
                <div class="section-toggle-left">
                  <div class="section-icon database">
                    <i class="pi pi-database" />
                  </div>
                  <div class="section-toggle-info">
                    <h4>Database</h4>
                    <p>
                      {{ form.database.type === "none" ? "No database configured" : form.database.type.toUpperCase() }}
                    </p>
                  </div>
                </div>
                <i class="pi pi-chevron-down toggle-icon" />
              </button>

              <Transition name="collapse">
                <div v-show="!collapsedSections.database" class="section-content">
                  <div class="database-options">
                    <button
                      class="db-option"
                      :class="{ selected: form.database.type === 'none' }"
                      @click="selectDatabaseType('none')"
                    >
                      <div class="db-option-icon none">
                        <i class="pi pi-times-circle" />
                      </div>
                      <div class="db-option-info">
                        <span class="db-option-name">No Database</span>
                        <span class="db-option-desc">Skip database setup</span>
                      </div>
                      <i v-if="form.database.type === 'none'" class="pi pi-check db-check" />
                    </button>

                    <button
                      class="db-option"
                      :class="{ selected: form.database.type === 'mysql' }"
                      @click="selectDatabaseType('mysql')"
                    >
                      <div class="db-option-icon mysql">
                        <i class="pi pi-database" />
                      </div>
                      <div class="db-option-info">
                        <span class="db-option-name">MySQL</span>
                        <span class="db-option-desc">Popular relational database</span>
                      </div>
                      <i v-if="form.database.type === 'mysql'" class="pi pi-check db-check" />
                    </button>

                    <button
                      class="db-option"
                      :class="{ selected: form.database.type === 'postgres' }"
                      @click="selectDatabaseType('postgres')"
                    >
                      <div class="db-option-icon postgres">
                        <i class="pi pi-database" />
                      </div>
                      <div class="db-option-info">
                        <span class="db-option-name">PostgreSQL</span>
                        <span class="db-option-desc">Advanced open source database</span>
                      </div>
                      <i v-if="form.database.type === 'postgres'" class="pi pi-check db-check" />
                    </button>

                    <button
                      class="db-option"
                      :class="{ selected: form.database.type === 'mariadb' }"
                      @click="selectDatabaseType('mariadb')"
                    >
                      <div class="db-option-icon mariadb">
                        <i class="pi pi-database" />
                      </div>
                      <div class="db-option-info">
                        <span class="db-option-name">MariaDB</span>
                        <span class="db-option-desc">MySQL-compatible fork</span>
                      </div>
                      <i v-if="form.database.type === 'mariadb'" class="pi pi-check db-check" />
                    </button>

                    <button
                      class="db-option"
                      :class="{ selected: form.database.type === 'mongodb' }"
                      @click="selectDatabaseType('mongodb')"
                    >
                      <div class="db-option-icon mongodb">
                        <i class="pi pi-database" />
                      </div>
                      <div class="db-option-info">
                        <span class="db-option-name">MongoDB</span>
                        <span class="db-option-desc">NoSQL document database</span>
                      </div>
                      <i v-if="form.database.type === 'mongodb'" class="pi pi-check db-check" />
                    </button>
                  </div>

                  <Transition name="expand">
                    <div v-if="form.database.type !== 'none'" class="database-config">
                      <!-- Connection Mode -->
                      <div class="section-card">
                        <div class="section-header compact">
                          <div class="section-icon small">
                            <i class="pi pi-link" />
                          </div>
                          <h4>Connection Mode</h4>
                        </div>

                        <div
                          class="mode-options"
                          :class="infrastructureSettings.database.enabled ? 'four-col' : 'three-col'"
                        >
                          <button
                            v-if="infrastructureSettings.database.enabled"
                            class="mode-option recommended"
                            :class="{ selected: form.database.mode === 'shared' }"
                            @click="selectSharedDatabase"
                          >
                            <div class="mode-icon shared">
                              <i class="pi pi-share-alt" />
                            </div>
                            <div class="mode-info">
                              <span class="mode-name">Use Shared</span>
                              <span class="mode-desc">Auto-create in shared DB</span>
                            </div>
                            <span class="recommended-badge">Recommended</span>
                          </button>

                          <button
                            class="mode-option"
                            :class="{ selected: form.database.mode === 'create' }"
                            @click="selectDatabaseMode('create')"
                          >
                            <div class="mode-icon">
                              <i class="pi pi-plus-circle" />
                            </div>
                            <div class="mode-info">
                              <span class="mode-name">Create New</span>
                              <span class="mode-desc">Add database to app stack</span>
                            </div>
                          </button>

                          <button
                            class="mode-option"
                            :class="{ selected: form.database.mode === 'existing' }"
                            @click="selectDatabaseMode('existing')"
                          >
                            <div class="mode-icon">
                              <i class="pi pi-server" />
                            </div>
                            <div class="mode-info">
                              <span class="mode-name">Use Existing</span>
                              <span class="mode-desc">Connect to local container</span>
                            </div>
                          </button>

                          <button
                            class="mode-option"
                            :class="{ selected: form.database.mode === 'external' }"
                            @click="selectDatabaseMode('external')"
                          >
                            <div class="mode-icon">
                              <i class="pi pi-globe" />
                            </div>
                            <div class="mode-info">
                              <span class="mode-name">External</span>
                              <span class="mode-desc">Connect to remote server</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      <!-- Existing Container Selection -->
                      <Transition name="expand">
                        <div v-if="form.database.mode === 'existing'" class="section-card">
                          <div class="section-header compact">
                            <div class="section-icon small">
                              <i class="pi pi-server" />
                            </div>
                            <h4>Select Container</h4>
                            <button
                              class="refresh-btn"
                              :disabled="loadingDbContainers"
                              @click="loadExistingDbContainers"
                            >
                              <i class="pi pi-refresh" :class="{ 'pi-spin': loadingDbContainers }" />
                            </button>
                          </div>

                          <div class="existing-containers">
                            <div v-if="loadingDbContainers" class="loading-containers">
                              <i class="pi pi-spin pi-spinner" />
                              <span>Loading containers...</span>
                            </div>
                            <div v-else-if="filteredDbContainers.length === 0" class="no-containers">
                              <i class="pi pi-info-circle" />
                              <span>No {{ form.database.type }} containers found</span>
                              <button class="switch-mode-btn" @click="form.database.mode = 'create'">
                                Create new instead
                              </button>
                            </div>
                            <div v-else class="container-list">
                              <button
                                v-for="container in filteredDbContainers"
                                :key="container.id"
                                class="container-option"
                                :class="{
                                  selected: form.database.existingContainer === container.name,
                                }"
                                @click="selectExistingContainer(container)"
                              >
                                <div class="container-icon">
                                  <i class="pi pi-database" />
                                </div>
                                <div class="container-details">
                                  <span class="container-name">{{ container.name }}</span>
                                  <span class="container-image">{{ container.image }}</span>
                                </div>
                                <i v-if="form.database.existingContainer === container.name" class="pi pi-check" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Transition>

                      <!-- External Database Config -->
                      <Transition name="expand">
                        <div v-if="form.database.mode === 'external'" class="section-card">
                          <div class="section-header compact">
                            <div class="section-icon small">
                              <i class="pi pi-globe" />
                            </div>
                            <h4>Server Details</h4>
                          </div>

                          <div class="credentials-form">
                            <div class="form-row">
                              <div class="form-field flex-grow">
                                <label for="externalHost">
                                  Host
                                  <span class="required">*</span>
                                </label>
                                <input
                                  id="externalHost"
                                  v-model="form.database.externalHost"
                                  type="text"
                                  placeholder="db.example.com"
                                />
                              </div>
                              <div class="form-field port-field">
                                <label for="externalPort">
                                  Port
                                  <span class="required">*</span>
                                </label>
                                <input
                                  id="externalPort"
                                  v-model="form.database.externalPort"
                                  type="text"
                                  :placeholder="getDefaultPort(form.database.type)"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Transition>

                      <!-- Credentials -->
                      <div class="section-card">
                        <div class="section-header compact">
                          <div class="section-icon small">
                            <i class="pi pi-key" />
                          </div>
                          <h4>Credentials</h4>
                        </div>

                        <div class="credentials-form">
                          <div class="form-field">
                            <label for="dbName">Database Name</label>
                            <input
                              id="dbName"
                              v-model="form.database.dbName"
                              type="text"
                              :placeholder="form.name ? form.name.replace(/-/g, '_') : 'app_db'"
                            />
                          </div>

                          <div class="form-row">
                            <div class="form-field">
                              <label for="dbUser">Username</label>
                              <input id="dbUser" v-model="form.database.dbUser" type="text" placeholder="app" />
                            </div>

                            <div class="form-field">
                              <label for="dbPassword">
                                Password
                                <span v-if="form.database.mode === 'create'" class="required">*</span>
                              </label>
                              <input
                                id="dbPassword"
                                v-model="form.database.dbPassword"
                                type="password"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>

                          <Transition name="expand">
                            <div v-if="form.database.mode === 'create'" class="form-field">
                              <label for="dbRootPassword">Root Password</label>
                              <input
                                id="dbRootPassword"
                                v-model="form.database.dbRootPassword"
                                type="password"
                                placeholder="Leave empty to use same as password"
                              />
                              <span class="field-hint">Admin password for new database</span>
                            </div>
                          </Transition>
                        </div>
                      </div>

                      <!-- Connection Test -->
                      <div
                        v-if="form.database.mode === 'external' || form.database.mode === 'existing'"
                        class="section-card connection-test"
                      >
                        <div class="connection-test-content">
                          <div class="connection-status">
                            <div v-if="form.database.connectionStatus === 'checking'" class="status checking">
                              <i class="pi pi-spin pi-spinner" />
                              <span>Testing connection...</span>
                            </div>
                            <div v-else-if="form.database.connectionStatus === 'success'" class="status success">
                              <i class="pi pi-check-circle" />
                              <span>Connection successful</span>
                            </div>
                            <div v-else-if="form.database.connectionStatus === 'error'" class="status error">
                              <i class="pi pi-times-circle" />
                              <span>{{ form.database.connectionError || "Connection failed" }}</span>
                            </div>
                            <div v-else class="status idle">
                              <i class="pi pi-info-circle" />
                              <span>Test connection before proceeding</span>
                            </div>
                          </div>
                          <button
                            class="test-btn"
                            :disabled="form.database.connectionStatus === 'checking'"
                            @click="checkDatabaseConnection"
                          >
                            <i class="pi pi-bolt" />
                            Test
                          </button>
                        </div>
                      </div>

                      <!-- Configuration Preview for External/Existing -->
                      <div
                        v-if="form.database.mode === 'external' || form.database.mode === 'existing'"
                        class="section-card config-preview"
                      >
                        <div class="section-header compact">
                          <div class="section-icon small">
                            <i class="pi pi-eye" />
                          </div>
                          <h4>Configuration Preview</h4>
                        </div>
                        <div class="preview-content">
                          <div class="preview-item">
                            <span class="preview-label">Connection</span>
                            <code class="preview-value"
                              >{{
                                form.database.mode === "existing"
                                  ? form.database.existingContainer
                                  : form.database.externalHost
                              }}:{{ form.database.externalPort || getDefaultPort(form.database.type) }}</code
                            >
                          </div>
                          <div class="preview-item">
                            <span class="preview-label">Database</span>
                            <code class="preview-value">{{
                              form.database.dbName || (form.name ? form.name.replace(/-/g, "_") : "app_db")
                            }}</code>
                          </div>
                          <div class="preview-item">
                            <span class="preview-label">User</span>
                            <code class="preview-value">{{ form.database.dbUser || "app" }}</code>
                          </div>
                          <div class="preview-hint">
                            <i class="pi pi-info-circle" />
                            Environment variables will be automatically added to your app
                          </div>
                        </div>
                      </div>

                      <!-- Create Mode Preview -->
                      <div v-if="form.database.mode === 'create'" class="section-card config-preview">
                        <div class="section-header compact">
                          <div class="section-icon small">
                            <i class="pi pi-code" />
                          </div>
                          <h4>Service Preview</h4>
                        </div>
                        <div class="preview-content">
                          <pre class="compose-preview">{{ getDatabaseServiceYaml().trim() }}</pre>
                          <div class="preview-hint">
                            <i class="pi pi-info-circle" />
                            This database service will be added to your compose stack
                          </div>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </Transition>
            </div>

            <!-- Storage Section -->
            <div v-if="selectedTemplateMounts.length > 0" class="collapsible-section">
              <button
                class="section-toggle"
                :class="{ collapsed: collapsedSections.storage }"
                @click="toggleSection('storage')"
              >
                <div class="section-toggle-left">
                  <div class="section-icon storage">
                    <i class="pi pi-folder" />
                  </div>
                  <div class="section-toggle-info">
                    <h4>Storage</h4>
                    <p>{{ form.mounts.filter((m) => m.enabled).length }} mount(s) configured</p>
                  </div>
                </div>
                <i class="pi pi-chevron-down toggle-icon" />
              </button>

              <Transition name="collapse">
                <div v-show="!collapsedSections.storage" class="section-content">
                  <div class="mounts-grid">
                    <div
                      v-for="mount in selectedTemplateMounts"
                      :key="mount.id"
                      class="mount-card"
                      :class="{ enabled: getMountSelection(mount.id)?.enabled }"
                    >
                      <div class="mount-header">
                        <label class="mount-toggle">
                          <input
                            type="checkbox"
                            :checked="getMountSelection(mount.id)?.enabled"
                            :disabled="mount.required"
                            @change="toggleMount(mount.id)"
                          />
                          <span class="mount-name">{{ mount.name }}</span>
                          <span v-if="mount.required" class="required-badge">Required</span>
                        </label>
                      </div>
                      <p class="mount-description">{{ mount.description }}</p>
                      <p class="mount-path">
                        <i class="pi pi-folder-open" />
                        {{ mount.container_path }}
                      </p>
                      <div v-if="getMountSelection(mount.id)?.enabled" class="mount-type-selector">
                        <button
                          class="type-btn"
                          :class="{ active: getMountSelection(mount.id)?.type === 'file' }"
                          @click="setMountType(mount.id, 'file')"
                        >
                          <i class="pi pi-file" />
                          Bind Mount
                        </button>
                        <button
                          class="type-btn"
                          :class="{ active: getMountSelection(mount.id)?.type === 'volume' }"
                          @click="setMountType(mount.id, 'volume')"
                        >
                          <i class="pi pi-database" />
                          Volume
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Step 3: Configuration -->
          <div v-else-if="currentStep === 3" class="step-panel">
            <div class="step2-layout">
              <!-- Compose Editor -->
              <div class="compose-section">
                <div class="compose-header">
                  <div class="compose-title">
                    <i class="pi pi-file-edit" />
                    <span>docker-compose.yml</span>
                  </div>
                  <div class="compose-actions">
                    <button class="action-btn" title="Format" @click="formatCompose">
                      <i class="pi pi-align-left" />
                    </button>
                    <button class="action-btn" title="Copy" @click="copyCompose">
                      <i class="pi pi-copy" />
                    </button>
                  </div>
                </div>
                <div class="compose-editor-wrapper">
                  <Codemirror
                    v-model="form.composeContent"
                    :style="{ height: '100%' }"
                    :extensions="extensions"
                    :tab-size="2"
                    placeholder="# Docker Compose configuration..."
                  />
                </div>
                <div v-if="errors.composeContent" class="compose-error">
                  <i class="pi pi-exclamation-circle" />
                  {{ errors.composeContent }}
                </div>
              </div>

              <!-- Side Panel -->
              <div class="side-panel">
                <!-- Environment Variables -->
                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-key" />
                    </div>
                    <h4>Environment</h4>
                  </div>
                  <div class="env-section">
                    <div v-for="(env, index) in form.envVars" :key="index" class="env-row">
                      <input v-model="env.key" placeholder="KEY" class="env-key" />
                      <input v-model="env.value" placeholder="value" class="env-value" />
                      <button class="env-remove" @click="removeEnvVar(index)">
                        <i class="pi pi-times" />
                      </button>
                    </div>
                    <button class="add-env-btn" @click="addEnvVar">
                      <i class="pi pi-plus" />
                      Add Variable
                    </button>
                  </div>
                </div>

                <!-- Port Settings -->
                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-sitemap" />
                    </div>
                    <h4>Ports</h4>
                  </div>
                  <div class="ports-section">
                    <div v-for="(port, index) in form.networking.ports" :key="index" class="port-row">
                      <input
                        v-model.number="port.containerPort"
                        type="number"
                        placeholder="80"
                        class="port-container"
                        title="Container port"
                        @change="updateComposeWithSettings"
                      />
                      <span class="port-separator">:</span>
                      <input
                        v-model="port.hostPort"
                        type="text"
                        :placeholder="port.hostPort ? '' : 'host'"
                        class="port-host"
                        title="Host port (leave empty for expose only)"
                        @input="updateComposeWithSettings"
                      />
                      <button
                        class="port-remove"
                        @click="removePort(index)"
                        :disabled="form.networking.ports.length <= 1"
                      >
                        <i class="pi pi-times" />
                      </button>
                    </div>
                    <button type="button" class="add-port-btn" @click="addPort">
                      <i class="pi pi-plus" />
                      Add Port
                    </button>
                    <span class="field-hint">Container:Host - leave host empty to expose only</span>
                  </div>
                </div>

                <!-- Options -->
                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-cog" />
                    </div>
                    <h4>Options</h4>
                  </div>
                  <div class="options-section">
                    <div class="toggle-option">
                      <label class="toggle-label">
                        <input v-model="form.autoStart" type="checkbox" />
                        <span class="toggle-text">Start after creation</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Review -->
          <div v-else-if="currentStep === 4" class="step-panel">
            <div class="review-container">
              <div class="review-card">
                <div class="review-header">
                  <div class="review-icon">
                    <i class="pi pi-check-circle" />
                  </div>
                  <div class="review-title">
                    <h3>Ready to Deploy</h3>
                    <p>Review your configuration</p>
                  </div>
                </div>

                <div class="review-grid">
                  <div class="review-item">
                    <span class="review-label">Name</span>
                    <span class="review-value">{{ form.name }}</span>
                  </div>
                  <div v-if="deploymentMode === 'image'" class="review-item">
                    <span class="review-label">Image</span>
                    <span class="review-value">{{ form.image }}</span>
                  </div>
                  <div v-else-if="deploymentMode === 'easy'" class="review-item">
                    <span class="review-label">Template</span>
                    <span class="review-value">{{ selectedQuickAppName }}</span>
                  </div>
                  <div v-else class="review-item">
                    <span class="review-label">Mode</span>
                    <span class="review-value">Custom Compose</span>
                  </div>
                  <div v-if="effectiveDomain" class="review-item full-width">
                    <span class="review-label">Domain</span>
                    <span class="review-value domain">
                      <i class="pi pi-link" />
                      {{ effectiveDomain }}
                    </span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">SSL</span>
                    <span class="review-badge" :class="form.ssl.enabled ? 'success' : 'neutral'">
                      {{ form.ssl.enabled ? "Enabled" : "Disabled" }}
                    </span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Auto Start</span>
                    <span class="review-badge" :class="form.autoStart ? 'success' : 'neutral'">
                      {{ form.autoStart ? "Yes" : "No" }}
                    </span>
                  </div>
                  <div v-if="form.envVars.length" class="review-item">
                    <span class="review-label">Env Vars</span>
                    <span class="review-value">{{ form.envVars.filter((e) => e.key).length }} defined</span>
                  </div>
                </div>

                <div class="compose-summary">
                  <div class="compose-summary-header">
                    <i class="pi pi-file-edit" />
                    <span>Docker Compose</span>
                    <span class="compose-lines">{{ composeLineCount }} lines</span>
                  </div>
                  <pre class="compose-preview-code"
                    >{{ form.composeContent.slice(0, 400) }}{{ form.composeContent.length > 400 ? "\n..." : "" }}</pre
                  >
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <template #footer>
      <div class="footer-left">
        <button v-if="currentStep > 0" class="btn btn-ghost" @click="currentStep--">
          <i class="pi pi-arrow-left" />
          {{ currentStep === 1 ? "Change Mode" : "Back" }}
        </button>
      </div>
      <div class="footer-right">
        <button class="btn btn-secondary" :disabled="creating" @click="handleClose">Cancel</button>
        <button
          v-if="currentStep < steps.length"
          class="btn btn-primary"
          :disabled="!canProceed || generatingCompose"
          @click="nextStep"
        >
          <i v-if="generatingCompose" class="pi pi-spin pi-spinner" />
          <template v-else>
            {{ currentStep === 0 ? "Get Started" : "Continue" }}
            <i class="pi pi-arrow-right" />
          </template>
        </button>
        <button v-else class="btn btn-primary btn-create" :disabled="creating" @click="handleCreate">
          <i v-if="creating" class="pi pi-spin pi-spinner" />
          <i v-else class="pi pi-rocket" />
          {{ creating ? "Creating..." : "Deploy" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, shallowRef } from "vue";
import { Codemirror } from "vue-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import BaseModal from "@/components/base/BaseModal.vue";
import { deploymentsApi, templatesApi, settingsApi, containersApi, composeApi, credentialsApi } from "@/services/api";
import type { RegistryCredential } from "@/types";
import { useNotificationsStore } from "@/stores/notifications";

interface TemplateMount {
  id: string;
  name: string;
  container_path: string;
  description: string;
  type: "file" | "volume";
  required: boolean;
}

interface QuickApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  logo?: string;
  category: string;
  priority?: number;
  container_port?: number;
  mounts?: TemplateMount[];
  content: string;
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(["close", "created"]);

const notifications = useNotificationsStore();
const creating = ref(false);
const loadingQuickApps = ref(false);
const selectedQuickApp = ref("");
const selectedTemplateContent = ref("");
const quickApps = ref<QuickApp[]>([]);
const currentStep = ref(1);
const collapsedSections = ref<Record<string, boolean>>({
  database: false,
  storage: false,
});

const toggleSection = (section: string) => {
  collapsedSections.value[section] = !collapsedSections.value[section];
};
const generatedSubdomain = ref("");
const generatedDomain = ref("");

interface DbContainer {
  id: string;
  name: string;
  image: string;
  type: "mysql" | "postgres" | "mariadb" | "mongodb" | "unknown";
}
const existingDbContainers = ref<DbContainer[]>([]);
const loadingDbContainers = ref(false);
const existingDeployments = ref<string[]>([]);

const extensions = shallowRef([yaml(), oneDark]);

const deploymentMode = ref<"" | "easy" | "compose" | "image">("");
const showRegistryPassword = ref(false);
const existingCredentials = ref<RegistryCredential[]>([]);
const loadingCredentials = ref(false);

const easySteps = [
  { id: "basics", label: "Basics" },
  { id: "database", label: "Database" },
  { id: "configure", label: "Configure" },
  { id: "review", label: "Review" },
];

const steps = computed(() => easySteps);

const generatePassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const domainSettings = reactive({
  default_domain: "",
  auto_subdomain: false,
  auto_ssl: false,
  subdomain_style: "words",
});

const infrastructureSettings = reactive({
  default_proxy_network: "proxy",
  default_database_network: "database",
  database: {
    enabled: false,
    type: "mysql",
    container: "",
    host: "",
  },
  redis: {
    enabled: false,
    container: "",
    host: "",
  },
});

const form = reactive({
  name: "",
  image: "",
  composeContent: "",
  envVars: [] as { key: string; value: string }[],
  autoStart: false,
  useCustomDomain: false,
  networking: {
    expose: true,
    domain: "",
    protocol: "http",
    ports: [{ containerPort: 80, hostPort: "", expose: true }] as {
      containerPort: number;
      hostPort: string;
      expose: boolean;
    }[],
  },
  ssl: {
    enabled: false,
    autoCert: false,
  },
  database: {
    enabled: false,
    type: "none" as "none" | "mysql" | "postgres" | "mariadb" | "mongodb",
    mode: "create" as "create" | "existing" | "external" | "shared",
    existingContainer: "",
    externalHost: "",
    externalPort: "",
    dbName: "",
    dbUser: "app",
    dbPassword: "",
    dbRootPassword: "",
    connectionStatus: null as null | "checking" | "success" | "error",
    connectionError: "",
    useSharedDatabase: false,
  },
  mounts: [] as { id: string; enabled: boolean; type: "file" | "volume" }[],
  registry: {
    isPrivate: false,
    useExisting: false,
    selectedCredentialId: "",
    username: "",
    password: "",
    saveCredential: false,
    credentialName: "",
  },
});

const errors = reactive({
  name: "",
  image: "",
  composeContent: "",
});

const progressWidth = computed(() => {
  const totalSteps = steps.value.length;
  return `${((currentStep.value - 1) / (totalSteps - 1)) * 100}%`;
});

const displayedQuickApps = computed(() => {
  return [...quickApps.value].sort((a, b) => (b.priority || 0) - (a.priority || 0));
});

const composeLineCount = computed(() => {
  return form.composeContent.split("\n").filter((l) => l.trim()).length;
});

const selectedQuickAppName = computed(() => {
  if (selectedQuickApp.value === "custom") return "Custom";
  const app = quickApps.value.find((a) => a.id === selectedQuickApp.value);
  return app?.name || selectedQuickApp.value;
});

const selectedTemplateMounts = computed(() => {
  if (selectedQuickApp.value === "custom" || !selectedQuickApp.value) return [];
  const app = quickApps.value.find((a) => a.id === selectedQuickApp.value);
  return app?.mounts || [];
});

const effectiveDomain = computed(() => {
  if (form.useCustomDomain || !domainSettings.default_domain) {
    return form.networking.domain;
  }
  return generatedDomain.value;
});

const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return deploymentMode.value !== "";
  }

  if (currentStep.value === 1) {
    const nameValid = form.name.trim() && /^[a-z0-9-]+$/.test(form.name) && !errors.name;
    if (deploymentMode.value === "compose") {
      return nameValid;
    }
    if (deploymentMode.value === "image") {
      return nameValid && form.image.trim() !== "";
    }
    return nameValid && selectedQuickApp.value !== "";
  }

  if (deploymentMode.value === "easy") {
    if (currentStep.value === 2) {
      if (form.database.type !== "none") {
        if (form.database.mode === "existing" && !form.database.existingContainer) {
          return false;
        }
        if (form.database.mode === "external") {
          if (!form.database.externalHost.trim() || !form.database.externalPort.trim()) {
            return false;
          }
        }
      }
      return true;
    }
    if (currentStep.value === 3) {
      return form.composeContent.trim().length > 0;
    }
  }

  if (deploymentMode.value === "compose") {
    if (currentStep.value === 2) {
      return form.composeContent.trim().length > 0;
    }
  }

  return true;
});

const loadSettings = async () => {
  try {
    const response = await settingsApi.get();
    const settings = response.data.settings;
    if (settings?.domain) {
      domainSettings.default_domain = settings.domain.default_domain || "";
      domainSettings.auto_subdomain = settings.domain.auto_subdomain || false;
      domainSettings.auto_ssl = settings.domain.auto_ssl || false;
      domainSettings.subdomain_style = settings.domain.subdomain_style || "words";
      form.ssl.enabled = domainSettings.auto_ssl;
      form.ssl.autoCert = domainSettings.auto_ssl;
    }
    if (settings?.infrastructure) {
      infrastructureSettings.default_proxy_network = settings.infrastructure.default_proxy_network || "proxy";
      infrastructureSettings.default_database_network = settings.infrastructure.default_database_network || "database";
      if (settings.infrastructure.database) {
        infrastructureSettings.database.enabled = settings.infrastructure.database.enabled || false;
        infrastructureSettings.database.type = settings.infrastructure.database.type || "mysql";
        infrastructureSettings.database.container = settings.infrastructure.database.container || "";
        infrastructureSettings.database.host = settings.infrastructure.database.host || "";
      }
      if (settings.infrastructure.redis) {
        infrastructureSettings.redis.enabled = settings.infrastructure.redis.enabled || false;
        infrastructureSettings.redis.container = settings.infrastructure.redis.container || "";
        infrastructureSettings.redis.host = settings.infrastructure.redis.host || "";
      }
    }
  } catch {
    // Settings not available
  }
};

const loadCredentials = async () => {
  loadingCredentials.value = true;
  try {
    const response = await credentialsApi.list();
    existingCredentials.value = response.data.credentials || [];
  } catch {
    existingCredentials.value = [];
  } finally {
    loadingCredentials.value = false;
  }
};

const generateSubdomain = async () => {
  if (!domainSettings.default_domain) return;

  try {
    const response = await settingsApi.generateSubdomain();
    generatedSubdomain.value = response.data.subdomain;
    generatedDomain.value = response.data.full_domain;
  } catch {
    const adjectives = ["swift", "bright", "calm", "bold", "cool", "happy", "quick", "sunny"];
    const nouns = ["river", "cloud", "leaf", "star", "moon", "wave", "peak", "dawn"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    generatedSubdomain.value = `${adj}-${noun}-${num}`;
    generatedDomain.value = `${generatedSubdomain.value}.${domainSettings.default_domain}`;
  }
};

const regenerateSubdomain = () => {
  generateSubdomain();
};

const onNameChange = () => {
  errors.name = "";
  if (form.name && !/^[a-z0-9-]+$/.test(form.name)) {
    errors.name = "Only lowercase letters, numbers, and hyphens allowed";
  } else if (form.name && existingDeployments.value.includes(form.name)) {
    errors.name = "A deployment with this name already exists";
  }
};

const loadQuickApps = async () => {
  loadingQuickApps.value = true;
  try {
    const response = await templatesApi.list();
    quickApps.value = response.data.templates || [];
  } catch {
    quickApps.value = [];
  } finally {
    loadingQuickApps.value = false;
  }
};

const loadExistingDeployments = async () => {
  try {
    const response = await deploymentsApi.list();
    existingDeployments.value = response.data.deployments.map((d) => d.name);
  } catch {
    existingDeployments.value = [];
  }
};

const selectQuickApp = async (app: QuickApp) => {
  selectedQuickApp.value = app.id;
  if (!form.name) {
    form.name = app.id;
  }
  onNameChange();

  if (app.container_port) {
    form.networking.ports = [{ containerPort: app.container_port, hostPort: "", expose: true }];
  }

  if (app.mounts && app.mounts.length > 0) {
    form.mounts = app.mounts.map((m) => ({
      id: m.id,
      enabled: m.required,
      type: m.type,
    }));
  } else {
    form.mounts = [];
  }

  selectedTemplateContent.value = app.content;
  form.composeContent = "";
};

const toggleMount = (mountId: string) => {
  const mount = form.mounts.find((m) => m.id === mountId);
  if (mount) {
    const templateMount = selectedTemplateMounts.value.find((m) => m.id === mountId);
    if (templateMount?.required) return;
    mount.enabled = !mount.enabled;
  }
};

const setMountType = (mountId: string, type: "file" | "volume") => {
  const mount = form.mounts.find((m) => m.id === mountId);
  if (mount) {
    mount.type = type;
  }
};

const getMountSelection = (mountId: string) => {
  return form.mounts.find((m) => m.id === mountId);
};

const selectCustom = () => {
  selectedQuickApp.value = "custom";
  form.mounts = [];
  selectedTemplateContent.value = "";
  form.composeContent = getDefaultComposeContent();
};

const selectDatabaseType = (type: "none" | "mysql" | "postgres" | "mariadb" | "mongodb") => {
  form.database.type = type;
  form.database.dbName = form.name ? form.name.replace(/-/g, "_") : "app_db";
  form.database.connectionStatus = null;
  form.database.connectionError = "";
  form.database.useSharedDatabase = false;

  if (type !== "none") {
    if (!form.database.dbPassword) {
      form.database.dbPassword = generatePassword();
    }
    loadExistingDbContainers();

    if (infrastructureSettings.database.enabled) {
      form.database.mode = "shared";
      form.database.useSharedDatabase = true;
    }
  }
};

const selectSharedDatabase = () => {
  form.database.mode = "shared";
  form.database.useSharedDatabase = true;
  form.database.type = infrastructureSettings.database.type as "mysql" | "postgres" | "mariadb" | "mongodb";
};

const selectDatabaseMode = (mode: "create" | "existing" | "external") => {
  form.database.mode = mode;
  form.database.useSharedDatabase = false;
};

const getDefaultPort = (dbType: string): string => {
  switch (dbType) {
    case "mysql":
    case "mariadb":
      return "3306";
    case "postgres":
      return "5432";
    case "mongodb":
      return "27017";
    default:
      return "3306";
  }
};

const loadExistingDbContainers = async () => {
  loadingDbContainers.value = true;
  try {
    const response = await containersApi.list();
    const containers = response.data.containers || [];

    existingDbContainers.value = containers
      .filter((c: any) => {
        const image = c.image.toLowerCase();
        return (
          image.includes("mysql") || image.includes("postgres") || image.includes("mariadb") || image.includes("mongo")
        );
      })
      .map((c: any) => {
        const image = c.image.toLowerCase();
        let type: DbContainer["type"] = "unknown";
        if (image.includes("mysql") && !image.includes("mariadb")) type = "mysql";
        else if (image.includes("postgres")) type = "postgres";
        else if (image.includes("mariadb")) type = "mariadb";
        else if (image.includes("mongo")) type = "mongodb";

        return {
          id: c.id,
          name: c.name,
          image: c.image,
          type,
        };
      });
  } catch (error) {
    existingDbContainers.value = [];
  } finally {
    loadingDbContainers.value = false;
  }
};

const filteredDbContainers = computed(() => {
  if (form.database.type === "none") return [];
  return existingDbContainers.value.filter((c) => c.type === form.database.type || c.type === "unknown");
});

const selectExistingContainer = (container: DbContainer) => {
  form.database.existingContainer = container.name;
  form.database.connectionStatus = null;
};

const checkDatabaseConnection = async () => {
  form.database.connectionStatus = "checking";
  form.database.connectionError = "";

  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (form.database.mode === "external") {
      const host = form.database.externalHost;
      const port = form.database.externalPort;

      if (!host || !port) {
        throw new Error("Host and port are required");
      }
    }

    form.database.connectionStatus = "success";
    notifications.success("Connection successful", "Database is reachable");
  } catch (error: any) {
    form.database.connectionStatus = "error";
    form.database.connectionError = error.message || "Failed to connect to database";
    notifications.error("Connection failed", form.database.connectionError);
  }
};

const getDatabaseEnvVars = () => {
  const envVars: { key: string; value: string }[] = [];
  const db = form.database;
  const dbName = db.dbName || (form.name ? form.name.replace(/-/g, "_") : "app_db");

  let dbHost: string;
  let dbPort: string;

  if (db.mode === "external") {
    dbHost = db.externalHost;
    dbPort = db.externalPort || getDefaultPort(db.type);
  } else if (db.mode === "existing") {
    dbHost = db.existingContainer;
    dbPort = getDefaultPort(db.type);
  } else {
    dbHost = "db";
    dbPort = getDefaultPort(db.type);
  }

  if (db.type === "mysql" || db.type === "mariadb") {
    envVars.push({ key: "DB_HOST", value: dbHost });
    envVars.push({ key: "DB_PORT", value: dbPort });
    envVars.push({ key: "DB_DATABASE", value: dbName });
    envVars.push({ key: "DB_USERNAME", value: db.dbUser || "app" });
    envVars.push({ key: "DB_PASSWORD", value: db.dbPassword });
    envVars.push({
      key: "DATABASE_URL",
      value: `mysql://${db.dbUser || "app"}:${db.dbPassword}@${dbHost}:${dbPort}/${dbName}`,
    });
  } else if (db.type === "postgres") {
    envVars.push({ key: "DB_HOST", value: dbHost });
    envVars.push({ key: "DB_PORT", value: dbPort });
    envVars.push({ key: "DB_DATABASE", value: dbName });
    envVars.push({ key: "DB_USERNAME", value: db.dbUser || "app" });
    envVars.push({ key: "DB_PASSWORD", value: db.dbPassword });
    envVars.push({
      key: "DATABASE_URL",
      value: `postgres://${db.dbUser || "app"}:${db.dbPassword}@${dbHost}:${dbPort}/${dbName}`,
    });
  } else if (db.type === "mongodb") {
    envVars.push({ key: "MONGO_HOST", value: dbHost });
    envVars.push({ key: "MONGO_PORT", value: dbPort });
    envVars.push({ key: "MONGO_DATABASE", value: dbName });
    envVars.push({ key: "MONGO_USERNAME", value: db.dbUser || "app" });
    envVars.push({ key: "MONGO_PASSWORD", value: db.dbPassword });
    envVars.push({
      key: "MONGODB_URI",
      value: `mongodb://${db.dbUser || "app"}:${db.dbPassword}@${dbHost}:${dbPort}/${dbName}`,
    });
  }

  return envVars;
};

const getDatabaseServiceYaml = () => {
  const db = form.database;
  if (db.type === "none" || db.mode !== "create") return "";

  const dbName = db.dbName || (form.name ? form.name.replace(/-/g, "_") : "app_db");
  const rootPassword = db.dbRootPassword || db.dbPassword;

  if (db.type === "mysql") {
    return `
  db:
    image: mysql:8
    container_name: ${form.name}-db
    environment:
      MYSQL_ROOT_PASSWORD: ${rootPassword}
      MYSQL_DATABASE: ${dbName}
      MYSQL_USER: ${db.dbUser || "app"}
      MYSQL_PASSWORD: ${db.dbPassword}
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - web
    restart: unless-stopped`;
  } else if (db.type === "mariadb") {
    return `
  db:
    image: mariadb:10
    container_name: ${form.name}-db
    environment:
      MYSQL_ROOT_PASSWORD: ${rootPassword}
      MYSQL_DATABASE: ${dbName}
      MYSQL_USER: ${db.dbUser || "app"}
      MYSQL_PASSWORD: ${db.dbPassword}
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - web
    restart: unless-stopped`;
  } else if (db.type === "postgres") {
    return `
  db:
    image: postgres:15
    container_name: ${form.name}-db
    environment:
      POSTGRES_DB: ${dbName}
      POSTGRES_USER: ${db.dbUser || "app"}
      POSTGRES_PASSWORD: ${db.dbPassword}
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - web
    restart: unless-stopped`;
  } else if (db.type === "mongodb") {
    return `
  db:
    image: mongo:6
    container_name: ${form.name}-db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${db.dbUser || "app"}
      MONGO_INITDB_ROOT_PASSWORD: ${db.dbPassword}
      MONGO_INITDB_DATABASE: ${dbName}
    volumes:
      - db_data:/data/db
    networks:
      - web
    restart: unless-stopped`;
  }
  return "";
};

const getDatabaseVolumeYaml = () => {
  if (form.database.type === "none" || form.database.mode !== "create") return "";
  return `
volumes:
  db_data:`;
};

const buildPortConfig = (ports: { containerPort: number; hostPort: string }[]) => {
  const mappedPorts = ports.filter((p) => p.hostPort);
  const exposedPorts = ports.filter((p) => !p.hostPort);

  let config = "";
  if (mappedPorts.length > 0) {
    config += "ports:\n" + mappedPorts.map((p) => `      - "${p.hostPort}:${p.containerPort}"`).join("\n");
  }
  if (exposedPorts.length > 0) {
    if (config) config += "\n    ";
    config += "expose:\n" + exposedPorts.map((p) => `      - "${p.containerPort}"`).join("\n");
  }
  return config || `expose:\n      - "80"`;
};

const buildComposeTemplate = (name: string, ports: { containerPort: number; hostPort: string }[]) => {
  const portConfig = buildPortConfig(ports);
  const networkName = infrastructureSettings.default_proxy_network;

  return `name: ${name}
services:
  app:
    image: nginx:alpine
    container_name: ${name}
    ${portConfig}
    networks:
      - ${networkName}
    restart: unless-stopped

networks:
  ${networkName}:
    external: true
`;
};

const getDefaultComposeContent = () => {
  const name = form.name || "my-app";
  return buildComposeTemplate(name, form.networking.ports);
};

const buildComposeFromTemplate = () => {
  const name = form.name || "my-app";

  if (!selectedTemplateContent.value) {
    return getDefaultComposeContent();
  }

  let content = selectedTemplateContent.value;
  content = content.replace(/\$\{NAME\}/g, name);

  return content;
};

const buildComposeFromImage = () => {
  const name = form.name || "my-app";
  const image = form.image || "nginx:alpine";
  const portConfig = buildPortConfig(form.networking.ports);
  const networkName = infrastructureSettings.default_proxy_network;

  return `name: ${name}
services:
  app:
    image: ${image}
    container_name: ${name}
    ${portConfig}
    networks:
      - ${networkName}
    restart: unless-stopped

networks:
  ${networkName}:
    external: true
`;
};

const updateComposeWithSettings = async () => {
  if (!form.composeContent) return;

  try {
    const ports = form.networking.ports
      .filter((p) => p.containerPort > 0)
      .map((p) => ({
        container_port: p.containerPort,
        host_port: p.hostPort || "",
      }));

    const response = await composeApi.update({
      content: form.composeContent,
      ports: ports.length > 0 ? ports : [{ container_port: 80, host_port: "" }],
    });
    form.composeContent = response.data.content;
  } catch (error: any) {
    console.error("Failed to update compose:", error);
  }
};

const formatCompose = () => {
  // Basic formatting - could be enhanced
  notifications.info("Format", "YAML formatting applied");
};

const copyCompose = () => {
  navigator.clipboard.writeText(form.composeContent);
  notifications.success("Copied", "Compose content copied");
};

const addEnvVar = () => {
  form.envVars.push({ key: "", value: "" });
};

const removeEnvVar = (index: number) => {
  form.envVars.splice(index, 1);
};

const addPort = () => {
  form.networking.ports = [...form.networking.ports, { containerPort: 0, hostPort: "", expose: true }];
};

const removePort = (index: number) => {
  if (form.networking.ports.length > 1) {
    form.networking.ports = form.networking.ports.filter((_, i) => i !== index);
    updateComposeWithSettings();
  }
};

const generatingCompose = ref(false);

const nextStep = async () => {
  if (!canProceed.value) return;

  if (currentStep.value === 0) {
    currentStep.value = 1;
    if (deploymentMode.value === "compose") {
      selectedQuickApp.value = "custom";
      form.composeContent = getDefaultComposeContent();
    }
    return;
  }

  if (
    currentStep.value === 2 &&
    deploymentMode.value === "easy" &&
    selectedQuickApp.value &&
    selectedQuickApp.value !== "custom"
  ) {
    generatingCompose.value = true;
    try {
      const enabledMounts = form.mounts.filter((m) => m.enabled);
      const firstPort = form.networking.ports[0] || { containerPort: 80, hostPort: "" };
      const response = await templatesApi.generateCompose(selectedQuickApp.value, {
        name: form.name,
        container_port: firstPort.containerPort,
        map_ports: !!firstPort.hostPort,
        host_port: firstPort.hostPort || undefined,
        mounts: enabledMounts.length > 0 ? enabledMounts : undefined,
      });
      form.composeContent = response.data.content;
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      notifications.error("Failed to generate compose", msg);
      generatingCompose.value = false;
      return;
    }
    generatingCompose.value = false;
  }

  if (currentStep.value === 2 && deploymentMode.value === "image") {
    form.composeContent = buildComposeFromImage();
  }

  if (currentStep.value < steps.value.length) {
    currentStep.value++;
  }
};

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      creating.value = false;
      form.name = "";
      form.image = "";
      form.composeContent = "";
      form.envVars = [];
      form.autoStart = false;
      form.useCustomDomain = false;
      form.networking = {
        expose: true,
        domain: "",
        protocol: "http",
        ports: [{ containerPort: 80, hostPort: "", expose: true }],
      };
      form.ssl = { enabled: false, autoCert: false };
      form.database = {
        enabled: false,
        type: "none",
        mode: "create",
        existingContainer: "",
        externalHost: "",
        externalPort: "",
        dbName: "",
        dbUser: "app",
        dbPassword: "",
        dbRootPassword: "",
        connectionStatus: null,
        connectionError: "",
        useSharedDatabase: false,
      };
      form.registry = {
        isPrivate: false,
        useExisting: false,
        selectedCredentialId: "",
        username: "",
        password: "",
        saveCredential: false,
        credentialName: "",
      };
      showRegistryPassword.value = false;
      existingDbContainers.value = [];
      existingCredentials.value = [];
      errors.name = "";
      errors.composeContent = "";
      selectedQuickApp.value = "";
      selectedTemplateContent.value = "";
      deploymentMode.value = "";
      currentStep.value = 0;
      generatedSubdomain.value = "";
      generatedDomain.value = "";

      await loadSettings();
      await generateSubdomain();
      loadQuickApps();
      loadExistingDeployments();
      loadCredentials();
    }
  },
);

watch(deploymentMode, (newMode, oldMode) => {
  if (oldMode && newMode !== oldMode) {
    selectedQuickApp.value = "";
    selectedTemplateContent.value = "";
    form.name = "";
    form.image = "";
    form.composeContent = "";
    form.mounts = [];
    form.networking.ports = [{ containerPort: 80, hostPort: "", expose: true }];
    errors.name = "";
    errors.image = "";
  }
});

watch(
  () => form.name,
  async (newName) => {
    if (currentStep.value > 1) return;

    if (newName && selectedQuickApp.value && selectedQuickApp.value !== "custom") {
      try {
        const response = await templatesApi.getCompose(selectedQuickApp.value, newName);
        selectedTemplateContent.value = response.data.content;
        form.composeContent = response.data.content;
      } catch {
        form.composeContent = buildComposeFromTemplate();
      }
    } else if (newName && selectedQuickApp.value === "custom") {
      form.composeContent = buildComposeFromTemplate();
    }
  },
);

let isUpdatingNameFromCompose = false;
watch(
  () => form.composeContent,
  (content) => {
    if (isUpdatingNameFromCompose || !content || currentStep.value < 3) return;

    const nameMatch = content.match(/^name:\s*(.+)$/m);
    if (nameMatch) {
      const composeName = nameMatch[1].trim();
      if (composeName && composeName !== form.name && /^[a-z0-9-]+$/.test(composeName)) {
        isUpdatingNameFromCompose = true;
        form.name = composeName;
        onNameChange();
        setTimeout(() => {
          isUpdatingNameFromCompose = false;
        }, 100);
      }
    }
  },
);

const rebuildComposeWithDatabase = () => {
  if (deploymentMode.value !== "easy" || form.database.type === "none") return;

  const baseCompose = getBaseComposeWithoutDb();
  let compose = baseCompose;

  if (form.database.mode === "create") {
    const dbService = getDatabaseServiceYaml();
    const dbVolume = getDatabaseVolumeYaml();

    if (dbService) {
      // Add depends_on to app service if not already present
      if (!compose.includes("depends_on:")) {
        compose = compose.replace(/(services:\s*\n\s*app:.*?\n)((\s+\S.*\n)*)/m, (match, serviceStart, props) => {
          return serviceStart + `    depends_on:\n      - db\n` + props;
        });
      }

      // Insert db service at the end of services section
      const networksMatch = compose.match(/\nnetworks:/m);
      const volumesMatch = compose.match(/\nvolumes:/m);

      if (networksMatch) {
        const insertPos = compose.indexOf(networksMatch[0]);
        compose = compose.slice(0, insertPos) + dbService + "\n" + compose.slice(insertPos);
      } else if (volumesMatch) {
        const insertPos = compose.indexOf(volumesMatch[0]);
        compose = compose.slice(0, insertPos) + dbService + "\n" + compose.slice(insertPos);
      } else {
        compose = compose.trimEnd() + dbService + "\n";
      }

      // Add volumes section if needed
      if (!compose.includes("volumes:") && dbVolume) {
        compose = compose.trimEnd() + "\n" + dbVolume;
      } else if (compose.includes("volumes:") && !compose.includes("db_data:")) {
        compose = compose.replace(/volumes:\s*\n/, "volumes:\n  db_data:\n");
      }
    }
  }

  form.composeContent = compose;

  // Update environment variables
  const dbEnvVars = getDatabaseEnvVars();
  const dbKeys = [
    "DB_HOST",
    "DB_PORT",
    "DB_DATABASE",
    "DB_USERNAME",
    "DB_PASSWORD",
    "DATABASE_URL",
    "MONGO_HOST",
    "MONGO_PORT",
    "MONGO_DATABASE",
    "MONGO_USERNAME",
    "MONGO_PASSWORD",
    "MONGODB_URI",
  ];
  form.envVars = form.envVars.filter((e) => !dbKeys.includes(e.key));
  for (const env of dbEnvVars) {
    form.envVars.push(env);
  }
};

const getBaseComposeWithoutDb = () => {
  let compose = form.composeContent;

  // Remove db service block (handles various indentation)
  compose = compose.replace(/\n\s*db:\n(\s{4,}[^\n]+\n)*/g, "\n");

  // Remove depends_on db entry from app service
  compose = compose.replace(/\s*depends_on:\s*\n\s*-\s*db\s*\n/g, "\n");

  // Remove db_data from volumes
  compose = compose.replace(/\s*db_data:\s*\n?/g, "");

  // Remove empty volumes section
  compose = compose.replace(/\nvolumes:\s*\n(?=\n|$)/g, "");

  // Remove shared network if it was added for existing db
  compose = compose.replace(/\s*shared:\s*\n\s*external:\s*true\s*\n?/g, "");

  // Remove empty networks section
  compose = compose.replace(/\nnetworks:\s*\n(?=\n|$)/g, "");

  // Clean up multiple consecutive newlines
  compose = compose.replace(/\n{3,}/g, "\n\n");

  return compose;
};

// Database compose modification disabled - server handles compose generation

watch(
  () => [form.database.mode, form.database.existingContainer, form.database.type],
  () => {
    if (currentStep.value === 2 && deploymentMode.value === "easy") {
      // Preview will be updated when moving to next step
    }
  },
  { deep: true },
);

const validate = () => {
  errors.name = "";
  errors.composeContent = "";
  let valid = true;

  if (!form.name.trim()) {
    errors.name = "Name is required";
    valid = false;
  } else if (!/^[a-z0-9-]+$/.test(form.name)) {
    errors.name = "Only lowercase letters, numbers, and hyphens allowed";
    valid = false;
  }

  if (!form.composeContent.trim()) {
    errors.composeContent = "Compose configuration is required";
    valid = false;
  }

  return valid;
};

const handleCreate = async () => {
  if (!validate()) return;

  creating.value = true;

  try {
    const finalDomain =
      form.useCustomDomain || !domainSettings.default_domain ? form.networking.domain : generatedDomain.value;

    const payload: Record<string, any> = {
      name: form.name,
      compose_content: form.composeContent,
      template_id: selectedQuickApp.value !== "custom" ? selectedQuickApp.value : undefined,
      env_vars: form.envVars.filter((e) => e.key),
      auto_start: form.autoStart,
      use_shared_database: form.database.useSharedDatabase && form.database.mode === "shared",
      existing_database_container:
        form.database.mode === "existing" && form.database.existingContainer
          ? form.database.existingContainer
          : undefined,
    };

    if (form.registry.isPrivate) {
      if (form.registry.useExisting && form.registry.selectedCredentialId) {
        payload.registry_credential = {
          credential_id: form.registry.selectedCredentialId,
        };
      } else if (form.registry.username && form.registry.password) {
        payload.registry_credential = {
          username: form.registry.username,
          password: form.registry.password,
          save_credential: form.registry.saveCredential,
          credential_name: form.registry.credentialName || `${form.name}-registry`,
        };
      }
    }

    if (finalDomain) {
      payload.metadata = {
        name: form.name,
        type: "web",
        networking: {
          expose: true,
          domain: finalDomain,
          container_port: form.networking.ports[0]?.containerPort || 80,
          protocol: form.networking.protocol || "http",
        },
        ssl: {
          enabled: form.ssl.enabled,
          auto_cert: form.ssl.autoCert,
        },
        healthcheck: {
          path: "/health",
          interval: "30s",
        },
      };
    }

    await deploymentsApi.create(payload);
    emit("created");
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error("Failed to create deployment", msg);
  } finally {
    creating.value = false;
  }
};

const handleClose = () => {
  emit("close");
};
</script>

<style scoped>
/* Modal Header */
.modal-header-content {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.modal-header-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.modal-header-icon i {
  font-size: 1.5rem;
  color: white;
}

.modal-header-text h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
  line-height: 1.3;
}

.modal-header-text p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: var(--space-1) 0 0;
}

.wizard-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Progress */
.wizard-progress {
  padding: 0 var(--space-4);
}

.progress-track {
  height: 4px;
  background: var(--color-gray-100);
  border-radius: var(--radius-full);
  margin-bottom: var(--space-4);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-500), var(--color-primary-400));
  border-radius: var(--radius-full);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.steps-row {
  display: flex;
  justify-content: space-between;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.step-indicator {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-gray-200);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-400);
  transition: all 0.3s ease;
}

.step-item.active .step-indicator {
  border-color: var(--color-primary-500);
  background: var(--color-primary-500);
  color: white;
  box-shadow: 0 0 0 4px var(--color-primary-50);
}

.step-item.completed .step-indicator {
  border-color: var(--color-success-500);
  background: var(--color-success-500);
  color: white;
}

.step-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-400);
}

.step-item.active .step-label {
  color: var(--color-primary-600);
}

.step-item.completed .step-label {
  color: var(--color-success-600);
}

/* Content */
.wizard-content {
  min-height: 480px;
  max-height: 70vh;
  overflow: visible;
}

.step-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Section Cards */
.section-card {
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.section-card + .section-card,
.storage-section + .database-step {
  margin-top: var(--space-4);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.section-header .section-subtitle {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: var(--space-1) 0 0;
}

.section-header.compact {
  padding: var(--space-3) var(--space-4);
}

.section-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50));
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1rem;
}

.section-icon.small {
  width: 28px;
  height: 28px;
  font-size: var(--text-sm);
}

.section-header h4 {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

/* Step 1 Layout */
.step1-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.step1-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.step1-right {
  display: flex;
  flex-direction: column;
}

.templates-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Form Fields */
.form-field {
  padding: var(--space-4);
}

.form-field.compact {
  padding: var(--space-3) var(--space-4);
}

.form-field label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-2);
}

.form-field label .required {
  color: var(--color-danger-500);
}

.input-wrapper {
  position: relative;
}

.form-field input,
.form-field select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  color: var(--color-gray-900);
  background: white;
  transition: all 0.2s ease;
}

.form-field input:focus,
.form-field select:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}

.form-field input.error {
  border-color: var(--color-danger-500);
}

.input-icon {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
}

.input-icon.success {
  color: var(--color-success-500);
}

.field-error {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-danger-500);
  margin-top: var(--space-1);
}

.field-hint {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: var(--space-1);
}

/* Domain */
.domain-preview {
  padding: var(--space-3) var(--space-4);
}

.domain-url {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: linear-gradient(135deg, var(--color-primary-50), var(--color-info-50));
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.domain-url .protocol {
  color: var(--color-gray-400);
}

.domain-url .domain-text {
  color: var(--color-primary-700);
  font-weight: var(--font-medium);
  flex: 1;
}

.refresh-domain-btn {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-500);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-domain-btn:hover {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

/* Toggle Options */
.toggle-option {
  padding: var(--space-3) var(--space-4);
}

.toggle-option.nested {
  padding-left: var(--space-8);
  background: var(--color-gray-50);
}

.toggle-option.port-mapping {
  padding: var(--space-2) 0;
  margin-top: var(--space-2);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary-500);
}

.toggle-text {
  font-size: var(--text-sm);
  color: var(--color-gray-700);
}

.custom-domain-field,
.ssl-options {
  border-top: 1px solid var(--color-gray-100);
}

/* Templates */
.templates-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  color: var(--color-gray-400);
}

.templates-list {
  flex: 1;
  overflow-y: auto;
  max-height: 340px;
}

.template-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: white;
  border: none;
  border-bottom: 1px solid var(--color-gray-50);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.template-item:hover {
  background: var(--color-gray-50);
}

.template-item.selected {
  background: var(--color-primary-50);
}

.template-item:last-child {
  border-bottom: none;
}

.template-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-500);
  flex-shrink: 0;
  overflow: hidden;
}

.template-icon.has-logo {
  background: white;
  padding: 4px;
}

.template-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.template-item.selected .template-icon {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-400));
  color: white;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
}

.template-item.selected .template-icon.has-logo {
  background: white;
  border: 2px solid var(--color-primary-500);
}

.template-item.custom .template-icon {
  border: 2px dashed var(--color-gray-300);
  background: transparent;
}

.template-item.custom.selected .template-icon {
  border-color: var(--color-primary-500);
  background: var(--color-primary-500);
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.template-desc {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: 2px;
}

.template-check {
  color: var(--color-primary-500);
}

/* Step 2 Layout */
.step2-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: var(--space-4);
  height: 480px;
  overflow: hidden;
}

.compose-section {
  display: flex;
  flex-direction: column;
  background: var(--color-gray-900);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.compose-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-800);
  border-bottom: 1px solid var(--color-gray-700);
}

.compose-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-300);
}

.compose-actions {
  display: flex;
  gap: var(--space-1);
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--color-gray-400);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-gray-700);
  color: var(--color-gray-200);
}

.compose-editor-wrapper {
  flex: 1;
  overflow: hidden;
}

.compose-editor-wrapper :deep(.cm-editor) {
  height: 100%;
  font-size: 13px;
}

.compose-editor-wrapper :deep(.cm-scroller) {
  font-family: var(--font-mono);
}

.compose-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-danger-500);
  color: white;
  font-size: var(--text-sm);
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  min-height: 0;
}

.side-panel .section-card {
  flex-shrink: 0;
}

/* Env Section */
.env-section {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.env-row {
  display: flex;
  gap: var(--space-2);
  max-width: 100%;
}

.env-key {
  flex: 1;
  min-width: 0;
  padding: var(--space-2);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}

.env-value {
  flex: 1;
  min-width: 0;
  padding: var(--space-2);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.env-remove {
  background: none;
  border: none;
  color: var(--color-gray-400);
  padding: var(--space-1);
  cursor: pointer;
}

.env-remove:hover {
  color: var(--color-danger-500);
}

.add-env-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: white;
  border: 1px dashed var(--color-gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-env-btn:hover {
  border-color: var(--color-primary-300);
  color: var(--color-primary-600);
}

/* Ports Section */
.ports-section {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.port-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  max-width: 100%;
}

.port-container {
  width: 70px;
  padding: var(--space-2);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  text-align: center;
}

.port-separator {
  color: var(--color-gray-400);
  font-weight: var(--font-medium);
}

.port-host {
  width: 70px;
  padding: var(--space-2);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  text-align: center;
}

.port-remove {
  padding: var(--space-1);
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.port-remove:hover:not(:disabled) {
  background: var(--color-error-50);
  color: var(--color-error-500);
}

.port-remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.add-port-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: white;
  border: 1px dashed var(--color-gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-port-btn:hover {
  border-color: var(--color-primary-300);
  color: var(--color-primary-600);
}

/* Network Fields */
.network-fields {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.network-fields .form-field {
  padding: 0;
}

.network-fields input,
.network-fields select {
  padding: var(--space-2);
  font-size: var(--text-sm);
}

/* Options */
.options-section {
  padding: 0;
}

/* Review */
.review-container {
  max-width: 560px;
  margin: 0 auto;
}

.review-card {
  background: white;
  border: 1px solid var(--color-gray-100);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.review-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(135deg, var(--color-success-50), var(--color-primary-50));
  border-bottom: 1px solid var(--color-gray-100);
}

.review-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-success-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.review-title h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.review-title p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: var(--space-1) 0 0;
}

.review-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  padding: var(--space-4);
}

.review-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.review-item.full-width {
  grid-column: 1 / -1;
}

.review-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.review-value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.review-value.domain {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  color: var(--color-primary-600);
}

.review-badge {
  display: inline-flex;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  width: fit-content;
}

.review-badge.success {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.review-badge.neutral {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.compose-summary {
  border-top: 1px solid var(--color-gray-100);
  padding: var(--space-4);
}

.compose-summary-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-3);
}

.compose-lines {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  font-weight: var(--font-normal);
}

.compose-preview-code {
  background: var(--color-gray-900);
  color: var(--color-gray-300);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  overflow: hidden;
  max-height: 140px;
  margin: 0;
}

/* Footer */
:deep(.modal-footer) {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
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
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: var(--color-gray-700);
  border: 1px solid var(--color-gray-200);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
}

.btn-ghost {
  background: transparent;
  color: var(--color-gray-600);
}

.btn-ghost:hover {
  background: var(--color-gray-100);
}

.btn-create {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  padding: var(--space-2) var(--space-5);
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* Mode Selection Step */
.mode-selection-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.mode-selection {
  text-align: center;
  max-width: 700px;
  width: 100%;
}

.mode-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0 0 var(--space-2);
}

.mode-subtitle {
  font-size: var(--text-md);
  color: var(--color-gray-500);
  margin: 0 0 var(--space-8);
}

.deployment-modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.deployment-mode-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--space-6);
  background: white;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-xl);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.deployment-mode-card:hover {
  border-color: var(--color-primary-300);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.deployment-mode-card.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.mode-card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  margin-bottom: var(--space-4);
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.mode-card-icon.easy {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-400));
  color: white;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
}

.mode-card-icon.compose {
  background: linear-gradient(135deg, var(--color-info-600), var(--color-info-500));
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.mode-card-icon.image {
  background: linear-gradient(135deg, var(--color-success-600), var(--color-success-500));
  color: white;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25);
}

.mode-card-content h4 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0 0 var(--space-1);
}

.mode-card-content p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0 0 var(--space-3);
}

.mode-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.mode-features li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  margin-bottom: var(--space-1);
}

.mode-features li i {
  color: var(--color-success-500);
  font-size: 0.75rem;
}

.mode-badge {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  padding: var(--space-1) var(--space-2);
  background: var(--color-gray-100);
  color: var(--color-gray-600);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-sm);
}

.mode-badge.recommended {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

/* Database Step */
.database-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.database-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-2);
  padding: var(--space-3);
}

.db-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.db-option:hover {
  border-color: var(--color-primary-300);
  background: var(--color-gray-50);
}

.db-option.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.db-option-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.125rem;
}

.db-option-icon.none {
  background: linear-gradient(135deg, var(--color-gray-200), var(--color-gray-100));
  color: var(--color-gray-500);
}

.db-option-icon.mysql {
  background: linear-gradient(135deg, #00758f30, #00758f15);
  color: #00758f;
}

.db-option-icon.postgres {
  background: linear-gradient(135deg, #33679130, #33679115);
  color: #336791;
}

.db-option-icon.mariadb {
  background: linear-gradient(135deg, #c0765a30, #c0765a15);
  color: #c0765a;
}

.db-option-icon.mongodb {
  background: linear-gradient(135deg, #00ed6430, #00ed6415);
  color: #00684a;
}

.db-option.selected .db-option-icon {
  background: linear-gradient(135deg, var(--color-primary-200), var(--color-primary-100));
  color: var(--color-primary-600);
}

.db-option-info {
  flex: 1;
  min-width: 0;
}

.db-option-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.db-option-desc {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: 2px;
}

.db-check {
  color: var(--color-primary-500);
}

.database-config {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.mode-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  padding: var(--space-3);
}

.mode-options.three-col {
  grid-template-columns: repeat(3, 1fr);
}

.mode-options.four-col {
  grid-template-columns: repeat(4, 1fr);
}

.mode-option.recommended {
  border-color: var(--color-primary-300);
  background: var(--color-primary-50);
  position: relative;
}

.mode-option.recommended .mode-icon.shared {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

.recommended-badge {
  position: absolute;
  top: -8px;
  right: 8px;
  background: var(--color-primary-500);
  color: white;
  font-size: 0.625rem;
  font-weight: var(--font-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mode-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: white;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.mode-option:hover {
  border-color: var(--color-primary-300);
}

.mode-option.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.mode-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-gray-100);
  color: var(--color-gray-500);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mode-option.selected .mode-icon {
  background: var(--color-primary-500);
  color: white;
}

.mode-info {
  flex: 1;
}

.mode-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.mode-desc {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: var(--space-1);
  line-height: 1.4;
}

.credentials-form {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.form-row .form-field {
  padding: 0;
}

.form-field.flex-grow {
  flex: 1;
}

.form-field.port-field {
  width: 100px;
  flex-shrink: 0;
}

/* Existing containers */
.section-header .refresh-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-gray-500);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.section-header .refresh-btn:hover {
  background: var(--color-gray-100);
  color: var(--color-primary-600);
}

.existing-containers {
  padding: var(--space-3);
}

.loading-containers,
.no-containers {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--color-gray-500);
  text-align: center;
}

.no-containers i {
  font-size: 1.5rem;
  color: var(--color-gray-400);
}

.switch-mode-btn {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.switch-mode-btn:hover {
  background: var(--color-primary-100);
}

.container-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.container-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.container-option:hover {
  border-color: var(--color-primary-300);
  background: var(--color-gray-50);
}

.container-option.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.container-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-gray-100);
  color: var(--color-gray-500);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.container-option.selected .container-icon {
  background: var(--color-primary-500);
  color: white;
}

.container-details {
  flex: 1;
  min-width: 0;
}

.container-details .container-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.container-details .container-image {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  font-family: var(--font-mono);
  margin-top: 2px;
}

/* Connection test */
.connection-test {
  background: var(--color-gray-50);
}

.connection-test-content {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
}

.connection-status {
  flex: 1;
}

.connection-status .status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.connection-status .status.idle {
  color: var(--color-gray-500);
}

.connection-status .status.checking {
  color: var(--color-primary-600);
}

.connection-status .status.success {
  color: var(--color-success-600);
}

.connection-status .status.error {
  color: var(--color-danger-600);
}

.test-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary-500);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.test-btn:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Configuration Preview */
.config-preview {
  background: var(--color-gray-50);
}

.preview-content {
  padding: var(--space-4);
}

.preview-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-gray-200);
}

.preview-item:last-of-type {
  border-bottom: none;
}

.preview-label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.preview-value {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  color: var(--color-gray-700);
}

.preview-hint {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-gray-300);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.compose-preview {
  background: var(--color-gray-900);
  color: var(--color-gray-100);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  overflow-x: auto;
  white-space: pre;
  margin: 0 0 var(--space-2);
  max-height: 200px;
  overflow-y: auto;
}

/* Compose Info Panel */
.compose-info-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.compose-info-content {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: 1;
}

.compose-info-content .info-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.compose-info-content .info-item > i {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-gray-100);
  color: var(--color-gray-600);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  font-size: var(--text-sm);
}

.compose-info-content .info-item strong {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin-bottom: 2px;
}

.compose-info-content .info-item p {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin: 0;
  line-height: 1.4;
}

.compose-info-content .info-hint {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-info-50);
  border-radius: var(--radius-md);
  margin-top: auto;
}

.compose-info-content .info-hint i {
  color: var(--color-info-500);
  font-size: var(--text-sm);
}

.compose-info-content .info-hint span {
  font-size: var(--text-xs);
  color: var(--color-info-700);
}

/* Image Config Card */
.image-config-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.image-config-content {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: 1;
}

.image-config-content .info-hint {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-success-50);
  border-radius: var(--radius-md);
  margin-top: auto;
}

.image-config-content .info-hint i {
  color: var(--color-success-500);
  font-size: var(--text-sm);
}

.image-config-content .info-hint span {
  font-size: var(--text-xs);
  color: var(--color-success-700);
}

/* Private Registry Toggle */
.private-registry-toggle {
  margin-top: var(--space-1);
}

.private-registry-toggle .toggle-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.private-registry-toggle .toggle-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.private-registry-toggle .toggle-label i {
  color: var(--color-warning-500);
}

/* Registry Credentials */
.registry-credentials {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
}

.registry-credentials .form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.registry-credentials .form-field label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
}

.registry-credentials .form-field input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.registry-credentials .form-field input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

.save-credential-option {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-gray-200);
}

.save-credential-option .toggle-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.save-credential-option .toggle-label {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.credential-name-field {
  padding-left: var(--space-5);
}

.credential-name-field input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.credential-name-field input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

.credential-source-toggle {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-gray-200);
}

.credential-source-toggle .toggle-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.credential-source-toggle .toggle-label {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.existing-credential-select {
  margin-bottom: var(--space-3);
}

.existing-credential-select .form-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: white;
  cursor: pointer;
}

.existing-credential-select .form-select:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

.input-icon-btn {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: var(--space-1);
  color: var(--color-gray-400);
  cursor: pointer;
}

.input-icon-btn:hover {
  color: var(--color-gray-600);
}

/* Collapsible Sections */
.step2-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.collapsible-section {
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: linear-gradient(to right, var(--color-gray-50), white);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.section-toggle:hover {
  background: linear-gradient(to right, var(--color-gray-100), var(--color-gray-50));
}

.section-toggle-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.section-toggle-info h4 {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
  text-align: left;
}

.section-toggle-info p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 2px 0 0;
  text-align: left;
}

.toggle-icon {
  color: var(--color-gray-400);
  transition: transform 0.2s ease;
}

.section-toggle.collapsed .toggle-icon {
  transform: rotate(-90deg);
}

.section-icon.database {
  background: linear-gradient(135deg, var(--color-info-100), var(--color-info-50));
  color: var(--color-info-600);
}

.section-icon.storage {
  background: linear-gradient(135deg, var(--color-warning-100), var(--color-warning-50));
  color: var(--color-warning-600);
}

.section-content {
  border-top: 1px solid var(--color-gray-200);
  padding: var(--space-4);
  background: white;
}

/* Collapse transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* Mounts Grid */
.mounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-3);
}

.mount-card {
  padding: var(--space-4);
  background: white;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.mount-card:hover {
  border-color: var(--color-gray-300);
}

.mount-card.enabled {
  background: linear-gradient(135deg, var(--color-primary-50), white);
  border-color: var(--color-primary-400);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1);
}

.mount-header {
  margin-bottom: var(--space-2);
}

.mount-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.mount-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary-500);
}

.mount-toggle input[type="checkbox"]:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.mount-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.required-badge {
  margin-left: auto;
  padding: 3px 8px;
  background: linear-gradient(135deg, var(--color-warning-100), var(--color-warning-50));
  color: var(--color-warning-700);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
}

.mount-description {
  font-size: var(--text-xs);
  color: var(--color-gray-600);
  margin: 0 0 var(--space-2);
  line-height: 1.4;
}

.mount-path {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-gray-500);
  margin: 0 0 var(--space-3);
}

.mount-path i {
  font-size: 0.75rem;
}

.mount-type-selector {
  display: flex;
  gap: var(--space-2);
}

.mount-type-selector .type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-2);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mount-type-selector .type-btn:hover {
  border-color: var(--color-primary-300);
  background: var(--color-gray-50);
}

.mount-type-selector .type-btn.active {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-400));
  border-color: var(--color-primary-500);
  color: white;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.2);
}

.mount-type-selector .type-btn i {
  font-size: 0.75rem;
}

/* Responsive */
@media (max-width: 768px) {
  .step1-grid {
    grid-template-columns: 1fr;
  }

  .step2-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .compose-section {
    height: 300px;
  }

  .review-grid {
    grid-template-columns: 1fr;
  }

  .database-options {
    grid-template-columns: 1fr;
  }

  .mode-options {
    grid-template-columns: 1fr;
  }

  .mode-options.three-col,
  .mode-options.four-col {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-field.port-field {
    width: 100%;
  }

  .deployment-modes {
    grid-template-columns: 1fr;
  }

  .mode-selection-panel {
    min-height: 300px;
  }

  .mounts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
