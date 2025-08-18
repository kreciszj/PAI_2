import { Router } from 'express';
const router = Router();

router.get('/', async (_req, res) => res.json([]));
router.get('/:id', async (_req, res) => res.status(404).json({ error: 'not_found' }));

export default router;
