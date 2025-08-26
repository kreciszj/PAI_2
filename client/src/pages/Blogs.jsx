import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

export default function Blogs() {
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiFetch('/api/posts', {
        method: 'POST',
        body: { title, body },
        accessToken
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create post');
      }
      setTitle('');
      setBody('');
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-8">
      <h1 className="text-center mb-6 text-2xl font-semibold">Blogi</h1>
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
                <div className="mt-3 text-neutral-800 dark:text-neutral-200">
                  {post.body && <ReactMarkdown>{post.body}</ReactMarkdown>}
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
