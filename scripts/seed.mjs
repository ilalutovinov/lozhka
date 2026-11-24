// Наполняет Supabase: продукты, магазины, цены, рецепты. Безопасно запускать повторно.
import { createClient } from '@supabase/supabase-js';
import { INGREDIENTS, STORES, RECIPES, buildPrices } from '../lib/seed.js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ok = (r, what) => { if (r.error) { console.error('✗', what, r.error.message); process.exit(1); } console.log('✓', what); return r.data; };

const ing = ok(await sb.from('ingredients').upsert(INGREDIENTS.map((i) => ({ name: i.name, emoji: i.emoji, unit: i.unit, base_price: i.base, category: i.category, kcal: i.kcal, protein: i.protein, fat: i.fat, carbs: i.carbs, gpp: i.gpp })), { onConflict: 'name' }).select('id,name'), 'продукты');
const ingId = Object.fromEntries(ing.map((i) => [i.name, i.id]));

let stores = ok(await sb.from('stores').select('id,name'), 'магазины (чтение)');
const have = new Set(stores.map((s) => s.name));
const fresh = STORES.filter((s) => !have.has(s.name));
if (fresh.length) ok(await sb.from('stores').insert(fresh.map(({ name, short, color, type, lat, lng, address }) => ({ name, short, color, type, lat, lng, address }))), `магазины +${fresh.length}`);
stores = ok(await sb.from('stores').select('id,name'), 'магазины');
const storeId = Object.fromEntries(stores.map((s) => [s.name, s.id]));
const sname = Object.fromEntries(STORES.map((s) => [s.id, s.name]));

// цены не затираем, если админ уже что-то менял
const existing = ok(await sb.from('store_prices').select('store_id,ingredient_id'), 'цены (чтение)');
const has = new Set(existing.map((p) => p.store_id + ':' + p.ingredient_id));
const prices = buildPrices().map((p) => ({ store_id: storeId[sname[p.store]], ingredient_id: ingId[p.ing], price: p.price })).filter((p) => !has.has(p.store_id + ':' + p.ingredient_id));
if (prices.length) ok(await sb.from('store_prices').insert(prices), `цены +${prices.length}`);

ok(await sb.from('recipes').delete().eq('source', 'seed'), 'старые seed-рецепты удалены');
for (const r of RECIPES) {
  const row = ok(await sb.from('recipes').insert({ slug: r.id, title: r.n, meal: r.m, minutes: r.t, kcal: r.k, protein: r.p, fat: r.f, carbs: r.c, tags: r.tg, allergens: r.al, need: r.need, steps: r.st, source: 'seed', status: 'approved' }).select('id').single(), `рецепт: ${r.n}`);
  ok(await sb.from('recipe_ingredients').insert(r.ing.map(([n, a]) => ({ recipe_id: row.id, ingredient_id: ingId[n], amount: a }))), '  ингредиенты');
}
console.log('\nГотово.');
