import { verifyAccess } from '../lib/jwt.js';
import { User } from '../models/index.js';

export async function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    const payload = verifyAccess(token);
    const user = await User.findByPk(payload.sub);
    if (!user) return res.status(401).json({ error: 'user_missing' });

    req.user = { sub: user.id, role: user.role, username: user.username };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_or_expired_token' });
  }
}
