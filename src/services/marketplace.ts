import { apiClient } from "./api";

export interface MarketplaceCategory {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  templates_count?: number;
}

export interface MarketplaceTemplate {
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  logo: string | null;
  category?: MarketplaceCategory;
  source_type: string;
  latest_version: string | null;
  downloads_count: number;
  stars_count: number;
  is_verified: boolean;
  is_featured: boolean;
  is_official: boolean;
  updated_at: string;
}

// The download endpoint returns a bare agent-format payload (no data wrapper).
export interface AgentTemplatePayload {
  id: string;
  name: string;
  description: string;
  content: string;
  version: string;
}

interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export const marketplaceApi = {
  templates: (params?: { category?: string; featured?: boolean; per_page?: number; page?: number }) =>
    apiClient.get<Paginated<MarketplaceTemplate>>("/marketplace/templates", { params }),
  search: (q: string) => apiClient.get<Paginated<MarketplaceTemplate>>("/marketplace/search", { params: { q } }),
  categories: () => apiClient.get<{ data: MarketplaceCategory[] }>("/marketplace/categories"),
  download: (slug: string) => apiClient.get<AgentTemplatePayload>(`/marketplace/templates/${slug}/download`),
};
