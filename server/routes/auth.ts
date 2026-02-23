import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import { validate } from '../middleware/validation.js';
import { registerSchema, loginSchema } from '../validation/schemas.js';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
    }).returning({ id: users.id, email: users.email });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;
