import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

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

    async function load() {
        setLoading(true);
        const r = await apiFetch(`/api/movies/${id}`, { accessToken, refreshToken, setTokens });
        if (r.ok) setData(await r.json());
        setLoading(false);
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

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

    if (loading) return <div className="text-center text-sm opacity-70">Loading…</div>;
    if (!data) return <div className="text-red-500">Not found</div>;

    return (
        <div className="grid gap-6">
            <header className="grid gap-1">
                <h1 className="text-2xl font-semibold">{data.title} {data.year ? <span className="text-neutral-500">({data.year})</span> : null}</h1>
                {data.director && <div className="text-sm text-neutral-600 dark:text-neutral-400">Director: {data.director}</div>}
            </header>

            <section className="card">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{data.description || '—'}</p>
            </section>

            <section className="grid gap-3 md:grid-cols-2">
                <div className="card">
                    <h2 className="text-lg font-semibold mb-3">Average rating</h2>
                    <div className="text-3xl font-bold">{data.averageRating ?? '—'}</div>
                </div>

                <form onSubmit={submitRating} className="card grid gap-3">
                    <h2 className="text-lg font-semibold">Your rating</h2>
                    <select
                        className="input w-40"
                        value={rating}
                        onChange={e => setRating(Number(e.target.value))}
                    >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                    <button className="btn w-40" disabled={submittingRating}>{submittingRating ? 'Submitting…' : 'Submit rating'}</button>
                </form>
            </section>

            <section className="grid gap-3">
                <h2 className="text-lg font-semibold">Comments</h2>

                <form onSubmit={submitComment} className="card grid gap-3">
                    <textarea
                        className="input min-h-[90px]"
                        placeholder="Write a comment…"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button className="btn" disabled={submittingComment}>{submittingComment ? 'Posting…' : 'Post comment'}</button>
                        {error && <span className="text-sm text-red-500">{error}</span>}
                    </div>
                </form>

                <div className="grid gap-3">
                    {data.comments?.length ? data.comments.map(c => (
                        <article key={c.id} className="card">
                            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                                {c.author ? `@${c.author.username}` : '—'} • {new Date(c.createdAt).toLocaleString()}
                            </div>
                            <div className="text-sm">{c.body}</div>
                        </article>
                    )) : <div className="text-sm opacity-70">No comments yet.</div>}
                </div>
            </section>
        </div>
    );
}
