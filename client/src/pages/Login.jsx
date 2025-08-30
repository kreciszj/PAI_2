import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const API = import.meta.env.VITE_API_URL;

export default function Login() {
  const { setTokens } = useAuth();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setL] = useState(false);
  const [error, setE] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setE(null);
    setL(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) { setE('Błędne dane'); return; }
      const data = await res.json();
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      location.href = '/';
    } finally {
      setL(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="max-w-md w-full card overflow-hidden p-0 slide-up">
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-pink-500/15 dark:from-emerald-500/10 dark:via-sky-500/10 dark:to-pink-500/10">
          <h1 className="text-2xl font-extrabold">
            <span className="title-gradient">Witaj ponownie</span>
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Zaloguj się, aby kontynuować.</p>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 pt-4 grid gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Nazwa użytkownika</label>
            <input
              className="input"
              placeholder="username"
              value={username}
              onChange={e => setU(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
              maxLength={32}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Hasło</label>
            <div className="relative">
              <input
                className="input pr-24"
                placeholder="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setP(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-1.5 top-1.5 btn-ghost px-2 py-1 text-xs"
                aria-pressed={showPass}
              >
                {showPass ? 'Ukryj' : 'Pokaż'}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-red-500" aria-live="polite">{error}</div>}

          <button type="submit" className="btn w-full disabled:opacity-60" disabled={loading}>
            {loading ? 'Logowanie…' : 'Zaloguj się'}
          </button>

          <div className="flex justify-center">
            <Link to="/register" className="btn-ghost">Nie masz konta? Zarejestruj się</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
