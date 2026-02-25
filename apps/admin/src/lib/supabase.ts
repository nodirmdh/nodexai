import { createSupabaseBrowserClient } from '@ai-studio/shared/supabaseClient'

let supabaseClient: ReturnType<typeof createSupabaseBrowserClient> | undefined

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseBrowserClient(
      import.meta.env as Record<string, string | undefined>,
    )
  }

  return supabaseClient
}
