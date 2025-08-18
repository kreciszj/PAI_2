import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { initDb } from './models/index.js';
import { seed } from './bootstrap/seed.js';
import authRouter from './routes/auth.js';

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: false }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

await initDb();
await seed();

app.listen(config.port, () => {
  console.log(`API on http://localhost:${config.port}`);
});
