import { getSupabaseClient } from '../lib/supabase'

type OrderItemInput = {
  menuItemId: string
  quantity: number
}

type OrderItemPriceRow = {
  id: string
  price: number
}

type CreatedOrder = {
  id: string
}

type AuthUserInput = {
  id: string
  telegram_id: number
}

export async function createOrder(
  authUser: AuthUserInput | null,
  restaurantId: string,
  items: OrderItemInput[],
): Promise<CreatedOrder> {
  if (!authUser) {
    throw new Error('User is not authenticated')
  }

  if (!restaurantId) {
    throw new Error('restaurantId is required')
  }

  if (!items.length) {
    throw new Error('items cannot be empty')
  }

  if (items.some((item) => item.quantity <= 0)) {
    throw new Error('quantity must be greater than 0')
  }

  const supabase = getSupabaseClient()

  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', authUser.telegram_id)
    .single()

  if (userError || !dbUser) {
    throw new Error(userError?.message ?? 'Unable to resolve current user')
  }

  const menuItemIds = Array.from(new Set(items.map((item) => item.menuItemId)))
  const { data: menuItems, error: menuItemsError } = await supabase
    .from('menu_items')
    .select('id, price')
    .in('id', menuItemIds)

  if (menuItemsError || !menuItems) {
    throw new Error(menuItemsError?.message ?? 'Unable to load menu items')
  }

  const priceById = new Map(
    (menuItems as OrderItemPriceRow[]).map((row) => [row.id, Number(row.price)]),
  )

  const hasUnknownMenuItem = items.some((item) => !priceById.has(item.menuItemId))
  if (hasUnknownMenuItem) {
    throw new Error('Some menu items were not found')
  }

  const totalAmount = items.reduce((acc, item) => {
    const unitPrice = priceById.get(item.menuItemId) ?? 0
    return acc + unitPrice * item.quantity
  }, 0)

  const { data: createdOrder, error: orderInsertError } = await supabase
    .from('orders')
    .insert({
      client_id: dbUser.id,
      restaurant_id: restaurantId,
      status: 'pending',
      total_amount: totalAmount,
    })
    .select('id')
    .single()

  if (orderInsertError || !createdOrder) {
    throw new Error(orderInsertError?.message ?? 'Unable to create order')
  }

  const orderItemsPayload = items.map((item) => ({
    order_id: createdOrder.id,
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    price_snapshot: priceById.get(item.menuItemId) ?? 0,
  }))

  const { error: orderItemsInsertError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload)

  if (orderItemsInsertError) {
    if (orderItemsInsertError.code === 'PGRST204') {
      const fallbackPayload = items.map((item) => ({
        order_id: createdOrder.id,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        price: priceById.get(item.menuItemId) ?? 0,
      }))

      const { error: fallbackError } = await supabase
        .from('order_items')
        .insert(fallbackPayload)

      if (fallbackError) {
        throw new Error(fallbackError.message)
      }
    } else {
      throw new Error(orderItemsInsertError.message)
    }
  }

  return createdOrder
}
