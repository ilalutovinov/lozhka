// Импорт рецептов из бесплатного API TheMealDB (https://www.themealdb.com/api.php).
// Использование: npm run import:meals [сколько]   (по умолчанию 40)
// Рецепты попадают со статусом 'pending' — проверь и одобри в админке (вкладка «Рецепты»).
// Берём только блюда, где большинство ингредиентов удалось сопоставить с нашими продуктами.
// Названия и шаги — на английском (TheMealDB англоязычный): переведи вручную или добавь шаг перевода через API.
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const LIMIT = +process.argv[2] || 40;

const MAP = { chicken: 'Курица', 'chicken breast': 'Курица', 'chicken thighs': 'Курица', beef: 'Говядина', lamb: 'Баранина', mutton: 'Баранина', fish: 'Рыба', salmon: 'Рыба', cod: 'Рыба', haddock: 'Рыба', rice: 'Рис', 'basmati rice': 'Рис', potato: 'Картофель', potatoes: 'Картофель', carrot: 'Морковь', carrots: 'Морковь', onion: 'Лук', onions: 'Лук', 'red onion': 'Лук', garlic: 'Чеснок', 'garlic clove': 'Чеснок', tomato: 'Томаты', tomatoes: 'Томаты', 'chopped tomatoes': 'Томаты', milk: 'Молоко', butter: 'Сливочное масло', egg: 'Яйца', eggs: 'Яйца', flour: 'Мука', 'plain flour': 'Мука', 'self-raising flour': 'Мука', sugar: 'Сахар', 'caster sugar': 'Сахар', cheese: 'Сыр', 'cheddar cheese': 'Сыр', mushrooms: 'Грибы', pasta: 'Макароны', spaghetti: 'Макароны', penne: 'Макароны', noodles: 'Лапша', yogurt: 'Йогурт', 'greek yogurt': 'Йогурт', bread: 'Хлеб', walnuts: 'Орехи', almonds: 'Орехи', banana: 'Банан', bananas: 'Банан', apple: 'Яблоки', apples: 'Яблоки', courgettes: 'Кабачок', zucchini: 'Кабачок', 'olive oil': 'Масло подсолнечное', 'vegetable oil': 'Масло подсолнечное', oil: 'Масло подсолнечное', oats: 'Овсяные хлопья', chocolate: 'Шоколад', 'dark chocolate': 'Шоколад', buckwheat: 'Гречка', 'minced beef': 'Говядина', 'ground beef': 'Говядина', 'minced lamb': 'Баранина' };
const TRIVIAL = new Set(['salt', 'pepper', 'black pepper', 'water', 'sea salt', 'paprika', 'cumin', 'oregano', 'parsley', 'thyme', 'bay leaf', 'bay leaves', 'cinnamon', 'turmeric', 'coriander', 'ginger', 'chilli powder', 'basil', 'rosemary', 'sage', 'vinegar', 'soy sauce', 'stock', 'chicken stock', 'beef stock', 'lemon', 'lemon juice', 'cayenne pepper', 'garam masala', 'mustard', 'vanilla extract', 'baking powder', 'honey']);
const UNIT = { g: 1, gram: 1, grams: 1, kg: 1000, ml: 1, l: 1000, litre: 1000, tbsp: 15, tblsp: 15, tablespoon: 15, tablespoons: 15, tsp: 5, teaspoon: 5, teaspoons: 5, cup: 240, cups: 240, oz: 28, lb: 454, lbs: 454 };
const PIECE_G = { Лук: 110, Морковь: 70, Картофель: 150, Томаты: 120, Чеснок: 5, Кабачок: 200, Банан: 120, Яблоки: 180 };

function qty(measure, ing) {
  const m = (measure || '').toLowerCase().trim().match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*([a-z]+)?/);
  if (!m) return null;
  const num = m[1].split(/\s+/).reduce((s, x) => s + (x.includes('/') ? x.split('/')[0] / x.split('/')[1] : +x), 0);
  const u = m[2];
  if (u && UNIT[u]) return num * UNIT[u];
  if (ing.unit === 'pc') return num;
  return num * (PIECE_G[ing.name] || 100);
}

const { data: ings, error } = await sb.from('ingredients').select('*');
if (error) throw error;
const byName = Object.fromEntries(ings.map((i) => [i.name, i]));
const { data: ex } = await sb.from('recipes').select('slug').like('slug', 'mealdb-%');
const done = new Set((ex || []).map((r) => r.slug));

const meals = [];
for (const l of 'abcdefghijklmnopqrstuvwxyz') {
  const j = await (await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${l}`)).json();
  meals.push(...(j.meals || []));
}
console.log('получено из API:', meals.length);

let added = 0;
for (const m of meals) {
  if (added >= LIMIT) break;
  const slug = 'mealdb-' + m.idMeal;
  if (done.has(slug)) continue;
  const acc = {}; let nontriv = 0, mapped = 0;
  for (let i = 1; i <= 20; i++) {
    const raw = (m['strIngredient' + i] || '').toLowerCase().trim();
    if (!raw || TRIVIAL.has(raw)) continue;
    nontriv++;
    const ru = MAP[raw]; const ing = ru && byName[ru];
    if (!ing) continue;
    const g = qty(m['strMeasure' + i], ing);
    if (!g) continue;
    mapped++; acc[ing.name] = (acc[ing.name] || 0) + g;
  }
  if (mapped < 3 || mapped / nontriv < 0.6) continue;
  const PORT = 4; // TheMealDB не указывает число порций — считаем 4
  const per = Object.entries(acc).map(([n, g]) => [byName[n], g / PORT]);
  const t = per.reduce((s, [i, a]) => { const g = i.unit === 'pc' ? a * i.gpp : a; return { k: s.k + i.kcal * g / 100, p: s.p + i.protein * g / 100, f: s.f + i.fat * g / 100, c: s.c + i.carbs * g / 100 }; }, { k: 0, p: 0, f: 0, c: 0 });
  const names = per.map(([i]) => i.name);
  const tags = names.some((n) => ['Курица', 'Курица (фарш)', 'Говядина', 'Баранина'].includes(n)) ? ['m'] : names.includes('Рыба') ? ['f', 'a'] : names.some((n) => ['Молоко', 'Яйца', 'Сыр', 'Сливочное масло', 'Творог', 'Йогурт', 'Каймак'].includes(n)) ? ['a'] : [];
  const meal = m.strCategory === 'Breakfast' ? 'b' : m.strCategory === 'Dessert' || m.strCategory === 'Starter' || m.strCategory === 'Side' ? 's' : 'd';
  const rr = await sb.from('recipes').insert({ slug, title: m.strMeal, meal, minutes: 40, kcal: Math.round(t.k), protein: Math.round(t.p), fat: Math.round(t.f), carbs: Math.round(t.c), tags, allergens: [], steps: (m.strInstructions || '').split(/\r?\n/).map((s) => s.trim()).filter((s) => s.length > 3).slice(0, 12), source: 'themealdb', status: 'pending' }).select('id').single();
  if (rr.error) { console.error(rr.error.message); continue; }
  await sb.from('recipe_ingredients').insert(per.map(([i, a]) => ({ recipe_id: rr.data.id, ingredient_id: i.id, amount: Math.round(a * 10) / 10 })));
  added++; console.log('+', m.strMeal);
}
console.log(`Импортировано: ${added}. Одобри их в админке → «Рецепты» → «На модерации».`);
