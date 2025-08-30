import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { initDb } from './models/index.js';
import { seed } from './bootstrap/seed.js';
import authRouter from './routes/auth.js';
import moviesRouter from './routes/movies.js';
import postsRouter from './routes/posts.js';
import path from 'path';
import usersRouter from './routes/users.js';

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: false }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/posts', postsRouter);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), { maxAge: '7d' }));
app.use('/api/users', usersRouter);

await initDb();
await seed();

app.listen(config.port, () => {
  console.log(`API on http://localhost:${config.port}`);
});
