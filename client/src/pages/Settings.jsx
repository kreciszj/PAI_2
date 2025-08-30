import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function Settings() {
  const { accessToken, refreshToken, setTokens, clear } = useAuth();
  const [me, setMe] = useState(null);
  const [username, setUsername] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [userMsg, setUserMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState(null);

  // Admin: users management
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersMsg, setUsersMsg] = useState(null);
  const [busyUserIds, setBusyUserIds] = useState([]); // track per-row actions

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!accessToken) { setMe(null); return; }
      const r = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (!ignore && r.ok) {
        const data = await r.json();
        setMe(data);
        setUsername(data.username || '');
        // If admin, load users list
        if (data.role === 'admin') {
          await loadUsers();
        } else {
          setUsers([]);
        }
      }
    })();
    return () => { ignore = true; };
  }, [accessToken, refreshToken, setTokens]);

  async function loadUsers() {
    setLoadingUsers(true); setUsersMsg(null);
    try {
      const r = await apiFetch('/api/users', { accessToken, refreshToken, setTokens });
      if (!r.ok) {
        setUsersMsg('Nie udało się pobrać listy użytkowników');
        return;
      }
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
      // if I changed my own role/username, refresh /me
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

      {me?.role === 'admin' && (
        <section style={{ marginTop: 24, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Zarządzanie użytkownikami (admin)</h2>
            <button onClick={loadUsers} disabled={loadingUsers}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #999' }}>
              {loadingUsers ? 'Odświeżanie…' : 'Odśwież'}
            </button>
          </div>
          {usersMsg && <div style={{ marginBottom: 8 }}>{usersMsg}</div>}
          {loadingUsers && users.length === 0 ? (
            <div>Ładowanie…</div>
          ) : users.length === 0 ? (
            <div>Brak użytkowników do wyświetlenia.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Nazwa</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Rola</th>
                    <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #eee' }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                        <input
                          value={u.username}
                          onChange={(e) => setUsers(list => list.map(x => x.id === u.id ? { ...x, username: e.target.value } : x))}
                          style={{ width: '100%', padding: 6, border: '1px solid #ccc', borderRadius: 6 }}
                        />
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                        {u.id === me?.id ? (
                          <div title="Nie możesz zmienić własnej roli" style={{ padding: 6 }}>
                            {u.role}
                          </div>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => setUsers(list => list.map(x => x.id === u.id ? { ...x, role: e.target.value } : x))}
                            style={{ width: '100%', padding: 6, border: '1px solid #ccc', borderRadius: 6 }}
                          >
                            <option value="user">user</option>
                            <option value="moderator">moderator</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                        {u.id === me?.id ? (
                          <div style={{ textAlign: 'right', color: '#666', fontSize: 12 }}>Twoje konto</div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => saveUserAdmin(u)}
                              disabled={busyUserIds.includes(u.id)}
                              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #999' }}
                            >{busyUserIds.includes(u.id) ? 'Zapisywanie…' : 'Zapisz'}</button>
                            <button
                              onClick={() => deleteUserAdmin(u)}
                              disabled={busyUserIds.includes(u.id)}
                              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #c44', color: '#c00' }}
                            >{busyUserIds.includes(u.id) ? 'Usuwanie…' : 'Usuń'}</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Uwaga: usunięcie użytkownika usuwa także jego wpisy, komentarze i polubienia.</p>
        </section>
      )}

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
    case 'invalid_role': return 'Nieprawidłowa rola';
  case 'cannot_delete_self': return 'Nie możesz usunąć własnego konta';
    default: return 'Wystąpił błąd';
  }
}

