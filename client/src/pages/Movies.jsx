import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

export default function Movies() {
  const { accessToken, refreshToken, setTokens } = useAuth();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const r = await apiFetch('/api/movies', { accessToken, refreshToken, setTokens });
      if (r.ok) setRows(await r.json());
    })();
  }, [accessToken, refreshToken, setTokens]);

  return (
    <div style={{ display:'grid', gap:16 }}>
      <h1>Baza filmów</h1>
      <div style={{ display:'grid', gap:12 }}>
        {rows.map(m => (
          <div key={m.id} style={{ border:'1px solid rgba(0,0,0,0.2)', borderRadius:8, padding:12 }}>
            <div style={{ fontWeight:600 }}>{m.title} {m.year ? `(${m.year})` : ''}</div>
            <div style={{ color:'#888' }}>{m.description || 'Brak opisu'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
