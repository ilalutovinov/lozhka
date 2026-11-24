import { RECIPES, INGREDIENTS, STORES, buildPrices } from '../lib/seed.js';
import { makeCtx, generatePlan, planCost, shoppingList, rankStores, splitBasket, macros, fmt } from '../lib/planner.js';

const prices = {}; buildPrices().forEach((p) => { (prices[p.store] ||= {})[p.ing] = p.price; });
const cat = { ING: Object.fromEntries(INGREDIENTS.map((i) => [i.name, i])), recipes: RECIPES, stores: STORES, prices };
const S = { store: 0, ad: 2, kid: 0, meals: ['b', 'l', 'd'], days: [0, 1, 2, 3, 4, 5], kit: ['Плита', 'Духовка'], diet: 'none', like: [], cal: 0, kc: 2000, al: ['none'], dis: [], home: ['Сахар'], bud: 9000 };

for (const bud of [14000, 9000, 6000]) {
  const s = { ...S, bud }, ctx = makeCtx(s, cat);
  const plan = generatePlan(ctx);
  console.log(`бюджет ${fmt(bud)} → меню ${fmt(planCost(ctx, plan))}, блюд ${plan.length}, уникальных ${new Set(plan.map((x) => x.rid)).size}`);
}
const ctx = makeCtx(S, cat), plan = generatePlan(ctx), items = shoppingList(ctx, plan);
const rank = rankStores(cat, items, { lat: 42.87, lng: 74.6 });
console.log('рейтинг магазинов:', rank.map((s) => `${s.name} ${fmt(s.total)}${s.dist ? ' +' + fmt(s.travel) : ''}`).join(' | '));
console.log('раздельно:', fmt(splitBasket(cat, items).total));
console.log('вег. + без глютена:', generatePlan(makeCtx({ ...S, diet: 'veg', al: ['gluten'] }, cat)).map((x) => ctx.byId[x.rid].n).join(', '));
console.log('КБЖУ овсянки (расчёт vs вручную):', macros(RECIPES[0].ing, cat.ING), RECIPES[0].k, RECIPES[0].p);
