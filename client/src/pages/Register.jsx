import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
const API = import.meta.env.VITE_API_URL;

export default function Register() {
  const { setTokens } = useAuth();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [loading, setL] = useState(false);
  const [error, setE] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setE(null);
    setL(true);
    try {
      // 1) Rejestracja
      const r = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (r.status === 409) { setE('Nazwa użytkownika zajęta'); return; }
      if (!r.ok) { setE('Błąd danych'); return; }

      // 2) Auto-logowanie po rejestracji
      const l = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!l.ok) { setE('Zaloguj się ręcznie'); return; }
      const { accessToken, refreshToken } = await l.json();
      setTokens({ accessToken, refreshToken });
      location.href = '/';
    } finally {
      setL(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 360, margin: '64px auto', display:'grid', gap:12 }}>
      <h1>Rejestracja</h1>
      <input
        placeholder="username (3–32)"
        value={username}
        onChange={e=>setU(e.target.value)}
        minLength={3}
        maxLength={32}
        required
      />
      <input
        placeholder="password (min 6)"
        type="password"
        value={password}
        onChange={e=>setP(e.target.value)}
        minLength={6}
        required
      />
      {error && <div style={{ color:'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>{loading ? 'Rejestruję...' : 'Zarejestruj'}</button>
      <a href="/login" style={{ textAlign:'center' }}>Masz konto? Zaloguj się</a>
    </form>
  );
}
