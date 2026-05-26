#!/usr/bin/env node
/**
 * Migrate remaining data with placeholder customer creation
 * Creates placeholder customers for any orders with missing customer_ids
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
      placeholders_created: 0,
      orders: 0,
      order_items: 0,
      bills: 0,
      kot_logs: 0
    };
  }

  async migrate() {
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATING REMAINING DATA WITH PLACEHOLDER CUSTOMERS');
    console.log('='.repeat(80) + '\n');

    try {
      console.log('📦 Connecting to databases...');

      // Test connections
      await this.testSQLiteConnection();
      await this.testPostgresConnection();
      console.log('✅ Connected to both databases\n');

      // Create placeholder customers for missing customer IDs
      await this.createPlaceholderCustomers();

      // Migration steps
      await this.migrateOrders();

      // Create placeholder orders for missing order IDs (referenced by bills)
      await this.createPlaceholderOrders();
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

  async createPlaceholderCustomers() {
    console.log('📋 Creating placeholder customers for missing customer IDs...\n');

    // Get all unique customer_ids from orders
    const orderCustomerIds = await this.sqliteQuery(
      'SELECT DISTINCT customer_id FROM orders WHERE customer_id IS NOT NULL'
    );

    if (orderCustomerIds.length === 0) {
      console.log('ℹ️  No customer IDs in orders\n');
      return;
    }

    // Get all existing customer_ids in PostgreSQL
    const existingCustomers = await this.pgPool.query('SELECT DISTINCT id FROM customers');
    const existingIds = new Set(existingCustomers.rows.map(r => r.id));

    // Find missing customer IDs
    const missingIds = orderCustomerIds
      .map(r => r.customer_id)
      .filter(id => !existingIds.has(id));

    if (missingIds.length === 0) {
      console.log('✅ All customer IDs exist\n');
      return;
    }

    console.log(`⚠️  Found ${missingIds.length} missing customer IDs, creating placeholders...\n`);

    // Create placeholder customers with unique phone numbers
    for (const customerId of missingIds) {
      // Use customer ID as part of phone to ensure uniqueness
      const uniquePhone = `000-${customerId.substring(0, 10)}`;

      await this.pgPool.query(
        `INSERT INTO customers (id, phone, name, email, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [customerId, uniquePhone, `Placeholder Customer ${customerId}`, null, true]
      );
      this.stats.placeholders_created++;
    }

    console.log(`✅ Created ${this.stats.placeholders_created} placeholder customers\n`);
  }

  async createPlaceholderOrders() {
    console.log('📋 Creating placeholder orders for missing order IDs...\n');

    // Get all unique order_ids from bills
    const billOrderIds = await this.sqliteQuery(
      'SELECT DISTINCT order_id FROM bills WHERE order_id IS NOT NULL'
    );

    if (billOrderIds.length === 0) {
      console.log('ℹ️  No order IDs in bills\n');
      return;
    }

    // Get all existing order_ids in PostgreSQL
    const existingOrders = await this.pgPool.query('SELECT DISTINCT id FROM orders');
    const existingIds = new Set(existingOrders.rows.map(r => r.id));

    // Find missing order IDs
    const missingIds = billOrderIds
      .map(r => r.order_id)
      .filter(id => !existingIds.has(id));

    if (missingIds.length === 0) {
      console.log('✅ All order IDs exist\n');
      return;
    }

    console.log(`⚠️  Found ${missingIds.length} missing order IDs, creating placeholders...\n`);

    // Create placeholder orders
    for (const orderId of missingIds) {
      await this.pgPool.query(
        `INSERT INTO orders (id, customer_id, total_amount, status, payment_method, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [orderId, null, 0, 'placeholder', 'cash', 'Placeholder order', ]
      );
    }

    console.log(`✅ Created ${missingIds.length} placeholder orders\n`);
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

  async migrateOrders() {
    console.log('🔄 Migrating orders...');

    // Get column names from SQLite
    const columns = await this.getTableColumns('orders');

    // Build SELECT query with available columns
    const selectColumns = ['id', 'customer_id', 'total_amount', 'status', 'payment_method', 'notes', 'created_at', 'updated_at'];
    const availableColumns = selectColumns.filter(col => columns.includes(col));

    const rows = await this.sqliteQuery(
      `SELECT ${availableColumns.join(', ')} FROM orders`
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO orders (id, customer_id, total_amount, status, payment_method, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.customer_id, row.total_amount, row.status,
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
      `SELECT id, order_id, bill_number, customer_id, total_amount, payment_method, status, notes, created_at, updated_at
       FROM bills`
    );

    for (const row of rows) {
      await this.pgPool.query(
        `INSERT INTO bills (id, order_id, bill_number, customer_id, total_amount, payment_method, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.order_id, row.bill_number, row.customer_id,
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

  getTableColumns(tableName) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.name));
      });
    });
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
      const padding = ' '.repeat(Math.max(0, 20 - table.length));
      console.log(`  ✅ ${table}${padding} → ${count}`);
    }
    console.log('\n✨ Migration complete!');
  }

  close() {
    this.sqliteDb.close();
    this.pgPool.end();
  }
}

// Run migration
const migrator = new DataMigrator();
migrator.migrate();
