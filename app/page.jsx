'use client';
import Link from 'next/link';
import { useApp } from '@/lib/app';

const STEPS = [
  ['Расскажи о себе', '12 коротких вопросов: сколько вас, что любите, что нельзя, какой бюджет и что есть на кухне.'],
  ['Получи меню', 'Алгоритм собирает неделю: без повторов, под диету и аллергии, в рамках бюджета и нормы калорий.'],
  ['Сходи в нужный магазин', 'Список покупок считается по ценам магазинов. Карта подскажет, где выйдет дешевле с учётом дороги.'],
  ['Готовь и корректируй', 'Не нравится блюдо — замени в один клик. Свои рецепты добавляй в каталог.'],
];
const FEATS = [
  ['💸', 'Меню под бюджет', 'Укладываемся в твою сумму: подменяем дорогие блюда на доступные, пока не сойдётся.'],
  ['🗺️', 'Где дешевле — на карте', 'Сравниваем корзину по магазинам и рынкам, прибавляем стоимость дороги и показываем лучший вариант.'],
  ['🧾', 'Список покупок', 'Учитывает то, что уже есть дома. Можно скопировать, распечатать или поделиться.'],
  ['📖', 'Свои рецепты', 'Добавляй блюда — КБЖУ посчитается автоматически, а цена — по ценам магазинов.'],
  ['🔄', 'Замена в один клик', 'Не хочешь плов — нажми «заменить», остальная неделя подстроится.'],
  ['☁️', 'Запоминает тебя', 'Зарегистрируйся — настройки и меню будут на любом устройстве.'],
];

export default function Home() {
  const { cat, plan } = useApp();
  return (
    <div className="wrap">
      <section className="hero-l">
        <div>
          <span className="badge">Бишкек · цены магазинов и рынков</span>
          <h1>Меню на неделю — за 2 минуты и в рамках бюджета</h1>
          <p>Скажи, что любишь и сколько готов потратить. «Лёгкость» соберёт меню, посчитает список покупок и покажет, в каком магазине выйдет дешевле.</p>
          <div className="actions">
            <Link className="btn" href="/start">Собрать моё меню →</Link>
            {plan.length > 0 && <Link className="btn sec" href="/plan">Моё текущее меню</Link>}
          </div>
          <div className="stats">
            <div><b>{cat ? cat.recipes.length : '…'}</b><span className="mu">рецептов</span></div>
            <div><b>{cat ? cat.stores.length : '…'}</b><span className="mu">магазинов и рынков</span></div>
            <div><b>{cat ? Object.keys(cat.ING).length : '…'}</b><span className="mu">продуктов с ценами</span></div>
          </div>
        </div>
        <div className="mock">
          <div className="hero">🥗</div>
          <b>Твоя неделя готова!</b>
          <div className="bar" style={{ marginTop: 10 }}><i style={{ width: '68%' }} /></div>
          <small className="ok">в бюджете · выгоднее всего: Ошский базар</small>
          <div className="meal" style={{ marginTop: 10 }}><div className="th">🥣</div><div><small>Пн · Завтрак</small><b>Овсянка с шоколадом и бананом</b></div></div>
          <div className="meal"><div className="th">🍚</div><div><small>Пн · Ужин</small><b>Плов с курицей</b></div></div>
        </div>
      </section>

      <h2>Как это работает</h2>
      <div className="grid4">{STEPS.map(([t, d], i) => <div className="feat" key={t}><div className="stepn">{i + 1}</div><b>{t}</b><span className="mu">{d}</span></div>)}</div>

      <h2>Что внутри</h2>
      <div className="grid3">{FEATS.map(([e, t, d]) => <div className="feat" key={t}><div className="e">{e}</div><b>{t}</b><span className="mu">{d}</span></div>)}</div>

      <div className="card" style={{ margin: '28px 0 40px', textAlign: 'center', padding: 28 }}>
        <h2 style={{ marginTop: 0 }}>Хватит думать «что приготовить?»</h2>
        <Link className="btn" href="/start">Начать — это бесплатно</Link>
      </div>
    </div>
  );
}
