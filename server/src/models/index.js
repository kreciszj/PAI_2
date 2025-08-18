import { Sequelize, DataTypes } from 'sequelize';
import { config } from '../config/index.js';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.dbPath,
  logging: false,
});

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
  description: { type: DataTypes.TEXT },
}, { tableName: 'movies', underscored: true });

User.hasMany(RefreshToken, { foreignKey: 'user_id' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

export async function initDb() {
  await sequelize.sync();
}
