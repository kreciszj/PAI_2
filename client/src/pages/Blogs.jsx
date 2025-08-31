import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default function Blogs() {
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [movies, setMovies] = useState([]);
  const [movieFilter, setMovieFilter] = useState('');
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchPosts() {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch('/api/posts', { accessToken });
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  useEffect(() => {
    fetchPosts();
    (async () => {
      try {
        const res = await apiFetch('/api/movies');
        if (res.ok) {
          const data = await res.json();
          setMovies(data.items);
        }
      } catch { }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiFetch('/api/posts', {
        method: 'POST',
        body: { title, body, movieIds: selectedMovies.slice(0, 10) },
        accessToken
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create post');
      }
      setTitle(''); setBody(''); setSelectedMovies([]);
      fetchPosts();
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="max-w-3xl mx-auto grid gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold"><span className="title-gradient">Społeczność</span></h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Pisz, linkuj filmy, dyskutuj.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Tytuł</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="O czym dziś?" required />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Treść (Markdown wspierany)</label>
          <textarea className="input min-h-[8rem] resize-y" value={body} onChange={e => setBody(e.target.value)} placeholder="Twoje myśli…" required />
        </div>

        <div className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium">Powiąż filmy (max 10)</label>
            <span className="text-xs text-neutral-500">Wybrane: {selectedMovies.length}/10</span>
          </div>
          <input className="input" placeholder="Szukaj filmu…" value={movieFilter} onChange={e => setMovieFilter(e.target.value)} />
          <div className="max-h-48 overflow-auto border rounded-xl p-2 bg-white dark:bg-neutral-900">
            {movies
              .filter(m => !movieFilter.trim() || `${m.title} ${m.year ?? ''}`.toLowerCase().includes(movieFilter.toLowerCase()))
              .map(m => {
                const checked = selectedMovies.includes(m.id);
                const disableMore = !checked && selectedMovies.length >= 10;
                return (
                  <label key={m.id} className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 ${disableMore ? 'opacity-60' : ''}`}>
                    <input type="checkbox" checked={checked} disabled={disableMore} onChange={e => {
                      if (e.target.checked) setSelectedMovies(prev => (prev.includes(m.id) || prev.length >= 10) ? prev : [...prev, m.id]);
                      else setSelectedMovies(prev => prev.filter(x => x !== m.id));
                    }} />
                    <span className="text-sm">{m.title} {m.year ? `(${m.year})` : ''}</span>
                  </label>
                );
              })}
            {movies.length === 0 && (<div className="text-sm text-neutral-500">Brak filmów</div>)}
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end">
          <button className="btn">Dodaj post</button>
        </div>
      </form>

      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card"><div className="skeleton h-5 w-1/2 mb-3"></div><div className="skeleton h-4 w-full mb-2"></div><div className="skeleton h-4 w-5/6"></div></div>)}</div>
      ) : (
        <ul className="grid gap-6">
          {posts.map(post => (
            <li key={post.id} className="card hover:shadow-md transition-shadow">
              <Link to={`/blogs/${post.id}`} className="block no-underline">
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="text-xl">{post.title}</strong>
                  <small className="text-xs text-neutral-500">{new Date(post.created_at).toLocaleString()}</small>
                </div>
                <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {post.author?.username ? `Autor: ${post.author.username}` : 'Autor: nieznany'}
                </div>
                {Array.isArray(post.movies) && post.movies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {post.movies.slice(0, 6).map(m => (
                      <span key={m.id} className="chip">{m.title}{m.year ? ` (${m.year})` : ''}</span>
                    ))}
                    {post.movies.length > 6 && <span className="text-xs text-neutral-500">+{post.movies.length - 6} więcej</span>}
                  </div>
                )}
                {post.body && (
                  <div className="mt-3 text-neutral-800 dark:text-neutral-200 prose dark:prose-invert max-w-none prose-p:my-1 line-clamp-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{post.body}</ReactMarkdown>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
