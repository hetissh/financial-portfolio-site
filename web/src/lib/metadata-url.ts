// Keeps malformed deployment origins from failing the streamed metadata render.
export function configuredMetadataOrigin(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !localHttp) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return undefined;
    return url;
  } catch {
    return undefined;
  }
}

export function metadataBase(value: string | undefined): URL {
  return configuredMetadataOrigin(value) ?? new URL('http://127.0.0.1:4173');
}

export function canonicalPath(value: string | undefined, path: string) {
  return configuredMetadataOrigin(value) ? { canonical: path } : undefined;
}
