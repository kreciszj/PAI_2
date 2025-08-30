import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { initDb } from './models/index.js';
import { seed } from './bootstrap/seed.js';
import authRouter from './routes/auth.js';
import moviesRouter from './routes/movies.js';
import postsRouter from './routes/posts.js';
import path from 'path';

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: false }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/posts', postsRouter);
app.use('/uploads', (await import('express')).default.static(path.resolve('uploads')));


await initDb();
await seed();

app.listen(config.port, () => {
  console.log(`API on http://localhost:${config.port}`);
});
