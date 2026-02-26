import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import { getSupabaseClient } from './lib/supabase'
import { useAuth } from './context/AuthContext'

type ConnectionState =
  | { status: 'loading' }
  | { status: 'success'; data: unknown }
  | { status: 'error'; message: string }

function App() {
  const [state, setState] = useState<ConnectionState>({ status: 'loading' })
  const { user, loading, error } = useAuth()

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

  const userName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
  const visibleUserName = userName || user?.username || null

  return (
    <Routes>
      <Route
        path="/"
        element={
          <main>
            <section>
              {loading && <p>Auth: loading...</p>}
              {!loading && error && <p>Auth error: {error}</p>}
              {!loading && !error && user && (
                <p>Authenticated user: {visibleUserName ?? `id:${user.id}`}</p>
              )}
            </section>
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
