import { sb } from './supabase';
import * as seed from './seed';

// Единый формат каталога:
// { ING: {имя: {id, emoji, unit, base, category, kcal, protein, fat, carbs, gpp}},
//   recipes: [{id, n, m, t, k, p, f, c, tg[], al[], need, st[], ing:[[имя, кол-во на порцию]], status, source, mine}],
//   stores: [...], prices: {storeId: {имя: цена за кг/л/шт}}, demo: bool }

function seedCatalog() {
  const prices = {};
  seed.buildPrices().forEach((p) => { (prices[p.store] ||= {})[p.ing] = p.price; });
  return {
    demo: true,
    ING: Object.fromEntries(seed.INGREDIENTS.map((i) => [i.name, i])),
    recipes: seed.RECIPES.map((r) => ({ ...r })),
    stores: seed.STORES, prices,
  };
}

export async function loadCatalog() {
  if (!sb) return seedCatalog();
  try {
    const [ing, st, pr, rc, me] = await Promise.all([
      sb.from('ingredients').select('*').order('id'),
      sb.from('stores').select('*').order('id'),
      sb.from('store_prices').select('store_id, price, ingredients(name)'),
      sb.from('recipes').select('*, recipe_ingredients(amount, ingredients(name))').order('created_at'),
      sb.auth.getUser(),
    ]);
    const err = ing.error || st.error || pr.error || rc.error;
    if (err) throw err;
    if (!ing.data.length || !rc.data.length) return seedCatalog(); // БД ещё не засеяна
    const uid = me.data?.user?.id;
    const ING = Object.fromEntries(ing.data.map((i) => [i.name, {
      id: i.id, name: i.name, emoji: i.emoji, unit: i.unit, base: +i.base_price, category: i.category,
      kcal: +i.kcal, protein: +i.protein, fat: +i.fat, carbs: +i.carbs, gpp: +i.gpp,
    }]));
    const prices = {};
    pr.data.forEach((p) => { if (p.ingredients) (prices[p.store_id] ||= {})[p.ingredients.name] = +p.price; });
    const recipes = rc.data.map((r) => ({
      id: r.slug || r.id, dbId: r.id, n: r.title, m: r.meal, t: r.minutes, k: r.kcal, p: r.protein, f: r.fat, c: r.carbs,
      tg: r.tags || [], al: r.allergens || [], need: r.need, st: r.steps || [], status: r.status, source: r.source,
      mine: !!uid && r.author === uid,
      ing: (r.recipe_ingredients || []).filter((x) => x.ingredients).map((x) => [x.ingredients.name, +x.amount]),
    })).filter((r) => r.ing.length);
    return { demo: false, ING, recipes, stores: st.data, prices };
  } catch (e) {
    console.warn('Supabase недоступен, демо-режим:', e);
    return seedCatalog();
  }
}
