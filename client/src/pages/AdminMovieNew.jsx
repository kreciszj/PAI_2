// src/pages/AdminMovieNew.jsx
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
      if (r.ok) setMe(await r.json()); else setMe(null);
    })();
  }, [accessToken, refreshToken, setTokens]);

  const isAdmin = me?.role === 'admin';

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isAdmin) return;
    setErr(null); setSaving(true);
    try {
      const y = year ? Number(year) : null;
      if (y && (!Number.isInteger(y) || y < 1888 || y > 2100)) throw new Error('Podaj rok 1888–2100');

      const create = await apiFetch('/api/movies', {
        method: 'POST',
        body: { title: title.trim(), year: y, director: director?.trim() || null, description: description?.trim() || null },
        accessToken, refreshToken, setTokens,
      });
      if (!create.ok) { const d = await create.json().catch(()=>({})); throw new Error(d.error || 'Nie udało się utworzyć filmu'); }
      const created = await create.json();
      const movieId = created.id || created.movie?.id;
      if (!movieId) throw new Error('Brak ID nowego filmu');

      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch(`${API}/api/movies/${movieId}/cover`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: fd });
        if (!up.ok) { const d = await up.json().catch(()=>({})); throw new Error(d.error || 'Nie udało się wysłać okładki'); }
      }
      nav(`/movies/${movieId}`);
    } catch (e) { setErr(e.message || 'Błąd zapisu'); } finally { setSaving(false); }
  }

  if (!accessToken) return <div className="container-page max-w-xl"><div className="card">Musisz być zalogowany.</div></div>;
  if (!isAdmin) return <div className="container-page max-w-xl"><div className="card">Brak uprawnień (admin).</div></div>;

  return (
    <div className="container-page max-w-4xl grid gap-4">
      <h1 className="text-3xl font-extrabold mb-2"><span className="title-gradient">Dodaj film</span></h1>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[320px_1fr] items-start">
        {/* Podgląd okładki */}
        <div className="card grid gap-3">
          <div className="text-sm font-medium">Okładka</div>
          <label
            className="aspect-[2/3] w-full max-w-[320px] grid place-items-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-400 cursor-pointer overflow-hidden"
            title="Kliknij aby wybrać plik"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>Wybierz obraz</span>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
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
            <button type="button" className="btn-ghost" onClick={() => { setTitle(''); setYear(''); setDirector(''); setDescription(''); setFile(null); setErr(null); }}>
              Wyczyść
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
