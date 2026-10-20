// Declares the native module supplied by Cloudflare Workers during Worker builds.
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
