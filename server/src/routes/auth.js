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

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const u = username.trim();
  if (u.length < 3 || u.length > 32) return res.status(400).json({ error: 'username_length_3_32' });
  if (password.length < 6) return res.status(400).json({ error: 'password_min_6' });

  const exists = await User.findOne({ where: { username: u } });
  if (exists) return res.status(409).json({ error: 'username_taken' });

  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({ id: uuid(), username: u, password_hash: hash, role: 'user' });

  return res.status(201).json({ id: user.id, username: user.username });
});

// POST /api/auth/login
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

// POST /api/auth/refresh
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

// POST /api/auth/logout
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

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { username, currentPassword, newPassword } = req.body || {};

  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: 'user_not_found' });

  let changed = false;

  if (typeof username !== 'undefined' && username !== null) {
    const u = String(username).trim();
    if (u.length < 3 || u.length > 32) return res.status(400).json({ error: 'username_length_3_32' });
    if (u !== user.username) {
      const exists = await User.findOne({ where: { username: u } });
      if (exists) return res.status(409).json({ error: 'username_taken' });
      user.username = u;
      changed = true;
    }
  }

  if (typeof newPassword !== 'undefined' && newPassword !== null) {
    const np = String(newPassword);
    if (np.length < 6) return res.status(400).json({ error: 'password_min_6' });
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'current_password_required' });
    }
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_current_password' });
    const hash = await bcrypt.hash(np, 12);
    user.password_hash = hash;
    changed = true;
  }

  if (!changed) return res.status(400).json({ error: 'nothing_to_update' });

  await user.save();

  const access = signAccessToken(user);
  return res.json({ id: user.id, username: user.username, role: user.role, accessToken: access });
});

export default router;
