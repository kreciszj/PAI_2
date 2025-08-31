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
      const r = await fetch(`${API}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (r.status === 409) { setE('Nazwa użytkownika zajęta'); return; }
      if (!r.ok) { setE('Błąd danych'); return; }
      const l = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen grid place-items-center px-4">
      <div className="max-w-md w-full card overflow-hidden p-0 slide-up">
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-indigo-500/15 via-emerald-500/10 to-sky-500/15 dark:from-indigo-500/10 dark:via-emerald-500/10 dark:to-sky-500/10">
          <h1 className="text-2xl font-extrabold">
            <span className="title-gradient">Dołącz do nas</span>
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Załóż konto dosłownie w pare sekund!</p>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 pt-4 grid gap-4">
          <input
            className="input"
            placeholder="username (3–32)"
            value={username}
            onChange={e => setU(e.target.value)}
            minLength={3}
            maxLength={32}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="password (min 6)"
            value={password}
            onChange={e => setP(e.target.value)}
            minLength={6}
            required
          />
          {error && <div className="text-sm text-red-500">{error}</div>}
          <button type="submit" className="btn w-full" disabled={loading}>
            {loading ? 'Rejestruję…' : 'Zarejestruj'}
          </button>
          <div className="flex justify-center">
            <Link to="/login" className="btn-ghost">Masz konto? Zaloguj się</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
