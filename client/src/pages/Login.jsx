import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
const API = import.meta.env.VITE_API_URL;

export default function Login() {
  const { setTokens } = useAuth();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [error, setE] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setE(null);
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) { setE('Błędne dane'); return; }
    const data = await res.json();
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    location.href = '/';
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 360, margin: '64px auto', display:'grid', gap:12 }}>
      <h1>Logowanie</h1>
      <input placeholder="username" value={username} onChange={e=>setU(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e=>setP(e.target.value)} />
      {error && <div style={{ color:'red' }}>{error}</div>}
      <button type="submit">Zaloguj</button>
    </form>
  );
}
