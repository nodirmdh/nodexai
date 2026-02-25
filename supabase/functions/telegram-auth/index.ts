import { createClient } from 'npm:@supabase/supabase-js@2'

type TelegramUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  allows_write_to_pm?: boolean
  photo_url?: string
}

const jsonHeaders = {
  'access-control-allow-origin': 'https://nodexai-miniapp.vercel.app',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json; charset=utf-8',
}

const encoder = new TextEncoder()

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  })
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

async function hmacSha256(
  key: Uint8Array,
  message: string,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(message),
  )

  return new Uint8Array(signature)
}

async function verifyTelegramInitData(
  initData: string,
  botToken: string,
): Promise<{ ok: true; params: URLSearchParams } | { ok: false }> {
  const params = new URLSearchParams(initData)
  const providedHash = params.get('hash')

  if (!providedHash) {
    return { ok: false }
  }

  const pairs: string[] = []
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      pairs.push(`${key}=${value}`)
    }
  }
  pairs.sort()

  const dataCheckString = pairs.join('\n')
  const secretKey = await hmacSha256(encoder.encode('WebAppData'), botToken)
  const calculatedHashBytes = await hmacSha256(secretKey, dataCheckString)
  const calculatedHash = bytesToHex(calculatedHashBytes)

  if (!safeEqualHex(calculatedHash, providedHash)) {
    return { ok: false }
  }

  return { ok: true, params }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: jsonHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!botToken || !supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: 'Missing required environment variables' })
  }

  let initData: string | undefined
  try {
    const body = await req.json()
    initData = body?.initData
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  if (!initData || typeof initData !== 'string') {
    return jsonResponse(400, { error: 'initData is required' })
  }

  const verification = await verifyTelegramInitData(initData, botToken)
  if (!verification.ok) {
    return jsonResponse(401, { error: 'Invalid Telegram initData signature' })
  }

  const userRaw = verification.params.get('user')
  if (!userRaw) {
    return jsonResponse(400, { error: 'Telegram user is missing in initData' })
  }

  let telegramUser: TelegramUser
  try {
    telegramUser = JSON.parse(userRaw) as TelegramUser
  } catch {
    return jsonResponse(400, { error: 'Invalid Telegram user payload' })
  }

  if (!telegramUser.id || typeof telegramUser.id !== 'number') {
    return jsonResponse(400, { error: 'Invalid Telegram user id' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .maybeSingle()

  if (selectError) {
    return jsonResponse(500, { error: 'Failed to load user' })
  }

  if (existingUser) {
    return jsonResponse(200, { success: true, user: existingUser })
  }

  const { data: createdUser, error: insertError } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramUser.id,
      role: 'client',
    })
    .select('*')
    .single()

  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      const { data: concurrentUser, error: concurrentSelectError } =
        await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', telegramUser.id)
          .single()

      if (concurrentSelectError) {
        return jsonResponse(500, { error: 'Failed to load user after conflict' })
      }

      return jsonResponse(200, { success: true, user: concurrentUser })
    }

    return jsonResponse(500, { error: 'Failed to create user' })
  }

  return jsonResponse(200, { success: true, user: createdUser })
})
