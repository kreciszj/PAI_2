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
  const [selectedMovies, setSelectedMovies] = useState([]); // movie ids
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/posts', { accessToken });
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // load movies list for linking
    (async () => {
      try {
        const res = await apiFetch('/api/movies');
        if (res.ok) {
          const data = await res.json();
          setMovies(data.items);
        }
      } catch {}
    })();
  }, []);

  const handleSubmit = async (e) => {
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
      setTitle('');
      setBody('');
      setSelectedMovies([]);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-8">
      <h1 className="text-center mb-6 text-2xl font-semibold">Posty</h1>
      <form onSubmit={handleSubmit} className="card mb-8 space-y-4">
        <div>
          <label htmlFor="title" className="block font-medium mb-1">Tytuł</label>
          <input
            id="title"
            type="text"
            placeholder="Tytuł"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="input"
          />
        </div>
        <div>
          <label htmlFor="body" className="block font-medium mb-1">Treść</label>
          <textarea
            id="body"
            placeholder="Treść"
            value={body}
            onChange={e => setBody(e.target.value)}
            required
            rows={6}
            className="input resize-y min-h-[8rem]"
          />
        </div>
        <div>
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
            {movies
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
            {movies.length === 0 && (
              <div className="text-sm text-neutral-500">Brak filmów</div>
            )}
          </div>
        </div>
        <button type="submit" className="btn">Dodaj post</button>
      </form>
      {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
      {loading ? (
        <div className="text-sm text-neutral-500">Ładowanie...</div>
      ) : (
        <ul className="list-none p-0 m-0 space-y-6">
          {posts.map(post => (
            <li key={post.id} className="card hover:shadow-md transition-shadow">
              <Link to={`/blogs/${post.id}`} className="block no-underline">
                <strong className="text-lg">{post.title}</strong>
                <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {post.author?.username ? `Autor: ${post.author.username}` : 'Autor: nieznany'}
                </div>
                <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                  Polubienia: {post.likes_count ?? 0}
                </div>
                {Array.isArray(post.movies) && post.movies.length > 0 && (
                  <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 flex flex-wrap gap-2">
                    {post.movies.slice(0, 5).map(m => (
                      <span key={m.id} className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border text-neutral-700 dark:text-neutral-200">
                        {m.title}{m.year ? ` (${m.year})` : ''}
                      </span>
                    ))}
                    {post.movies.length > 5 && <span className="text-neutral-500">+{post.movies.length - 5} więcej</span>}
                  </div>
                )}
                <div className="mt-3 text-neutral-800 dark:text-neutral-200 prose prose-sm dark:prose-invert max-w-none">
                  {post.body && (
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                      {post.body}
                    </ReactMarkdown>
                  )}
                </div>
                <small className="block mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(post.created_at).toLocaleString()}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
