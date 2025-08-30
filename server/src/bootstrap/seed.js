import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
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
      const jsonPath = path.resolve('./src/bootstrap/top100_movies.json');
      let moviesToAdd = [];
      if (fs.existsSync(jsonPath)) {
        const rawData = fs.readFileSync(jsonPath, 'utf-8').trim();
        if (rawData) {
          const moviesData = JSON.parse(rawData);
          moviesToAdd = moviesData.map(m => ({
            id: uuid(),
            title: m.title,
            year: m.year ?? null,
            director: m.director ?? null,
            description: m.description ?? null,
          }));
          console.log('[seed] imported movies from JSON');
        }
      }

      if (moviesToAdd.length === 0) {
        moviesToAdd = [
          {
            id: uuid(),
            title: 'Inception',
            year: 2010,
            director: 'Christopher Nolan',
            description: 'Sci-fi heist.'
          },
          {
            id: uuid(),
            title: 'The Matrix',
            year: 1999,
            director: 'Lana & Lilly Wachowski',
            description: 'Reality bend.'
          },
          {
            id: uuid(),
            title: 'Interstellar',
            year: 2014,
            director: 'Christopher Nolan',
            description: 'Space & time.'
          },
        ];
        console.log('[seed] inserted default sample movies');
      }

      await Movie.bulkCreate(moviesToAdd);
    }
  }
}
