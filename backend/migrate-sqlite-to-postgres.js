#!/usr/bin/env node
/**
 * Migrate data from local SQLite database to remote PostgreSQL
 * Usage: node migrate-sqlite-to-postgres.js
 */

import sqlite3 from 'sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const { Pool } = pg;

const SQLITE_DB = './data/pos.db';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

class DataMigrator {
  constructor() {
    this.sqliteDb = new sqlite3.Database(SQLITE_DB);
    this.pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    this.stats = {
      categories: 0,
      products: 0,
      customers: 0,
      staff_users: 0,
      orders: 0,
      order_items: 0,
      bills: 0,
      kot_logs: 0
    };
  }

  async migrate() {
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATING DATA FROM SQLite TO PostgreSQL');
    console.log('='.repeat(80) + '\n');

    try {
      console.log('📦 Connecting to databases...');

      // Test connections
      await this.testSQLiteConnection();
      await this.testPostgresConnection();
      console.log('✅ Connected to both databases\n');

      // Fix schema: Allow NULL phone in customers table
      console.log('🔧 Fixing schema constraints...');
      await this.pgPool.query('ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL');
      console.log('✅ Schema constraints fixed\n');

      // Migration steps
      await this.migrateCategories();
      await this.migrateProducts();
      await this.migrateCustomers();
      await this.migrateStaffUsers();
      await this.migrateOrders();
      await this.migrateOrderItems();
      await this.migrateBills();
      await this.migrateKotLogs();

      console.log('\n' + '='.repeat(80));
      console.log('✅ MIGRATION COMPLETE');
      console.log('='.repeat(80) + '\n');

      this.printSummary();
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    } finally {
      this.close();
    }
  }

  testSQLiteConnection() {
    return new Promise((resolve, reject) => {
      this.sqliteDb.get('SELECT 1', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async testPostgresConnection() {
    const client = await this.pgPool.connect();
    await client.query('SELECT 1');
    client.release();
  }

  async migrateCategories() {
    console.log('🔄 Migrating categories...');

    const rows = await this.sqliteQuery(
      'SELECT id, name, position, created_at, updated_at FROM categories'
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO categories (id, name, position, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.name, row.position, row.created_at, row.updated_at]
      );
    }

    this.stats.categories = rows.length;
    console.log(`✅ Migrated ${rows.length} categories`);
  }

  async migrateProducts() {
    console.log('🔄 Migrating products...');

    const rows = await this.sqliteQuery(
      `SELECT id, name, category, price, description, position, veg_type, is_active, is_beverage, created_at, updated_at
       FROM products`
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO products (id, name, category, price, description, position, veg_type, is_active, is_beverage, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.name, row.category, row.price, row.description, row.position,
         row.veg_type, row.is_active, row.is_beverage, row.created_at, row.updated_at]
      );
    }

    this.stats.products = rows.length;
    console.log(`✅ Migrated ${rows.length} products`);
  }

  async migrateCustomers() {
    console.log('🔄 Migrating customers...');

    const rows = await this.sqliteQuery(
      'SELECT id, phone, name, email, is_active, created_at, updated_at FROM customers'
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO customers (id, phone, name, email, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.phone, row.name, row.email, row.is_active, row.created_at, row.updated_at]
      );
    }

    this.stats.customers = rows.length;
    console.log(`✅ Migrated ${rows.length} customers`);
  }

  async migrateStaffUsers() {
    console.log('🔄 Migrating staff users...');

    const rows = await this.sqliteQuery(
      'SELECT id, username, password_hash, full_name, email, role, is_active, created_at, updated_at FROM staff_users'
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO staff_users (id, username, password_hash, full_name, email, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (username) DO NOTHING`,
        [row.id, row.username, row.password_hash, row.full_name, row.email,
         row.role, row.is_active, row.created_at, row.updated_at]
      );
    }

    this.stats.staff_users = rows.length;
    console.log(`✅ Migrated ${rows.length} staff users`);
  }

  async migrateOrders() {
    console.log('🔄 Migrating orders...');

    const rows = await this.sqliteQuery(
      'SELECT id, customer_id, customer_phone, total_amount, status, payment_method, notes, created_at, updated_at FROM orders'
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO orders (id, customer_id, customer_phone, total_amount, status, payment_method, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.customer_id, row.customer_phone, row.total_amount, row.status,
         row.payment_method, row.notes, row.created_at, row.updated_at]
      );
    }

    this.stats.orders = rows.length;
    console.log(`✅ Migrated ${rows.length} orders`);
  }

  async migrateOrderItems() {
    console.log('🔄 Migrating order items...');

    const rows = await this.sqliteQuery(
      'SELECT id, order_id, product_id, quantity, unit_price, gst, total_price, created_at FROM order_items'
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, gst, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.order_id, row.product_id, row.quantity, row.unit_price,
         row.gst, row.total_price, row.created_at]
      );
    }

    this.stats.order_items = rows.length;
    console.log(`✅ Migrated ${rows.length} order items`);
  }

  async migrateBills() {
    console.log('🔄 Migrating bills...');

    const rows = await this.sqliteQuery(
      `SELECT id, order_id, bill_number, customer_id, customer_phone, total_amount, payment_method, status, notes, created_at, updated_at
       FROM bills`
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO bills (id, order_id, bill_number, customer_id, customer_phone, total_amount, payment_method, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.order_id, row.bill_number, row.customer_id, row.customer_phone,
         row.total_amount, row.payment_method, row.status, row.notes, row.created_at, row.updated_at]
      );
    }

    this.stats.bills = rows.length;
    console.log(`✅ Migrated ${rows.length} bills`);
  }

  async migrateKotLogs() {
    console.log('🔄 Migrating KOT logs...');

    const rows = await this.sqliteQuery(
      'SELECT id, order_id, status, printed_at, completed_at, created_at FROM kot_logs'
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO kot_logs (id, order_id, status, printed_at, completed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.order_id, row.status, row.printed_at, row.completed_at, row.created_at]
      );
    }

    this.stats.kot_logs = rows.length;
    console.log(`✅ Migrated ${rows.length} KOT logs`);
  }

  sqliteQuery(query) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  printSummary() {
    console.log('📊 Data Summary:\n');
    for (const [table, count] of Object.entries(this.stats)) {
      const padding = ' '.repeat(Math.max(0, 15 - table.length));
      console.log(`  ✅ ${table}${padding} → ${count} records migrated`);
    }
    console.log('\n✨ All data successfully migrated to PostgreSQL!');
  }

  close() {
    this.sqliteDb.close();
    this.pgPool.end();
  }
}

// Run migration
const migrator = new DataMigrator();
migrator.migrate();
