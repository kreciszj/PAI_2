import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Link } from 'react-router-dom';

export default function Movies() {
    const { accessToken, refreshToken, setTokens } = useAuth();
    const [rows, setRows] = useState([]);

    useEffect(() => {
        (async () => {
            const r = await apiFetch('/api/movies', { accessToken, refreshToken, setTokens });
            if (r.ok) setRows(await r.json());
        })();
    }, [accessToken, refreshToken, setTokens]);

    return (
        <div className="grid gap-4">
            <h1 className="text-2xl font-semibold">Baza filmów</h1>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map(m => (
                    <Link key={m.id} to={`/movies/${m.id}`} className="card hover:shadow-md transition">
                        <h2 className="text-lg font-semibold">
                            {m.title} {m.year ? <span className="text-neutral-500">({m.year})</span> : null}
                        </h2>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {m.description || 'Brak opisu'}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
