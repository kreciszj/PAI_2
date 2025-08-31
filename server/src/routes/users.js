import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { User, RefreshToken, Comment, Rating, Post, PostLike, PostMovie } from '../models/index.js';

const router = Router();

function ensureAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}

// GET /api/users — list users (admin only)
router.get('/', requireAuth, ensureAdmin, async (_req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id', 'username', 'role', 'bio', 'created_at', 'updated_at'] });
    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      bio: u.bio ?? null,
      created_at: u.get('created_at') ?? null,
      updated_at: u.get('updated_at') ?? null,
    }));
    res.json(result);
  } catch (e) {
    console.error('GET /api/users error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// PATCH /api/users/:id — update username/role/bio (admin only)
router.patch('/:id', requireAuth, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, bio } = req.body || {};

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'not_found' });

    let changed = false;

    if (typeof username !== 'undefined') {
      const u = String(username).trim();
      if (u.length < 3 || u.length > 32) return res.status(400).json({ error: 'username_length_3_32' });
      if (u !== user.username) {
        const exists = await User.findOne({ where: { username: u } });
        if (exists) return res.status(409).json({ error: 'username_taken' });
        user.username = u; changed = true;
      }
    }

    if (typeof role !== 'undefined') {
      // Prevent changing own role
      if (req.user?.sub === id) {
        return res.status(400).json({ error: 'cannot_change_own_role' });
      }
      const allowed = ['user', 'moderator', 'admin'];
      const r = String(role);
      if (!allowed.includes(r)) return res.status(400).json({ error: 'invalid_role' });
      if (user.role !== r) { user.role = r; changed = true; }
    }

    if (typeof bio !== 'undefined') {
      const b = bio === null ? null : String(bio);
      if (user.bio !== b) { user.bio = b; changed = true; }
    }

    if (!changed) return res.status(400).json({ error: 'nothing_to_update' });
    await user.save();
    return res.json({ id: user.id, username: user.username, role: user.role, bio: user.bio ?? null });
  } catch (e) {
    console.error('PATCH /api/users/:id error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// DELETE /api/users/:id — delete user and related data (admin only)
router.delete('/:id', requireAuth, ensureAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Prevent self-deletion
    if (req.user?.sub === id) {
      return res.status(400).json({ error: 'cannot_delete_self' });
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'not_found' });

    // Delete authored posts and their relations
    const posts = await Post.findAll({ where: { author_id: id } });
    const postIds = posts.map(p => p.id);
    if (postIds.length) {
      await Comment.destroy({ where: { post_id: postIds } });
      await PostLike.destroy({ where: { post_id: postIds } });
      await PostMovie.destroy({ where: { post_id: postIds } });
      await Post.destroy({ where: { id: postIds } });
    }

    // Delete user activity on others
    await Comment.destroy({ where: { user_id: id } });
    await Rating.destroy({ where: { user_id: id } });
    await PostLike.destroy({ where: { user_id: id } });
    await RefreshToken.destroy({ where: { user_id: id } });

    await user.destroy();
    return res.status(204).end();
  } catch (e) {
    console.error('DELETE /api/users/:id error', e);
    return res.status(500).json({ error: 'internal' });
  }
});

export default router;
