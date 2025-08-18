import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  dbPath: process.env.DB_PATH || './data/app.sqlite',
  jwt: {
    accessTtlSec: Number(process.env.JWT_ACCESS_TTL || 900),
    refreshTtlSec: Number(process.env.JWT_REFRESH_TTL || 1209600),
    accessSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  },
  env: process.env.NODE_ENV || 'development',
};
