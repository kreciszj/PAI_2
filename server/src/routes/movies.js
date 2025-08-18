import { Router } from 'express';
import { Movie } from '../models/index.js';

const router = Router();

// GET /api/movies
router.get('/', async (_req, res) => {
  const rows = await Movie.findAll({ order: [['year','DESC']] });
  res.json(rows.map(m => ({
    id: m.id, title: m.title, year: m.year, description: m.description
  })));
});

// GET /api/movies/:id
router.get('/:id', async (req, res) => {
  const m = await Movie.findByPk(req.params.id);
  if (!m) return res.status(404).json({ error: 'not_found' });
  res.json({ id: m.id, title: m.title, year: m.year, description: m.description });
});

export default router;
