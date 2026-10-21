/** Only an explicit URL selection can change the tenant on initial load. */
export function explicitTenantSlug(pathname: string, search: string): string | null {
  const query = new URLSearchParams(search).get("tenant");
  if (query) return query;
  return pathname.match(/^\/demo\/([^/]+)/)?.[1] ?? null;
}