// Declares the site Worker, runtime bindings, and cache service Worker.
import { bindings, defineConfig, defineWorker } from 'cf/config';
import { createWorkersResponseStoreServiceBindingConfig } from '@vinext/cloudflare/cache/config';

const responseStore = await createWorkersResponseStoreServiceBindingConfig({
  worker: {
    name: 'financial-portfolio-site-response-store',
    compatibilityDate: '2026-10-19',
    compatibilityFlags: ['nodejs_compat'],
  },
  bucket: 'financial-portfolio-site-response-store-cache-bodies',
});

export const responseStoreServiceBinding = responseStore.serviceBindingWorker;

export default defineConfig({
  worker: defineWorker({
    ...responseStore.applicationWorker,
    name: 'financial-portfolio-site',
    entrypoint: 'vinext/server/fetch-handler',
    compatibilityDate: '2026-10-19',
    compatibilityFlags: ['nodejs_compat'],
    assets: {
      notFoundHandling: 'none',
    },
    env: {
      ...responseStore.applicationWorker.env,
      ASSETS: bindings.assets(),
      PORTFOLIO_ADMIN: { type: 'text', value: '1' },
      PORTFOLIO_DATA_SOURCE: { type: 'text', value: 'supabase' },
      SITE_MODE: { type: 'text', value: 'preview' },
      SITE_URL: { type: 'secret' },
      SUPABASE_URL: { type: 'secret' },
      SUPABASE_PUBLISHABLE_KEY: { type: 'secret' },
      SUPABASE_SECRET_KEY: { type: 'secret' },
      RESEND_API_KEY: { type: 'secret' },
      RESEND_FROM_EMAIL: { type: 'secret' },
      ADMIN_ORIGIN: { type: 'secret' },
    },
  }),
});
