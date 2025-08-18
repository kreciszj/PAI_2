import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { User, Movie } from '../models/index.js';

export async function seed() {
  if (!config.seed.onBoot) return;
  const login = config.seed.adminUser;
  const pass = config.seed.adminPass;

  let admin = await User.findOne({ where: { username: login } });
  if (!admin) {
    const hash = await bcrypt.hash(pass, 12);
    admin = await User.create({
      id: uuid(), username: login, password_hash: hash, role: 'admin',
    });
    console.log(`[seed] created admin "${login}"`);
  } else if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
    console.log(`[seed] upgraded "${login}" to admin`);
  }

  if (config.seed.sampleData) {
    const count = await Movie.count();
    if (count === 0) {
      await Movie.bulkCreate([
        { id: uuid(), title: 'Inception', year: 2010, description: 'Sci-fi heist.' },
        { id: uuid(), title: 'The Matrix', year: 1999, description: 'Reality bend.' },
        { id: uuid(), title: 'Interstellar', year: 2014, description: 'Space & time.' },
      ]);
      console.log('[seed] inserted sample movies');
    }
  }
}
