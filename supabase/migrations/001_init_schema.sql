create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (role in ('client', 'restaurant', 'admin', 'driver'))
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  open boolean not null default false,
  min_order numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_min_order_non_negative check (min_order >= 0),
  constraint restaurants_owner_id_fkey
    foreign key (owner_id) references public.users(id) on delete restrict
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  name text not null,
  price numeric(12,2) not null,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_price_non_negative check (price >= 0),
  constraint menu_items_restaurant_id_fkey
    foreign key (restaurant_id) references public.restaurants(id) on delete cascade
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  restaurant_id uuid not null,
  courier_id uuid,
  status text not null default 'new',
  total_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check
    check (status in ('new','accepted','preparing','ready','delivering','delivered','cancelled')),
  constraint orders_total_price_non_negative check (total_price >= 0),
  constraint orders_client_id_fkey
    foreign key (client_id) references public.users(id) on delete restrict,
  constraint orders_restaurant_id_fkey
    foreign key (restaurant_id) references public.restaurants(id) on delete restrict,
  constraint orders_courier_id_fkey
    foreign key (courier_id) references public.users(id) on delete set null
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  menu_item_id uuid not null,
  quantity integer not null,
  price numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_price_non_negative check (price >= 0),
  constraint order_items_order_id_fkey
    foreign key (order_id) references public.orders(id) on delete cascade,
  constraint order_items_menu_item_id_fkey
    foreign key (menu_item_id) references public.menu_items(id) on delete restrict
);

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  driver_id uuid,
  status text not null default 'searching',
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rides_status_check
    check (status in ('searching','assigned','in_transit','completed','cancelled')),
  constraint rides_price_non_negative check (price >= 0),
  constraint rides_client_id_fkey
    foreign key (client_id) references public.users(id) on delete restrict,
  constraint rides_driver_id_fkey
    foreign key (driver_id) references public.users(id) on delete set null
);

create unique index if not exists idx_users_telegram_id on public.users (telegram_id);
create index if not exists idx_orders_client_id on public.orders (client_id);
create index if not exists idx_orders_restaurant_id on public.orders (restaurant_id);
create index if not exists idx_rides_client_id on public.rides (client_id);
create index if not exists idx_rides_driver_id on public.rides (driver_id);

alter table public.users enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.rides enable row level security;
