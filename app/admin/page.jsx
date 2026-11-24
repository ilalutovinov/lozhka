'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/app';
import { sb } from '@/lib/supabase';

const StoreMap = dynamic(() => import('@/components/StoreMap'), { ssr: false });
const TABS = [['stores', '🏪 Магазины'], ['prices', '💰 Цены'], ['reports', '💬 Отчёты о ценах'], ['recipes', '📖 Рецепты'], ['ings', '🥕 Продукты']];

export default function Admin() {
  const { role, user, cat, reload, ready, say } = useApp();
  const [tab, setTab] = useState('stores');
  if (!sb) return <div className="narrow"><h1>Админка</h1><div className="card">Нужен Supabase.</div></div>;
  if (!ready || !cat) return null;
  if (role !== 'admin') return <div className="narrow"><h1>Админка</h1><div className="card">Доступ только для администраторов. {user ? 'Выдай себе роль SQL-запросом из README.' : 'Сначала войди.'}</div></div>;
  const p = { cat, reload, say };
  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <h1>Админ-панель</h1>
      <div className="tabs" style={{ overflowX: 'auto' }}>{TABS.map(([k, t]) => <div key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</div>)}</div>
      {tab === 'stores' && <Stores {...p} />}{tab === 'prices' && <Prices {...p} />}{tab === 'reports' && <Reports {...p} />}
      {tab === 'recipes' && <RecipesAdmin {...p} />}{tab === 'ings' && <Ings {...p} />}
    </div>
  );
}

function Stores({ cat, reload, say }) {
  const [f, setF] = useState({ name: '', short: '', color: '#2fa84f', type: 'supermarket', address: '', lat: '', lng: '' });
  const add = async () => {
    if (!f.name || f.lat === '' || f.lng === '') return say('Название и точка на карте обязательны');
    const { error } = await sb.from('stores').insert({ ...f, short: f.short || f.name[0], lat: +f.lat, lng: +f.lng });
    say(error ? error.message : 'Магазин добавлен'); if (!error) { setF({ ...f, name: '', short: '', address: '' }); reload(); }
  };
  const del = async (id) => { if (!confirm('Удалить магазин вместе с ценами?')) return; await sb.from('stores').delete().eq('id', id); reload(); };
  const move = async (id, lat, lng) => { await sb.from('stores').update({ lat, lng }).eq('id', id); reload(); };
  return <div className="split">
    <div>
      <div className="card" style={{ marginBottom: 12 }}><h3>Добавить магазин</h3><p className="sub">Кликни по карте — координаты подставятся сами.</p>
        <input type="text" placeholder="Название" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="g g3"><input type="text" placeholder="Знак (1–2 симв.)" value={f.short} onChange={(e) => setF({ ...f, short: e.target.value })} />
          <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} style={{ height: 42, width: '100%' }} />
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="supermarket">Супермаркет</option><option value="bazaar">Рынок</option><option value="shop">Магазин</option></select></div>
        <input type="text" placeholder="Адрес" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <div className="g g2"><input type="number" placeholder="Широта" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} /><input type="number" placeholder="Долгота" value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} /></div>
        <button className="btn sm" onClick={add}>Добавить</button></div>
      <div className="card"><table className="t"><tbody>{cat.stores.map((s) => <tr key={s.id}><td><b style={{ color: s.color }}>{s.short}</b> {s.name}<br /><small className="mu">{s.lat?.toFixed(4)}, {s.lng?.toFixed(4)}</small></td>
        <td><button className="btn sm sec" onClick={() => f.lat !== '' ? move(s.id, +f.lat, +f.lng) : say('Сначала кликни точку на карте')} title="Переместить в выбранную точку">📍</button> <button className="btn sm red" onClick={() => del(s.id)}>✕</button></td></tr>)}</tbody></table></div>
    </div>
    <StoreMap stores={cat.stores} height={460} onPick={(lat, lng) => setF((x) => ({ ...x, lat, lng }))} />
  </div>;
}

