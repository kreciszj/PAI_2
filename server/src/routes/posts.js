import { Router } from 'express';
import { Post } from '../models/index.js';
import { v4 as uuid } from 'uuid';
import { Comment, User } from '../models/index.js';
import { requireAuth } from '../middleware/requireAuth.js';
const router = Router();

// Get all posts
router.get('/', async (_req, res) => {
	try {
						 const posts = await Post.findAll({
							 order: [['created_at', 'DESC']],
							 include: [{ model: User, as: 'User', attributes: ['id', 'username'] }]
						 });
						 const result = posts.map(post => ({
							 id: post.id,
							 title: post.title,
							 created_at: post.created_at,
							 author: post.User ? { id: post.User.id, username: post.User.username } : null
						 }));
						 res.json(result);
	} catch (err) {
		res.status(500).json({ error: 'server_error' });
	}
});
// Create new post
router.post('/', requireAuth, async (req, res) => {
       const { title, body } = req.body;
       const userId = req.user?.sub;
       const username = req.user?.username;
       if (!title || !body || !userId || !username) return res.status(400).json({ error: 'missing_fields' });
       try {
	       const post = await Post.create({ title, body, author_id: userId });
	       // Attach author info to response
	       res.status(201).json({
		 id: post.id,
		 title: post.title,
		 body: post.body,
		 created_at: post.created_at,
		 author: { id: userId, username }
	       });
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

// GET /api/posts/:id/comments
router.get('/:id/comments', async (req, res) => {
	try {
		const { id } = req.params;
		const post = await Post.findByPk(id);
		if (!post) return res.status(404).json({ error: 'not_found' });

		const commentsRows = await Comment.findAll({
			where: { post_id: id },
			include: [{ model: User, attributes: ['id', 'username'] }],
			order: [['created_at', 'DESC']],
		});

			const comments = commentsRows.map(c => ({
				id: c.id,
				body: c.body,
				author: c.User ? { id: c.User.id, username: c.User.username } : null,
				createdAt: c.created_at ? new Date(c.created_at).toISOString() : null,
			}));

		res.json(comments);
	} catch (e) {
		console.error('GET /api/posts/:id/comments error', e);
		res.status(500).json({ error: 'internal' });
	}
});

// POST /api/posts/:id/comments
router.post('/:id/comments', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
		const { body } = req.body || {};
		if (!body || typeof body !== 'string' || !body.trim()) {
			return res.status(400).json({ error: 'comment_required' });
		}
		const post = await Post.findByPk(id);
		if (!post) return res.status(404).json({ error: 'not_found' });

		const comment = await Comment.create({
			id: uuid(), user_id: req.user.sub, post_id: id, body: body.trim(),
		});

		const withUser = await Comment.findByPk(comment.id, {
			include: [{ model: User, attributes: ['id', 'username'] }],
		});

			res.status(201).json({
				id: withUser.id,
				body: withUser.body,
				author: withUser.User ? { id: withUser.User.id, username: withUser.User.username } : null,
				createdAt: withUser.created_at ? new Date(withUser.created_at).toISOString() : null,
			});
	} catch (e) {
		console.error('POST /api/posts/:id/comments error', e);
		res.status(500).json({ error: 'internal' });
	}
});

export default router;
