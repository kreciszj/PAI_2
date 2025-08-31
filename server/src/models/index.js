import { Sequelize, DataTypes } from 'sequelize';
import { config } from '../config/index.js';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.dbPath,
  logging: false,
});

// ===== MODELS =====
export const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.TEXT, allowNull: false },
  role: { type: DataTypes.ENUM('user', 'moderator', 'admin'), defaultValue: 'user' },
  bio: { type: DataTypes.TEXT },
}, { tableName: 'users', underscored: true });

export const RefreshToken = sequelize.define('RefreshToken', {
  token: { type: DataTypes.STRING, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  revoked_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'refresh_tokens', underscored: true });

export const Movie = sequelize.define('Movie', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING, allowNull: false },
  year: { type: DataTypes.INTEGER },
  director: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  cover_url: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'movies', underscored: true });

export const Rating = sequelize.define('Rating', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id: { type: DataTypes.UUID, allowNull: false },
  movie_id: { type: DataTypes.UUID, allowNull: false },
  value: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 10 } },
}, {
  tableName: 'ratings',
  underscored: true,
  indexes: [{ unique: true, fields: ['user_id', 'movie_id'] }],
});

export const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id: { type: DataTypes.UUID, allowNull: false },
  movie_id: { type: DataTypes.UUID, allowNull: true },
  post_id: { type: DataTypes.UUID, allowNull: true },
  body: { type: DataTypes.TEXT, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'comments', underscored: true });

export const Post = sequelize.define('Post', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  author_id: { type: DataTypes.UUID, allowNull: false },
  likes_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'posts', underscored: true });

export const PostLike = sequelize.define('PostLike', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id: { type: DataTypes.UUID, allowNull: false },
  post_id: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'post_likes',
  underscored: true,
  indexes: [{ unique: true, fields: ['user_id', 'post_id'] }],
});

export const PostMovie = sequelize.define('PostMovie', {
  post_id: { type: DataTypes.UUID, allowNull: false },
  movie_id: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'post_movies',
  underscored: true,
  timestamps: false,
  indexes: [{ unique: true, fields: ['post_id', 'movie_id'] }],
});

// ===== RELATIONS =====
User.hasMany(Post, { foreignKey: 'author_id' });
Post.belongsTo(User, { foreignKey: 'author_id' });
User.hasMany(RefreshToken, { foreignKey: 'user_id' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

Movie.hasMany(Rating, { foreignKey: 'movie_id' });
Rating.belongsTo(Movie, { foreignKey: 'movie_id' });
User.hasMany(Rating, { foreignKey: 'user_id' });
Rating.belongsTo(User, { foreignKey: 'user_id' });

Movie.hasMany(Comment, { foreignKey: 'movie_id' });
Comment.belongsTo(Movie, { foreignKey: 'movie_id' });
Post.hasMany(Comment, { foreignKey: 'post_id' });
Comment.belongsTo(Post, { foreignKey: 'post_id' });
User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(PostLike, { foreignKey: 'user_id' });
PostLike.belongsTo(User, { foreignKey: 'user_id' });
Post.hasMany(PostLike, { foreignKey: 'post_id' });
PostLike.belongsTo(Post, { foreignKey: 'post_id' });

Post.belongsToMany(Movie, { through: PostMovie, as: 'movies', foreignKey: 'post_id', otherKey: 'movie_id' });
Movie.belongsToMany(Post, { through: PostMovie, as: 'posts', foreignKey: 'movie_id', otherKey: 'post_id' });

// ===== INIT + SEED =====
export async function initDb() {
  if (config.resetDbOnBoot) {
    await sequelize.drop();
  }
  await sequelize.sync({ alter: true });
}
