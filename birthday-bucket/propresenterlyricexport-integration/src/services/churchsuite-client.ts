import type { ChurchSuiteConfig } from '../types/churchsuite';

const BASE_URL = 'https://api.churchsuite.com/v1';

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
    headers: {
      'X-Account': config.account,
      'X-Application': config.appName,
      'X-Auth': config.apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`ChurchSuite API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchAllPages<T>(
  config: ChurchSuiteConfig,
  path: string,
  perPage = 50
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await churchSuiteFetch<T[] | { [key: string]: T[] }>(
      config,
      path,
      { page: String(page), per_page: String(perPage) }
    );

    const items = Array.isArray(response)
      ? response
      : (Object.values(response).find(Array.isArray) as T[] | undefined);

    if (!items || items.length === 0) {
      hasMore = false;
    } else {
      all.push(...items);
      if (items.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return all;
}
