// Ядро: подбор меню под профиль + бюджет + реальные цены магазинов, список покупок, выбор магазина.
const ORDER = ['b', 'l', 'd', 's'];
const SHARE = { b: 0.25, l: 0.35, d: 0.3, s: 0.1 };
export const TRAVEL_SOM_PER_KM = 15; // допущение: «стоимость» километра пути (туда-обратно)

export const portions = (S) => Math.max(1, Math.ceil(S.ad + S.kid * 0.5));
export const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сом';
export const U = (ing) => (ing?.unit === 'ml' ? 'мл' : ing?.unit === 'pc' ? 'шт' : 'г');

// Цена 1 г / 1 мл / 1 шт. Если у магазина нет цены на товар — берём среднюю по магазинам, потом базовую.
export function priceFn(cat, storeId) {
  return (name) => {
    const ing = cat.ING[name];
    if (!ing) return 0;
    const k = ing.unit === 'pc' ? 1 : 0.001;
    const own = storeId ? cat.prices[storeId]?.[name] : null;
    if (own != null) return own * k;
    const v = Object.values(cat.prices).map((x) => x[name]).filter((x) => x != null);
    return (v.length ? v.reduce((a, b) => a + b, 0) / v.length : ing.base) * k;
  };
}

export function makeCtx(S, cat, storeId = S.store) {
  const priceOf = priceFn(cat, storeId);
  const por = portions(S);
  const byId = Object.fromEntries(cat.recipes.map((r) => [r.id, r]));
  const portionCost = (r) => r.ing.reduce((s, [n, a]) => s + a * priceOf(n), 0);
  return { S, cat, priceOf, por, byId, portionCost, cost: (r) => portionCost(r) * por };
}

export function allowed(r, S) {
  const d = S.diet, tg = r.tg;
  if (['veg', 'vegan', 'lent'].includes(d) && (tg.includes('m') || tg.includes('f'))) return false;
  if (['vegan', 'lent'].includes(d) && tg.includes('a')) return false;
  if (d === 'pesc' && tg.includes('m')) return false;
  if (!S.al.includes('none') && r.al.some((a) => S.al.includes(a))) return false;
  if (r.ing.some(([n]) => S.dis.some((z) => n.startsWith(z)))) return false;
  if (r.need && !S.kit.includes(r.need)) return false;
  return true;
}

const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };
const poolFor = (ctx, m) => {
  const all = ctx.cat.recipes.filter((r) => r.m === m);
  const ok = all.filter((r) => allowed(r, ctx.S));
  return ok.length ? ok : all;
};

function score(r, m, i, ctx, st, o) {
  const { S } = ctx;
  let s = 0;
  s += (st.used[r.id] || 0) * (S.like.includes('prep') ? 20 : 90);          // разнообразие
  if (st.last[m] === r.id) s += 500;                                        // не два раза подряд
  s += ctx.cost(r) * (o.cheap ? 1 : 0.2);                                   // цена
  if (S.like.includes('fast')) s += r.t * 0.8;
  if (S.like.includes('pan')) s += r.ing.length * 4;
  if (S.diet === 'keto') s += r.c * 2.5;
  if (S.diet === 'protein') s -= r.p * 2.5;
  if (S.diet === 'small') s += r.k * 0.05;
  s -= r.ing.filter(([n]) => st.ings.has(n)).length * 7;                    // общие продукты → меньше остатков
  if (S.cal) {
    const sum = S.meals.reduce((a, x) => a + SHARE[x], 0);
    s += Math.abs(r.k - (S.kc * SHARE[m]) / sum) * 0.12;                    // близко к норме калорий
  }
  return s + hash(o.seed + ':' + i + ':' + r.id) * 12;
}

function pick(pool, m, i, ctx, st, o, exclude = []) {
  let best = null, bs = Infinity;
  for (const r of pool) {
    if (exclude.includes(r.id)) continue;
    const s = score(r, m, i, ctx, st, o);
    if (s < bs) { bs = s; best = r; }
  }
  return best;
}

const note = (st, r, m) => { st.used[r.id] = (st.used[r.id] || 0) + 1; st.last[m] = r.id; r.ing.forEach(([n]) => st.ings.add(n)); };

export const planCost = (ctx, plan) => plan.reduce((s, x) => s + (ctx.byId[x.rid] ? ctx.cost(ctx.byId[x.rid]) : 0), 0);

