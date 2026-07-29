# Changelog

## [0.4.0-beta.1] - 2026-07-29

First beta of the Albacore release. Some Albacore items remain in progress and are not in this beta.

### Added
- Observability views: container and per-deployment serving metrics as time-series charts over 6h and 24h ranges, threshold alerts, and live log following
- Dashboards screen to create, rename and delete dashboards and arrange panels over container and serving metrics
- Remote S3-compatible backup configuration (AWS, R2, B2, MinIO) alongside the local copy, with object-storage credentials entered as secrets
- Container file browser: bring a running service's files onto the host, edit them with the existing editor, and unmount tagged paths
- Per-IP security event trace showing each event's path, status, user agent and message
- Deployment-scoped AI file editor with per-call approval for state-changing tools; the env tab shares keys only and seeded session input is redacted
- MCP server settings tab
- AI chat session history: list saved sessions, most recent first, and reopen one to restore its transcript and scope
- Agents managed as flat markdown files, with a panel editor and starter template plus creation through the assistant
- Routing-only hostname entry in the domain form for externally-fronted proxies, separate from ordinary aliases
- Opt-in per-domain static-asset caching toggle
- Global search and an AI assistant entry point across the dashboard

### Enhanced
- Design refresh foundation: dark mode, design tokens and Iconify iconography
- Start/stop/restart run as background jobs with streamed output that survives a page reload
- Deployments list and dashboard rendering reworked so views load without waiting on everything at once

## [0.3.0] - 2026-06-08

### Added
- AI assistant across the dashboard: conversational sessions with a global entry point, inline allow/decline on tool calls, suggested actions, and AI provider settings
- Plan review flow: preview deployment mutations before applying them
- Optional app template selection for image and compose deploys; image mode prefills container port and mounts while keeping the user's image
- Security whitelist and detection threshold management from the dashboard
- Settings toggle for showing hidden files in the file manager by default (default on); the file manager starts from it

### Enhanced
- System terminal runs on the interactive PTY stream, reusing the container terminal component: full-screen and terminal-control programs work and resizes propagate
- Required template mounts are preselected but stay editable in every mode, and deselections stick

### Fixed
- Prompts composed by the product no longer appear in the assistant chat; only messages the user types are shown
- Any unauthorized API response is treated as an expired session

## [0.2.0] - 2026-05-25

### Added
- API key edit dialog with per-deployment access levels (read/write/admin)
- Shared `TabbedFormModal` and `DeploymentAccessField` components used by both user and API key dialogs
- Deployment protected-mode panel: blocked actions, blocked command rules, human-readable rule explanations
- System terminal protection panel in settings, sharing the same rule helpers
- System-wide file manager with chmod, file creation, hidden-file and system-folder toggles
- System-wide terminal view gated by a new permission
- Default landing on the user's home directory in the system file manager

### Enhanced
- File browser is now context-agnostic via an injected API adapter; row actions collapsed into an overflow menu
- Auth interceptor narrowed so a per-resource 401 no longer logs the user out
- Vite dev proxy tightened to a regex prefix so `/api-keys` is not swallowed by the `/api` rule

### Fixed
- Mount action restored in the deployment file browser after the file-manager refactor
- Stair-step rendering in the system terminal (line-feed conversion)
- Modal corners not rounded due to missing overflow clipping
- Blank initial render in the file view while the first listing was in flight
- Danger button colors falling back to white due to an undefined CSS variable

## [0.1.5] - 2026-03-22

### Added
- Setup wizard with guided onboarding flow
- Agent version compatibility check with min/max bounds
- Dev build detection with dismissable warning banner
- Service selector in cron job form with live API lookup
- Service selector in Domain & SSL Settings modal
- `getServices` API function for deployment service discovery

### Enhanced
- Shared `apiClient` across stores (removed setup store duplicate)
- Clipboard fallback for non-HTTPS environments
- Better error differentiation (network vs server) in setup store

### Fixed
- Removed hardcoded container names from compose templates
- Service dropdown resets when deployment changes in cron form
- Version warning persists in store for session duration

## [0.1.0] - 2026-03-19

### Added
- Deployment wizard with CodeMirror editor and domain configuration
- File browser and configuration editing
- Database management with SQL editor, table data browser, and schema view
- Container terminal with WebSocket shell
- Traffic dashboard with intelligent insights, IP blocking, and domain stats
- Security dashboard with configurable detection thresholds and health checks
- DNS management UI
- RBAC user interface with granular permissions and per-user overrides
- API key management
- Cron jobs management page
- Backups with async job polling
- Multi-domain and multi-database support in compose mode
- Private registry credentials support and pull image dialog
- Deployment card component with quick actions and shortcuts
- Infrastructure management and network configuration UI
- SSL certificate management
- Environment variable management
- Log viewer and container logs
- Cluster management view with environment selector
- Container resource management and server info with network health
- Stats store with real system metrics and optimized polling
- Resilient request handling for service restarts
- Plugin system with widget support
- i18n translation support
- Design system with standardized CSS variables
