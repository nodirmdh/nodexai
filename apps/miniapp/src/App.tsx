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
  // @ts-ignore
  const tg = window.Telegram?.WebApp

  if (tg) {
    console.log("Telegram user:", tg.initDataUnsafe?.user)
  } else {
    console.log("Not opened inside Telegram")
  }
}, [])

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

  return (
    <Routes>
      <Route
        path="/"
        element={
          <main>
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
