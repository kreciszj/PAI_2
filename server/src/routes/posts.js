import { Router } from 'express';
import { Post } from '../models/index.js';
const router = Router();

// Get all posts
router.get('/', async (_req, res) => {
	try {
		const posts = await Post.findAll({ order: [['created_at', 'DESC']] });
		res.json(posts);
	} catch (err) {
		res.status(500).json({ error: 'server_error' });
	}
});
// Create new post
router.post('/', async (req, res) => {
	const { title, body } = req.body;
	if (!title || !body) return res.status(400).json({ error: 'missing_fields' });
	try {
		const post = await Post.create({ title, body });
		res.status(201).json(post);
	} catch (err) {
		res.status(500).json({ error: 'server_error' });
	}
});

// Get single post by id
router.get('/:id', async (req, res) => {
	try {
		const post = await Post.findByPk(req.params.id);
		if (!post) return res.status(404).json({ error: 'not_found' });
		res.json(post);
	} catch (err) {
		res.status(500).json({ error: 'server_error' });
	}
});

export default router;
