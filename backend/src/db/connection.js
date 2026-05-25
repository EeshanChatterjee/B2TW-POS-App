import pg from 'pg';
import pool from 'pg-pool';

const { Pool } = pg;

let dbPool = null;

/**
 * Get or create database connection pool
 * Uses pg for PostgreSQL connections
 */
export async function getDatabase() {
  if (dbPool) return dbPool;

  try {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create connection pool
    dbPool = new Pool({
      connectionString,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await dbPool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();

    return {
      pool: dbPool,
      async run(sql, params = []) {
        try {
          const result = await dbPool.query(sql, params);
          return { changes: result.rowCount };
        } catch (error) {
          console.error('Database run error:', error);
          throw error;
        }
      },
      async exec(sql) {
        try {
          const statements = sql.split(';').filter(stmt => stmt.trim());
          for (const stmt of statements) {
            if (stmt.trim()) {
              await dbPool.query(stmt);
            }
          }
        } catch (error) {
          console.error('Database exec error:', error);
          throw error;
        }
      },
      async all(sql, params = []) {
        try {
          const result = await dbPool.query(sql, params);
          return result.rows;
        } catch (error) {
          console.error('Database all error:', error);
          throw error;
        }
      },
      async get(sql, params = []) {
        try {
          const result = await dbPool.query(sql, params);
          return result.rows[0] || null;
        } catch (error) {
          console.error('Database get error:', error);
          throw error;
        }
      },
      async close() {
        if (dbPool) {
          await dbPool.end();
          dbPool = null;
        }
      }
    };
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (dbPool) {
    await dbPool.end();
    dbPool = null;
  }
}

export default { getDatabase, closeDatabase };
