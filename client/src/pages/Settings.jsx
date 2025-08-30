import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function Settings() {
  const { accessToken, refreshToken, setTokens } = useAuth();
  const [me, setMe] = useState(null);
  const [username, setUsername] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [userMsg, setUserMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!accessToken) { setMe(null); return; }
      const r = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (!ignore && r.ok) {
        const data = await r.json();
        setMe(data);
        setUsername(data.username || '');
      }
    })();
    return () => { ignore = true; };
  }, [accessToken, refreshToken, setTokens]);

  async function submitUsername(e) {
    e.preventDefault();
    setSavingUser(true); setUserMsg(null);
    try {
      const r = await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: { username },
        accessToken, refreshToken, setTokens,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setUserMsg(errorToMsg(err?.error));
      } else {
        const data = await r.json();
        // server returns fresh access token if username changed
        if (data.accessToken) setTokens({ accessToken: data.accessToken, refreshToken });
        setUserMsg('Nazwa użytkownika zaktualizowana');
        setMe((m) => ({ ...m, username: data.username }));
      }
    } finally {
      setSavingUser(false);
    }
  }

  async function submitPassword(e) {
    e.preventDefault();
    setSavingPass(true); setPassMsg(null);
    try {
      const r = await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: { currentPassword, newPassword },
        accessToken, refreshToken, setTokens,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setPassMsg(errorToMsg(err?.error));
      } else {
        const data = await r.json();
        if (data.accessToken) setTokens({ accessToken: data.accessToken, refreshToken });
        setPassMsg('Hasło zostało zmienione');
        setCurrentPassword('');
        setNewPassword('');
      }
    } finally {
      setSavingPass(false);
    }
  }

  if (!accessToken) return <div style={{ margin: 24 }}>Zaloguj się, aby zarządzać ustawieniami.</div>;

  return (
    <div style={{ maxWidth: 560, margin: '24px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Ustawienia</h1>

      <section style={{ marginBottom: 24, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Zmień nazwę użytkownika</h2>
        <form onSubmit={submitUsername}>
          <label style={{ display: 'block', marginBottom: 8 }}>Nazwa użytkownika</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)}
                 minLength={3} maxLength={32}
                 style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button disabled={savingUser} type="submit"
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #999' }}>
              {savingUser ? 'Zapisywanie…' : 'Zapisz' }
            </button>
            {userMsg && <span aria-live="polite">{userMsg}</span>}
          </div>
        </form>
      </section>

      <section style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Zmień hasło</h2>
        <form onSubmit={submitPassword}>
          <label style={{ display: 'block', marginBottom: 8 }}>Aktualne hasło</label>
          <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                 type="password"
                 style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
          <label style={{ display: 'block', margin: '12px 0 8px' }}>Nowe hasło</label>
          <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                 type="password" minLength={6}
                 style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button disabled={savingPass} type="submit"
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #999' }}>
              {savingPass ? 'Zapisywanie…' : 'Zapisz' }
            </button>
            {passMsg && <span aria-live="polite">{passMsg}</span>}
          </div>
        </form>
      </section>
    </div>
  );
}

function errorToMsg(code) {
  switch (code) {
    case 'username_length_3_32': return 'Nazwa użytkownika musi mieć 3-32 znaki';
    case 'username_taken': return 'Taka nazwa użytkownika już istnieje';
    case 'password_min_6': return 'Hasło musi mieć co najmniej 6 znaków';
    case 'current_password_required': return 'Podaj aktualne hasło';
    case 'invalid_current_password': return 'Aktualne hasło jest nieprawidłowe';
    case 'nothing_to_update': return 'Brak zmian do zapisania';
    default: return 'Wystąpił błąd';
  }
}
