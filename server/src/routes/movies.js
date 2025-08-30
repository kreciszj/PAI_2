import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { fn, col } from 'sequelize';
import { Movie, Rating, Comment, User } from '../models/index.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// GET /api/movies
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1
    const limit = 10;
    const offset = (page - 1) * limit;

    const {count, rows} = await Movie.findAndCountAll({
        order: [['year', 'DESC']],
        limit,
        offset
    });

    res.json({
        page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        items: rows.map(m => ({
            id: m.id,
            title: m.title,
            year: m.year,
            director: m.director ?? null,
            description: m.description ?? null,
        })),
    });
});

// GET /api/movies/top
router.get('/top', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const {count, rows} = await Movie.findAndCountAll({
            limit,
            offset,
        });

        const items = await Promise.all(rows.map(async m => {
            const avgRow = await Rating.findOne({
                where: {movie_id: m.id},
                attributes: [[fn('avg', col('value')), 'avg']],
                raw: true,
            });
            const averageRating = avgRow?.avg != null ? Number(parseFloat(avgRow.avg).toFixed(2)) : null;

            return {
                id: m.id,
                title: m.title,
                year: m.year,
                director: m.director ?? null,
                description: m.description ?? null,
                averageRating,
            };
        }));

        items.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));

        res.json({
            page,
            totalPages: Math.ceil(count / limit),
            items,
        });
    } catch (e) {
        console.error('GET /api/movies/top error', e);
        res.status(500).json({error: 'internal'});
    }
});

// GET /api/movies/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findByPk(id);
    if (!movie) return res.status(404).json({ error: 'not_found' });

    const avgRow = await Rating.findOne({
      where: { movie_id: id },
      attributes: [[fn('avg', col('value')), 'avg']],
      raw: true,
    });
    const averageRating = avgRow?.avg != null ? Number(parseFloat(avgRow.avg).toFixed(2)) : null;

    const commentsRows = await Comment.findAll({
      where: { movie_id: id },
      include: [{ model: User, attributes: ['id', 'username'] }],
      order: [['created_at', 'DESC']],
    });

    const comments = commentsRows.map(c => ({
      id: c.id,
      body: c.body,
      author: c.User ? { id: c.User.id, username: c.User.username } : null,
      createdAt: c.createdAt,
    }));

    res.json({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      director: movie.director,
      description: movie.description,
      averageRating,
      comments,
    });
  } catch (e) {
    console.error('GET /api/movies/:id error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/movies/:id/rating
router.post('/:id/rating', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body || {};
    const v = Number(value);
    if (!Number.isInteger(v) || v < 1 || v > 10) return res.status(400).json({ error: 'rating_1_10' });

    const movie = await Movie.findByPk(id);
    if (!movie) return res.status(404).json({ error: 'not_found' });

    const userId = req.user.sub;
    let row = await Rating.findOne({ where: { user_id: userId, movie_id: id } });
    if (!row) {
      row = await Rating.create({ id: uuid(), user_id: userId, movie_id: id, value: v });
    } else {
      row.value = v;
      await row.save();
    }

    const avgRow = await Rating.findOne({
      where: { movie_id: id },
      attributes: [[fn('avg', col('value')), 'avg']],
      raw: true,
    });
    const averageRating = avgRow?.avg != null ? Number(parseFloat(avgRow.avg).toFixed(2)) : null;

    res.json({ ok: true, averageRating });
  } catch (e) {
    console.error('POST /api/movies/:id/rating error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// GET /api/movies/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findByPk(id);
    if (!movie) return res.status(404).json({ error: 'not_found' });

    const commentsRows = await Comment.findAll({
      where: { movie_id: id },
      include: [{ model: User, attributes: ['id', 'username'] }],
      order: [['created_at', 'DESC']],
    });

    const comments = commentsRows.map(c => ({
      id: c.id,
      body: c.body,
      author: c.User ? { id: c.User.id, username: c.User.username } : null,
      createdAt: c.createdAt,
    }));

    res.json(comments);
  } catch (e) {
    console.error('GET /api/movies/:id/comments error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/movies/:id/comments
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body || {};
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'comment_required' });
    }
    const movie = await Movie.findByPk(id);
    if (!movie) return res.status(404).json({ error: 'not_found' });

    const comment = await Comment.create({
      id: uuid(), user_id: req.user.sub, movie_id: id, body: body.trim(),
    });

    const withUser = await Comment.findByPk(comment.id, {
      include: [{ model: User, attributes: ['id', 'username'] }],
    });

    res.status(201).json({
      id: withUser.id,
      body: withUser.body,
      author: withUser.User ? { id: withUser.User.id, username: withUser.User.username } : null,
      createdAt: withUser.createdAt,
    });
  } catch (e) {
    console.error('POST /api/movies/:id/comments error', e);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
// Update movie comment
router.put('/:movieId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { movieId, commentId } = req.params;
    let { body } = req.body || {};
    if (typeof body !== 'string' || !body.trim()) return res.status(400).json({ error: 'comment_required' });

    const movie = await Movie.findByPk(movieId);
    if (!movie) return res.status(404).json({ error: 'not_found' });

    const comment = await Comment.findByPk(commentId, { include: [{ model: User, attributes: ['id','username'] }] });
    if (!comment || comment.movie_id !== movieId) return res.status(404).json({ error: 'not_found' });

    const me = req.user;
    const canModify = me && (me.sub === comment.user_id || me.role === 'admin' || me.role === 'moderator');
    if (!canModify) return res.status(403).json({ error: 'forbidden' });

    comment.body = body.trim();
    await comment.save();

    return res.json({ id: comment.id, body: comment.body, author: comment.User ? { id: comment.User.id, username: comment.User.username } : null, createdAt: comment.createdAt });
  } catch (e) {
    console.error('PUT /api/movies/:movieId/comments/:commentId error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// Delete movie comment
router.delete('/:movieId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { movieId, commentId } = req.params;
    const movie = await Movie.findByPk(movieId);
    if (!movie) return res.status(404).json({ error: 'not_found' });

    const comment = await Comment.findByPk(commentId);
    if (!comment || comment.movie_id !== movieId) return res.status(404).json({ error: 'not_found' });

    const me = req.user;
    const canModify = me && (me.sub === comment.user_id || me.role === 'admin' || me.role === 'moderator');
    if (!canModify) return res.status(403).json({ error: 'forbidden' });

    await comment.destroy();
    return res.status(204).end();
  } catch (e) {
    console.error('DELETE /api/movies/:movieId/comments/:commentId error', e);
    res.status(500).json({ error: 'internal' });
  }
});
