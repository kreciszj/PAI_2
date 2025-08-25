import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import Comments from './Comments';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

export default function BlogPost() {
  const { id } = useParams();
  const { accessToken, ...auth } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liking, setLiking] = useState(false);

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

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontSize: 24, marginBottom: 12 }}>{post.title}</h2>
      <div style={{ marginBottom: 16 }}>
        {post.body && <ReactMarkdown>{post.body}</ReactMarkdown>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={toggleLike} disabled={liking} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: post.likedByMe ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          {post.likedByMe ? 'Nie lubię' : 'Lubię to'}
        </button>
        <span style={{ color: '#555' }}>Polubienia: {post.likes_count ?? 0}</span>
      </div>
      <small style={{ color: '#888' }}>{new Date(post.created_at).toLocaleString()}</small>
  <Comments />
    </div>
  );
}
