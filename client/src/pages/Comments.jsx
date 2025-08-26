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
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Komentarze</h3>
      {accessToken ? (
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            placeholder="Dodaj komentarz..."
            value={body}
            onChange={e => setBody(e.target.value)}
            required
            rows={3}
            className="input resize-y min-h-[5rem]"
          />
          <button type="submit" className="btn mt-2">Dodaj komentarz</button>
        </form>
      ) : (
        <div className="mb-4 text-neutral-500 dark:text-neutral-400">Musisz być zalogowany, aby dodać komentarz.</div>
      )}
      {error && <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>}
      {loading ? (
        <div className="text-sm text-neutral-500">Ładowanie...</div>
      ) : (
        <ul className="list-none p-0 m-0 space-y-3">
          {comments.map(comment => (
            <li key={comment.id} className="card p-4">
              <div className="font-medium mb-1">
                {comment.author?.username || 'Nieznany użytkownik'}
              </div>
              <div className="text-neutral-800 dark:text-neutral-200">{comment.body}</div>
              <small className="block mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {new Date(comment.createdAt).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