function Prices({ cat, reload, say }) {
  const [sid, setSid] = useState(cat.stores[0]?.id || 0), [edit, setEdit] = useState({});
  useEffect(() => setEdit({}), [sid]);
  const save = async () => {
    const rows = Object.entries(edit).filter(([, v]) => v > 0).map(([n, v]) => ({ store_id: sid, ingredient_id: cat.ING[n].id, price: v, updated_at: new Date().toISOString() }));
    if (!rows.length) return;
    const { error } = await sb.from('store_prices').upsert(rows);
    say(error ? error.message : `Сохранено: ${rows.length}`); if (!error) { setEdit({}); reload(); }
  };
  return <div className="card">
    <div className="actions"><select style={{ width: 'auto', margin: 0 }} value={sid} onChange={(e) => setSid(+e.target.value)}>{cat.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <button className="btn sm" onClick={save} disabled={!Object.keys(edit).length}>Сохранить ({Object.keys(edit).length})</button></div>
    <table className="t"><thead><tr><th>Продукт</th><th>Цена, сом за кг / л / шт</th></tr></thead><tbody>
      {Object.values(cat.ING).map((i) => <tr key={i.id}><td>{i.emoji} {i.name}</td><td><input type="number" style={{ margin: 0, maxWidth: 140 }} value={edit[i.name] ?? cat.prices[sid]?.[i.name] ?? ''} placeholder={`~${i.base}`} onChange={(e) => setEdit({ ...edit, [i.name]: +e.target.value })} /></td></tr>)}</tbody></table></div>;
}

function Reports({ cat, reload, say }) {
  const [rows, setRows] = useState([]);
  const load = () => sb.from('price_reports').select('*, stores(name), ingredients(name)').eq('status', 'pending').order('created_at').then((r) => setRows(r.data || []));
  useEffect(() => { load(); }, []);
  const act = async (r, ok) => {
    if (ok) await sb.from('store_prices').upsert({ store_id: r.store_id, ingredient_id: r.ingredient_id, price: r.price, updated_at: new Date().toISOString() });
    await sb.from('price_reports').update({ status: ok ? 'approved' : 'rejected' }).eq('id', r.id);
    say(ok ? 'Цена обновлена' : 'Отклонено'); load(); if (ok) reload();
  };
  return <div className="card">{!rows.length && <p className="sub">Нет новых отчётов.</p>}
    {rows.map((r) => <div className="ig" key={r.id}><span><b>{r.ingredients?.name}</b> · {r.stores?.name}<br /><small className="mu">сейчас {cat.prices[r.store_id]?.[r.ingredients?.name] ?? '—'} → предлагают {r.price}</small></span>
      <span><button className="btn sm" onClick={() => act(r, true)}>✓</button> <button className="btn sm sec" onClick={() => act(r, false)}>✕</button></span></div>)}</div>;
}

function RecipesAdmin({ reload, say }) {
  const [rows, setRows] = useState([]), [flt, setFlt] = useState('pending');
  const load = () => { let q = sb.from('recipes').select('id,title,status,source,created_at').order('created_at', { ascending: false }).limit(200); if (flt !== 'all') q = q.eq('status', flt); q.then((r) => setRows(r.data || [])); };
  useEffect(() => { load(); }, [flt]);
  const setStatus = async (id, status) => { await sb.from('recipes').update({ status }).eq('id', id); say('Готово'); load(); reload(); };
  const del = async (id) => { if (!confirm('Удалить рецепт?')) return; await sb.from('recipes').delete().eq('id', id); load(); reload(); };
  return <div className="card">
    <select style={{ width: 'auto' }} value={flt} onChange={(e) => setFlt(e.target.value)}><option value="pending">На модерации</option><option value="approved">В каталоге</option><option value="private">Личные</option><option value="all">Все</option></select>
    {!rows.length && <p className="sub">Пусто.</p>}
    {rows.map((r) => <div className="ig" key={r.id}><span><b>{r.title}</b> <span className="badge">{r.status}</span> <small className="mu">{r.source}</small></span>
      <span>{r.status !== 'approved' && <button className="btn sm" onClick={() => setStatus(r.id, 'approved')}>Одобрить</button>} <button className="btn sm red" onClick={() => del(r.id)}>✕</button></span></div>)}</div>;
}

function Ings({ cat, reload, say }) {
  const [f, setF] = useState({ name: '', emoji: '🍽️', unit: 'g', base_price: 100, category: 'dry', kcal: 0, protein: 0, fat: 0, carbs: 0, gpp: 100 });
  const add = async () => { const { error } = await sb.from('ingredients').insert(f); say(error ? error.message : 'Добавлено'); if (!error) { setF({ ...f, name: '' }); reload(); } };
  const n = (k, ph) => <input type="number" placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: +e.target.value })} />;
  return <div className="card"><h3>Новый продукт</h3>
    <div className="g g3"><input type="text" placeholder="Название" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><input type="text" placeholder="Эмодзи" value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} />
      <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}><option value="g">граммы</option><option value="ml">мл</option><option value="pc">штуки</option></select></div>
    <div className="g g3">{n('base_price', 'Цена за кг/л/шт')}<select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="fresh">Свежее</option><option value="meat">Мясо/рыба</option><option value="dairy">Молочное</option><option value="dry">Бакалея</option></select>{n('gpp', 'г в штуке')}</div>
    <div className="g g4">{n('kcal', 'ккал/100')}{n('protein', 'Б')}{n('fat', 'Ж')}{n('carbs', 'У')}</div>
    <button className="btn sm" onClick={add}>Добавить</button><p className="sub" style={{ marginTop: 10 }}>Сейчас в базе: {Object.keys(cat.ING).length} продуктов.</p></div>;
}
