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
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Blogi</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: 32, background: '#f9f9f9', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #eee' }}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="title" style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Tytuł</label>
          <input
            id="title"
            type="text"
            placeholder="Tytuł"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="body" style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Treść</label>
          <textarea
            id="body"
            placeholder="Treść"
            value={body}
            onChange={e => setBody(e.target.value)}
            required
            rows={4}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', resize: 'vertical' }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 4, background: '#007bff', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Dodaj post</button>
      </form>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {loading ? <div>Ładowanie...</div> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {posts.map(post => (
            <li key={post.id} style={{ marginBottom: 24, background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 4px #eee' }}>
              <Link to={`/blogs/${post.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <strong style={{ fontSize: 18 }}>{post.title}</strong>
                <div style={{ margin: '8px 0', color: '#333' }}>
                  {/* Author will be shown here if available */}
                  {post.author?.username ? `Autor: ${post.author.username}` : 'Autor: nieznany'}
                </div>
                <div style={{ margin: '8px 0', color: '#555' }}>
                  Polubienia: {post.likes_count ?? 0}
                </div>
                <div style={{ margin: '8px 0', color: '#333' }}>
                  {post.body && <ReactMarkdown>{post.body}</ReactMarkdown>}
                </div>
                <small style={{ color: '#888' }}>{new Date(post.created_at).toLocaleString()}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
