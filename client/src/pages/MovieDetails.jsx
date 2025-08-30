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

function toAbs(u) {
  if (!u) return u;
  return u.startsWith('/uploads/') ? `${API}${u}` : u;
}

function Cover({ src, alt }) {
  const [s, setS] = useState(toAbs(src) || PLACEHOLDER);
  return (
    <img
      src={s || PLACEHOLDER}
      alt={alt}
      width={300}
      height={450}
      style={{ objectFit:'cover', borderRadius:8, border:'1px solid #ddd', background:'#f3f4f6' }}
      onError={(e) => { if (s !== PLACEHOLDER) { setS(PLACEHOLDER); e.currentTarget.onerror = null; } }}
    />
  );
}

export default function MovieDetails() {
  const { id } = useParams();
  const { accessToken, refreshToken, setTokens } = useAuth();

  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(10);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState(null);

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

  async function submitRating(e) {
    e.preventDefault();
    setRatingError(null);
    setSubmittingRating(true);
    try {
      const r = await apiFetch(`/api/movies/${id}/rating`, {
        method: 'POST',
        body: { value: Number(rating) },
        accessToken, refreshToken, setTokens,
      });
      if (!r.ok) {
        setRatingError('Nie udało się zapisać oceny');
      } else {
        const { averageRating } = await r.json();
        setData(d => d ? { ...d, averageRating } : d); // optymistyczny update
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
        setData(d => d ? { ...d, comments: [created, ...(d.comments ?? [])] } : d); // bez GET
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

  function cancelEdit() {
    setEditingId(null);
    setEditBody('');
  }

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

  if (loading) return <div className="text-center text-sm opacity-70">Loading…</div>;
  if (!data) return <div className="text-red-500">Not found</div>;

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">
          {data.title} {data.year ? <span className="text-neutral-500">({data.year})</span> : null}
        </h1>
        {data.director && <div className="text-sm text-neutral-600 dark:text-neutral-400">Director: {data.director}</div>}
      </header>

      <section className="grid gap-4 md:grid-cols-[300px_1fr] items-start">
        <div><Cover src={data.coverUrl} alt={data.title} /></div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{data.description || '—'}</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Average rating</h2>
          <div className="text-3xl font-bold">{data.averageRating ?? '—'}</div>
          {ratingError && <div className="text-sm text-red-500 mt-2">{ratingError}</div>}
        </div>

        <form onSubmit={submitRating} className="card grid gap-3">
          <h2 className="text-lg font-semibold">Your rating</h2>
          <select
            className="input w-40"
            value={rating}
            onChange={e => setRating(Number(e.target.value))}
            disabled={!accessToken || submittingRating}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (<option key={v} value={v}>{v}</option>))}
          </select>
          <button className="btn w-40" disabled={!accessToken || submittingRating}>
            {submittingRating ? 'Submitting…' : 'Submit rating'}
          </button>
        </form>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Comments</h2>

        <form onSubmit={submitComment} className="card grid gap-3">
          <textarea
            className="input min-h-[90px]"
            placeholder={accessToken ? 'Write a comment…' : 'Zaloguj się, aby dodać komentarz'}
            value={comment}
            onChange={e => setComment(e.target.value)}
            disabled={!accessToken || submittingComment}
          />
          <div className="flex gap-2">
            <button className="btn" disabled={!accessToken || submittingComment}>
              {submittingComment ? 'Posting…' : 'Post comment'}
            </button>
            {commentError && <span className="text-sm text-red-500">{commentError}</span>}
          </div>
        </form>

        <div className="grid gap-3">
          {data.comments?.length ? data.comments.map(c => (
            <article key={c.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
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
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">{c.body}</div>
                  )}
                </div>
                {canModify(c) && editingId !== c.id && (
                  <div className="flex gap-2">
                    <button className="btn" onClick={() => startEdit(c)}>Edit</button>
                    <button
                      className="btn bg-red-600 hover:bg-red-500"
                      disabled={deletingId === c.id}
                      onClick={() => deleteComment(c.id)}
                    >
                      {deletingId === c.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </article>
          )) : <div className="text-sm opacity-70">No comments yet.</div>}
        </div>
      </section>
    </div>
  );
}
