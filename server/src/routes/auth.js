import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { User, RefreshToken } from '../models/index.js';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../lib/jwt.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { config } from '../config/index.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username_and_password_required' });
  const exists = await User.findOne({ where: { username } });
  if (exists) return res.status(409).json({ error: 'username_taken' });

  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({ id: uuid(), username, password_hash: hash, role: 'user' });
  return res.status(201).json({ id: user.id, username: user.username });
});

// POST /api/auth/login -> access + refresh
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await User.findOne({ where: { username } });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const access = signAccessToken(user);
  const refresh = signRefreshToken(user);

  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlSec * 1000);
  await RefreshToken.create({ token: refresh, user_id: user.id, expires_at: expiresAt });

  return res.json({ accessToken: access, refreshToken: refresh });
});

// POST /api/auth/refresh -> nowy access token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'missing_refresh' });

  const row = await RefreshToken.findByPk(refreshToken);
  if (!row || row.revoked_at) return res.status(401).json({ error: 'refresh_invalid' });

  try {
    const payload = verifyRefresh(refreshToken);
    const userId = payload.sub;
    const user = await User.findByPk(userId);
    if (!user) return res.status(401).json({ error: 'user_missing' });
    const access = signAccessToken(user);
    return res.json({ accessToken: access });
  } catch {
    return res.status(401).json({ error: 'refresh_expired' });
  }
});

// POST /api/auth/logout -> unieważnij refresh
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'missing_refresh' });
  await RefreshToken.update({ revoked_at: new Date() }, { where: { token: refreshToken } });
  return res.status(204).end();
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  return res.json({ id: req.user.sub, username: req.user.username, role: req.user.role });
});

export default router;
