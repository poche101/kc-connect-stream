// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseClient() {
  // Prefer dot notation – Vite replaces these at build time
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);

  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined'
      ? process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
      : undefined);

  // Temporary debug – this will show in the browser console / terminal
  console.log('[Supabase Client Debug]', {
    hasUrl: !!url,
    hasKey: !!key,
    urlPreview: url?.slice(0, 30),
    keyPreview: key?.slice(0, 20),
    viteUrl: import.meta.env.VITE_SUPABASE_URL,
    vitePublishable: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    viteAnon: import.meta.env.VITE_SUPABASE_ANON_KEY,
  });

  if (!url || !key) {
    throw new Error(
      `Supabase URL or Key is missing.\n` +
        `URL: ${url ? 'present' : 'MISSING'}\n` +
        `Key: ${key ? 'present' : 'MISSING'}\n` +
        `Check your .env / .env.local and restart the dev server.`
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) {
      _supabase = createSupabaseClient();
    }
    return Reflect.get(_supabase, prop, receiver);
  },
});