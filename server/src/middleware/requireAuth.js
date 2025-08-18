import { verifyAccess } from '../lib/jwt.js';

export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try {
    req.user = verifyAccess(token);
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_or_expired_token' });
  }
}
