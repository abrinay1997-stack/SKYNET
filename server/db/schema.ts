import { pgTable, serial, text, timestamp, integer, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const credentials = pgTable('credentials', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  modelName: varchar('model_name', { length: 100 }),
});

export const analysisHistory = pgTable('analysis_history', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  asset: varchar('asset', { length: 50 }).notNull(),
  researcherReport: text('researcher_report'),
  quantReport: text('quant_report'),
  riskReport: text('risk_report'),
  cioReport: text('cio_report'),
  recommendation: varchar('recommendation', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
});
