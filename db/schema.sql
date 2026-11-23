-- Схема для Supabase (этап 2)
create table products (id serial primary key, name text unique not null, unit text default 'кг');
create table dishes (id serial primary key, name text not null, emoji text, meals text[] not null, allergens text[] default '{}', is_public boolean default true);
create table dish_items (dish_id int references dishes on delete cascade, product_id int references products, grams int not null, primary key (dish_id, product_id));
create table places (id serial primary key, name text not null, kind text check (kind in ('bazaar','supermarket')), lat float, lng float);
create table prices (id serial primary key, product_id int references products, place_id int references places, price numeric not null, source text default 'admin', user_id uuid, created_at timestamptz default now());
create table profiles (id uuid primary key, tg_id bigint unique, name text, role text default 'user');
create table rations (id serial primary key, user_id uuid references profiles, data jsonb not null, total numeric, created_at timestamptz default now());
create table comments (id serial primary key, place_id int references places, user_id uuid references profiles, text text not null, created_at timestamptz default now());
