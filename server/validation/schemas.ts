import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

export const projectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
  }),
});

export const credentialsSchema = z.object({
  body: z.object({
    provider: z.enum(['gemini', 'anthropic', 'openai']),
    api_key: z.string().min(1),
    model_name: z.string().optional(),
  }),
});
