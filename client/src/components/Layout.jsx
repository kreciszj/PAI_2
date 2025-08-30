import { NavLink, Outlet, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

export default function Layout() {
  const { accessToken, refreshToken, setTokens, clear } = useAuth();
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (r?.ok) setMe(await r.json());
    })();
  }, [accessToken, refreshToken, setTokens]);

  const link = (to, label, end=false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => isActive ? 'navlink navlink-active' : 'navlink'}
    >
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-200/70 dark:border-neutral-800
                         bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-1">
            {link('/', 'Baza filmów', true)}
            {link('/movies/top', 'Ranking')}
            {link('/blogs', 'Blogi')}
            {link('/my-blog', 'Mój Blog')}
          </nav>
          <div className="flex items-center gap-3">
            {me && <Link to="/settings" className="btn-ghost">@{me.username}</Link>}
            <button className="btn-ghost" onClick={clear}>Wyloguj</button>
          </div>
        </div>
      </header>
      <main className="container-page">
        <Outlet />
      </main>
    </div>
  );
}
