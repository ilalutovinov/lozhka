'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/app';
import { sb } from '@/lib/supabase';
import { MEALS, MN, ALG } from '@/lib/options';
import { makeCtx, macros, fmt, U } from '@/lib/planner';

const KINDS = [['', 'Овощное / без мяса'], ['a', 'С молочным / яйцами'], ['f', 'С рыбой'], ['m', 'С мясом']];

export default function Recipes() {
  const { S, cat, user, reload, say } = useApp();
  const [q, setQ] = useState(''), [meal, setMeal] = useState(''), [mine, setMine] = useState(false), [sel, setSel] = useState(null), [form, setForm] = useState(false);
  const ctx = useMemo(() => cat && makeCtx(S, cat), [S, cat]);
  if (!cat) return <div className="wrap"><p className="sub">Загрузка…</p></div>;
  const list = cat.recipes.filter((r) => (!meal || r.m === meal) && (!mine || r.mine) && r.n.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <h1>Рецепты</h1>
      <p className="sub">{cat.recipes.length} в каталоге. Цена — на одну порцию{S.store ? '' : ', по средним ценам'}.</p>
      <div className="actions">
        <input type="text" style={{ maxWidth: 260, margin: 0 }} placeholder="🔎 Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ width: 'auto', margin: 0 }} value={meal} onChange={(e) => setMeal(e.target.value)}><option value="">Все приёмы</option>{MEALS.map((m) => <option key={m[0]} value={m[0]}>{m[1]}</option>)}</select>
        {user && <label className="ch" style={{ margin: 0 }}><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Мои</label>}
        <button className="btn sm" onClick={() => (user ? setForm(true) : say('Войдите, чтобы добавлять рецепты'))}>＋ Свой рецепт</button>
        {!user && <Link className="btn sm sec" href="/auth">Войти</Link>}
      </div>
      <div className="grid3">{list.map((r) => (
        <div className="feat" key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSel(r)}>
          <div className="e">{cat.ING[r.ing[0][0]]?.emoji || '🍲'}</div><b>{r.n}</b>
          <small className="mu">{MN[r.m]} · {r.t} мин · {r.k} ккал · {fmt(ctx.portionCost(r))}</small>
          <div>{r.mine && <span className="badge">моё · {r.status === 'pending' ? 'на модерации' : r.status === 'private' ? 'личное' : 'в каталоге'}</span>}</div>
        </div>))}</div>
      {!list.length && <p className="sub">Ничего не найдено.</p>}

      {sel && <div className="modal-bg" onClick={() => setSel(null)}><div className="modal" onClick={(e) => e.stopPropagation()}>
        <h1 style={{ marginTop: 0 }}>{sel.n}</h1>
        <div className="mac"><span>⏱ {sel.t} мин</span><span>Б {sel.p}</span><span>Ж {sel.f}</span><span>У {sel.c}</span><b>{sel.k} ккал</b></div>
        {sel.ing.map(([n, a]) => <div className="ig" key={n}><span>{cat.ING[n]?.emoji} {n}</span><b>{a} {U(cat.ING[n])}</b></div>)}
        {sel.st.map((s, i) => <div className="ig" key={i}><span><b style={{ color: 'var(--or)' }}>{i + 1}.</b> {s}</span></div>)}
        <div className="actions">
          {sel.mine && sb && <button className="btn sm red" onClick={async () => { await sb.from('recipes').delete().eq('id', sel.dbId); setSel(null); reload(); say('Удалено'); }}>Удалить</button>}
          <button className="btn sm sec" onClick={() => setSel(null)}>Закрыть</button></div>
      </div></div>}
      {form && <RecipeForm cat={cat} user={user} onClose={() => setForm(false)} onSaved={() => { setForm(false); reload(); say('Рецепт сохранён'); }} />}
    </div>
  );
}

