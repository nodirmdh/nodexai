import { createContext, useContext, type PropsWithChildren } from 'react'
import { useTelegramAuth, type AuthUser } from '../hooks/useTelegramAuth'
import { createOrder } from '../hooks/useCreateOrder'

type OrderItemInput = {
  menuItemId: string
  quantity: number
}

type CreateOrderFn = (
  restaurantId: string,
  items: OrderItemInput[],
) => Promise<{ id: string }>

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  error: string | null
  createOrder: CreateOrderFn
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const auth = useTelegramAuth()
  const createOrderFromContext: CreateOrderFn = (restaurantId, items) =>
    createOrder(auth.user, restaurantId, items)

  return (
    <AuthContext.Provider value={{ ...auth, createOrder: createOrderFromContext }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
