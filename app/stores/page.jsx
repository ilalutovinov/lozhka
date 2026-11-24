'use client';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/app';
import { haversine } from '@/lib/planner';

const StoreMap = dynamic(() => import('@/components/StoreMap'), { ssr: false, loading: () => <div className="card">Загружаем карту…</div> });
const TYPE = { supermarket: 'Супермаркет', bazaar: 'Рынок', shop: 'Магазин' };

export default function Stores() {
  const { cat, say } = useApp();
  const [me, setMe] = useState(null);
  // Индекс цен: средняя цена магазина относительно средней по всем (по общим товарам)
  const rows = useMemo(() => {
    if (!cat) return [];
    const avg = {};
    Object.values(cat.prices).forEach((m) => Object.entries(m).forEach(([n, p]) => (avg[n] ||= []).push(p)));
    return cat.stores.map((s) => {
      const p = cat.prices[s.id] || {}, ks = Object.keys(p);
      const idx = ks.length ? ks.reduce((a, n) => a + p[n] / (avg[n].reduce((x, y) => x + y, 0) / avg[n].length), 0) / ks.length : null;
      return { ...s, idx, n: ks.length, dist: me && s.lat != null ? haversine(me, s) : null };
    }).sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0) || (a.idx ?? 9) - (b.idx ?? 9));
  }, [cat, me]);
  if (!cat) return <div className="wrap"><p className="sub">Загрузка…</p></div>;
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }), () => say('Нет доступа к геолокации'));

  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <h1>Магазины и рынки</h1>
      <p className="sub">Индекс цен: 100 % — средняя цена по городу. Чем ниже, тем дешевле. {cat.demo && <b>Сейчас показаны демонстрационные цены.</b>}</p>
      <div className="actions"><button className="btn sm" onClick={locate}>📍 Рядом со мной</button></div>
      <div className="split">
        <StoreMap stores={rows.map((s) => ({ ...s, label: s.idx ? `Индекс цен ${Math.round(s.idx * 100)} %` : '' }))} user={me} />
        <div className="card" style={{ overflow: 'auto' }}><table className="t"><thead><tr><th>Магазин</th><th>Индекс</th>{me && <th>Км</th>}</tr></thead><tbody>
          {rows.map((s) => <tr key={s.id}><td><b style={{ color: s.color }}>{s.short}</b> {s.name}<br /><small className="mu">{TYPE[s.type]} · {s.n} цен</small></td>
            <td>{s.idx ? <span className={`badge ${s.idx > 1.02 ? 'w' : ''}`}>{Math.round(s.idx * 100)} %</span> : '—'}</td>{me && <td>{s.dist?.toFixed(1)}</td>}</tr>)}</tbody></table></div>
      </div>
    </div>
  );
}
