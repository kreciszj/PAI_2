import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

function Sidebar({ tabs, active, onSelect }) {
  return (
    <nav className="card p-0 overflow-hidden">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          className={
            `w-full text-left px-4 py-3 border-b last:border-0 transition
             hover:bg-neutral-50 dark:hover:bg-neutral-800
             ${active===t.key
               ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold'
               : ''}`
          }
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

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

  // Admin
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersMsg, setUsersMsg] = useState(null);
  const [busyUserIds, setBusyUserIds] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const [active, setActive] = useState('profile');
  const tabs = useMemo(() => {
    const base = [
      { key: 'profile', label: 'Ustawienia użytkownika' },
      { key: 'password', label: 'Zmiana hasła' },
    ];
    if (me?.role === 'admin') base.push({ key: 'users', label: 'Użytkownicy (admin)' });
    return base;
  }, [me]);

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

  useEffect(() => {
    if (active === 'users' && me?.role === 'admin' && !usersLoaded) {
      loadUsers().then(() => setUsersLoaded(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, me]);

  async function loadUsers() {
    setLoadingUsers(true); setUsersMsg(null);
    try {
      const r = await apiFetch('/api/users', { accessToken, refreshToken, setTokens });
      if (!r.ok) { setUsersMsg('Nie udało się pobrać listy użytkowników'); return; }
      const rows = await r.json();
      setUsers(rows);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function saveUserAdmin(u) {
    setUsersMsg(null);
    setBusyUserIds(ids => [...ids, u.id]);
    try {
      const r = await apiFetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        body: { username: u.username, role: u.role },
        accessToken, refreshToken, setTokens,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setUsersMsg(errorToMsg(err?.error));
        return;
      }
      const row = await r.json();
      setUsers(list => list.map(x => x.id === row.id ? { ...x, ...row } : x));
      if (row.id === me?.id) {
        const meRes = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
        if (meRes.ok) setMe(await meRes.json());
      }
    } finally {
      setBusyUserIds(ids => ids.filter(id => id !== u.id));
    }
  }

  async function deleteUserAdmin(u) {
    if (!confirm(`Usunąć użytkownika @${u.username}? Tej operacji nie można cofnąć.`)) return;
    setUsersMsg(null);
    setBusyUserIds(ids => [...ids, u.id]);
    try {
      const r = await apiFetch(`/api/users/${u.id}`, { method: 'DELETE', accessToken, refreshToken, setTokens });
      if (!r.ok && r.status !== 204) {
        const err = await r.json().catch(() => ({}));
        setUsersMsg(errorToMsg(err?.error));
        return;
      }
      setUsers(list => list.filter(x => x.id !== u.id));
    } finally {
      setBusyUserIds(ids => ids.filter(id => id !== u.id));
    }
  }

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

  if (!accessToken) {
    return (
      <div className="container-page">
        <div className="max-w-2xl mx-auto card text-sm">
          Zaloguj się, aby zarządzać ustawieniami.
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-5xl grid gap-4">
      {/* Hero */}
      <div className="card p-6">
        <h1 className="text-3xl font-extrabold">
          <span className="title-gradient">Ustawienia</span>
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Profil, bezpieczeństwo i administracja.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr] items-start">
        <Sidebar tabs={tabs} active={active} onSelect={setActive} />
        <div className="grid gap-4">
          {active === 'profile' && (
            <section className="card">
              <h2 className="text-lg font-semibold mb-3">Zmień nazwę użytkownika</h2>
              <form onSubmit={submitUsername} className="grid gap-3 max-w-md">
                <label className="grid gap-1">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Nazwa użytkownika</span>
                  <input
                    className="input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    minLength={3}
                    maxLength={32}
                    required
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button disabled={savingUser} type="submit" className="btn disabled:opacity-60">
                    {savingUser ? 'Zapisywanie…' : 'Zapisz'}
                  </button>
                  {userMsg && <span aria-live="polite" className="text-sm">{userMsg}</span>}
                </div>
              </form>
            </section>
          )}

          {active === 'password' && (
            <section className="card">
              <h2 className="text-lg font-semibold mb-3">Zmiana hasła</h2>
              <form onSubmit={submitPassword} className="grid gap-3 max-w-md">
                <label className="grid gap-1">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Aktualne hasło</span>
                  <input
                    className="input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    required
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Nowe hasło</span>
                  <input
                    className="input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    minLength={6}
                    required
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button disabled={savingPass} type="submit" className="btn disabled:opacity-60">
                    {savingPass ? 'Zapisywanie…' : 'Zmień hasło'}
                  </button>
                  {passMsg && <span aria-live="polite" className="text-sm">{passMsg}</span>}
                </div>
              </form>
            </section>
          )}

          {active === 'users' && me?.role === 'admin' && (
            <section className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Zarządzanie użytkownikami</h2>
                <button onClick={loadUsers} disabled={loadingUsers} className="btn-ghost disabled:opacity-60">
                  {loadingUsers ? 'Odświeżanie…' : 'Odśwież'}
                </button>
              </div>
              {usersMsg && <div className="mb-2 text-sm text-red-600">{usersMsg}</div>}
              {loadingUsers && users.length === 0 ? (
                <div className="text-sm text-neutral-500">Ładowanie…</div>
              ) : users.length === 0 ? (
                <div className="text-sm text-neutral-500">Brak użytkowników do wyświetlenia.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 border-b border-neutral-200/70 dark:border-neutral-800">Nazwa</th>
                        <th className="text-left px-3 py-2 border-b border-neutral-200/70 dark:border-neutral-800">Rola</th>
                        <th className="text-right px-3 py-2 border-b border-neutral-200/70 dark:border-neutral-800">Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/60">
                            <input
                              className="input"
                              value={u.username}
                              onChange={(e) => setUsers(list => list.map(x => x.id === u.id ? { ...x, username: e.target.value } : x))}
                            />
                          </td>
                          <td className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/60">
                            {u.id === me?.id ? (
                              <div title="Nie możesz zmienić własnej roli" className="px-1.5 py-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                                {u.role}
                              </div>
                            ) : (
                              <select
                                className="input"
                                value={u.role}
                                onChange={(e) => setUsers(list => list.map(x => x.id === u.id ? { ...x, role: e.target.value } : x))}
                              >
                                <option value="user">user</option>
                                <option value="moderator">moderator</option>
                                <option value="admin">admin</option>
                              </select>
                            )}
                          </td>
                          <td className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/60">
                            {u.id === me?.id ? (
                              <div className="text-right text-xs text-neutral-500">Twoje konto</div>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => saveUserAdmin(u)}
                                  disabled={busyUserIds.includes(u.id)}
                                  className="btn disabled:opacity-60"
                                >
                                  {busyUserIds.includes(u.id) ? 'Zapisywanie…' : 'Zapisz'}
                                </button>
                                <button
                                  onClick={() => deleteUserAdmin(u)}
                                  disabled={busyUserIds.includes(u.id)}
                                  className="btn btn-danger disabled:opacity-60"
                                >
                                  {busyUserIds.includes(u.id) ? 'Usuwanie…' : 'Usuń'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-xs text-neutral-500">
                Uwaga: usunięcie użytkownika usuwa także jego wpisy, komentarze i polubienia.
              </p>
            </section>
          )}
        </div>
      </div>
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
    case 'invalid_role': return 'Nieprawidłowa rola';
    case 'cannot_delete_self': return 'Nie możesz usunąć własnego konta';
    case 'cannot_change_own_role': return 'Nie możesz zmienić własnej roli';
    default: return 'Wystąpił błąd';
  }
}
