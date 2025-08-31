import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default function Comments() {
  const { id } = useParams();
  const { accessToken, refreshToken, setTokens } = useAuth();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function fetchComments() {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`/api/posts/${id}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      setComments(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  useEffect(() => { fetchComments(); }, [id]);
  useEffect(() => { (async () => { if (!accessToken) { setMe(null); return; } try { const res = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens }); if (res.ok) setMe(await res.json()); } catch { } })(); }, [accessToken, refreshToken, setTokens]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiFetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        body: { body },
        accessToken, refreshToken, setTokens,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add comment');
      }
      setBody('');
      fetchComments();
    } catch (err) { setError(err.message); }
  };

  const canModify = (c) => {
    if (!me) return false;
    const isAuthor = c.author?.id && me.id === c.author.id;
    const elevated = me.role === 'admin' || me.role === 'moderator';
    return isAuthor || elevated;
  };

  const startEdit = (c) => { setEditingId(c.id); setEditBody(c.body || ''); };
  const cancelEdit = () => { setEditingId(null); setEditBody(''); };

  const saveEdit = async (commentId) => {
    if (!editingId || editingId !== commentId) return;
    setSaving(true); setError(null);
    try {
      const res = await apiFetch(`/api/posts/${id}/comments/${commentId}`, {
        method: 'PUT', body: { body: editBody }, accessToken, refreshToken, setTokens,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update comment');
      }
      cancelEdit(); await fetchComments();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const deleteComment = async (commentId) => {
    if (!confirm('Usunąć komentarz?')) return;
    setDeletingId(commentId); setError(null);
    try {
      const res = await apiFetch(`/api/posts/${id}/comments/${commentId}`, { method: 'DELETE', accessToken, refreshToken, setTokens });
      if (!res.ok && res.status !== 204) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete comment');
      }
      await fetchComments();
    } catch (e) { setError(e.message); } finally { setDeletingId(null); }
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Komentarze</h3>

      {accessToken ? (
        <form onSubmit={handleSubmit} className="card mb-4 grid gap-3">
          <textarea
            placeholder="Dodaj komentarz…"
            value={body}
            onChange={e => setBody(e.target.value)}
            required
            rows={3}
            className="input resize-y min-h-[5rem]"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-neutral-500">Markdown wspierany</span>
            <button type="submit" className="btn">Wyślij</button>
          </div>
        </form>
      ) : (
        <div className="mb-4 text-neutral-500 dark:text-neutral-400">Musisz być zalogowany, aby dodać komentarz.</div>
      )}

      {error && <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>}

      {loading ? (
        <div className="grid gap-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card"><div className="skeleton h-4 w-1/2 mb-2"></div><div className="skeleton h-3 w-full mb-1"></div><div className="skeleton h-3 w-5/6"></div></div>)}</div>
      ) : (
        <ul className="grid gap-3">
          {comments.map(comment => (
            <li key={comment.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium mb-1">{comment.author?.username || 'Nieznany użytkownik'}</div>
                  {editingId === comment.id ? (
                    <div className="grid gap-2">
                      <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={3} className="input min-h-[4rem]" />
                      <div className="flex gap-2">
                        <button className="btn" disabled={saving} onClick={() => saveEdit(comment.id)}>{saving ? 'Zapisywanie…' : 'Zapisz'}</button>
                        <button className="btn-ghost" onClick={cancelEdit}>Anuluj</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-neutral-800 dark:text-neutral-200 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{comment.body}</ReactMarkdown>
                    </div>
                  )}
                  <small className="block mt-2 text-xs text-neutral-500 dark:text-neutral-400">{new Date(comment.createdAt).toLocaleString()}</small>
                </div>

                {canModify(comment) && editingId !== comment.id && (
                  <div className="flex gap-2">
                    <button className="btn" onClick={() => startEdit(comment)}>Edytuj</button>
                    <button className="btn btn-danger" disabled={deletingId === comment.id} onClick={() => deleteComment(comment.id)}>
                      {deletingId === comment.id ? 'Usuwanie…' : 'Usuń'}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
