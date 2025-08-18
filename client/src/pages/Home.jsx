import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

export default function Home() {
  const { accessToken, refreshToken, setTokens, clear } = useAuth();
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (res.ok) setMe(await res.json());
    })();
  }, [accessToken, refreshToken, setTokens]);

  if (!accessToken) return <div style={{ margin: 24 }}>Nie zalogowano</div>;

  return (
    <div style={{ margin: 24 }}>
      <h1>Home</h1>
      <pre>{JSON.stringify(me, null, 2)}</pre>
      <button onClick={clear}>Wyloguj</button>
    </div>
  );
}
