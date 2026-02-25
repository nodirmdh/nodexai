import { useEffect, useState } from 'react'

const TELEGRAM_AUTH_FUNCTION_URL =
  'https://akrftloxqmaeohfmxzgz.supabase.co/functions/v1/telegram-auth'

type TelegramUserProfile = {
  first_name?: string
  last_name?: string
  username?: string
}

type TelegramWebApp = {
  initData?: string
  initDataUnsafe?: {
    user?: TelegramUserProfile
  }
  ready: () => void
  expand: () => void
}

type TelegramRoot = {
  WebApp?: TelegramWebApp
}

type AuthFunctionUser = {
  id: string
  telegram_id: number
  role: string
}

export type AuthUser = AuthFunctionUser & TelegramUserProfile

type AuthFunctionResponse = {
  success: boolean
  user: AuthFunctionUser
  error?: string
}

export function useTelegramAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const authenticate = async () => {
      const telegram = (window as Window & { Telegram?: TelegramRoot }).Telegram
      const webApp = telegram?.WebApp

      if (!webApp) {
        setError('Not inside Telegram')
        setLoading(false)
        return
      }

      try {
        webApp.ready()
        webApp.expand()
      } catch {
        // Continue auth flow even if Telegram UI methods fail.
      }

      const initData = webApp.initData
      if (!initData) {
        setError('Telegram initData is missing')
        setLoading(false)
        return
      }

      const telegramUser = webApp.initDataUnsafe?.user

      try {
        const response = await fetch(TELEGRAM_AUTH_FUNCTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })

        const payload = (await response.json()) as Partial<AuthFunctionResponse>

        if (!response.ok || !payload.success || !payload.user) {
          setError(payload.error ?? 'Telegram authentication failed')
          setLoading(false)
          return
        }

        setUser({
          ...payload.user,
          first_name: telegramUser?.first_name,
          last_name: telegramUser?.last_name,
          username: telegramUser?.username,
        })
        setError(null)
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Telegram authentication failed',
        )
      } finally {
        setLoading(false)
      }
    }

    void authenticate()
  }, [])

  return { user, loading, error }
}
