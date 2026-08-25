# Changelog

## [0.4.0-beta.7] - 2026-08-23

### Added
- Container memory utilization for percentage-based alert rules and dashboard panels

### Fixed
- Deployment domain summaries show the target service and container port

## [0.4.0-beta.6] - 2026-08-23

### Added
- Guided Fleet setup, peer access controls, runtime provider selection, and remote deployment inventories
- Deployment autoscaling configuration with workload compatibility and activation guidance
- Grouped notification incidents with editable targets and delivery rules
- HTTP, TCP, and container command health checks for web services and databases
- Full deployment details and management controls for permitted Fleet peers
- Service-specific HTTP, TCP, and command health check editing

### Changed
- Deployments show the selected server in the navigation and remain local by default
- Deployment configuration keeps scaling beside settings while service image changes remain in the overview

### Fixed
- Assigned local deployments load without Fleet access or Fleet availability
- Peer deployment lists reload when switching from an empty local server
- Peer deployment details open for users with read access
- Peer deployment details use the same overview, configuration, files, and actions as local deployments
- Object storage and notifications follow their dedicated permissions
- Operators no longer see Updates unless access is explicitly granted
- Read-only Settings access is clearly identified and its controls remain legible in dark mode
- User deployment grants can target a deployment on a specific Fleet server
- Host terminal and process controls are hidden unless system write access is explicitly granted
- Global certificate actions remain administrator-only while deployment certificates stay manageable

## [0.4.0-beta.4] - 2026-08-21

### Added
- Folder uploads and file browser actions for copying, moving, renaming, browsing archives, and extracting them
- Guided deployment diagnostics with incident lookup, configurable application health checks, response details, and log file selection from disk or a container

### Fixed
- Rebuild options and empty-state actions now use the shared design system
- Paused and incomplete health states use distinct status treatments

## [0.4.0-beta.3] - 2026-08-05

Third beta of the Albacore release, reworking the observability and logs experience.

### Added
- Observability console at `/observability` with a left rail that folds metrics, logs, alerts and dashboards into one place, replacing the separate sidebar entries
- Structured log view: one expandable row per entry coloured by level, multi-line entries (an exception and its stack trace) folded into a single row, JSON fields parsed out, and the raw terminal a toggle away
- Reading a deployment's own log files from the logs view, plus a fleet-wide Logs page for any deployment
- A Databases tab on the deployment detail, moved out of the overview

### Enhanced
- The observability screens are denser: the count cards became a compact strip, fleet and host charts split into tabs (fleet first) with a per-deployment filter, and the alerts screen moved to a stable two-column layout so firing alerts no longer push the rules around; network reads as a per-second rate
- The console scrolls its own body instead of the whole page, and the sidebar starts collapsed and remembers the choice, opening hover flyouts so grouped navigation stays reachable when collapsed

### Fixed
- A long unbreakable log line no longer widens the whole page
- A folded log entry keeps its expanded state as the live stream buffer slides, and log level detection matches the agent
- The "All logs" tail option now requests all logs instead of a hundred lines

## [0.4.0-beta.2] - 2026-08-01

Second beta of the Albacore release, continuing the work on top of beta.1. Some Albacore items remain in progress and are not in this beta.

### Added
- From Git option in the new-deployment flow: clone a repository and deploy its compose file, with a private repository authenticated by a saved credential or a token that can be saved for reuse
- Administration > Updates: the current version and the releases available on a channel (stable, or prereleases behind an opt-in), each with its changelog, installing the newest in one click behind the settings permission
- Host charts on the observability screen for host CPU, memory and disk, with an alert rule able to target a host metric; the host section is hidden when its endpoint is absent instead of breaking the view
- Agent scheduling from a cadence picker with a permissions selector instead of hand-typed frontmatter, and a per-agent list of past runs that open in the assistant
- Deleting a saved assistant conversation, behind a confirmation

### Enhanced
- An alert rule selects which notification targets it sends to (none selected means all) and can opt to restart the offending deployment when it fires, offered for container metrics only; a firing rule shows the containers that were using the most of the resource
- The new-deployment method picker is a vertical option list with Template recommended, replacing the four equal cards, so a further source is one more row rather than a tighter squeeze

### Fixed
- A notification target no longer disappears after a successful test and save; the filled-in draft is pulled into the list on save
- The Agents, API keys and users views referenced design tokens that do not exist, so borders and surfaces dropped out (the Agents editor input had no visible border in dark mode); all three now use the design system's real tokens

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
