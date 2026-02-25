import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabaseEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

export type SupabaseEnvInput = Record<string, string | undefined>

export function getSupabaseConfig(env: SupabaseEnvInput) {
  return supabaseEnvSchema.parse(env)
}

export function createSupabaseBrowserClient(env: SupabaseEnvInput) {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = getSupabaseConfig(env)

  return createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
}
