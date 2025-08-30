import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  const { accessToken, refreshToken, setTokens, clear } = useAuth();
  const [me, setMe] = useState(null);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      if (!accessToken) { setMe(null); return; }
      const r = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (r?.ok) setMe(await r.json());
    })();
  }, [accessToken, refreshToken, setTokens]);

  const link = (to, label, activeOverride = false, end = false) => (
    <NavLink
      to={to}
      end={end && !activeOverride}
      className={({ isActive }) => (isActive || activeOverride ? 'navlink navlink-active' : 'navlink')}
    >
      {label}
    </NavLink>
  );

  const isMoviesActive = location.pathname === '/' || location.pathname === '/top';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-1">
            {link('/', 'Baza filmów', isMoviesActive, true)}
            {link('/blogs', 'Społeczność')}
          </nav>

          <div className="flex items-center gap-3">
            {me?.role === 'admin' && (
              <Link
                to="/admin/movies/new"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500 dark:hover:bg-emerald-900"
                style={{ fontWeight: 600 }}
              >
                <span>＋</span>
                <span>Add movie</span>
              </Link>
            )}
            <ThemeToggle />
            {me && <Link to="/settings" className="btn-ghost">@{me.username}</Link>}
            {accessToken && <button className="btn-ghost" onClick={clear}>Wyloguj</button>}
          </div>
        </div>
      </header>

      <main className="container-page">
        <Outlet />
      </main>
    </div>
  );
}
