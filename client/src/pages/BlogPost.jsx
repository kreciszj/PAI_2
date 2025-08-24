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

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/posts/${id}`);
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

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontSize: 24, marginBottom: 12 }}>{post.title}</h2>
      <div style={{ marginBottom: 16 }}>
        {post.body && <ReactMarkdown>{post.body}</ReactMarkdown>}
      </div>
      <small style={{ color: '#888' }}>{new Date(post.created_at).toLocaleString()}</small>
  <Comments />
    </div>
  );
}
