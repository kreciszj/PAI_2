import { useState } from 'react';
import { Link } from 'react-router-dom';
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
      // 1) rejestracja
      const r = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (r.status === 409) { setE('Nazwa użytkownika zajęta'); return; }
      if (!r.ok) { setE('Błąd danych'); return; }

      // 2) auto-login
      const l = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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
    <div className="container-page max-w-md">
      <div className="card">
        <h1 className="text-xl font-semibold mb-4">Rejestracja</h1>
        <form onSubmit={submit} className="grid gap-3">
          <input
            className="input"
            placeholder="username (3–32)"
            value={username}
            onChange={e=>setU(e.target.value)}
            minLength={3}
            maxLength={32}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="password (min 6)"
            value={password}
            onChange={e=>setP(e.target.value)}
            minLength={6}
            required
          />
          {error && <div className="text-sm text-red-500">{error}</div>}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Rejestruję…' : 'Zarejestruj'}
          </button>
        </form>
        <div className="mt-3 text-center">
          <Link to="/login" className="btn-ghost">Masz konto? Zaloguj się</Link>
        </div>
      </div>
    </div>
  );
}
