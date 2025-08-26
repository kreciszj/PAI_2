import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import Comments from './Comments';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

export default function BlogPost() {
  const { id } = useParams();
  const { accessToken, refreshToken, setTokens } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liking, setLiking] = useState(false);
  const [me, setMe] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/posts/${id}`, { accessToken });
        if (!res.ok) throw new Error('Post not found');
        const data = await res.json();
        setPost(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  useEffect(() => {
    // fetch current user if logged in for permission checks
    (async () => {
      if (!accessToken) { setMe(null); return; }
      const res = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (res.ok) setMe(await res.json());
    })();
  }, [accessToken, refreshToken, setTokens]);

  if (loading) return <div className="text-sm text-neutral-500">Ładowanie...</div>;
  if (error) return <div className="text-red-600 dark:text-red-400">{error}</div>;
  if (!post) return null;

  const toggleLike = async () => {
    if (!accessToken) return alert('Zaloguj się, aby polubić');
    setLiking(true);
    try {
      const method = post.likedByMe ? 'DELETE' : 'POST';
      const res = await apiFetch(`/api/posts/${id}/like`, { method, accessToken });
      if (!res.ok) throw new Error('Błąd polubienia');
      const data = await res.json();
      setPost(p => ({ ...p, likedByMe: data.liked, likes_count: data.likesCount }));
    } catch (e) {
      console.error(e);
    } finally {
      setLiking(false);
    }
  };

  const canModify = me && post && (me.id === post.author_id || me.role === 'admin' || me.role === 'moderator');

  const startEdit = () => {
    setEditTitle(post.title);
    setEditBody(post.body || '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async (e) => {
    e?.preventDefault();
    if (!canModify) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/posts/${id}`, {
        method: 'PUT',
        body: { title: editTitle, body: editBody },
        accessToken,
      });
      if (!res.ok) throw new Error('Błąd zapisu');
      const data = await res.json();
      setPost(p => ({ ...p, title: data.title, body: data.body }));
      setIsEditing(false);
    } catch (e) {
      alert(e.message || 'Nie udało się zapisać');
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async () => {
    if (!canModify) return;
    if (!confirm('Na pewno usunąć ten post?')) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/posts/${id}`, { method: 'DELETE', accessToken });
      if (!res.ok && res.status !== 204) throw new Error('Błąd usuwania');
      // redirect back to blogs list
      location.assign('/blogs');
    } catch (e) {
      alert(e.message || 'Nie udało się usunąć');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-8">
      {isEditing ? (
        <form onSubmit={saveEdit} className="card mb-4 space-y-2">
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="input"
            placeholder="Tytuł"
          />
          <textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            rows={6}
            className="input"
            placeholder="Treść"
          />
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn">
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
            <button type="button" onClick={cancelEdit} className="btn-ghost">Anuluj</button>
          </div>
        </form>
      ) : (
        <h2 className="text-2xl font-semibold mb-3">{post.title}</h2>
      )}
      <div className="mb-4 text-neutral-900 dark:text-neutral-100">
        {!isEditing && post.body && <ReactMarkdown>{post.body}</ReactMarkdown>}
      </div>
      {canModify && !isEditing && (
        <div className="flex gap-2 mb-3">
          <button onClick={startEdit} className="btn">Edytuj</button>
          <button onClick={deletePost} disabled={deleting} className="btn bg-red-600 hover:bg-red-500">
            {deleting ? 'Usuwanie…' : 'Usuń'}
          </button>
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={toggleLike}
          disabled={liking}
          className={`btn ${post.likedByMe ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
        >
          {post.likedByMe ? 'Nie lubię' : 'Lubię to'}
        </button>
        <span className="text-neutral-600 dark:text-neutral-300">Polubienia: {post.likes_count ?? 0}</span>
      </div>
      <div className="text-neutral-600 dark:text-neutral-300 mb-2">
        {post.author?.username ? `Autor: ${post.author.username}` : null}
      </div>
      <small className="text-neutral-500 dark:text-neutral-400">{new Date(post.created_at).toLocaleString()}</small>
  <Comments />
    </div>
  );
}
