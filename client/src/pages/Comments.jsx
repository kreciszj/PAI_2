import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function Comments() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/posts/${id}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      setComments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiFetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        body: { body },
        accessToken
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add comment');
      }
      setBody('');
      fetchComments();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ marginTop: 32 }}>
      <h3>Komentarze</h3>
      {accessToken ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
          <textarea
            placeholder="Dodaj komentarz..."
            value={body}
            onChange={e => setBody(e.target.value)}
            required
            rows={2}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', resize: 'vertical' }}
          />
          <button type="submit" style={{ marginTop: 8, padding: '6px 12px', borderRadius: 4, background: '#007bff', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Dodaj komentarz</button>
        </form>
      ) : (
        <div style={{ marginBottom: 16, color: '#888' }}>Musisz być zalogowany, aby dodać komentarz.</div>
      )}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      {loading ? <div>Ładowanie...</div> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {comments.map(comment => (
            <li key={comment.id} style={{ marginBottom: 12, background: '#f6f6f6', padding: 8, borderRadius: 6 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
                {comment.author?.username || 'Nieznany użytkownik'}
              </div>
              <div>{comment.body}</div>
              <small style={{ color: '#888' }}>{new Date(comment.createdAt).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
