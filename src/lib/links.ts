const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function pageUrl(path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `${base}/${clean ? `${clean}/` : ''}`;
}

export function assetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|data:)/i.test(path)) return path;
  return `${base}/${path.replace(/^\//, '')}`;
}
