# Changelog

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
