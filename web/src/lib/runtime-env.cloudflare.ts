// Reads Worker bindings from the server request context and falls back to Node settings.
import { env } from 'cloudflare:workers';

export function runtimeSetting(name: string) {
  const value = (env as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : process.env[name];
}