function RecipeForm({ cat, user, onClose, onSaved }) {
  const names = Object.keys(cat.ING);
  const [f, setF] = useState({ title: '', meal: 'l', minutes: 30, kind: '', portions: 2, steps: '', share: false, allergens: [], need: '' });
  const [rows, setRows] = useState([{ n: names[0], a: 100 }]);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const per = rows.filter((r) => r.a > 0).map((r) => [r.n, r.a / f.portions]);
  const mc = macros(per, cat.ING);

  const save = async () => {
    if (!sb) return setErr('Нужна база данных (Supabase).');
    if (!f.title.trim() || !per.length) return setErr('Нужны название и хотя бы один ингредиент.');
    setBusy(true); setErr('');
    const { data, error } = await sb.from('recipes').insert({
      title: f.title.trim(), meal: f.meal, minutes: +f.minutes, kcal: mc.k, protein: mc.p, fat: mc.f, carbs: mc.c,
      tags: f.kind ? (f.kind === 'a' ? ['a'] : f.kind === 'f' ? ['f', 'a'] : ['m']) : [], allergens: f.allergens, need: f.need || null,
      steps: f.steps.split('\n').map((s) => s.trim()).filter(Boolean), source: 'user', author: user.id, status: f.share ? 'pending' : 'private',
    }).select('id').single();
    if (error) { setBusy(false); return setErr(error.message); }
    const { error: e2 } = await sb.from('recipe_ingredients').insert(per.map(([n, a]) => ({ recipe_id: data.id, ingredient_id: cat.ING[n].id, amount: Math.round(a * 100) / 100 })));
    setBusy(false);
    if (e2) return setErr(e2.message);
    onSaved();
  };
  const upd = (i, p) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>
      <h1 style={{ marginTop: 0 }}>Новый рецепт</h1>
      <input type="text" placeholder="Название" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <div className="g g3">
        <select value={f.meal} onChange={(e) => setF({ ...f, meal: e.target.value })}>{MEALS.map((m) => <option key={m[0]} value={m[0]}>{m[1]}</option>)}</select>
        <input type="number" min="1" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} title="Минут" />
        <input type="number" min="1" value={f.portions} onChange={(e) => setF({ ...f, portions: Math.max(1, +e.target.value) })} title="Порций" />
      </div>
      <small className="mu">Слева направо: приём пищи · минут · на сколько порций рецепт</small>
      <select style={{ marginTop: 8 }} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
      <h3>Ингредиенты (на весь рецепт)</h3>
      {rows.map((r, i) => <div key={i} style={{ display: 'flex', gap: 6 }}>
        <select value={r.n} onChange={(e) => upd(i, { n: e.target.value })}>{names.map((n) => <option key={n}>{n}</option>)}</select>
        <input type="number" style={{ width: 90 }} value={r.a} onChange={(e) => upd(i, { a: +e.target.value })} />
        <span style={{ alignSelf: 'center', width: 26 }}>{U(cat.ING[r.n])}</span>
        <button className="btn sm sec" style={{ height: 40 }} onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button></div>)}
      <button className="btn sm sec" onClick={() => setRows([...rows, { n: names[0], a: 100 }])}>＋ Ингредиент</button>
      <small className="mu" style={{ display: 'block', margin: '6px 0' }}>Нужного продукта нет в списке? Попроси админа добавить.</small>
      <div className="card" style={{ margin: '8px 0' }}>На порцию (авторасчёт): <b>{mc.k} ккал</b> · Б {mc.p} · Ж {mc.f} · У {mc.c}</div>
      <textarea placeholder="Шаги приготовления — каждый с новой строки" value={f.steps} onChange={(e) => setF({ ...f, steps: e.target.value })} />
      <div>{ALG.filter((a) => a[0] !== 'none').map(([id, t, e]) => <span key={id} className={`ch ${f.allergens.includes(id) ? 'on' : ''}`} onClick={() => setF({ ...f, allergens: f.allergens.includes(id) ? f.allergens.filter((x) => x !== id) : [...f.allergens, id] })}>{e} {t}</span>)}</div>
      <label className="ch"><input type="checkbox" checked={f.share} onChange={(e) => setF({ ...f, share: e.target.checked })} /> Предложить в общий каталог (проверит админ)</label>
      {err && <p className="bad">{err}</p>}
      <div className="actions"><button className="btn sm" disabled={busy} onClick={save}>Сохранить</button><button className="btn sm sec" onClick={onClose}>Отмена</button></div>
    </div></div>
  );
}
