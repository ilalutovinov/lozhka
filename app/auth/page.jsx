'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase';
import { useApp } from '@/lib/app';

export default function Auth() {
  const { user, signOut } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!sb) return <div className="narrow"><h1>Вход</h1><div className="card">Supabase не подключён — приложение работает в гостевом режиме, данные хранятся только в этом браузере. Добавь ключи в <code>.env.local</code> (см. README).</div></div>;
  if (user) return <div className="narrow"><h1>Вы вошли</h1><p className="sub">{user.email}</p><button className="btn sec" onClick={signOut}>Выйти</button></div>;

  const go = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('');
    const { data, error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password: pw })
      : await sb.auth.signUp({ email, password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === 'up' && !data.session) return setMsg('Проверь почту — отправили письмо для подтверждения.');
    router.push('/plan');
  };
  return (
    <form className="narrow" onSubmit={go} style={{ paddingTop: 30 }}>
      <h1>{mode === 'in' ? 'Вход' : 'Регистрация'}</h1>
      <p className="sub">Аккаунт нужен, чтобы меню и настройки запоминались на любом устройстве и чтобы добавлять свои рецепты.</p>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Пароль (мин. 6 символов)" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required />
      {msg && <p className="bad">{msg}</p>}
      <button className="btn full" disabled={busy}>{mode === 'in' ? 'Войти' : 'Создать аккаунт'}</button>
      <p className="sub" style={{ textAlign: 'center', marginTop: 14 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>{mode === 'in' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}</a></p>
    </form>
  );
}
