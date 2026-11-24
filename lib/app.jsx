'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { sb } from './supabase';
import { loadCatalog } from './repo';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
export const DEFAULT_S = { store: 0, ad: 1, kid: 0, meals: ['b', 'l'], days: [0, 1, 2, 3, 4, 5], kit: ['Плита'], diet: 'none', like: [], cal: 0, kc: 2000, al: ['none'], dis: [], home: [], bud: 6000 };
const KEY = 'legkost:v1';

export function AppProvider({ children }) {
  const [S, setS] = useState(DEFAULT_S);
  const [plan, setPlan] = useState([]);
  const [chk, setChk] = useState({});
  const [cat, setCat] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('user');
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const synced = useRef(false);

  const set = useCallback((patch) => setS((s) => ({ ...s, ...patch })), []);
  const say = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 2200); }, []);
  const reload = useCallback(() => loadCatalog().then(setCat), []);

  useEffect(() => {
    try {
      const j = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (j) { setS({ ...DEFAULT_S, ...j.S }); setPlan(j.plan || []); setChk(j.chk || {}); }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { reload(); }, [reload, user]);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    synced.current = false;
    if (!sb || !user) { setRole('user'); return; }
    (async () => {
      const p = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
      setRole(p.data?.role || 'user');
      const st = await sb.from('user_state').select('data').eq('user_id', user.id).maybeSingle();
      const d = st.data?.data;
      if (d?.S) { setS({ ...DEFAULT_S, ...d.S }); setPlan(d.plan || []); setChk(d.chk || {}); }
      synced.current = true;
      if (!d?.S) setS((s) => ({ ...s })); // локальные данные уйдут в облако
    })();
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    const data = { S, plan, chk };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    if (sb && user && synced.current) {
      const t = setTimeout(() => sb.from('user_state').upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }), 800);
      return () => clearTimeout(t);
    }
  }, [S, plan, chk, ready, user]);

  const signOut = async () => { await sb?.auth.signOut(); setUser(null); };
  return (
    <Ctx.Provider value={{ S, set, plan, setPlan, chk, setChk, cat, user, role, ready, reload, signOut, say }}>
      {children}
      {toast && <div className="toast">{toast}</div>}
    </Ctx.Provider>
  );
}
