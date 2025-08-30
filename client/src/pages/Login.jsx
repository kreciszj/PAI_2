import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
const API = import.meta.env.VITE_API_URL;

export default function Login() {
    const { setTokens } = useAuth();
    const [username, setU] = useState('');
    const [password, setP] = useState('');
    const [error, setE] = useState(null);

    async function submit(e) {
        e.preventDefault();
        setE(null);
        const res = await fetch(`${API}/api/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) { setE('Błędne dane'); return; }
        const data = await res.json();
        setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        location.href = '/';
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
            <div className="container-page">
                <div className="flex justify-end mb-4">
                    <ThemeToggle />
                </div>
                <div className="max-w-md mx-auto card">
                    <h1 className="text-xl font-semibold mb-4">Logowanie</h1>
                    <form onSubmit={submit} className="grid gap-3">
                        <input className="input" placeholder="username" value={username} onChange={e => setU(e.target.value)} />
                        <input className="input" placeholder="password" type="password" value={password} onChange={e => setP(e.target.value)} />
                        {error && <div className="text-sm text-red-500">{error}</div>}
                        <button type="submit" className="btn">Zaloguj</button>
                    </form>
                    <div className="mt-3 text-center">
                        <Link to="/register" className="btn-ghost">Nie masz konta? Zarejestruj się</Link>
                    </div>
                </div>
            </div>
        </div>
    );

}
