import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;
const PLACEHOLDER = `data:image/svg+xml;utf8,` +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='360'>
  <rect width='100%' height='100%' fill='#e5e7eb'/>
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='#9ca3af'>?</text>
</svg>`);

const toAbs = (u) => (!u ? u : u.startsWith('/uploads/') ? `${API}${u}` : u);

function Cover({ src, alt }) {
  const [s, setS] = useState(toAbs(src) || PLACEHOLDER);
  return (
    <img
      src={s || PLACEHOLDER}
      alt={alt}
      className="w-full aspect-[2/3] object-cover rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900"
      onError={(e)=>{ if(s!==PLACEHOLDER){ e.currentTarget.onerror=null; setS(PLACEHOLDER);} }}
    />
  );
}

export default function Home() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await apiFetch('/api/movies?page=1');
      if (r.ok) {
        const data = await r.json();
        setRows((data.items || []).slice(0, 15));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="grid gap-6">
      {/* Hero */}
      <section className="card p-6">
        <h1 className="text-4xl font-extrabold">
          <span className="title-gradient">CineBase</span>
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Twoja encyklopedia filmów + społeczność blogowa.
        </p>
        <div className="mt-4 flex gap-2">
          <Link to="/top" className="btn">Ranking</Link>
          <Link to="/blogs" className="btn btn-secondary">Społeczność</Link>
        </div>
      </section>

      {/* Ostatnio dodane */}
      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ostatnio dodane filmy</h2>
          <Link to="/" className="btn-ghost">Zobacz wszystkie</Link>
        </div>

        {loading ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({length:10}).map((_,i)=>(
              <div key={i} className="card p-0 overflow-hidden">
                <div className="skeleton aspect-[2/3]"></div>
                <div className="p-3 space-y-2">
                  <div className="skeleton h-4 w-2/3"></div>
                  <div className="skeleton h-3 w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
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
                  <h3 className="text-sm font-semibold line-clamp-2">{m.title}</h3>
                  <div className="text-xs text-neutral-500">{m.year ?? '—'}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
