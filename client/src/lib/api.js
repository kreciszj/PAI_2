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
    try { setTokens({ accessToken: null, refreshToken: null }); } catch {}
    try { localStorage.removeItem('tokens'); } catch {}
    if (!location.pathname.startsWith('/login')) location.assign('/login');
    return res;
  }

  const { accessToken: newAccess } = await rr.json();
  setTokens({ accessToken: newAccess, refreshToken });

  res = await doFetch(newAccess);
  return res;
}
