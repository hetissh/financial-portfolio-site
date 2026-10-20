// Configures the Vinext application and Cloudflare Worker build.
import { defineConfig } from 'vite';
import vinext from 'vinext';
import { cloudflare } from '@cloudflare/vite-plugin';
import { responseStoreServiceBinding } from './cloudflare.config.ts';
import { responseStoreAdapter } from '@vinext/cloudflare/cache/response-store-adapter';
import { createHash } from 'node:crypto';
import { patchCssModules } from 'vite-css-modules';
import path from 'node:path';

export default defineConfig({
  define: {
    'process.env.NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE': JSON.stringify('supabase'),
  },
  plugins: [
    patchCssModules({ exportMode: 'default' }),
    vinext({
      cache: responseStoreAdapter(),
      nextConfig: {
        pageExtensions: ['admin.tsx', 'admin.ts', 'tsx', 'ts'],
        trailingSlash: true,
        images: { unoptimized: true },
        poweredByHeader: false,
      },
    }),
    cloudflare({
      auxiliaryWorkers: [{ config: responseStoreServiceBinding }],
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: '@/lib/runtime-env',
        replacement: path.resolve(import.meta.dirname, 'src/lib/runtime-env.cloudflare.ts'),
      },
      { find: 'sharp', replacement: path.resolve(import.meta.dirname, 'empty-stub.js') },
    ],
  },
  build: {
    rolldownOptions: { external: ['cloudflare:workers'] },
  },
  css: {
    modules: {
      generateScopedName(name: string, filename: string) {
        const relativePath = path
          .relative(import.meta.dirname, filename.replace(/\?.*$/, ''))
          .replaceAll('\\', '/');
        return `_${name}_${createHash('sha256').update(relativePath).digest('hex').slice(0, 7)}`;
      },
    },
  },
});
