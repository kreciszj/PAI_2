import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import Comments from './Comments';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

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
  const [allMovies, setAllMovies] = useState([]);
  const [movieFilter, setMovieFilter] = useState('');
  const [selectedMovies, setSelectedMovies] = useState([]);

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
    // fetch movies for selection when editing
    (async () => {
      try {
        const res = await apiFetch('/api/movies');
        if (res.ok) setAllMovies(await res.json());
      } catch {}
    })();
  }, []);

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
  setSelectedMovies(Array.isArray(post.movies) ? post.movies.map(m => m.id) : []);
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
        body: { title: editTitle, body: editBody, movieIds: selectedMovies.slice(0, 10) },
        accessToken,
      });
      if (!res.ok) throw new Error('Błąd zapisu');
      const data = await res.json();
      setPost(p => ({ ...p, title: data.title, body: data.body, movies: data.movies || [] }));
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
          <div className="pt-2">
            <div className="flex items-baseline justify-between mb-2">
              <label className="block font-medium">Powiąż filmy (max 10)</label>
              <span className="text-xs text-neutral-500">Wybrane: {selectedMovies.length}/10</span>
            </div>
            <input
              type="text"
              placeholder="Szukaj filmu..."
              value={movieFilter}
              onChange={e => setMovieFilter(e.target.value)}
              className="input mb-2"
            />
            <div className="max-h-48 overflow-auto border rounded-md p-2 bg-white dark:bg-neutral-900">
              {allMovies
                .filter(m => !movieFilter.trim() || `${m.title} ${m.year ?? ''}`.toLowerCase().includes(movieFilter.toLowerCase()))
                .map(m => {
                  const checked = selectedMovies.includes(m.id);
                  const disableMore = !checked && selectedMovies.length >= 10;
                  return (
                    <label key={m.id} className={`flex items-center gap-2 py-1 px-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 ${disableMore ? 'opacity-60' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disableMore}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedMovies(prev => (prev.includes(m.id) || prev.length >= 10) ? prev : [...prev, m.id]);
                          } else {
                            setSelectedMovies(prev => prev.filter(x => x !== m.id));
                          }
                        }}
                      />
                      <span className="text-sm">{m.title} {m.year ? `(${m.year})` : ''}</span>
                    </label>
                  );
                })}
              {allMovies.length === 0 && (
                <div className="text-sm text-neutral-500">Brak filmów</div>
              )}
            </div>
          </div>
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
      <div className="mb-4 text-neutral-900 dark:text-neutral-100 prose dark:prose-invert max-w-none">
        {!isEditing && post.body && (
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {post.body}
          </ReactMarkdown>
        )}
      </div>
      {!isEditing && Array.isArray(post.movies) && post.movies.length > 0 && (
        <div className="mb-4">
          <div className="font-medium mb-2">Powiązane filmy:</div>
          <ul className="list-disc ml-5 text-sm">
            {post.movies.map(m => (
              <li key={m.id}>{m.title}{m.year ? ` (${m.year})` : ''}</li>
            ))}
          </ul>
        </div>
      )}
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
