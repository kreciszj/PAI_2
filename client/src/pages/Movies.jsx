import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Link, NavLink } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;
const PLACEHOLDER = `data:image/svg+xml;utf8,` + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='360'><rect width='100%' height='100%' fill='#e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='#9ca3af'>?</text></svg>`
);

function toAbs(u){ if(!u) return u; return u.startsWith('/uploads/') ? `${API}${u}` : u; }

function Cover({ src, alt }) {
  const [s, setS] = useState(toAbs(src) || PLACEHOLDER);
  return (
    <img
      src={s || PLACEHOLDER}
      alt={alt}
      width={240}
      height={360}
      className="w-full aspect-[2/3] object-cover rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900"
      onError={(e)=>{ if(s!==PLACEHOLDER){ e.currentTarget.onerror=null; setS(PLACEHOLDER);} }}
    />
  );
}

export default function Movies() {
  const { accessToken, refreshToken, setTokens } = useAuth();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await apiFetch(`/api/movies?page=${page}`, {accessToken, refreshToken, setTokens});
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
        <NavLink to="/" end className={({isActive}) => `tab ${isActive ? 'tab-active' : ''}`}>Baza filmów</NavLink>
        <NavLink to="/top" className={({isActive}) => `tab ${isActive ? 'tab-active' : ''}`}>Ranking</NavLink>
      </div>

      {loading && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({length:10}).map((_,i)=><div key={i} className="card p-0 overflow-hidden"><div className="skeleton aspect-[2/3]"></div><div className="p-3 space-y-2"><div className="skeleton h-4 w-2/3"></div><div className="skeleton h-3 w-1/3"></div></div></div>)}
      </div>}

      {!loading && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map(m => (
            <Link key={m.id} to={`/movies/${m.id}`} className="card p-0 overflow-hidden group">
              <div className="relative">
                <Cover src={m.coverUrl} alt={m.title} />
                <div className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent text-white opacity-0 group-hover:opacity-100 transition">
                  {m.description ? <p className="text-xs line-clamp-3">{m.description}</p> : null}
                </div>
              </div>
              <div className="p-3">
                <h2 className="text-sm font-semibold line-clamp-2">{m.title}</h2>
                <div className="text-xs text-neutral-500">{m.year ?? '—'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-2 mt-2 items-center">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage(p => p - 1)}
          className="btn-ghost border border-neutral-200 dark:border-neutral-800 rounded-xl disabled:opacity-50"
        >Poprzednia</button>
        <span className="text-sm px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800">{page} / {totalPages}</span>
        <button
          disabled={page >= totalPages || loading}
          onClick={() => setPage(p => p + 1)}
          className="btn-ghost border border-neutral-200 dark:border-neutral-800 rounded-xl disabled:opacity-50"
        >Następna</button>
      </div>
    </div>
  );
}
