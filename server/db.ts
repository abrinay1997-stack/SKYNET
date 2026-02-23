import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './db/schema.js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export default db;
