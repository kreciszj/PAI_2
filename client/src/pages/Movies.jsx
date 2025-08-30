import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Link, NavLink } from 'react-router-dom';

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
    <div className="grid gap-4">
      {/* Nawigacja między zakładkami */}
      <div className="flex gap-3">
        <NavLink
          to="/"
          end
          className={({isActive}) =>
            `px-6 py-3 w-40 text-center rounded-xl font-semibold text-lg transition
       ${isActive
              ? "bg-blue-600 text-white shadow-md"
              : "bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"}`
          }
        >
          Baza filmów
        </NavLink>
        <NavLink
          to="/top"
          className={({isActive}) =>
            `px-6 py-3 w-40 text-center rounded-xl font-semibold text-lg transition
       ${isActive
              ? "bg-blue-600 text-white shadow-md"
              : "bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"}`
          }
        >
          Ranking
        </NavLink>
      </div>


      {loading && <p>Ładowanie...</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(m => (
          <Link key={m.id} to={`/movies/${m.id}`} className="card hover:shadow-md transition">
            <h2 className="text-lg font-semibold">
              {m.title} {m.year ? <span className="text-neutral-500">({m.year})</span> : null}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {m.description || 'Brak opisu'}
            </p>
          </Link>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-4 items-center">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Poprzednia
        </button>
        <span>{page} / {totalPages}</span>
        <button
          disabled={page >= totalPages || loading}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Następna
        </button>
      </div>
    </div>
  );
}
