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
      // Menu items from Bao to the Wings menu (parsed from PDF)
      // Prices adjusted to base amount (95.24% of GST-inclusive prices)
      const sampleProducts = [
        // BAO (₹142.86 base from ₹150 with 5% GST)
        { id: 'prod-001', name: 'Chicken Bao', category: 'Bao', price: 142.86, is_beverage: 0 },
        { id: 'prod-002', name: 'Soya Bao', category: 'Bao', price: 142.86, is_beverage: 0 },
        { id: 'prod-003', name: 'Paneer Bao', category: 'Bao', price: 142.86, is_beverage: 0 },
        { id: 'prod-004', name: 'Sabz Bao', category: 'Bao', price: 142.86, is_beverage: 0 },
        { id: 'prod-005', name: 'Corn Bao', category: 'Bao', price: 142.86, is_beverage: 0 },

        // CHICKEN WINGS (₹171.43 base from ₹180 with 5% GST)
        { id: 'prod-010', name: 'Korean Wings', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },
        { id: 'prod-011', name: 'Kimchi Wings', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },
        { id: 'prod-012', name: 'Honey Chilli Chicken', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },
        { id: 'prod-013', name: 'Sriracha Wings', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },
        { id: 'prod-015', name: 'Mango Habenaro Wings', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },
        { id: 'prod-017', name: 'Peri Peri Wings', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },
        { id: 'prod-019', name: 'Bbq Wings', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },
        { id: 'prod-027', name: 'Cheesy Wings', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },
        { id: 'prod-028', name: 'Teriyaki Wings', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },
        { id: 'prod-029', name: 'Sweet Chilli Wings', category: 'Chicken Wings', price: 171.43, is_beverage: 0 },

        // KOREAN RAMEN (₹171.43 base from ₹180 with 5% GST)
        { id: 'prod-006', name: 'Kimchi Non Veg Ramen', category: 'Korean Ramen', price: 171.43, is_beverage: 0 },
        { id: 'prod-007', name: 'Cheese Non Veg Ramen', category: 'Korean Ramen', price: 171.43, is_beverage: 0 },
        { id: 'prod-008', name: 'Kimchi Veg Ramen', category: 'Korean Ramen', price: 171.43, is_beverage: 0 },
        { id: 'prod-009', name: 'Cheese Veg Ramen', category: 'Korean Ramen', price: 171.43, is_beverage: 0 },

        // BEVERAGES
        { id: 'prod-039', name: 'Water 10', category: 'Beverages', price: 9.52, is_beverage: 1 },
        { id: 'prod-040', name: 'Water 20', category: 'Beverages', price: 19.05, is_beverage: 1 },
        { id: 'prod-041', name: 'Jeera Soda 10', category: 'Beverages', price: 9.52, is_beverage: 1 },
        { id: 'prod-042', name: 'Jeera Soda 20', category: 'Beverages', price: 19.05, is_beverage: 1 },
        { id: 'prod-043', name: 'Coke 20', category: 'Beverages', price: 19.05, is_beverage: 1 },
        { id: 'prod-044', name: 'Sprite 20', category: 'Beverages', price: 19.05, is_beverage: 1 },
        { id: 'prod-045', name: 'ThumsUp 20', category: 'Beverages', price: 19.05, is_beverage: 1 },
        { id: 'prod-034', name: 'Mojito Boba', category: 'Beverages', price: 166.67, is_beverage: 1 },
        { id: 'prod-035', name: 'Ocean Boba', category: 'Beverages', price: 166.67, is_beverage: 1 },
        { id: 'prod-037', name: 'Sweet Night', category: 'Beverages', price: 166.67, is_beverage: 1 },
        { id: 'prod-038', name: 'Lime Boba', category: 'Beverages', price: 166.67, is_beverage: 1 },
        { id: 'prod-036', name: 'Cloud 9', category: 'Beverages', price: 166.67, is_beverage: 1 },

        // LITE BITES (₹128.57 base from ₹135 with 5% GST)
        { id: 'prod-020', name: 'Chicken Popcorn', category: 'Lite Bites', price: 128.57, is_beverage: 0 },
        { id: 'prod-021', name: 'Cheese Pizza Pop', category: 'Lite Bites', price: 128.57, is_beverage: 0 },
        { id: 'prod-022', name: 'Veg Spring Roll', category: 'Lite Bites', price: 128.57, is_beverage: 0 },
        { id: 'prod-023', name: 'Paneer Popcorn', category: 'Lite Bites', price: 128.57, is_beverage: 0 },
        { id: 'prod-024', name: 'Peri Peri Potato Wedges', category: 'Lite Bites', price: 128.57, is_beverage: 0 },
        { id: 'prod-025', name: 'Honey Chilli Potato', category: 'Lite Bites', price: 128.57, is_beverage: 0 },
        { id: 'prod-026', name: 'Crispy Corn', category: 'Lite Bites', price: 128.57, is_beverage: 0 },
        { id: 'prod-016', name: 'Bbq Chicken Fingers', category: 'Lite Bites', price: 128.57, is_beverage: 0 },
        { id: 'prod-018', name: 'Salted Chicken Fingers', category: 'Lite Bites', price: 128.57, is_beverage: 0 },
        { id: 'prod-014', name: 'Peri Peri Chicken', category: 'Lite Bites', price: 128.57, is_beverage: 0 },

        // DESSERT BAO (₹142.86 base from ₹150 with 5% GST)
        { id: 'prod-030', name: 'Nutella Bao', category: 'Dessert Bao', price: 142.86, is_beverage: 0 },
        { id: 'prod-031', name: 'Peach Boba', category: 'Dessert Bao', price: 142.86, is_beverage: 0 },
      ];

      for (const product of sampleProducts) {
        await db.run(
          `INSERT INTO products (id, name, category, price, is_beverage, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [product.id, product.name, product.category, product.price, product.is_beverage]
        );
      }
      console.log('✅ Menu items seeded (43 products from Bao to the Wings menu)');
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
