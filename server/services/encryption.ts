import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY = process.env.MASTER_ENCRYPTION_KEY;

if (!KEY || KEY.length !== 64) {
  console.warn('WARNING: MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
}

export function encrypt(text: string): string {
  if (!KEY) throw new Error('MASTER_ENCRYPTION_KEY is not defined');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Format: iv:tag:encryptedData
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!KEY) throw new Error('MASTER_ENCRYPTION_KEY is not defined');

  const [ivHex, tagHex, encryptedDataHex] = encryptedText.split(':');
  if (!ivHex || !tagHex || !encryptedDataHex) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encryptedData = Buffer.from(encryptedDataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
