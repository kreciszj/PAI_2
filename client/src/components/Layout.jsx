// src/components/Layout.jsx
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

  const isFilmsSection =
    location.pathname === '/' ||
    location.pathname === '/top' ||
    location.pathname.startsWith('/movies') ||
    location.pathname.startsWith('/admin/movies');

  const isCommunity = location.pathname.startsWith('/blogs');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-neutral-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/favicon.svg"
                onError={(e) => { e.currentTarget.src = '/favicon.png'; }}
                alt="FilmBlog"
                className="h-8 w-8 rounded-xl shadow ring-1 ring-black/5"
              />
              <span className="font-extrabold tracking-tight text-lg">
                <span className="title-gradient">FilmBlog</span>
              </span>
            </Link>

            <nav className="ml-2 flex items-center gap-1 overflow-x-auto">
              <NavLink
                to="/"
                className={() => (isFilmsSection ? 'navlink navlink-active' : 'navlink')}
              >
                Filmy
              </NavLink>
              <NavLink
                to="/blogs"
                className={() => (isCommunity ? 'navlink navlink-active' : 'navlink')}
              >
                Społeczność
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {me?.role === 'admin' && (
              <Link
                to="/admin/movies/new"
                title="Dodaj film"
                className="btn btn-success rounded-xl inline-flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="opacity-90">
                  <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"/>
                </svg>
                <span>Dodaj Film</span>
              </Link>
            )}
            <ThemeToggle />
            {me && <Link to="/settings" className="btn-ghost">@{me.username}</Link>}
            {accessToken && <button className="btn-ghost" onClick={clear}>Wyloguj</button>}
          </div>
        </div>
      </header>

      <main className="container-page fade-in">
        <Outlet />
      </main>
    </div>
  );
}
