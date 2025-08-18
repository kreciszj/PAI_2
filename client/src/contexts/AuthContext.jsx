import { createContext, useContext, useState, useMemo } from 'react';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [tokens, setTokens] = useState(() => {
    const raw = localStorage.getItem('tokens');
    return raw ? JSON.parse(raw) : { accessToken: null, refreshToken: null };
  });
  const save = (t) => { setTokens(t); localStorage.setItem('tokens', JSON.stringify(t)); };
  const clear = () => { setTokens({ accessToken: null, refreshToken: null }); localStorage.removeItem('tokens'); };

  const value = useMemo(() => ({ ...tokens, setTokens: save, clear }), [tokens]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
