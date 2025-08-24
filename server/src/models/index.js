import { Sequelize, DataTypes } from 'sequelize';
import { config } from '../config/index.js';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.dbPath,
  logging: false,
});

// ===== MODELS =====
export const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true },
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.TEXT, allowNull: false },
  role: { type: DataTypes.ENUM('user','moderator','admin'), defaultValue: 'user' },
  bio: { type: DataTypes.TEXT },
}, { tableName: 'users', underscored: true });

export const RefreshToken = sequelize.define('RefreshToken', {
  token: { type: DataTypes.STRING, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  revoked_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'refresh_tokens', underscored: true });

export const Movie = sequelize.define('Movie', {
  id: { type: DataTypes.UUID, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  year: { type: DataTypes.INTEGER },
  director: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
}, { tableName: 'movies', underscored: true });

export const Rating = sequelize.define('Rating', {
  id: { type: DataTypes.UUID, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  movie_id: { type: DataTypes.UUID, allowNull: false },
  value: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 10 } },
}, {
  tableName: 'ratings',
  underscored: true,
  indexes: [{ unique: true, fields: ['user_id', 'movie_id'] }],
});

export const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.UUID, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  movie_id: { type: DataTypes.UUID, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'comments', underscored: true });

export const Post = sequelize.define('Post', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'posts', underscored: true });

// ===== RELATIONS =====
User.hasMany(RefreshToken, { foreignKey: 'user_id' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

Movie.hasMany(Rating, { foreignKey: 'movie_id' });
Rating.belongsTo(Movie, { foreignKey: 'movie_id' });
User.hasMany(Rating, { foreignKey: 'user_id' });
Rating.belongsTo(User, { foreignKey: 'user_id' });

Movie.hasMany(Comment, { foreignKey: 'movie_id' });
Comment.belongsTo(Movie, { foreignKey: 'movie_id' });
User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

// ===== INIT =====
export async function initDb() {
  await sequelize.sync();
}
