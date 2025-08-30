import { Router } from 'express';
import { Post, PostLike, Movie, PostMovie } from '../models/index.js';
import { v4 as uuid } from 'uuid';
import { Comment, User } from '../models/index.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { verifyAccess } from '../lib/jwt.js';
const router = Router();

// Get all posts
router.get('/', async (req, res) => {
		try {
							 const posts = await Post.findAll({
								 order: [['created_at', 'DESC']],
								 include: [
									 { model: User, attributes: ['id', 'username'] },
									 { model: Movie, as: 'movies', attributes: ['id','title','year','director'], through: { attributes: [] } },
								 ]
							 });

								 let userId = null;
								 const hdr = req.headers.authorization || '';
								 const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
								 if (token) {
									 try { const payload = verifyAccess(token); userId = payload.sub; } catch {}
								 }

								 const result = await Promise.all(posts.map(async post => {
									 let likedByMe = false;
									 if (userId) {
										 const like = await PostLike.findOne({ where: { user_id: userId, post_id: post.id } });
										 likedByMe = !!like;
									 }
									 return ({
										 id: post.id,
										 title: post.title,
										 created_at: post.created_at,
										 likes_count: post.likes_count ?? 0,
										 likedByMe,
										 author: post.User ? { id: post.User.id, username: post.User.username } : null,
										 movies: Array.isArray(post.movies) ? post.movies.map(m => ({ id: m.id, title: m.title, year: m.year, director: m.director ?? null })) : [],
									 });
								 }));
								 res.json(result);
		} catch (err) {
				res.status(500).json({ error: 'server_error' });
		}
});
// Create new post
		router.post('/', requireAuth, async (req, res) => {
		       const { title, body, movieIds } = req.body;
       const userId = req.user?.sub;
       const username = req.user?.username;
       if (!title || !body || !userId || !username) return res.status(400).json({ error: 'missing_fields' });
       try {
			       const post = await Post.create({ title, body, author_id: userId });
			       // attach up to 10 movies if provided
			       if (Array.isArray(movieIds) && movieIds.length) {
			         const uniqueIds = [...new Set(movieIds)].slice(0, 10);
			         const movies = await Movie.findAll({ where: { id: uniqueIds } });
			         await post.setMovies(movies);
			       }
	       // Attach author info to response
			       const withMovies = await Post.findByPk(post.id, { include: [ { model: Movie, as: 'movies', attributes: ['id','title','year','director'], through: { attributes: [] } } ] });
			       res.status(201).json({
		 id: post.id,
		 title: post.title,
		 body: post.body,
		 created_at: post.created_at,
				 author: { id: userId, username },
				 movies: withMovies?.movies?.map(m => ({ id: m.id, title: m.title, year: m.year, director: m.director ?? null })) ?? [],
	       });
       } catch (err) {
	       res.status(500).json({ error: 'server_error' });
       }
});

// Get single post by id
router.get('/:id', async (req, res) => {
	try {
		const post = await Post.findByPk(req.params.id, { include: [
			{ model: User, attributes: ['id', 'username'] },
			{ model: Movie, as: 'movies', attributes: ['id','title','year','director'], through: { attributes: [] } }
		] });
		if (!post) return res.status(404).json({ error: 'not_found' });

		let userId = null;
		const hdr = req.headers.authorization || '';
		const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
		if (token) {
		  try { const payload = verifyAccess(token); userId = payload.sub; } catch {}
		}

		let likedByMe = false;
		if (userId) {
		  const like = await PostLike.findOne({ where: { user_id: userId, post_id: post.id } });
		  likedByMe = !!like;
		}

		res.json({
		  id: post.id,
		  title: post.title,
		  body: post.body,
		  created_at: post.created_at,
		  author_id: post.author_id,
		  author: post.User ? { id: post.User.id, username: post.User.username } : null,
		  likes_count: post.likes_count ?? 0,
		  likedByMe,
		  movies: Array.isArray(post.movies) ? post.movies.map(m => ({ id: m.id, title: m.title, year: m.year, director: m.director ?? null })) : [],
		});
	} catch (err) {
		res.status(500).json({ error: 'server_error' });
	}
});

// Update post (author, moderator, admin)
router.put('/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
		const post = await Post.findByPk(id);
		if (!post) return res.status(404).json({ error: 'not_found' });

		const me = req.user; // { sub, role, username }
		const canModify = me && (me.sub === post.author_id || me.role === 'admin' || me.role === 'moderator');
		if (!canModify) return res.status(403).json({ error: 'forbidden' });

		let { title, body, movieIds } = req.body || {};
		if (typeof title === 'string') title = title.trim();
		if (typeof body === 'string') body = body.trim();
		if (!title && !body && !Array.isArray(movieIds)) return res.status(400).json({ error: 'nothing_to_update' });

		if (title) post.title = title;
		if (body) post.body = body;
		await post.save();

		// update linked movies if provided
		if (Array.isArray(movieIds)) {
			const uniqueIds = [...new Set(movieIds)].slice(0, 10);
			const movies = await Movie.findAll({ where: { id: uniqueIds } });
			await post.setMovies(movies);
		}

		// reload with movies
		const withMovies = await Post.findByPk(post.id, { include: [{ model: Movie, as: 'movies', attributes: ['id','title','year','director'], through: { attributes: [] } }] });
		return res.json({
			id: post.id,
			title: post.title,
			body: post.body,
			created_at: post.created_at,
			author_id: post.author_id,
			likes_count: post.likes_count ?? 0,
			movies: withMovies?.movies?.map(m => ({ id: m.id, title: m.title, year: m.year, director: m.director ?? null })) ?? [],
		});
	} catch (e) {
		console.error('PUT /api/posts/:id error', e);
		return res.status(500).json({ error: 'internal' });
	}
});

