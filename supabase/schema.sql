-- Лёгкость · схема БД. Выполни целиком в Supabase → SQL Editor.
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create table if not exists ingredients (
  id serial primary key,
  name text unique not null,
  emoji text default '🍽️',
  unit text not null default 'g' check (unit in ('g','ml','pc')),
  base_price numeric not null default 0,      -- сом за 1 кг / 1 л / 1 шт
  category text default 'dry' check (category in ('fresh','meat','dairy','dry')),
  kcal numeric default 0, protein numeric default 0, fat numeric default 0, carbs numeric default 0, -- на 100 г/мл
  gpp numeric default 100                      -- граммов в одной штуке (для unit = pc)
);

create table if not exists stores (
  id serial primary key,
  name text not null,
  short text,
  color text default '#2fa84f',
  type text default 'supermarket' check (type in ('supermarket','bazaar','shop')),
  lat double precision, lng double precision,
  address text
);

create table if not exists store_prices (
  store_id int references stores on delete cascade,
  ingredient_id int references ingredients on delete cascade,
  price numeric not null,
  updated_at timestamptz default now(),
  primary key (store_id, ingredient_id)
);

-- Пользователи сообщают «тут цена другая» → админ подтверждает
create table if not exists price_reports (
  id bigserial primary key,
  store_id int references stores on delete cascade,
  ingredient_id int references ingredients on delete cascade,
  price numeric not null,
  user_id uuid default auth.uid() references auth.users on delete set null,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  meal text not null check (meal in ('b','l','d','s')),
  minutes int default 20, kcal int default 0, protein int default 0, fat int default 0, carbs int default 0,
  tags text[] default '{}',        -- m мясо, f рыба, a животные продукты
  allergens text[] default '{}',
  need text,                        -- нужная техника
  steps text[] default '{}',
  source text default 'user',       -- seed | user | themealdb
  author uuid references auth.users on delete set null,
  status text default 'private' check (status in ('approved','pending','private')),
  created_at timestamptz default now()
);

create table if not exists recipe_ingredients (
  recipe_id uuid references recipes on delete cascade,
  ingredient_id int references ingredients on delete restrict,
  amount numeric not null,          -- на 1 порцию
  primary key (recipe_id, ingredient_id)
);

create table if not exists user_state (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ===== RLS =====
alter table profiles enable row level security;
alter table ingredients enable row level security;
alter table stores enable row level security;
alter table store_prices enable row level security;
alter table price_reports enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table user_state enable row level security;

create policy "profile: read own/admin" on profiles for select using (id = auth.uid() or is_admin());
create policy "profile: admin update" on profiles for update using (is_admin());

create policy "ingredients: read" on ingredients for select using (true);
create policy "ingredients: admin write" on ingredients for all using (is_admin()) with check (is_admin());
create policy "stores: read" on stores for select using (true);
create policy "stores: admin write" on stores for all using (is_admin()) with check (is_admin());
create policy "prices: read" on store_prices for select using (true);
create policy "prices: admin write" on store_prices for all using (is_admin()) with check (is_admin());

create policy "reports: read own/admin" on price_reports for select using (user_id = auth.uid() or is_admin());
create policy "reports: insert" on price_reports for insert with check (user_id = auth.uid());
create policy "reports: admin update" on price_reports for update using (is_admin());
create policy "reports: admin delete" on price_reports for delete using (is_admin());

create policy "recipes: read" on recipes for select using (status = 'approved' or author = auth.uid() or is_admin());
create policy "recipes: insert" on recipes for insert
  with check (is_admin() or (author = auth.uid() and status in ('private','pending')));
create policy "recipes: update" on recipes for update
  using (author = auth.uid() or is_admin())
  with check (is_admin() or (author = auth.uid() and status in ('private','pending')));
create policy "recipes: delete" on recipes for delete using (author = auth.uid() or is_admin());

create policy "ri: read" on recipe_ingredients for select
  using (exists (select 1 from recipes r where r.id = recipe_id));
create policy "ri: write" on recipe_ingredients for all
  using (exists (select 1 from recipes r where r.id = recipe_id and (r.author = auth.uid() or is_admin())))
  with check (exists (select 1 from recipes r where r.id = recipe_id and (r.author = auth.uid() or is_admin())));

create policy "state: own" on user_state for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Сделать себя админом (после регистрации на сайте):
-- update profiles set role = 'admin' where email = 'ТВОЯ_ПОЧТА';
