import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

let db = null;

/**
 * Get or create database connection
 * Uses better-sqlite3 for persistent SQLite database
 */
export async function getDatabase(dbPath = './data/pos.db') {
  if (db) return db;

  try {
    // Ensure data directory exists
    const dataDir = dirname(dbPath);
    mkdirSync(dataDir, { recursive: true });

    // Open database connection (creates file if it doesn't exist)
    const database = new Database(dbPath);

    // Enable foreign keys
    database.pragma('foreign_keys = ON');

    // Create a wrapper object that provides async-like interface for compatibility
    db = {
      database,
      dbPath,
      async run(sql, params = []) {
        try {
          const stmt = database.prepare(sql);
          const result = stmt.run(...params);
          return { changes: result.changes };
        } catch (error) {
          console.error('Database run error:', error);
          throw error;
        }
      },
      async exec(sql) {
        try {
          database.exec(sql);
        } catch (error) {
          console.error('Database exec error:', error);
          throw error;
        }
      },
      async all(sql, params = []) {
        try {
          const stmt = database.prepare(sql);
          const results = stmt.all(...params);
          return results;
        } catch (error) {
          console.error('Database all error:', error);
          throw error;
        }
      },
      async get(sql, params = []) {
        try {
          const stmt = database.prepare(sql);
          const result = stmt.get(...params);
          return result || null;
        } catch (error) {
          console.error('Database get error:', error);
          throw error;
        }
      },
      async close() {
        if (database) {
          database.close();
        }
      }
    };

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
