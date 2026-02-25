import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import { getSupabaseClient } from './lib/supabase'

type ConnectionState =
  | { status: 'loading' }
  | { status: 'success'; data: unknown }
  | { status: 'error'; message: string }

function App() {
  const [state, setState] = useState<ConnectionState>({ status: 'loading' })

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .limit(5)

        if (error) {
          setState({ status: 'error', message: error.message })
          return
        }

        setState({ status: 'success', data: data ?? [] })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown connection error'
        setState({ status: 'error', message })
      }
    }

    void loadRestaurants()
  }, [])

  const telegram = (window as Window & { Telegram?: any }).Telegram
  const webApp = telegram?.WebApp
  const debugData = {
    telegramType: typeof telegram,
    webAppType: typeof webApp,
    platform: webApp?.platform ?? null,
    version: webApp?.version ?? null,
    initDataLength: webApp?.initData?.length ?? 0,
    user: JSON.stringify(webApp?.initDataUnsafe?.user ?? null),
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <main>
            <pre>{JSON.stringify(debugData, null, 2)}</pre>
            {state.status === 'loading' && <p>Loading...</p>}
            {state.status === 'error' && <p>{state.message}</p>}
            {state.status === 'success' && (
              <pre>{JSON.stringify(state.data, null, 2)}</pre>
            )}
          </main>
        }
      />
    </Routes>
  )
}

export default App
