import {useEffect, useState} from 'react';
import {useAuth} from '../contexts/AuthContext';
import {apiFetch} from '../lib/api';
import {Link} from 'react-router-dom';

function truncateText(text, maxLength) {
    if (!text) return '';
    const sliceLength = Math.max(0, maxLength - 3);
    return text.length > maxLength ? text.slice(0, sliceLength) + '...' : text;
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 10 - fullStars - halfStar;
    return '★'.repeat(fullStars) + '⯪'.repeat(halfStar) + '✩'.repeat(emptyStars);
}

export default function MoviesTop() {
    const {accessToken, refreshToken, setTokens} = useAuth();
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const r = await apiFetch(`/api/movies/top?page=${page}`, {accessToken, refreshToken, setTokens});
                if (r.ok) {
                    const data = await r.json();
                    setRows(data.items);
                    setTotalPages(data.totalPages);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [accessToken, refreshToken, setTokens, page]);

    return (
        <div className="grid gap-4">
            <h1 className="text-2xl font-semibold">Ranking filmów</h1>

            {loading && <p>Ładowanie...</p>}

            <div className="flex flex-col gap-4">
                {rows.map((m, index) => (
                    <Link
                        key={m.id}
                        to={`/movies/${m.id}`}
                        className="card hover:shadow-md transition p-4 flex gap-4"
                    >
                        <div className="flex flex-col gap-1 w-1/3">
                            <h2 className="text-lg font-semibold">
                                {index + 1 + (page - 1) * 10}. {m.title}
                                {m.year && <span className="text-sm text-neutral-500 ml-2">({m.year})</span>}
                            </h2>
                            {m.director && <p className="text-sm text-neutral-500">{m.director}</p>}
                            {m.averageRating != null && (
                                <p className="text-2xl font-bold text-yellow-600">
                                    {m.averageRating}/10 {renderStars(m.averageRating)}
                                </p>
                            )}
                        </div>

                        <p className="text-sm text-neutral-600 dark:text-neutral-400 flex-1">
                            {truncateText(m.description, 150)}
                        </p>
                    </Link>
                ))}
            </div>

            <div className="flex justify-center gap-2 mt-4 items-center">
                <button
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                >
                    Poprzednia
                </button>
                <span>{page} / {totalPages}</span>
                <button
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                >
                    Następna
                </button>
            </div>
        </div>
    );
}
