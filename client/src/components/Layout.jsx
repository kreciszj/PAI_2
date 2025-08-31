import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import ThemeToggle from './ThemeToggle';

function SearchBar() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState([]);
  const [posts, setPosts] = useState([]);
  const [allMovies, setAllMovies] = useState(null);
  const [allPosts, setAllPosts] = useState(null);
  const nav = useNavigate();
  const boxRef = useRef(null);
  const location = useLocation();

  useEffect(() => { setOpen(false); setQ(''); }, [location]);

  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const query = q.trim().toLowerCase();
      if (!query) { setMovies([]); setPosts([]); setOpen(false); return; }

      setLoading(true);
      try {
        if (!allMovies) {
          const r = await apiFetch('/api/movies');
          if (r.ok) {
            const data = await r.json();
            setAllMovies(data.items || []);
          }
        }
        if (!allPosts) {
          const r2 = await apiFetch('/api/posts');
          if (r2.ok) setAllPosts(await r2.json());
        }

        const m = (allMovies || [])
          .filter(m => `${m.title} ${m.year ?? ''} ${m.director ?? ''}`.toLowerCase().includes(query))
          .slice(0, 5);
        const p = (allPosts || [])
          .filter(p => (p.title || '').toLowerCase().includes(query))
          .slice(0, 5);

        setMovies(m);
        setPosts(p);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, allMovies, allPosts]);

  function goFirstMatch() {
    if (movies[0]) nav(`/movies/${movies[0].id}`);
    else if (posts[0]) nav(`/blogs/${posts[0].id}`);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <input
        className="input w-full"
        placeholder="Szukaj filmów..."
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => { if (q.trim()) setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter') { e.preventDefault(); goFirstMatch(); }
        }}
        aria-label="Wyszukaj"
      />

      {open && (
        <div className="absolute left-0 right-0 mt-2 z-30 card p-0 overflow-hidden">
          {loading ? (
            <div className="p-3 text-sm text-neutral-600 dark:text-neutral-300">Szukam…</div>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              {movies.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs uppercase tracking-wider text-neutral-500">Filmy</div>
                  <ul>
                    {movies.map(m => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => nav(`/movies/${m.id}`)}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                        >
                          <span className="text-neutral-500">🎬</span>
                          <span className="truncate flex-1">{m.title}</span>
                          <span className="text-xs text-neutral-500">{m.year ?? ''}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {posts.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs uppercase tracking-wider text-neutral-500">Posty</div>
                  <ul>
                    {posts.map(p => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => nav(`/blogs/${p.id}`)}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                        >
                          <span className="text-neutral-500">📝</span>
                          <span className="truncate flex-1">{p.title}</span>
                          {p.author?.username && <span className="text-xs chip">@{p.author.username}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {movies.length === 0 && posts.length === 0 && (
                <div className="p-3 text-sm text-neutral-600 dark:text-neutral-300">Brak wyników</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
        <div className="mx-auto max-w-7xl px-4 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-3">
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

          <div className="flex items-center justify-center">
            <SearchBar />
          </div>

          <div className="flex items-center gap-2 justify-end">
            {me?.role === 'admin' && (
              <Link
                to="/admin/movies/new"
                title="Dodaj film"
                className="btn btn-success rounded-xl inline-flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="opacity-90">
                  <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
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
