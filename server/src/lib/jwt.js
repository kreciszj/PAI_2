import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username },
    config.jwt.accessSecret, { expiresIn: config.jwt.accessTtlSec });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshTtlSec });
}

export function verifyAccess(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

export function verifyRefresh(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}
