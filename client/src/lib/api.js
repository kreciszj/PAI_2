const API = import.meta.env.VITE_API_URL;

export async function apiFetch(path, { method='GET', body, accessToken, refreshToken, setTokens } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status !== 401) return res;

  // spróbuj odświeżyć
  if (!refreshToken || !setTokens) return res;
  const rr = await fetch(`${API}/api/auth/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!rr.ok) return res;

  const { accessToken: newAccess } = await rr.json();
  setTokens({ accessToken: newAccess, refreshToken });
  // ponów oryginalne żądanie
  return fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newAccess}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}
