import axios from "axios";

// The marketplace is a separate public service from the agent API. Browsing needs no auth.
const marketplaceClient = axios.create({
  baseURL: import.meta.env.VITE_MARKETPLACE_URL || "https://api.flatrun.dev/v1",
  timeout: 15000,
});

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
    marketplaceClient.get<Paginated<MarketplaceTemplate>>("/templates", { params }),
  search: (q: string) => marketplaceClient.get<Paginated<MarketplaceTemplate>>("/search", { params: { q } }),
  categories: () => marketplaceClient.get<{ data: MarketplaceCategory[] }>("/categories"),
  download: (slug: string) => marketplaceClient.get<AgentTemplatePayload>(`/templates/${slug}/download`),
};
