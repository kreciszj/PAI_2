import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

const PLACEHOLDER = `data:image/svg+xml;utf8,` +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450'>
  <rect width='100%' height='100%' fill='#e5e7eb'/>
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='64' fill='#9ca3af'>?</text>
</svg>`);

const API = import.meta.env.VITE_API_URL;
const toAbs = (u) => (!u ? u : u.startsWith('/uploads/') ? `${API}${u}` : u);

function Cover({ src, alt }) {
  const [s, setS] = useState(toAbs(src) || PLACEHOLDER);
  return (
    <img
      src={s || PLACEHOLDER}
      alt={alt}
      width={300}
      height={450}
      className="w-[300px] h-[450px] object-cover rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900"
      onError={(e) => { if (s !== PLACEHOLDER) { setS(PLACEHOLDER); e.currentTarget.onerror = null; } }}
    />
  );
}

function Stars({ value = 0 }) {
  const v = Math.max(0, Math.min(10, value));
  return (
    <span className="text-yellow-500/90 text-xl leading-none select-none">
      {'★'.repeat(Math.round(v))}{'✩'.repeat(10 - Math.round(v))}
    </span>
  );
}

function StarsInput({ value, onChange, disabled }) {
  return (
    <div className={`flex gap-1 text-2xl ${disabled ? 'opacity-60' : ''}`}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => !disabled && onChange(n)}
          className={`leading-none transition ${n <= value ? 'text-yellow-500' : 'text-neutral-300 dark:text-neutral-700'} hover:scale-105`}
          aria-label={`Oceń na ${n}/10`}
          disabled={disabled}
          title={`${n}/10`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function MovieDetails() {
  const { id } = useParams();
  const { accessToken, refreshToken, setTokens } = useAuth();

  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [myRating, setMyRating] = useState(10);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMsg, setRatingMsg] = useState(null);

  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    setLoading(true);
    const r = await apiFetch(`/api/movies/${id}`, { accessToken, refreshToken, setTokens });
    if (r.ok) {
      const d = await r.json();
      setData({
        ...d,
        comments: Array.isArray(d.comments) ? d.comments : [],
      });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      if (!accessToken) { setMe(null); return; }
      const r = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (r.ok) setMe(await r.json());
    })();
  }, [accessToken, refreshToken, setTokens]);

  async function submitRating() {
    if (!accessToken) { setRatingMsg('Zaloguj się, aby oceniać.'); return; }
    setRatingMsg(null);
    setSubmittingRating(true);
    try {
      const r = await apiFetch(`/api/movies/${id}/rating`, {
        method: 'POST',
        body: { value: Number(myRating) },
        accessToken, refreshToken, setTokens,
      });
      if (!r.ok) {
        setRatingMsg('Nie udało się zapisać oceny');
      } else {
        const { averageRating } = await r.json();
        setData(d => d ? { ...d, averageRating } : d);
        setRatingMsg('Zapisano Twoją ocenę!');
        setTimeout(() => setRatingMsg(null), 2000);
      }
    } finally {
      setSubmittingRating(false);
    }
  }

  async function clearRating() {
    if (!accessToken) return;
    setSubmittingRating(true);
    setRatingMsg(null);
    try {
      const r = await apiFetch(`/api/movies/${id}/rating`, {
        method: 'DELETE',
        accessToken, refreshToken, setTokens,
      });
      if (!r.ok) {
        setRatingMsg('Nie udało się usunąć oceny');
      } else {
        const d = await r.json().catch(() => ({}));
        if (typeof d.averageRating !== 'undefined') {
          setData(prev => prev ? { ...prev, averageRating: d.averageRating } : prev);
        }
        setRatingMsg('Usunięto Twoją ocenę.');
      }
    } finally {
      setSubmittingRating(false);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    setCommentError(null);
    const body = comment.trim();
    if (!body) return;
    setSubmittingComment(true);
    try {
      const r = await apiFetch(`/api/movies/${id}/comments`, {
        method: 'POST',
        body: { body },
        accessToken, refreshToken, setTokens,
      });
      if (!r.ok) {
        setCommentError('Nie udało się dodać komentarza');
      } else {
        const created = await r.json();
        setData(d => d ? { ...d, comments: [created, ...(d.comments ?? [])] } : d);
        setComment('');
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  function canModify(c) {
    if (!me) return false;
    const isAuthor = c.author?.id && me.id === c.author.id;
    const elevated = me.role === 'admin' || me.role === 'moderator';
    return isAuthor || elevated;
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditBody(c.body || '');
  }
  function cancelEdit() { setEditingId(null); setEditBody(''); }

  async function saveEdit(commentId) {
    if (!editingId || editingId !== commentId) return;
    setSaving(true);
    setCommentError(null);
    try {
      const r = await apiFetch(`/api/movies/${id}/comments/${commentId}`, {
        method: 'PUT',
        body: { body: editBody },
        accessToken, refreshToken, setTokens,
      });
      if (!r.ok) {
        setCommentError('Nie udało się zaktualizować komentarza');
      } else {
        const updated = await r.json();
        setData(d => d ? {
          ...d,
          comments: (d.comments ?? []).map(c => c.id === updated.id ? updated : c),
        } : d);
        cancelEdit();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteComment(commentId) {
    if (!confirm('Usunąć komentarz?')) return;
    setDeletingId(commentId);
    setCommentError(null);
    try {
      const r = await apiFetch(`/api/movies/${id}/comments/${commentId}`, {
        method: 'DELETE',
        accessToken, refreshToken, setTokens,
      });
      if (!r.ok && r.status !== 204) {
        setCommentError('Nie udało się usunąć komentarza');
      } else {
        setData(d => d ? {
          ...d,
          comments: (d.comments ?? []).filter(c => c.id !== commentId),
        } : d);
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <div className="text-center text-sm opacity-70">Ładowanie…</div>;
  if (!data) return <div className="text-red-500">Nie znaleziono</div>;

  return (
    <div className="grid gap-6">
      {/* Nagłówek */}
      <header className="card p-6">
        <h1 className="text-3xl font-extrabold">
          <span className="title-gradient">{data.title}</span>
          {data.year ? <span className="text-neutral-500"> ({data.year})</span> : null}
        </h1>
        {data.director && (
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Reżyser: <span className="chip">{data.director}</span>
          </div>
        )}
      </header>

      {/* Główna sekcja */}
      <section className="grid gap-4 md:grid-cols-[300px_1fr] items-start">
        <div className="card p-3">
          <Cover src={data.coverUrl} alt={data.title} />
        </div>

        <div className="grid gap-4">
          <div className="card">
            <h2 className="text-lg font-semibold mb-2">Opis</h2>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{data.description || '—'}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-lg font-semibold mb-2">Średnia ocena</h2>
              <div className="flex items-end gap-3">
                <div className="text-3xl font-extrabold">{typeof data.averageRating === 'number' ? data.averageRating.toFixed(1) : '—'}</div>
                <Stars value={data.averageRating ?? 0} />
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Twoja ocena</h2>
              <div className="flex items-center justify-between gap-3">
                <StarsInput value={myRating} onChange={setMyRating} disabled={!accessToken || submittingRating} />
                <div className="flex gap-2">
                  <button onClick={submitRating} disabled={!accessToken || submittingRating} className="btn">
                    {submittingRating ? 'Zapisywanie…' : 'Zapisz'}
                  </button>
                  <button onClick={clearRating} disabled={!accessToken || submittingRating} className="btn-ghost border border-neutral-200 dark:border-neutral-800 rounded-xl">
                    Wyczyść
                  </button>
                </div>
              </div>
              {ratingMsg && <div className="text-sm mt-2 text-neutral-600 dark:text-neutral-400">{ratingMsg}</div>}
              {!accessToken && <div className="text-sm mt-2 text-neutral-500">Zaloguj się, aby oceniać.</div>}
            </div>
          </div>
        </div>
      </section>

      {/* Komentarze */}
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Komentarze</h2>

        <form onSubmit={submitComment} className="card grid gap-3">
          <textarea
            className="input min-h-[90px]"
            placeholder={accessToken ? 'Napisz komentarz…' : 'Zaloguj się, aby dodać komentarz'}
            value={comment}
            onChange={e => setComment(e.target.value)}
            disabled={!accessToken || submittingComment}
          />
          <div className="flex gap-2">
            <button className="btn" disabled={!accessToken || submittingComment}>
              {submittingComment ? 'Wysyłanie…' : 'Dodaj komentarz'}
            </button>
            {commentError && <span className="text-sm text-red-500">{commentError}</span>}
          </div>
        </form>

        <div className="grid gap-3">
          {data.comments?.length ? data.comments.map(c => (
            <article key={c.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    {c.author ? `@${c.author.username}` : '—'} • {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}
                  </div>
                  {editingId === c.id ? (
                    <div className="grid gap-2">
                      <textarea
                        className="input min-h-[90px]"
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        disabled={saving}
                      />
                      <div className="flex gap-2">
                        <button className="btn" disabled={saving} onClick={() => saveEdit(c.id)}>
                          {saving ? 'Zapisywanie…' : 'Zapisz'}
                        </button>
                        <button className="btn-ghost" onClick={cancelEdit}>Anuluj</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">{c.body}</div>
                  )}
                </div>
                {canModify(c) && editingId !== c.id && (
                  <div className="flex gap-2">
                    <button className="btn" onClick={() => startEdit(c)}>Edytuj</button>
                    <button
                      className="btn btn-danger"
                      disabled={deletingId === c.id}
                      onClick={() => deleteComment(c.id)}
                    >
                      {deletingId === c.id ? 'Usuwanie…' : 'Usuń'}
                    </button>
                  </div>
                )}
              </div>
            </article>
          )) : <div className="text-sm opacity-70">Brak komentarzy.</div>}
        </div>
      </section>
    </div>
  );
}
