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
      // Menu items from Bao to the Wings menu (parsed from PDF)
      // Prices adjusted to base amount (95.24% of GST-inclusive prices)
      const sampleProducts = [
        // BAO (₹142.86 base from ₹150 with 5% GST)
        { id: 'prod-001', name: 'Chicken Bao', category: 'Bao', price: 142.86, is_beverage: false },
        { id: 'prod-002', name: 'Soya Bao', category: 'Bao', price: 142.86, is_beverage: false },
        { id: 'prod-003', name: 'Paneer Bao', category: 'Bao', price: 142.86, is_beverage: false },
        { id: 'prod-004', name: 'Sabz Bao', category: 'Bao', price: 142.86, is_beverage: false },
        { id: 'prod-005', name: 'Corn Bao', category: 'Bao', price: 142.86, is_beverage: false },

        // CHICKEN WINGS (₹171.43 base from ₹180 with 5% GST)
        { id: 'prod-010', name: 'Korean Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { id: 'prod-011', name: 'Kimchi Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { id: 'prod-012', name: 'Honey Chilli Chicken', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { id: 'prod-013', name: 'Sriracha Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { id: 'prod-015', name: 'Mango Habenaro Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { id: 'prod-017', name: 'Peri Peri Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { id: 'prod-019', name: 'Bbq Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { id: 'prod-027', name: 'Cheesy Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { id: 'prod-028', name: 'Teriyaki Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },
        { id: 'prod-029', name: 'Sweet Chilli Wings', category: 'Chicken Wings', price: 171.43, is_beverage: false },

        // KOREAN RAMEN (₹171.43 base from ₹180 with 5% GST)
        { id: 'prod-006', name: 'Kimchi Non Veg Ramen', category: 'Korean Ramen', price: 171.43, is_beverage: false },
        { id: 'prod-007', name: 'Cheese Non Veg Ramen', category: 'Korean Ramen', price: 171.43, is_beverage: false },
        { id: 'prod-008', name: 'Kimchi Veg Ramen', category: 'Korean Ramen', price: 171.43, is_beverage: false },
        { id: 'prod-009', name: 'Cheese Veg Ramen', category: 'Korean Ramen', price: 171.43, is_beverage: false },

        // BEVERAGES
        { id: 'prod-039', name: 'Water 10', category: 'Beverages', price: 9.52, is_beverage: true },
        { id: 'prod-040', name: 'Water 20', category: 'Beverages', price: 19.05, is_beverage: true },
        { id: 'prod-041', name: 'Jeera Soda 10', category: 'Beverages', price: 9.52, is_beverage: true },
        { id: 'prod-042', name: 'Jeera Soda 20', category: 'Beverages', price: 19.05, is_beverage: true },
        { id: 'prod-043', name: 'Coke 20', category: 'Beverages', price: 19.05, is_beverage: true },
        { id: 'prod-044', name: 'Sprite 20', category: 'Beverages', price: 19.05, is_beverage: true },
        { id: 'prod-045', name: 'ThumsUp 20', category: 'Beverages', price: 19.05, is_beverage: true },
        { id: 'prod-034', name: 'Mojito Boba', category: 'Beverages', price: 166.67, is_beverage: true },
        { id: 'prod-035', name: 'Ocean Boba', category: 'Beverages', price: 166.67, is_beverage: true },
        { id: 'prod-037', name: 'Sweet Night', category: 'Beverages', price: 166.67, is_beverage: true },
        { id: 'prod-038', name: 'Lime Boba', category: 'Beverages', price: 166.67, is_beverage: true },
        { id: 'prod-036', name: 'Cloud 9', category: 'Beverages', price: 166.67, is_beverage: true },

        // LITE BITES (₹128.57 base from ₹135 with 5% GST)
        { id: 'prod-020', name: 'Chicken Popcorn', category: 'Lite Bites', price: 128.57, is_beverage: false },
        { id: 'prod-021', name: 'Cheese Pizza Pop', category: 'Lite Bites', price: 128.57, is_beverage: false },
        { id: 'prod-022', name: 'Veg Spring Roll', category: 'Lite Bites', price: 128.57, is_beverage: false },
        { id: 'prod-023', name: 'Paneer Popcorn', category: 'Lite Bites', price: 128.57, is_beverage: false },
        { id: 'prod-024', name: 'Peri Peri Potato Wedges', category: 'Lite Bites', price: 128.57, is_beverage: false },
        { id: 'prod-025', name: 'Honey Chilli Potato', category: 'Lite Bites', price: 128.57, is_beverage: false },
        { id: 'prod-026', name: 'Crispy Corn', category: 'Lite Bites', price: 128.57, is_beverage: false },
        { id: 'prod-016', name: 'Bbq Chicken Fingers', category: 'Lite Bites', price: 128.57, is_beverage: false },
        { id: 'prod-018', name: 'Salted Chicken Fingers', category: 'Lite Bites', price: 128.57, is_beverage: false },
        { id: 'prod-014', name: 'Peri Peri Chicken', category: 'Lite Bites', price: 128.57, is_beverage: false },

        // DESSERT BAO (₹142.86 base from ₹150 with 5% GST)
        { id: 'prod-030', name: 'Nutella Bao', category: 'Dessert Bao', price: 142.86, is_beverage: false },
        { id: 'prod-031', name: 'Peach Boba', category: 'Dessert Bao', price: 142.86, is_beverage: false },
      ];

      // Helper function to classify veg type based on product name
      const classifyVegType = (name) => {
        const lowerName = name.toLowerCase();

        // Non-veg indicators
        const nonVegKeywords = ['chicken', 'non veg'];
        if (nonVegKeywords.some(keyword => lowerName.includes(keyword))) {
          return 'non_veg';
        }

        // Veg indicators
        const vegKeywords = ['paneer', 'soya', 'veg', 'sabz', 'corn', 'spring roll', 'potato', 'crispy'];
        if (vegKeywords.some(keyword => lowerName.includes(keyword))) {
          return 'veg';
        }

        // Beverages and desserts - not applicable
        return 'not_applicable';
      };

      for (let index = 0; index < sampleProducts.length; index++) {
        const product = sampleProducts[index];
        const vegType = classifyVegType(product.name);
        await client.query(
          `INSERT INTO products (id, name, category, price, is_beverage, is_active, position, veg_type)
           VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
          [product.id, product.name, product.category, product.price, product.is_beverage, index, vegType]
        );
      }
      console.log('✅ Menu items seeded (43 products from Bao to the Wings menu)');
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
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
