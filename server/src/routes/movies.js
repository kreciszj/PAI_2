import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { fn, col } from 'sequelize';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Movie, Rating, Comment, User, PostMovie } from '../models/index.js';
import { requireAuth } from '../middleware/requireAuth.js';


const router = Router();

// === upload setup ===
const uploadRoot = path.join(process.cwd(), 'uploads');
const coversDir = path.join(uploadRoot, 'covers');
fs.mkdirSync(coversDir, { recursive: true });

function isAdmin(req) { return req.user?.role === 'admin'; }

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, coversDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, `${req.params.id}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('invalid_file_type'));
  }
});


// GET /api/movies
router.get('/', async (req, res) => {
  const pageQuery = req.query.page;
  let items, count, totalPages, page;

  if (pageQuery) {
    page = parseInt(pageQuery, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const result = await Movie.findAndCountAll({
      order: [['year', 'DESC']],
      limit,
      offset,
    });

    count = result.count;
    items = result.rows;
    totalPages = Math.ceil(count / limit);
  } else {
    // brak page → zwracamy wszystkie
    items = await Movie.findAll({ order: [['year', 'DESC']] });
    count = items.length;
    page = 1;
    totalPages = 1;
  }

  res.json({
    page,
    totalPages,
    totalItems: count,
    items: items.map(m => ({
      id: m.id,
      title: m.title,
      year: m.year,
      director: m.director ?? null,
      description: m.description ?? null,
      coverUrl: m.cover_url ?? null,
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
        coverUrl: m.cover_url ?? null,
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
      createdAt: c.created_at ?? c.createdAt,
    }));

    res.json({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      director: movie.director,
      description: movie.description,
      coverUrl: movie.cover_url ?? null,
      averageRating,
      comments,
    });
  } catch (e) {
    console.error('GET /api/movies/:id error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/movies (admin) — create
router.post('/', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
  try {
    const { title, year, director, description, coverUrl } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title_required' });
    const movie = await Movie.create({
      id: uuid(),
      title: String(title).trim(),
      year: year ?? null,
      director: director ?? null,
      description: description ?? null,
      cover_url: coverUrl ?? null,
    });
    res.status(201).json({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      director: movie.director,
      description: movie.description,
      coverUrl: movie.cover_url,
    });
  } catch (e) {
    console.error('POST /api/movies error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// PUT /api/movies/:id (admin) — update
router.put('/:id', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
  try {
    const movie = await Movie.findByPk(req.params.id);
    if (!movie) return res.status(404).json({ error: 'not_found' });
    const { title, year, director, description, coverUrl } = req.body || {};

    if (typeof title === 'string') movie.title = title.trim();
    if (typeof year !== 'undefined') movie.year = year;
    if (typeof director !== 'undefined') movie.director = director;
    if (typeof description !== 'undefined') movie.description = description;
    if (typeof coverUrl !== 'undefined') movie.cover_url = coverUrl || null;

    await movie.save();
    res.json({
      id: movie.id, title: movie.title, year: movie.year, director: movie.director,
      description: movie.description, coverUrl: movie.cover_url,
    });
  } catch (e) {
    console.error('PUT /api/movies/:id error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// DELETE /api/movies/:id (admin) — delete
router.delete('/:id', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
  try {
    const { id } = req.params;
    const movie = await Movie.findByPk(id);
    if (!movie) return res.status(404).json({ error: 'not_found' });

    await Rating.destroy({ where: { movie_id: id } });
    await Comment.destroy({ where: { movie_id: id } });
    await PostMovie.destroy({ where: { movie_id: id } });

    // remove file if stored locally
    if (movie.cover_url && movie.cover_url.startsWith('/uploads/covers/')) {
      const abs = path.join(uploadRoot, 'covers', path.basename(movie.cover_url));
      fs.promises.unlink(abs).catch(() => {});
    }

    await movie.destroy();
    res.status(204).end();
  } catch (e) {
    console.error('DELETE /api/movies/:id error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// POST /api/movies/:id/cover (admin) — upload file
router.post('/:id/cover', requireAuth, (req, res, next) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
  next();
}, upload.single('file'), async (req, res) => {
  try {
    const movie = await Movie.findByPk(req.params.id);
    if (!movie) return res.status(404).json({ error: 'not_found' });
    if (!req.file) return res.status(400).json({ error: 'file_required' });

    const newRel = `/uploads/covers/${req.file.filename}`;
    if (movie.cover_url && movie.cover_url.startsWith('/uploads/covers/') && movie.cover_url !== newRel) {
      const oldAbs = path.join(uploadRoot, 'covers', path.basename(movie.cover_url));
      fs.promises.unlink(oldAbs).catch(() => {});
    }

    movie.cover_url = newRel;
    await movie.save();
    res.json({ coverUrl: movie.cover_url });
  } catch (e) {
    console.error('POST /api/movies/:id/cover error', e);
    res.status(500).json({ error: 'internal' });
  }
});

// ===== Komentarze i oceny (bez zmian merytorycznych) =====

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
    if (!row) row = await Rating.create({ id: uuid(), user_id: userId, movie_id: id, value: v });
    else { row.value = v; await row.save(); }

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
      createdAt: c.created_at ?? c.createdAt,
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
      createdAt: withUser.created_at ?? withUser.createdAt,
    });
  } catch (e) {
    console.error('POST /api/movies/:id/comments error', e);
    res.status(500).json({ error: 'internal' });
  }
});

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

    return res.json({ id: comment.id, body: comment.body, author: comment.User ? { id: comment.User.id, username: comment.User.username } : null, createdAt: comment.created_at ?? comment.createdAt });
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

export default router;
