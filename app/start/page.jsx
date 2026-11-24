'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/app';
import { MEALS, KIT, DIET, LIKE, ALG, DN } from '@/lib/options';
import { generatePlan, makeCtx, planCost, portions, fmt } from '@/lib/planner';

export default function Start() {
  const { S, set, cat, setPlan, setChk } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [load, setLoad] = useState(-1);
  const [q, setQ] = useState('');
  if (!cat) return <div className="ld"><div className="logo">🥗</div></div>;

  const tm = (k, v, ex) => {
    let a = [...S[k]];
    if (ex && v === ex) a = [ex];
    else { a = a.includes(v) ? a.filter((z) => z !== v) : [...a, v]; if (ex) a = a.filter((z) => z !== ex); if (ex && !a.length) a = [ex]; }
    set({ [k]: a });
  };
  const grid = (list, k, cls, multi, ex) => (
    <div className={`g ${cls}`}>{list.map(([id, name, e]) => {
      const on = multi ? S[k].includes(id) : S[k] === id;
      return <div key={id} className={`it ${on ? 'on' : ''}`} onClick={() => (multi ? tm(k, id, ex) : set({ [k]: id }))}><span className="e">{e}</span>{name}</div>;
    })}</div>
  );
  const names = Object.keys(cat.ING);
  const por = portions(S);
  const flt = (n) => n.toLowerCase().includes(q.toLowerCase());

  const STEPS = [
    { h: 'Где ты покупаешь продукты?', s: 'Цены меню считаются по выбранному магазину', btn: 'Дальше', b: () => (
      <div className="g g3">
        <div className={`it ${!S.store ? 'on' : ''}`} onClick={() => set({ store: 0 })}><span className="e">✨</span>Любой — подберите дешевле</div>
        {cat.stores.map((s) => <div key={s.id} className={`it ${S.store === s.id ? 'on' : ''}`} onClick={() => set({ store: s.id })}><span className="e" style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.short}</span>{s.name}</div>)}
      </div>) },
    { h: 'Кто будет есть?', s: 'Порции рассчитываются на всех', btn: 'Дальше', b: () => (<>
      {[['ad', '🧑', 'Взрослые', 'обычные порции', 1], ['kid', '🧒', 'Дети', 'детские порции', 0]].map(([k, e, t, d, mn]) => (
        <div className="row" key={k} style={{ cursor: 'default' }}><span className="e">{e}</span><div className="fl"><b>{t}</b><small>{d}</small></div>
          <div className="cnt"><button onClick={() => set({ [k]: Math.max(mn, S[k] - 1) })}>−</button>{S[k]}<button className="p" onClick={() => set({ [k]: S[k] + 1 })}>+</button></div></div>))}
      <div className="row" style={{ cursor: 'default' }}><div className="fl"><small>Порций на приём</small></div><b style={{ color: 'var(--or)', fontSize: 18 }}>{por}</b></div></>) },
    { h: 'Какие приёмы пищи?', s: 'Выбери, что планировать', btn: 'Дальше', b: () => MEALS.map(([id, t, d, e]) => (
      <div key={id} className={`row ${S.meals.includes(id) ? 'on' : ''}`} onClick={() => tm('meals', id)}><span className="e">{e}</span><div className="fl"><b>{t}</b><small>{d}</small></div><div className="ck">{S.meals.includes(id) ? '✓' : ''}</div></div>)) },
    { h: 'В какие дни готовишь?', s: 'Рекомендуем 6 дней, на 1 свободный', btn: 'Дальше', b: () => (<>
      <div className="days">{DN.map((n, i) => <div key={n} className={`it ${S.days.includes(i) ? 'on' : ''}`} onClick={() => tm('days', i)}>{n}</div>)}</div>
      <p className="sub" style={{ textAlign: 'center', marginTop: 14 }}>Готовишь {S.days.length} дн.</p></>) },
    { h: 'Что есть на кухне?', s: 'Отметь технику, которой пользуешься', btn: 'Дальше', b: () => (
      <div className="g g4">{KIT.map(([n, e]) => <div key={n} className={`it ${S.kit.includes(n) ? 'on' : ''}`} onClick={() => tm('kit', n)}><span className="e">{e}</span><small>{n}</small></div>)}</div>) },
    { h: 'Как ты питаешься?', s: '', btn: 'Дальше', b: () => grid(DIET, 'diet', 'g2', false) },
    { h: 'Что тебе ближе?', s: 'Можно выбрать несколько', btn: 'Дальше', b: () => grid(LIKE, 'like', 'g2', true) },
    { h: 'Считаешь калории?', s: '', btn: 'Дальше', b: () => (<>
      {[[0, 'Нет, без подсчётов', 'Просто вкусное и сбалансированное меню'], [1, 'Да, у меня есть цель', 'Подберём блюда под норму калорий']].map(([v, t, d]) => (
        <div key={v} className={`row ${!!S.cal === !!v ? 'on' : ''}`} onClick={() => set({ cal: v })}><div className="fl"><b>{t}</b><small>{d}</small></div><div className="ck">{!!S.cal === !!v ? '✓' : ''}</div></div>))}
      {!!S.cal && <input type="number" value={S.kc} onChange={(e) => set({ kc: +e.target.value })} placeholder="ккал в день" />}</>) },
    { h: 'Есть аллергии?', s: '', btn: 'Подтвердить и продолжить', b: () => grid(ALG, 'al', 'g2', true, 'none') },
    { h: 'Что не любишь?', s: '', btn: S.dis.length ? 'Дальше' : 'Пропустить', b: () => (<>
      <input type="text" placeholder="🔎 Найти продукт" value={q} onChange={(e) => setQ(e.target.value)} />
      {names.filter(flt).map((n) => <span key={n} className={`ch ${S.dis.includes(n) ? 'on' : ''}`} onClick={() => tm('dis', n)}>{cat.ING[n].emoji} {n}</span>)}</>) },
    { h: 'Что уже есть дома?', s: 'Учтём это в списке покупок', btn: S.home.length ? 'Дальше' : 'Пропустить', b: () => (<>
      <input type="text" placeholder="🔎 Найти продукт" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="g g4">{names.filter(flt).map((n) => <div key={n} className={`it ${S.home.includes(n) ? 'on' : ''}`} style={{ minHeight: 70 }} onClick={() => tm('home', n)}><span className="e">{cat.ING[n].emoji}</span><small>{n}</small></div>)}</div></>) },
    { h: 'Твой бюджет на неделю', s: `${S.days.length} дней · ${S.meals.length} приёма · ${por} порц.`, btn: 'Собрать моё меню', b: () => {
      const ctx = makeCtx(S, cat);
      const t = planCost(ctx, generatePlan(ctx, { seed: 1 })), c = planCost(ctx, generatePlan(ctx, { cheap: true }));
      const st = t <= S.bud * 0.9 ? 'С запасом' : t <= S.bud ? 'В притык' : c <= S.bud ? 'Подберём подешевле' : 'Бюджета маловато';
      return (<>
        <div className="big">{fmt(S.bud)}</div>
        <input type="range" min="1000" max="25000" step="500" value={S.bud} onChange={(e) => set({ bud: +e.target.value })} />
        <div className="card" style={{ marginTop: 16 }}><b>{st}</b>
          <div className="sub" style={{ margin: '4px 0 0' }}>Меню по твоим условиям — примерно {fmt(t)}, самый бюджетный вариант — {fmt(c)}.</div>
          <div className="bx"><div>{fmt(c)}<small>минимум</small></div><div>{fmt(S.bud)}<small>бюджет</small></div><div>{generatePlan(ctx).length * por}<small>порций</small></div></div></div></>);
    } },
  ];

  const next = () => {
    if (step < STEPS.length - 1) { setStep(step + 1); setQ(''); window.scrollTo(0, 0); return; }
    setLoad(0);
    let i = 0;
    const t = setInterval(() => {
      i++; setLoad(i);
      if (i > 5) {
        clearInterval(t);
        const ctx = makeCtx(S, cat);
        setPlan(generatePlan(ctx, { seed: Date.now() % 1000 })); setChk({});
        router.push('/plan');
      }
    }, 450);
  };

  if (load >= 0) {
    const L = ['Смотрим сходные недели…', 'Подбираем рецепты…', 'Считаем калории…', 'Сверяем цены магазинов…', 'Сверяем с бюджетом…'];
    return <div className="ld"><div className="logo">🥗</div><b style={{ color: 'var(--or)', fontSize: 20 }}>Лёгкость</b>
      {L.map((x, i) => <div key={x} className={`ls ${load > i ? 'd' : ''}`}>{load > i ? '✓' : '○'} {x}</div>)}</div>;
  }
  const d = STEPS[step];
  return (
    <div className="narrow">
      <div className="top">
        <button className="back" style={{ visibility: step ? 'visible' : 'hidden' }} onClick={() => setStep(step - 1)}>‹</button>
        <div className="pr"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
        <span className="mu" style={{ fontSize: 12 }}>{step + 1}/{STEPS.length}</span>
      </div>
      <h1>{d.h}</h1><p className="sub">{d.s}</p>
      {d.b()}
      <button className="btn full cta" onClick={next}>{d.btn}</button>
    </div>
  );
}
