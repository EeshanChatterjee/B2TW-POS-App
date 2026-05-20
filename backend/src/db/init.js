import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * Initialize SQLite database with schema
 * Runs schema.sql and seeds default data
 */
export async function initializeDatabase(dbPath = './data/pos.db') {
  try {
    console.log('📦 Initializing database...');

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Read and execute schema
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await db.exec(schema);
    console.log('✅ Database schema created');

    // Seed default admin user (username: admin, password: admin123)
    await seedDefaultData(db);

    await db.close();
    console.log('✅ Database initialized successfully at:', dbPath);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Seed default data (admin user, sample products)
 */
async function seedDefaultData(db) {
  try {
    // Check if admin user exists
    const adminExists = await db.get(
      'SELECT COUNT(*) as count FROM admin_users'
    );

    if (adminExists.count === 0) {
      // Default admin user (password: admin123)
      // In production, use proper password hashing (bcrypt)
      await db.run(
        `INSERT INTO admin_users (id, username, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        ['admin-001', 'admin', 'admin123', 'admin', 1]
      );
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    }

    // Check if products exist
    const productsExist = await db.get(
      'SELECT COUNT(*) as count FROM products'
    );

    if (productsExist.count === 0) {
      // Sample menu items
      const sampleProducts = [
        { id: 'prod-001', name: 'Bao - Chicken', category: 'Main', price: 150, is_beverage: 0 },
        { id: 'prod-002', name: 'Bao - Vegetarian', category: 'Main', price: 120, is_beverage: 0 },
        { id: 'prod-003', name: 'Bao - Paneer', category: 'Main', price: 130, is_beverage: 0 },
        { id: 'prod-004', name: 'Fries', category: 'Sides', price: 80, is_beverage: 0 },
        { id: 'prod-005', name: 'Sprite', category: 'Beverages', price: 50, is_beverage: 1 },
        { id: 'prod-006', name: 'Coke', category: 'Beverages', price: 50, is_beverage: 1 },
        { id: 'prod-007', name: 'Mango Lassi', category: 'Beverages', price: 60, is_beverage: 1 },
      ];

      for (const product of sampleProducts) {
        await db.run(
          `INSERT INTO products (id, name, category, price, is_beverage, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [product.id, product.name, product.category, product.price, product.is_beverage]
        );
      }
      console.log('✅ Sample products seeded');
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch(console.error);
}

export default initializeDatabase;