export function generatePlan(ctx, { cheap = false, seed = 0 } = {}) {
  const { S } = ctx;
  const slots = [];
  [...S.days].sort().forEach((d) => ORDER.forEach((m) => S.meals.includes(m) && slots.push({ d, m })));
  const pools = Object.fromEntries(S.meals.map((m) => [m, poolFor(ctx, m)]));
  const st = { used: {}, ings: new Set(), last: {} };
  const plan = [];
  slots.forEach((sl, i) => {
    const r = pick(pools[sl.m], sl.m, i, ctx, st, { cheap, seed });
    if (!r) return;
    note(st, r, sl.m);
    plan.push({ d: sl.d, m: sl.m, rid: r.id });
  });
  // Подгонка под бюджет: заменяем блюдо, где замена даёт наибольшую экономию
  let total = planCost(ctx, plan), guard = 0;
  while (total > S.bud && guard++ < 300) {
    let bi = -1, br = null, bsave = 0;
    plan.forEach((x, i) => {
      const cur = ctx.byId[x.rid];
      pools[x.m].forEach((r) => {
        if (r.id === x.rid) return;
        const dup = plan.filter((o) => o.rid === r.id).length;
        const save = ctx.cost(cur) - ctx.cost(r) - dup * 30;
        if (save > bsave) { bsave = save; bi = i; br = r; }
      });
    });
    if (bi < 0) break;
    plan[bi] = { ...plan[bi], rid: br.id };
    total = planCost(ctx, plan);
  }
  return plan;
}

// Новое блюдо для одного слота (кнопка «Заменить»)
export function swapMeal(ctx, plan, i) {
  const x = plan[i], st = { used: {}, ings: new Set(), last: {} };
  plan.forEach((o, j) => { if (j !== i && ctx.byId[o.rid]) note(st, ctx.byId[o.rid], o.m); });
  const r = pick(poolFor(ctx, x.m), x.m, i, ctx, st, { cheap: false, seed: Math.random() * 1e6 }, [x.rid]);
  return r ? plan.map((p, j) => (j === i ? { ...p, rid: r.id } : p)) : plan;
}

export function shoppingList(ctx, plan) {
  const m = {};
  plan.forEach((x) => ctx.byId[x.rid]?.ing.forEach(([n, a]) => { m[n] = (m[n] || 0) + a * ctx.por; }));
  return Object.entries(m)
    .map(([n, a]) => ({ n, a, home: ctx.S.home.includes(n) }))
    .sort((x, y) => x.home - y.home || (ctx.cat.ING[x.n]?.category || '').localeCompare(ctx.cat.ING[y.n]?.category || ''));
}

export function haversine(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Корзина по каждому магазину + «стоимость дороги» → рейтинг, где выгоднее всего
export function rankStores(cat, items, user) {
  const need = items.filter((i) => !i.home);
  return cat.stores.filter((s) => s.lat != null).map((s) => {
    const pf = priceFn(cat, s.id);
    const total = need.reduce((sum, i) => sum + i.a * pf(i.n), 0);
    const missing = need.filter((i) => cat.prices[s.id]?.[i.n] == null).length;
    const dist = user ? haversine(user, s) : null;
    const travel = dist != null ? dist * 2 * TRAVEL_SOM_PER_KM : 0;
    return { ...s, total, missing, dist, travel, score: total + travel };
  }).sort((a, b) => a.score - b.score);
}

// «Каждый товар там, где дешевле»
export function splitBasket(cat, items) {
  const by = {}; let total = 0;
  items.filter((i) => !i.home).forEach((i) => {
    let best = null;
    cat.stores.forEach((s) => {
      const p = cat.prices[s.id]?.[i.n];
      if (p == null) return;
      const unit = cat.ING[i.n].unit === 'pc' ? 1 : 0.001;
      const c = i.a * p * unit;
      if (!best || c < best.c) best = { s, c };
    });
    if (best) { (by[best.s.id] ||= { store: best.s, items: [], sum: 0 }); by[best.s.id].items.push({ n: i.n, c: best.c }); by[best.s.id].sum += best.c; total += best.c; }
  });
  return { total, stores: Object.values(by).sort((a, b) => b.sum - a.sum) };
}

// КБЖУ на порцию из ингредиентов (amounts — на одну порцию)
export function macros(ing, ING) {
  const t = { k: 0, p: 0, f: 0, c: 0 };
  ing.forEach(([n, a]) => {
    const x = ING[n]; if (!x) return;
    const g = x.unit === 'pc' ? a * x.gpp : a;
    t.k += (x.kcal * g) / 100; t.p += (x.protein * g) / 100; t.f += (x.fat * g) / 100; t.c += (x.carbs * g) / 100;
  });
  return { k: Math.round(t.k), p: Math.round(t.p), f: Math.round(t.f), c: Math.round(t.c) };
}
