import { apiClient } from "./api";

export interface SecurityProfile {
  api_version: string;
  baseline_version: string;
  version: string;
  runtime?: string;
  targets: Record<string, unknown>;
  reviews: Record<string, unknown>;
  schedule: { incremental: string; retrospective: string; full: string };
  budget: Record<string, number>;
  access_policy: { version: string; actions: Record<string, unknown> };
  exceptions?: unknown[];
}
export interface ProfileState {
  profile: SecurityProfile | null;
  revision: string;
  status: string;
  approval: { profile_revision: string; deployment_revision: string; actor: string; approved_at: string } | null;
}
export interface CoverageRow {
  concern: string;
  service?: string;
  root?: string;
  status: string;
  reason: string;
}
export interface SecurityFinding {
  id: string;
  run_id: string;
  status: string;
  concern: string;
  classification: string;
  signal: string;
  evidence_id: string;
  first_seen: string;
  last_seen: string;
  occurrences: number;
}
export interface SecurityProposal {
  error?: string;
  id: string;
  base_revision: string;
  deployment_revision: string;
  profile_revision: string;
  profile: SecurityProfile;
  source: string;
  status: string;
}
export interface SecurityReport {
  model_assessment?: { summary: string; questions: string[]; evidence_refs: string[] };
  hold: boolean;
  id: string;
  status: string;
  mode: string;
  requested_at: string;
  completed_at: string | null;
  model_status: string;
  delivery_status: string;
  coverage: CoverageRow[];
  findings: { id: string; classification: string; concern: string; signal: string; evidence_id: string }[];
  limitations: string[];
}
const base = (name: string) => `/deployments/${encodeURIComponent(name)}`;
export const securityReviewsApi = {
  profile: (name: string) =>
    apiClient.get<{
      state: ProfileState;
      ready_proposals?: SecurityProposal[];
      assistant_available?: boolean;
      suggested_profile: SecurityProfile;
      discovery: {
        revision: string;
        coverage: CoverageRow[];
        services?: {
          name: string;
          image: string;
          mounts: { type: string; source: string; target: string; read_only?: boolean }[];
        }[];
      };
      warnings: string[];
    }>(`${base(name)}/security-profile`),
  save: (name: string, base_revision: string, profile: SecurityProfile) =>
    apiClient.put(`${base(name)}/security-profile`, { base_revision, profile }),
  propose: (name: string, base_revision: string, profile: SecurityProfile) =>
    apiClient.post<{ proposal: SecurityProposal }>(`${base(name)}/security-profile/proposals`, {
      base_revision,
      profile,
    }),
  generate: (name: string, base_revision: string) =>
    apiClient.post<{ proposal: SecurityProposal }>(`${base(name)}/security-profile/generate`, { base_revision }),
  proposal: (name: string, id: string) =>
    apiClient.get<{ proposal: SecurityProposal }>(`${base(name)}/security-profile/proposals/${encodeURIComponent(id)}`),
  import: (name: string, base_revision: string) =>
    apiClient.post<{ proposal: SecurityProposal }>(`${base(name)}/security-profile/import`, { base_revision }),
  approve: (name: string, proposal: SecurityProposal) =>
    apiClient.post(`${base(name)}/security-profile/proposals/${proposal.id}/approve`, {
      base_revision: proposal.base_revision,
      deployment_revision: proposal.deployment_revision,
      profile_revision: proposal.profile_revision,
    }),
  reports: (name: string, offset = 0) =>
    apiClient.get<{ reports: SecurityReport[] }>(`${base(name)}/security-reviews`, { params: { limit: 20, offset } }),
  findings: (name: string, offset = 0) =>
    apiClient.get<{ findings: SecurityFinding[] }>(`${base(name)}/security-findings`, {
      params: { limit: 100, offset },
    }),
  closeFinding: (name: string, id: string, reason: string) =>
    apiClient.post(`${base(name)}/security-findings/${encodeURIComponent(id)}/close`, { reason }),
  report: (name: string, id: string) =>
    apiClient.get<{ report: SecurityReport }>(`${base(name)}/security-reviews/${encodeURIComponent(id)}`),
  hold: (name: string, id: string, hold: boolean) =>
    apiClient.put(`${base(name)}/security-reviews/${encodeURIComponent(id)}/hold`, { hold }),
  run: (name: string, mode: string, profile_revision: string, deployment_revision: string) =>
    apiClient.post(`${base(name)}/security-reviews`, { mode, profile_revision, deployment_revision }),
  evidence: (name: string, run: string, id: string) =>
    apiClient.get<{ evidence: unknown }>(
      `${base(name)}/security-reviews/${encodeURIComponent(run)}/evidence/${encodeURIComponent(id)}`,
    ),
};
