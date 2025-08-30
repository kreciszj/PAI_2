import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Link } from 'react-router-dom';

const PLACEHOLDER = `data:image/svg+xml;utf8,` +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450'>
  <rect width='100%' height='100%' fill='#e5e7eb'/>
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='64' fill='#9ca3af'>?</text>
</svg>`);

function Cover({ src, alt, size='sm' }) {
  const [s, setS] = useState(src || PLACEHOLDER);
  const w = size === 'sm' ? 96 : 300;
  const h = size === 'sm' ? 144 : 450;
  return (
    <img
      src={s || PLACEHOLDER}
      alt={alt}
      width={w}
      height={h}
      style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd', background: '#f3f4f6' }}
      onError={(e) => { if (s !== PLACEHOLDER) { setS(PLACEHOLDER); e.currentTarget.onerror = null; } }}
    />
  );
}

export default function Home() {
  const { accessToken, refreshToken, setTokens, clear } = useAuth();
  const [me, setMe] = useState(null);
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    (async () => {
      if (!accessToken) { setMe(null); return; }
      const res = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (res.ok) setMe(await res.json());
    })();
  }, [accessToken, refreshToken, setTokens]);

  useEffect(() => {
    (async () => {
      const r = await apiFetch('/api/movies');
      if (r.ok) setMovies(await r.json());
    })();
  }, []);

  return (
    <div style={{ margin: 24 }}>
      <h1>Home</h1>
      {accessToken ? (
        <>
          <pre>{JSON.stringify(me, null, 2)}</pre>
          <button onClick={clear}>Wyloguj</button>
        </>
      ) : (
        <div style={{ marginBottom: 16 }}>Nie zalogowano</div>
      )}

      <h2 style={{ marginTop: 24, marginBottom: 12 }}>Ostatnio dodane filmy</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
        {movies.map(m => (
          <Link key={m.id} to={`/movies/${m.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Cover src={m.coverUrl} alt={m.title} size="sm" />
            <div style={{ fontSize: 12, marginTop: 6 }}>
              <div style={{ fontWeight: 600 }}>{m.title}</div>
              <div style={{ color: '#6b7280' }}>{m.year ?? '—'}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
