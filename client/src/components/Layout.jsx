import { NavLink, Outlet, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

export default function Layout() {
  const { accessToken, refreshToken, setTokens, clear } = useAuth();
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await apiFetch('/api/auth/me', { accessToken, refreshToken, setTokens });
      if (r?.ok) setMe(await r.json());
    })();
  }, [accessToken, refreshToken, setTokens]);

  return (
    <div>
      <header style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 16px', borderBottom:'1px solid rgba(0,0,0,0.2)'
      }}>
        <nav style={{ display:'flex', gap:12 }}>
          <NavLink to="/" end> Baza filmów </NavLink>
          <NavLink to="/blogs"> Blogi </NavLink>
          <NavLink to="/my-blog"> Mój Blog </NavLink>
        </nav>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {me && <Link to="/settings">@{me.username}</Link>}
          <button onClick={clear}>Wyloguj</button>
        </div>
      </header>
      <main style={{ padding:16 }}>
        <Outlet />
      </main>
    </div>
  );
}
