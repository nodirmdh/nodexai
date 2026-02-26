create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.order_identity_unchanged(
  p_order_id uuid,
  p_client_id uuid,
  p_restaurant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and o.client_id = p_client_id
      and o.restaurant_id = p_restaurant_id
  )
$$;

create or replace function public.ride_status_only_update(
  p_ride_id uuid,
  p_client_id uuid,
  p_driver_id uuid,
  p_price numeric,
  p_created_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rides r
    where r.id = p_ride_id
      and r.client_id = p_client_id
      and r.driver_id is not distinct from p_driver_id
      and r.price = p_price
      and r.created_at = p_created_at
  )
$$;

drop policy if exists users_select_own_or_admin on public.users;
drop policy if exists users_update_own on public.users;

create policy users_select_own_or_admin
on public.users
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

create policy users_update_own
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists restaurants_select_clients on public.restaurants;
drop policy if exists restaurants_manage_owner on public.restaurants;
drop policy if exists restaurants_manage_admin on public.restaurants;

create policy restaurants_select_clients
on public.restaurants
for select
to authenticated
using (true);

create policy restaurants_manage_owner
on public.restaurants
for all
to authenticated
using (
  owner_id = auth.uid()
  and public.current_user_role() = 'restaurant'
)
with check (
  owner_id = auth.uid()
  and public.current_user_role() = 'restaurant'
);

create policy restaurants_manage_admin
on public.restaurants
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists menu_items_select_clients_open_only on public.menu_items;
drop policy if exists menu_items_manage_owner on public.menu_items;
drop policy if exists menu_items_manage_admin on public.menu_items;

create policy menu_items_select_clients_open_only
on public.menu_items
for select
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = menu_items.restaurant_id
        and r.owner_id = auth.uid()
    )
  )
  or (
    public.current_user_role() = 'client'
    and exists (
      select 1
      from public.restaurants r
      where r.id = menu_items.restaurant_id
        and r.open = true
    )
  )
);

create policy menu_items_manage_owner
on public.menu_items
for all
to authenticated
using (
  public.current_user_role() = 'restaurant'
  and exists (
    select 1
    from public.restaurants r
    where r.id = menu_items.restaurant_id
      and r.owner_id = auth.uid()
  )
)
with check (
  public.current_user_role() = 'restaurant'
  and exists (
    select 1
    from public.restaurants r
    where r.id = menu_items.restaurant_id
      and r.owner_id = auth.uid()
  )
);

create policy menu_items_manage_admin
on public.menu_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists orders_insert_client on public.orders;
drop policy if exists orders_select_client on public.orders;
drop policy if exists orders_select_restaurant_owner on public.orders;
drop policy if exists orders_update_restaurant_status on public.orders;
drop policy if exists orders_manage_admin on public.orders;

create policy orders_insert_client
on public.orders
for insert
to authenticated
with check (
  client_id = auth.uid()
  and public.current_user_role() = 'client'
);

create policy orders_select_client
on public.orders
for select
to authenticated
using (
  client_id = auth.uid()
  and public.current_user_role() = 'client'
);

create policy orders_select_restaurant_owner
on public.orders
for select
to authenticated
using (
  public.current_user_role() = 'restaurant'
  and exists (
    select 1
    from public.restaurants r
    where r.id = orders.restaurant_id
      and r.owner_id = auth.uid()
  )
);

create policy orders_update_restaurant_status
on public.orders
for update
to authenticated
using (
  public.current_user_role() = 'restaurant'
  and exists (
    select 1
    from public.restaurants r
    where r.id = orders.restaurant_id
      and r.owner_id = auth.uid()
  )
)
with check (
  public.current_user_role() = 'restaurant'
  and exists (
    select 1
    from public.restaurants r
    where r.id = orders.restaurant_id
      and r.owner_id = auth.uid()
  )
  and public.order_identity_unchanged(id, client_id, restaurant_id)
);

create policy orders_manage_admin
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists order_items_insert_client on public.order_items;
drop policy if exists order_items_select_client on public.order_items;
drop policy if exists order_items_select_restaurant_owner on public.order_items;
drop policy if exists order_items_manage_admin on public.order_items;

create policy order_items_insert_client
on public.order_items
for insert
to authenticated
with check (
  public.current_user_role() = 'client'
  and exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.client_id = auth.uid()
  )
);

create policy order_items_select_client
on public.order_items
for select
to authenticated
using (
  public.current_user_role() = 'client'
  and exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.client_id = auth.uid()
  )
);

create policy order_items_select_restaurant_owner
on public.order_items
for select
to authenticated
using (
  public.current_user_role() = 'restaurant'
  and exists (
    select 1
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.id = order_items.order_id
      and r.owner_id = auth.uid()
  )
);

create policy order_items_manage_admin
on public.order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists rides_insert_client on public.rides;
drop policy if exists rides_select_client on public.rides;
drop policy if exists rides_select_driver on public.rides;
drop policy if exists rides_update_driver_status_only on public.rides;
drop policy if exists rides_manage_admin on public.rides;

create policy rides_insert_client
on public.rides
for insert
to authenticated
with check (
  client_id = auth.uid()
  and public.current_user_role() = 'client'
);

create policy rides_select_client
on public.rides
for select
to authenticated
using (
  client_id = auth.uid()
  and public.current_user_role() = 'client'
);

create policy rides_select_driver
on public.rides
for select
to authenticated
using (
  driver_id = auth.uid()
  and public.current_user_role() = 'driver'
);

create policy rides_update_driver_status_only
on public.rides
for update
to authenticated
using (
  driver_id = auth.uid()
  and public.current_user_role() = 'driver'
)
with check (
  driver_id = auth.uid()
  and public.current_user_role() = 'driver'
  and public.ride_status_only_update(id, client_id, driver_id, price, created_at)
);

create policy rides_manage_admin
on public.rides
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.users force row level security;
alter table public.restaurants force row level security;
alter table public.menu_items force row level security;
alter table public.orders force row level security;
alter table public.order_items force row level security;
alter table public.rides force row level security;
