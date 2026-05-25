import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

/**
 * Initialize PostgreSQL database with schema
 * Runs schema-postgres.sql and seeds default data
 */
export async function initializeDatabase() {
  let client = null;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📦 Initializing PostgreSQL database...');

    client = await pool.connect();

    // Read and execute schema
    const schema = readFileSync(join(__dirname, 'schema-postgres.sql'), 'utf-8');

    // Split and execute statements
    const statements = schema.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }
    console.log('✅ Database schema created');

    // Seed default data
    await seedDefaultData(client);

    console.log('✅ PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

/**
 * Seed default data (staff users, sample products)
 */
async function seedDefaultData(client) {
  try {
    // Check if staff users exist
    const staffResult = await client.query(
      'SELECT COUNT(*) as count FROM staff_users'
    );

    if (staffResult.rows[0].count === 0) {
      // Hash password for all demo users (password: password)
      const hashedPassword = await bcrypt.hash('password', 10);

      // Create demo staff users
      const demoUsers = [
        { username: 'admin', full_name: 'Admin User', email: 'admin@b2tw.com', role: 'admin' },
        { username: 'manager', full_name: 'Manager User', email: 'manager@b2tw.com', role: 'manager' },
        { username: 'operator', full_name: 'Operator User', email: 'operator@b2tw.com', role: 'operator' }
      ];

      for (const user of demoUsers) {
        await client.query(
          `INSERT INTO staff_users (id, username, password_hash, full_name, email, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [uuidv4(), user.username, hashedPassword, user.full_name, user.email, user.role, true]
        );
      }
      console.log('✅ Demo staff users created (admin, manager, operator with password: password)');
    }

    // Check if categories exist
    const categoriesResult = await client.query(
      'SELECT COUNT(*) as count FROM categories'
    );

    if (categoriesResult.rows[0].count === 0) {
      // Category order for the menu
      const categoryOrder = [
        'Bao',
        'Korean Ramen',
        'Chicken Wings',
        'Lite Bites',
        'Dessert Bao',
        'Beverages'
      ];

      for (let index = 0; index < categoryOrder.length; index++) {
        await client.query(
          `INSERT INTO categories (id, name, position) VALUES ($1, $2, $3)`,
          [uuidv4(), categoryOrder[index], index]
        );
      }
      console.log('✅ Categories created with custom order');
    }

    // Check if products exist
    const productsResult = await client.query(
      'SELECT COUNT(*) as count FROM products'
    );

    if (productsResult.rows[0].count === 0) {
      // Sample products (simplified list - add more as needed)
      const sampleProducts = [
        // BAO
        { name: 'Chicken Bao', category: 'Bao', price: 142.86, is_beverage: false },
        { name: 'Soya Bao', category: 'Bao', price: 142.86, is_beverage: false },
        { name: 'Paneer Bao', category: 'Bao', price: 142.86, is_beverage: false },

        // CHICKEN WINGS
        { name: 'Korean Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { name: 'Kimchi Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { name: 'Honey Chilli Chicken', category: 'Chicken Wings', price: 171.43, is_beverage: false },

        // BEVERAGES
        { name: 'Coke 20', category: 'Beverages', price: 19.05, is_beverage: true },
        { name: 'Sprite 20', category: 'Beverages', price: 19.05, is_beverage: true },
        { name: 'ThumsUp 20', category: 'Beverages', price: 19.05, is_beverage: true },
      ];

      for (const product of sampleProducts) {
        await client.query(
          `INSERT INTO products (id, name, category, price, is_beverage, veg_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            uuidv4(),
            product.name,
            product.category,
            product.price,
            product.is_beverage,
            product.veg_type || 'not_applicable'
          ]
        );
      }
      console.log('✅ Sample products created');
    }
  } catch (error) {
    console.error('Error seeding default data:', error);
    throw error;
  }
}

// Run initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export default { initializeDatabase };
