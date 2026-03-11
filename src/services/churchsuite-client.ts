import type { ChurchSuiteConfig } from '../types/churchsuite';

const BASE_URL = 'https://api.churchsuite.com/v2';

function getHeaders(config: ChurchSuiteConfig): Record<string, string> {
  if (!config.accessToken) {
    throw new Error('OAuth2 access token is required. Please authorize with ChurchSuite first.');
  }
  return {
    Authorization: `Bearer ${config.accessToken}`,
    'Content-Type': 'application/json',
  };
}

export async function churchSuiteFetch<T>(
  config: ChurchSuiteConfig,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: getHeaders(config),
  });

  if (!res.ok) {
    throw new Error(`ChurchSuite API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * v2 paginated response envelope.
 * List endpoints return: { data: T[], pagination: { num_results, per_page, page, next_page, prev_page } }
 */
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    num_results: number;
    per_page: number;
    page: number;
    next_page: number | null;
    prev_page: number | null;
  };
}

export async function fetchAllPages<T>(
  config: ChurchSuiteConfig,
  path: string,
  perPage = 100
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await churchSuiteFetch<PaginatedResponse<T>>(
      config,
      path,
      { page: String(page), per_page: String(perPage) }
    );

    if (response.data && response.data.length > 0) {
      all.push(...response.data);
    }

    // Use the pagination metadata to determine if there are more pages
    hasMore = response.pagination?.next_page != null;
    page++;
  }

  return all;
}
