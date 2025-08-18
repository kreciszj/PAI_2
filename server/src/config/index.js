import 'dotenv/config';

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

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
  env,
  seed: {
    onBoot: (process.env.SEED_ON_BOOT || (!isProd)).toString() === 'true',
    sampleData: (process.env.SEED_SAMPLE_DATA || (!isProd)).toString() === 'true',
    adminUser: process.env.SEED_ADMIN_USER || 'user',
    adminPass: process.env.SEED_ADMIN_PASS || 'user',
  },
};
