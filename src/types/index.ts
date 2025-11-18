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
}
