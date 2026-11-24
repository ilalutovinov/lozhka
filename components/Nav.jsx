'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/app';

export default function Nav() {
  const { user, role, signOut } = useApp();
  const p = usePathname();
  const L = ([h, t]) => <Link key={h} href={h} className={p === h ? 'on' : ''}>{t}</Link>;
  return (
    <nav className="nav"><div className="wrap">
      <Link href="/" className="brand-link">🥗 Лёгкость</Link>
      {[['/plan', 'Меню'], ['/recipes', 'Рецепты'], ['/stores', 'Магазины']].map(L)}
      {role === 'admin' && L(['/admin', 'Админ'])}
      {user ? <a href="#" onClick={(e) => { e.preventDefault(); signOut(); }}>Выйти</a> : L(['/auth', 'Войти'])}
    </div></nav>
  );
}
