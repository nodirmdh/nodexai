drop table if exists public.drivers cascade;
drop table if exists public.rides cascade;
drop table if exists public.couriers cascade;
drop table if exists public.courier_profiles cascade;
drop table if exists public.courier_locations cascade;
drop table if exists public.courier_orders cascade;

drop function if exists public.ride_status_only_update(uuid, uuid, uuid, numeric, timestamptz);

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('client', 'restaurant', 'admin'));

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'total_price'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'total_amount'
  ) then
    alter table public.orders rename column total_price to total_amount;
  end if;
end $$;

alter table public.orders
  add column if not exists total_amount numeric(12,2) not null default 0;

do $$
declare
  col_name text;
begin
  for col_name in
    select c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'orders'
      and c.column_name not in (
        'id',
        'client_id',
        'restaurant_id',
        'status',
        'total_amount',
        'created_at',
        'updated_at'
      )
  loop
    execute format('alter table public.orders drop column if exists %I cascade', col_name);
  end loop;
end $$;

alter table public.orders
  alter column client_id set not null,
  alter column restaurant_id set not null,
  alter column status set not null,
  alter column total_amount set not null,
  alter column total_amount set default 0,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.orders
  drop constraint if exists orders_total_price_non_negative,
  drop constraint if exists orders_total_amount_non_negative;

alter table public.orders
  add constraint orders_total_amount_non_negative
  check (total_amount >= 0);

alter table public.orders
  drop constraint if exists orders_client_id_fkey,
  drop constraint if exists orders_restaurant_id_fkey;

alter table public.orders
  add constraint orders_client_id_fkey
  foreign key (client_id) references public.users(id) on delete restrict,
  add constraint orders_restaurant_id_fkey
  foreign key (restaurant_id) references public.restaurants(id) on delete restrict;

drop index if exists idx_rides_client_id;
drop index if exists idx_rides_driver_id;

alter table public.users enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

alter table public.users force row level security;
alter table public.restaurants force row level security;
alter table public.menu_items force row level security;
alter table public.orders force row level security;
alter table public.order_items force row level security;
