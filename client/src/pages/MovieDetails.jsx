import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

const PLACEHOLDER = `data:image/svg+xml;utf8,` +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450'>
  <rect width='100%' height='100%' fill='#e5e7eb'/>
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='64' fill='#9ca3af'>?</text>
</svg>`);

function Cover({ src, alt }) {
  const [s, setS] = useState(src || PLACEHOLDER);
  return (
    <img
      src={s || PLACEHOLDER}
      alt={alt}
      width={300}
      height={450}
      style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd', background: '#f3f4f6' }}
      onError={(e) => { if (s !== PLACEHOLDER) { setS(PLACEHOLDER); e.currentTarget.onerror = null; } }}
    />
  );
}

export default function MovieDetails() {
    const { id } = useParams();
    const { accessToken, refreshToken, setTokens } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [rating, setRating] = useState(10);
    const [submittingRating, setSubmittingRating] = useState(false);

    const [comment, setComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [error, setError] = useState(null);
    const [me, setMe] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editBody, setEditBody] = useState('');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    async function load() {
        setLoading(true);
        const r = await apiFetch(`/api/movies/${id}`, { accessToken, refreshToken, setTokens });
        if (r.ok) setData(await r.json());
        setLoading(false);
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    useEffect(() => {
        (async () => {
            if (!accessToken) { setMe(null); return; }
            const r = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
            if (r.ok) setMe(await r.json());
        })();
    }, [accessToken, refreshToken, setTokens]);

    async function submitRating(e) {
        e.preventDefault();
        setError(null);
        setSubmittingRating(true);
        const r = await apiFetch(`/api/movies/${id}/rating`, {
            method: 'POST',
            body: { value: Number(rating) },
            accessToken, refreshToken, setTokens,
        });
        if (!r.ok) setError('Failed to submit rating');
        await load();
        setSubmittingRating(false);
    }

    async function submitComment(e) {
        e.preventDefault();
        setError(null);
        if (!comment.trim()) return;
        setSubmittingComment(true);
        const r = await apiFetch(`/api/movies/${id}/comments`, {
            method: 'POST',
            body: { body: comment },
            accessToken, refreshToken, setTokens,
        });
        if (!r.ok) setError('Failed to post comment');
        setComment('');
        await load();
        setSubmittingComment(false);
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
        setError(null);
        const r = await apiFetch(`/api/movies/${id}/comments/${commentId}`, {
            method: 'PUT',
            body: { body: editBody },
            accessToken, refreshToken, setTokens,
        });
        if (!r.ok) setError('Failed to update comment');
        cancelEdit();
        await load();
        setSaving(false);
    }

    async function deleteComment(commentId) {
        if (!confirm('Delete this comment?')) return;
        setDeletingId(commentId);
        setError(null);
        const r = await apiFetch(`/api/movies/${id}/comments/${commentId}`, {
            method: 'DELETE', accessToken, refreshToken, setTokens,
        });
        if (!r.ok && r.status !== 204) setError('Failed to delete comment');
        await load();
        setDeletingId(null);
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
                </div>

                <form onSubmit={submitRating} className="card grid gap-3">
                    <h2 className="text-lg font-semibold">Your rating</h2>
                    <select className="input w-40" value={rating} onChange={e => setRating(Number(e.target.value))}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (<option key={v} value={v}>{v}</option>))}
                    </select>
                    <button className="btn w-40" disabled={submittingRating}>{submittingRating ? 'Submitting…' : 'Submit rating'}</button>
                </form>
            </section>

            <section className="grid gap-3">
                <h2 className="text-lg font-semibold">Comments</h2>

                <form onSubmit={submitComment} className="card grid gap-3">
                    <textarea className="input min-h-[90px]" placeholder="Write a comment…" value={comment} onChange={e => setComment(e.target.value)} />
                    <div className="flex gap-2">
                        <button className="btn" disabled={submittingComment}>{submittingComment ? 'Posting…' : 'Post comment'}</button>
                        {error && <span className="text-sm text-red-500">{error}</span>}
                    </div>
                </form>

                <div className="grid gap-3">
                    {data.comments?.length ? data.comments.map(c => (
                        <article key={c.id} className="card">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                                        {c.author ? `@${c.author.username}` : '—'} • {new Date(c.createdAt).toLocaleString()}
                                    </div>
                                    {editingId === c.id ? (
                                        <div className="grid gap-2">
                                            <textarea className="input min-h-[90px]" value={editBody} onChange={e => setEditBody(e.target.value)} />
                                            <div className="flex gap-2">
                                                <button className="btn" disabled={saving} onClick={() => saveEdit(c.id)}>{saving ? 'Saving…' : 'Save'}</button>
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
                                        <button className="btn bg-red-600 hover:bg-red-500" disabled={deletingId === c.id} onClick={() => deleteComment(c.id)}>
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
