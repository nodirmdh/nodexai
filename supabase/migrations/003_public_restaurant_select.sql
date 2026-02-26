drop policy if exists restaurants_select_public on public.restaurants;
drop policy if exists menu_items_select_public_open_restaurants on public.menu_items;

create policy restaurants_select_public
on public.restaurants
for select
to public
using (true);

create policy menu_items_select_public_open_restaurants
on public.menu_items
for select
to public
using (
  exists (
    select 1
    from public.restaurants r
    where r.id = menu_items.restaurant_id
      and r.open = true
  )
);
