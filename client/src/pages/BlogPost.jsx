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

  if (loading) return <div>Ładowanie...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
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
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      {isEditing ? (
        <form onSubmit={saveEdit} style={{ marginBottom: 16 }}>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="input"
            placeholder="Tytuł"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6, marginBottom: 8 }}
          />
          <textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            rows={6}
            className="input"
            placeholder="Treść"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} className="btn" style={{ padding: '6px 12px' }}>
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
            <button type="button" onClick={cancelEdit} className="btn-ghost" style={{ padding: '6px 12px' }}>Anuluj</button>
          </div>
        </form>
      ) : (
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>{post.title}</h2>
      )}
      <div style={{ marginBottom: 16 }}>
        {!isEditing && post.body && <ReactMarkdown>{post.body}</ReactMarkdown>}
      </div>
      {canModify && !isEditing && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={startEdit} className="btn" style={{ padding: '6px 12px' }}>Edytuj</button>
          <button onClick={deletePost} disabled={deleting} className="btn danger" style={{ padding: '6px 12px', background: '#ef4444', color: '#fff' }}>
            {deleting ? 'Usuwanie…' : 'Usuń'}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={toggleLike} disabled={liking} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: post.likedByMe ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          {post.likedByMe ? 'Nie lubię' : 'Lubię to'}
        </button>
        <span style={{ color: '#555' }}>Polubienia: {post.likes_count ?? 0}</span>
      </div>
      <div style={{ color: '#666', marginBottom: 8 }}>
        {post.author?.username ? `Autor: ${post.author.username}` : null}
      </div>
      <small style={{ color: '#888' }}>{new Date(post.created_at).toLocaleString()}</small>
  <Comments />
    </div>
  );
}
