export interface Deployment {
  name: string;
  path: string;
  status: "running" | "stopped" | "error" | "unknown";
  created_at: string;
  updated_at: string;
  services?: Service[];
  metadata?: ServiceMetadata;
}

export interface Service {
  name: string;
  container_id: string;
  image: string;
  status: string;
  health?: string;
  ports?: string[];
  networks?: string[];
  created_at: string;
}

export interface ServiceMetadata {
  name: string;
  type: string;
  networking: NetworkingConfig;
  ssl: SSLConfig;
  healthcheck: HealthCheckConfig;
  quick_actions?: QuickAction[];
  security?: DeploymentSecurityConfig;
}

export interface QuickAction {
  id: string;
  name: string;
  command: string;
  description?: string;
  icon?: string;
  service?: string;
}

export interface NetworkingConfig {
  expose: boolean;
  domain: string;
  container_port: number;
  protocol: string;
  proxy_type?: string;
}

export interface SSLConfig {
  enabled: boolean;
  auto_cert: boolean;
}

export interface HealthCheckConfig {
  path: string;
  interval: string;
}

export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
  subnet: string;
  gateway: string;
  containers: NetworkContainer[];
  labels: Record<string, string>;
  created: string;
}

export interface NetworkContainer {
  name: string;
  ipv4: string;
  mac_address: string;
}

export interface Certificate {
  domain: string;
  issuer: string;
  not_before: string;
  not_after: string;
  days_left: number;
  status: "valid" | "expiring" | "expired";
  path: string;
  auto_renew?: boolean;
  deployment_id?: string;
}

export interface ProxyStatus {
  deployment_name: string;
  exposed: boolean;
  domain?: string;
  virtual_host_exists: boolean;
  ssl_enabled: boolean;
  certificate_exists: boolean;
  certificate?: Certificate;
}

export interface ProxySetupResult {
  deployment_name: string;
  domain?: string;
  success: boolean;
  skipped: boolean;
  message?: string;
  virtual_host_created: boolean;
  nginx_reloaded: boolean;
  certificate_requested: boolean;
  certificate_exists: boolean;
  ssl_message?: string;
  ssl_error?: string;
}

export interface VirtualHost {
  name: string;
  config_file: string;
  modified_at: number;
}

export interface RegistryType {
  slug: string;
  name: string;
  url_patterns: string[];
  auth_type: "basic" | "token";
  login_url?: string;
  docs_url?: string;
  icon?: string;
  source: "builtin" | "local" | "marketplace";
  is_official: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegistryCredential {
  id: string;
  name: string;
  registry_type_slug: string;
  username: string;
  email?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  registry_type?: RegistryType;
}

export interface SecurityEvent {
  id: number;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  source_ip: string;
  request_path?: string;
  request_method?: string;
  status_code?: number;
  user_agent?: string;
  message: string;
  deployment_name?: string;
  created_at: string;
}

export interface BlockedIP {
  id: number;
  ip: string;
  reason?: string;
  blocked_at: string;
  expires_at?: string;
  auto_blocked: boolean;
}

export interface ProtectedRoute {
  id: number;
  path_pattern: string;
  rate_limit: number;
  block_duration: number;
  enabled: boolean;
  created_at: string;
}

export interface SecurityStats {
  total_events: number;
  last_24_hours: number;
  last_7_days: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  blocked_ips_count: number;
  protected_routes_count: number;
  top_offending_ips: { ip: string; event_count: number; last_seen: string }[];
  top_deployments: { name: string; event_count: number; critical: number; high: number }[];
  recent_critical: SecurityEvent[];
  events_trend: { date: string; count: number }[];
}

export interface DeploymentSecurityConfig {
  enabled?: boolean;
  blocked_ips?: string[];
  protected_paths: ProtectedPath[];
  rate_limits: DeploymentRateLimit[];
}

export interface ProtectedPath {
  pattern: string;
  enabled: boolean;
}

export interface DeploymentRateLimit {
  path: string;
  rate: number;
  burst: number;
  enabled: boolean;
}
