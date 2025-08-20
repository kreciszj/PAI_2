const API = import.meta.env.VITE_API_URL;

export async function apiFetch(path, { method='GET', body, accessToken, refreshToken, setTokens } = {}) {
  const doFetch = (token) => fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  let res = await doFetch(accessToken);
  if (res.status !== 401) return res;
  if (!refreshToken || !setTokens) return res;
  const rr = await fetch(`${API}/api/auth/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!rr.ok) {
    // refresh nie działa -> wyloguj i na login
    try { setTokens({ accessToken: null, refreshToken: null }); } catch {}
    try { localStorage.removeItem('tokens'); } catch {}
    // pozwól wyżej wykryć 401 (np. Private przekieruje), albo od razu przejdź:
    if (!location.pathname.startsWith('/login')) location.assign('/login');
    return res; // 401
  }

  const { accessToken: newAccess } = await rr.json();
  setTokens({ accessToken: newAccess, refreshToken });

  // retry
  res = await doFetch(newAccess);
  return res;
}
