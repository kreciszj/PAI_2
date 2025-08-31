import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Link, NavLink } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;
const PLACEHOLDER = `data:image/svg+xml;utf8,` + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='360'><rect width='100%' height='100%' fill='#e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='#9ca3af'>?</text></svg>`
);
function toAbs(u) { if (!u) return u; return u.startsWith('/uploads/') ? `${API}${u}` : u; }
function Cover({ src, alt }) {
  const [s, setS] = useState(toAbs(src) || PLACEHOLDER);
  return (
    <img
      src={s || PLACEHOLDER}
      alt={alt}
      className="w-[96px] h-[144px] object-cover rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900"
      onError={(e) => { if (s !== PLACEHOLDER) { e.currentTarget.onerror = null; setS(PLACEHOLDER); } }}
    />
  );
}
function Stars({ value = 0 }) {
  const v = Math.max(0, Math.min(10, value));
  const full = Math.floor(v);
  const half = v - full >= .5;
  const empty = 10 - full - (half ? 1 : 0);
  return (
    <span className="text-yellow-500/90">
      {'★'.repeat(full)}{half ? '⯪' : ''}{'✩'.repeat(empty)}
    </span>
  );
}
function truncateText(text, maxLength) { if (!text) return ''; const n = Math.max(0, maxLength - 3); return text.length > maxLength ? text.slice(0, n) + '…' : text; }

export default function MoviesTop() {
  const { accessToken, refreshToken, setTokens } = useAuth();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await apiFetch(`/api/movies/top?page=${page}`, { accessToken, refreshToken, setTokens });
        if (r.ok) {
          const data = await r.json();
          setRows(data.items);
          setTotalPages(data.totalPages);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, refreshToken, setTokens, page]);

  return (
    <div className="grid gap-6">
      <div className="tabs w-fit">
        <NavLink to="/" end className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}>Baza filmów</NavLink>
        <NavLink to="/top" className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}>Ranking</NavLink>
      </div>

      {loading && <div className="grid gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-4 flex gap-4 items-center"><div className="skeleton w-24 h-36"></div><div className="flex-1 space-y-2"><div className="skeleton h-5 w-2/3"></div><div className="skeleton h-4 w-1/3"></div><div className="skeleton h-3 w-1/2"></div></div></div>)}</div>}

      {!loading && (
        <div className="flex flex-col gap-3">
          {rows.map((m, index) => (
            <Link key={m.id} to={`/movies/${m.id}`} className="card p-4 flex gap-4 hover:shadow-md transition">
              <div className="flex items-center justify-center w-12">
                <div className="h-10 w-10 grid place-items-center rounded-lg bg-indigo-600 text-white font-bold">{index + 1 + (page - 1) * 10}</div>
              </div>
              <Cover src={m.coverUrl} alt={m.title} />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{m.title} {m.year ? <span className="text-sm text-neutral-500">({m.year})</span> : null}</h2>
                {m.director && <p className="text-sm text-neutral-500">Reżyser: {m.director}</p>}
                {m.averageRating != null && (
                  <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {m.averageRating.toFixed(1)}/10 <Stars value={m.averageRating} />
                  </p>
                )}
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">{truncateText(m.description, 220)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-2 mt-2 items-center">
        <button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} className="btn-ghost border border-neutral-200 dark:border-neutral-800 rounded-xl disabled:opacity-50">Poprzednia</button>
        <span className="text-sm px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800">{page} / {totalPages}</span>
        <button disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)} className="btn-ghost border border-neutral-200 dark:border-neutral-800 rounded-xl disabled:opacity-50">Następna</button>
      </div>
    </div>
  );
}
