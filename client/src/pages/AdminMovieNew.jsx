// client/src/pages/AdminMovieNew.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

const API = import.meta.env.VITE_API_URL;

export default function AdminMovieNew() {
  const nav = useNavigate();
  const { accessToken, refreshToken, setTokens } = useAuth();
  const [me, setMe] = useState(null);

  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [director, setDirector] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      if (!accessToken) return setMe(null);
      const r = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (r.ok) setMe(await r.json());
      else setMe(null);
    })();
  }, [accessToken, refreshToken, setTokens]);

  const isAdmin = me?.role === 'admin';

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isAdmin) return;
    setErr(null);
    setSaving(true);
    try {
      const y = year ? Number(year) : null;
      if (y && (!Number.isInteger(y) || y < 1888 || y > 2100)) {
        throw new Error('Podaj rok 1888–2100');
      }

      // 1) create movie
      const create = await apiFetch('/api/movies', {
        method: 'POST',
        body: { title: title.trim(), year: y, director: director?.trim() || null, description: description?.trim() || null },
        accessToken, refreshToken, setTokens,
      });
      if (!create.ok) {
        const d = await create.json().catch(()=>({}));
        throw new Error(d.error || 'Nie udało się utworzyć filmu');
      }
      const created = await create.json();
      const movieId = created.id || created.movie?.id;
      if (!movieId) throw new Error('Brak ID nowego filmu');

      // 2) upload cover (optional)
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch(`${API}/api/movies/${movieId}/cover`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: fd,
        });
        if (!up.ok) {
          const d = await up.json().catch(()=>({}));
          throw new Error(d.error || 'Nie udało się wysłać okładki');
        }
      }

      // 3) go to details
      nav(`/movies/${movieId}`);
    } catch (e) {
      setErr(e.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  }

  if (!accessToken) return <div className="container-page max-w-xl"><div className="card">Musisz być zalogowany.</div></div>;
  if (!isAdmin) return <div className="container-page max-w-xl"><div className="card">Brak uprawnień (admin).</div></div>;

  return (
    <div className="container-page max-w-3xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Dodaj film</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[300px_1fr] items-start">
        {/* Podgląd okładki */}
        <div className="card grid gap-3">
          <div className="text-sm font-medium">Okładka</div>
          <div className="aspect-[2/3] w-full max-w-[300px] bg-neutral-100 dark:bg-neutral-900 rounded border overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-neutral-400">Brak</div>
            )}
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="input"
          />
          <p className="text-xs text-neutral-500">PNG/JPG/WEBP, do 5 MB.</p>
        </div>

        {/* Pola filmu */}
        <div className="card grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Tytuł *</span>
            <input className="input" value={title} onChange={e=>setTitle(e.target.value)} required placeholder="np. Inception" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium">Rok</span>
              <input className="input" value={year} onChange={e=>setYear(e.target.value.replace(/[^\d]/g,''))} inputMode="numeric" placeholder="np. 2010" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Reżyser</span>
              <input className="input" value={director} onChange={e=>setDirector(e.target.value)} placeholder="np. Christopher Nolan" />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Opis</span>
            <textarea className="input min-h-[140px]" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Krótki opis…" />
          </label>

          {err && <div className="text-sm text-red-600 dark:text-red-400">{err}</div>}

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn" disabled={saving || !title.trim()}>
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setTitle(''); setYear(''); setDirector(''); setDescription(''); setFile(null); setErr(null); }}
            >
              Wyczyść
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
