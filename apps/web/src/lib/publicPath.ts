/**
 * Prefix absolute app paths for GitHub Pages project sites (`/repo/` base).
 * `ROUTES.*` values always start with `/api/...`.
 */
export function withPublicPath(path: string): string {
  const base = import.meta.env.BASE_URL;
  if (!base || base === '/') return path;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}
