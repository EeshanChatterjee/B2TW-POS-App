import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

/**
 * Get or create database connection
 */
export async function getDatabase(dbPath = './data/pos.db') {
  if (db) return db;

  try {
    // Ensure data directory exists
    const dataDir = dirname(dbPath);
    mkdirSync(dataDir, { recursive: true });

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    return db;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
  }
}

export default { getDatabase, closeDatabase };
