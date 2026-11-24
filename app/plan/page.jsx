'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/app';
import { sb } from '@/lib/supabase';
import { DN, MN } from '@/lib/options';
import { generatePlan, makeCtx, planCost, shoppingList, swapMeal, rankStores, splitBasket, fmt, U } from '@/lib/planner';

const StoreMap = dynamic(() => import('@/components/StoreMap'), { ssr: false, loading: () => <div className="card">Загружаем карту…</div> });
const MEALORDER = ['b', 'l', 'd', 's'];

export default function Plan() {
  const { S, plan, setPlan, chk, setChk, cat, user, say } = useApp();
  const [tab, setTab] = useState('menu');
  const [open, setOpen] = useState(null);
  const [rp, setRp] = useState(1);
  const [pstore, setPstore] = useState(null);
  const [me, setMe] = useState(null);

  const ctx = useMemo(() => cat && makeCtx(S, cat, pstore ?? S.store), [S, cat, pstore]);
  if (!cat) return <div className="wrap"><p className="sub">Загрузка…</p></div>;
  if (!plan.filter((x) => ctx.byId[x.rid]).length) return (
    <div className="narrow" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div className="logo" style={{ margin: '0 auto 14px' }}>🥗</div><h1>Меню ещё не собрано</h1>
      <p className="sub">Ответь на несколько вопросов — это займёт пару минут.</p><Link className="btn" href="/start">Собрать меню</Link></div>);

  const live = plan.filter((x) => ctx.byId[x.rid]);
  const items = shoppingList(ctx, live);
  const need = items.filter((i) => !i.home);
  const listTotal = need.reduce((s, i) => s + i.a * ctx.priceOf(i.n), 0);
  const menuCost = planCost(ctx, live);
  const over = menuCost > S.bud;
  const ranked = rankStores(cat, items, me);
  const split = splitBasket(cat, items);
  const best = ranked[0];
  const worst = ranked.reduce((m, s) => Math.max(m, s.total), 0);
  const amt = (i) => `${Math.round(i.a)} ${U(cat.ING[i.n])}`;

  const rebuild = (cheap) => { setPlan(generatePlan(ctx, { cheap, seed: Math.random() * 1e6 })); setChk({}); say(cheap ? 'Собрали подешевле' : 'Меню пересобрано'); };
  const swap = (i) => { setPlan(swapMeal(ctx, live, i)); setOpen(null); };
  const copy = async () => {
    const t = 'Список покупок:\n' + need.map((i) => `• ${i.n} — ${amt(i)} (~${fmt(i.a * ctx.priceOf(i.n))})`).join('\n') + `\nИтого ~${fmt(listTotal)}`;
    try { await navigator.clipboard.writeText(t); say('Список скопирован'); } catch { say('Не удалось скопировать'); }
  };
  const locate = () => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition((p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }), () => say('Нет доступа к геолокации'))
    : say('Геолокация недоступна');
  const report = async (n) => {
    if (!sb || !user) return say('Войдите, чтобы сообщать цены');
    const sid = pstore ?? S.store; if (!sid) return say('Выберите конкретный магазин сверху');
    const v = parseFloat(window.prompt(`Сколько сейчас стоит «${n}» в «${cat.stores.find((s) => s.id === sid)?.name}»? (сом за ${cat.ING[n].unit === 'pc' ? 'шт' : cat.ING[n].unit === 'ml' ? 'литр' : 'кг'})`));
    if (!(v > 0)) return;
    const { error } = await sb.from('price_reports').insert({ store_id: sid, ingredient_id: cat.ING[n].id, price: v });
    say(error ? 'Ошибка отправки' : 'Спасибо! Цена уйдёт на проверку');
  };

  const r = open != null ? ctx.byId[live[open].rid] : null;
  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <h1>Твоя неделя готова!</h1>
      <div className="split" style={{ alignItems: 'stretch', gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="card">
          <small className="mu">Стоимость меню · {pstore ? cat.stores.find((s) => s.id === pstore)?.name : S.store ? cat.stores.find((s) => s.id === S.store)?.name : 'средняя по магазинам'}</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(menuCost)}</div>
          <div className={`bar ${over ? 'over' : ''}`}><i style={{ width: `${Math.min(100, (menuCost / S.bud) * 100)}%` }} /></div>
          <small className={over ? 'bad' : 'ok'}>{over ? `выше бюджета на ${fmt(menuCost - S.bud)}` : `в бюджете, остаётся ${fmt(S.bud - menuCost)}`}</small>
        </div>
        {best && <div className="card"><small className="mu">Выгоднее всего купить</small><div style={{ fontSize: 20, fontWeight: 800 }}>{best.name}</div>
          <small className="ok">корзина {fmt(best.total)} · на {fmt(worst - best.total)} дешевле самого дорогого</small></div>}
      </div>
      <div className="actions">
        <button className="btn sm sec" onClick={() => rebuild(false)}>🔄 Пересобрать</button>
        <button className="btn sm sec" onClick={() => rebuild(true)}>💸 Подешевле</button>
        <button className="btn sm sec" onClick={() => window.print()}>🖨️ Печать</button>
        <Link className="btn sm sec" href="/start">⚙️ Изменить условия</Link>
        <select style={{ width: 'auto', margin: 0 }} value={pstore ?? S.store} onChange={(e) => setPstore(+e.target.value)}>
          <option value={0}>Цены: средние</option>{cat.stores.map((s) => <option key={s.id} value={s.id}>Цены: {s.name}</option>)}
        </select>
      </div>
      <div className="tabs">{[['menu', 'Меню'], ['list', `Покупки (${need.length})`], ['stores', 'Где купить']].map(([k, t]) => <div key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</div>)}</div>

      {tab === 'menu' && <div className="weekgrid">{[...new Set(live.map((x) => x.d))].sort().map((d) => {
        const slots = live.map((x, i) => ({ ...x, i })).filter((x) => x.d === d).sort((a, b) => MEALORDER.indexOf(a.m) - MEALORDER.indexOf(b.m));
        const kc = slots.reduce((s, x) => s + ctx.byId[x.rid].k, 0);
        return <div className="day" key={d}><b><span>{DN[d]}</span><small className="mu">{kc} ккал</small></b>
          {slots.map((x) => { const rc = ctx.byId[x.rid]; return (
            <div className="meal" key={x.i} onClick={() => { setOpen(x.i); setRp(ctx.por); }}>
              <div className="th">{cat.ING[rc.ing[0][0]]?.emoji || '🍲'}</div>
              <div><small>{MN[x.m]}</small><b>{rc.n}</b><small style={{ textTransform: 'none' }}>{rc.t} мин · {fmt(ctx.cost(rc))}</small></div></div>); })}</div>;
      })}</div>}

      {tab === 'list' && <div className="card">
        {items.map((i) => (
          <div key={i.n} className="ig" style={{ opacity: i.home ? 0.5 : 1, cursor: 'pointer' }} onClick={() => setChk({ ...chk, [i.n]: !chk[i.n] })}>
            <span style={{ textDecoration: chk[i.n] ? 'line-through' : 'none' }}>{chk[i.n] ? '☑️' : '⬜'} {cat.ING[i.n].emoji} <b>{i.n}</b> <small className="mu">{i.home ? 'есть дома' : amt(i)}</small></span>
            <span>{!i.home && <>{fmt(i.a * ctx.priceOf(i.n))} <a href="#" title="Цена другая?" onClick={(e) => { e.preventDefault(); e.stopPropagation(); report(i.n); }}>💬</a></>}</span>
          </div>))}
        <div className="ig"><b>Итого</b><b>{fmt(listTotal)}</b></div>
        <div className="actions"><button className="btn sm" onClick={copy}>📋 Скопировать список</button><small className="mu" style={{ alignSelf: 'center' }}>💬 — сообщить, что цена другая</small></div>
      </div>}

      {tab === 'stores' && <>
        <div className="actions"><button className="btn sm" onClick={locate}>📍 Учесть, где я нахожусь</button>
          <small className="mu" style={{ alignSelf: 'center' }}>{me ? `К цене добавляется дорога (~15 сом/км туда-обратно)` : 'Без геолокации сравниваем только цены'}</small></div>
        <div className="split">
          <StoreMap stores={ranked.map((s, i) => ({ ...s, label: `${fmt(s.total)}${i === 0 ? ' — лучший выбор' : ''}` }))} user={me} best={best?.id} />
          <div className="card" style={{ overflow: 'auto' }}>
            <table className="t"><thead><tr><th>Магазин</th><th>Корзина</th>{me && <th>Путь</th>}</tr></thead><tbody>
              {ranked.map((s, i) => <tr key={s.id}><td><b style={{ color: s.color }}>{s.short}</b> {s.name} {i === 0 && <span className="badge">лучший</span>}
                {s.missing > 0 && <><br /><small className="mu">нет цен на {s.missing} тов. — взяты средние</small></>}</td>
                <td>{fmt(s.total)}</td>{me && <td>{s.dist?.toFixed(1)} км<br /><small className="mu">+{fmt(s.travel)}</small></td>}</tr>)}
            </tbody></table></div>
        </div>
        <h2>Каждый товар — там, где дешевле</h2>
        <div className="card"><p className="sub">Если готов объехать {split.stores.length} {split.stores.length === 1 ? 'место' : 'места'}: <b className="ok">{fmt(split.total)}</b>{best && split.total < best.total ? ` — это на ${fmt(best.total - split.total)} меньше, чем в «${best.name}»` : ''}.</p>
          {split.stores.map((g) => <div key={g.store.id} className="ig"><span><b style={{ color: g.store.color }}>{g.store.short}</b> <b>{g.store.name}</b><br /><small className="mu">{g.items.map((x) => x.n).join(', ')}</small></span><b>{fmt(g.sum)}</b></div>)}</div>
      </>}

      {r && <div className="modal-bg" onClick={() => setOpen(null)}><div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="hero">{cat.ING[r.ing[0][0]]?.emoji || '🍲'}</div>
        <h1 style={{ marginTop: 0 }}>{r.n}</h1>
        <div className="mac"><span>⏱ {r.t} мин</span><span>Б {r.p} г</span><span>Ж {r.f} г</span><span>У {r.c} г</span><b>{r.k} ккал/порц.</b></div>
        <h3 style={{ marginTop: 16 }}>Ингредиенты</h3>
        <div className="cnt" style={{ marginBottom: 6 }}><b>{rp} порц.</b><button onClick={() => setRp(Math.max(1, rp - 1))}>−</button><button className="p" onClick={() => setRp(rp + 1)}>+</button></div>
        {r.ing.map(([n, a]) => <div className="ig" key={n}><span>{cat.ING[n]?.emoji} {n}</span><span><b>{Math.round(a * rp * 10) / 10} {U(cat.ING[n])}</b> <small className="mu">{fmt(a * rp * ctx.priceOf(n))}</small></span></div>)}
        <div className="ig"><b>Стоимость</b><b>{fmt(ctx.portionCost(r) * rp)}</b></div>
        <h3 style={{ marginTop: 16 }}>Приготовление</h3>
        {r.st.map((s, i) => <div className="ig" key={i}><span><b style={{ color: 'var(--or)' }}>{i + 1}.</b> {s}</span></div>)}
        <div className="actions"><button className="btn sm" onClick={() => swap(open)}>🔄 Заменить блюдо</button><button className="btn sm sec" onClick={() => setOpen(null)}>Закрыть</button></div>
      </div></div>}
    </div>
  );
}