// Delete post (author, moderator, admin)
router.delete('/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
		const post = await Post.findByPk(id);
		if (!post) return res.status(404).json({ error: 'not_found' });

		const me = req.user; // { sub, role, username }
		const canModify = me && (me.sub === post.author_id || me.role === 'admin' || me.role === 'moderator');
		if (!canModify) return res.status(403).json({ error: 'forbidden' });

		// Remove related rows first
		await Comment.destroy({ where: { post_id: id } });
		await PostLike.destroy({ where: { post_id: id } });
		await PostMovie.destroy({ where: { post_id: id } });
		await post.destroy();
		return res.status(204).end();
	} catch (e) {
		console.error('DELETE /api/posts/:id error', e);
		return res.status(500).json({ error: 'internal' });
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

	// PUT /api/posts/:postId/comments/:commentId — update comment (author/mod/admin)
	router.put('/:postId/comments/:commentId', requireAuth, async (req, res) => {
		try {
			const { postId, commentId } = req.params;
			let { body } = req.body || {};
			if (typeof body !== 'string' || !body.trim()) {
				return res.status(400).json({ error: 'comment_required' });
			}

			const post = await Post.findByPk(postId);
			if (!post) return res.status(404).json({ error: 'not_found' });

			const comment = await Comment.findByPk(commentId, { include: [{ model: User, attributes: ['id','username'] }] });
			if (!comment || comment.post_id !== postId) return res.status(404).json({ error: 'not_found' });

			const me = req.user; // { sub, role }
			const canModify = me && (me.sub === comment.user_id || me.role === 'admin' || me.role === 'moderator');
			if (!canModify) return res.status(403).json({ error: 'forbidden' });

			comment.body = body.trim();
			await comment.save();

			return res.json({
				id: comment.id,
				body: comment.body,
				author: comment.User ? { id: comment.User.id, username: comment.User.username } : null,
				createdAt: comment.created_at ? new Date(comment.created_at).toISOString() : null,
			});
		} catch (e) {
			console.error('PUT /api/posts/:postId/comments/:commentId error', e);
			return res.status(500).json({ error: 'internal' });
		}
	});

	// DELETE /api/posts/:postId/comments/:commentId — delete comment (author/mod/admin)
	router.delete('/:postId/comments/:commentId', requireAuth, async (req, res) => {
		try {
			const { postId, commentId } = req.params;
			const post = await Post.findByPk(postId);
			if (!post) return res.status(404).json({ error: 'not_found' });

			const comment = await Comment.findByPk(commentId);
			if (!comment || comment.post_id !== postId) return res.status(404).json({ error: 'not_found' });

			const me = req.user; // { sub, role }
			const canModify = me && (me.sub === comment.user_id || me.role === 'admin' || me.role === 'moderator');
			if (!canModify) return res.status(403).json({ error: 'forbidden' });

			await comment.destroy();
			return res.status(204).end();
		} catch (e) {
			console.error('DELETE /api/posts/:postId/comments/:commentId error', e);
			return res.status(500).json({ error: 'internal' });
		}
	});

export default router;

// ===== Likes =====
router.post('/:id/like', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.sub;
		const post = await Post.findByPk(id);
		if (!post) return res.status(404).json({ error: 'not_found' });

		const existing = await PostLike.findOne({ where: { user_id: userId, post_id: id } });
		if (existing) return res.status(200).json({ ok: true, liked: true, likesCount: post.likes_count });

		await PostLike.create({ user_id: userId, post_id: id });
		post.likes_count = (post.likes_count ?? 0) + 1;
		await post.save();
		return res.json({ ok: true, liked: true, likesCount: post.likes_count });
	} catch (e) {
		console.error('POST /api/posts/:id/like error', e);
		return res.status(500).json({ error: 'internal' });
	}
});

router.delete('/:id/like', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user.sub;
		const post = await Post.findByPk(id);
		if (!post) return res.status(404).json({ error: 'not_found' });

		const existing = await PostLike.findOne({ where: { user_id: userId, post_id: id } });
		if (!existing) return res.status(200).json({ ok: true, liked: false, likesCount: post.likes_count });

		await existing.destroy();
		post.likes_count = Math.max(0, (post.likes_count ?? 0) - 1);
		await post.save();
		return res.json({ ok: true, liked: false, likesCount: post.likes_count });
	} catch (e) {
		console.error('DELETE /api/posts/:id/like error', e);
		return res.status(500).json({ error: 'internal' });
	}
});
