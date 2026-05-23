#!/usr/bin/env node

/**
 * Synthetic Data Seeding Script
 * Clears all transaction data and generates realistic test data
 * Daily sales: 1.5k - 6k
 * Generates data for the last 30 days
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Product catalog with prices (GST-inclusive)
const PRODUCTS = [
  // BAO (₹150 with 5% GST)
  { id: 'prod-001', name: 'Chicken Bao', price: 150, is_beverage: 0, category: 'Bao' },
  { id: 'prod-002', name: 'Soya Bao', price: 150, is_beverage: 0, category: 'Bao' },
  { id: 'prod-003', name: 'Paneer Bao', price: 150, is_beverage: 0, category: 'Bao' },
  { id: 'prod-004', name: 'Sabz Bao', price: 150, is_beverage: 0, category: 'Bao' },
  { id: 'prod-005', name: 'Corn Bao', price: 150, is_beverage: 0, category: 'Bao' },

  // CHICKEN WINGS (₹180 with 5% GST)
  { id: 'prod-010', name: 'Korean Wings', price: 180, is_beverage: 0, category: 'Chicken Wings' },
  { id: 'prod-011', name: 'Kimchi Wings', price: 180, is_beverage: 0, category: 'Chicken Wings' },
  { id: 'prod-012', name: 'Honey Chilli Chicken', price: 180, is_beverage: 0, category: 'Chicken Wings' },
  { id: 'prod-013', name: 'Sriracha Wings', price: 180, is_beverage: 0, category: 'Chicken Wings' },
  { id: 'prod-015', name: 'Mango Habenaro Wings', price: 180, is_beverage: 0, category: 'Chicken Wings' },

  // KOREAN RAMEN (₹180 with 5% GST)
  { id: 'prod-006', name: 'Kimchi Non Veg Ramen', price: 180, is_beverage: 0, category: 'Korean Ramen' },
  { id: 'prod-007', name: 'Cheese Non Veg Ramen', price: 180, is_beverage: 0, category: 'Korean Ramen' },
  { id: 'prod-008', name: 'Kimchi Veg Ramen', price: 180, is_beverage: 0, category: 'Korean Ramen' },
  { id: 'prod-009', name: 'Cheese Veg Ramen', price: 180, is_beverage: 0, category: 'Korean Ramen' },

  // BEVERAGES
  { id: 'prod-043', name: 'Coke 20', price: 20, is_beverage: 1, category: 'Beverages' },
  { id: 'prod-044', name: 'Sprite 20', price: 20, is_beverage: 1, category: 'Beverages' },
  { id: 'prod-045', name: 'ThumsUp 20', price: 20, is_beverage: 1, category: 'Beverages' },
  { id: 'prod-034', name: 'Mojito Boba', price: 175, is_beverage: 1, category: 'Beverages' },
  { id: 'prod-035', name: 'Ocean Boba', price: 175, is_beverage: 1, category: 'Beverages' },

  // LITE BITES (₹135 with 5% GST)
  { id: 'prod-020', name: 'Chicken Popcorn', price: 135, is_beverage: 0, category: 'Lite Bites' },
  { id: 'prod-021', name: 'Cheese Pizza Pop', price: 135, is_beverage: 0, category: 'Lite Bites' },
  { id: 'prod-022', name: 'Veg Spring Roll', price: 135, is_beverage: 0, category: 'Lite Bites' },
];

// Sample customer phone numbers (10 digit Indian format)
const CUSTOMER_PHONES = [
  '9876543210', '9876543211', '9876543212', '9876543213', '9876543214',
  '9876543215', '9876543216', '9876543217', '9876543218', '9876543219',
  '9123456789', '9123456790', '9123456791', '9123456792', '9123456793',
  '9876543220', '9876543221', '9876543222', '9876543223', '9876543224',
];

const CUSTOMER_NAMES = [
  'Raj Kumar', 'Priya Singh', 'Amit Patel', 'Sneha Sharma', 'Vikram Reddy',
  'Anjali Desai', 'Rohit Nair', 'Kavya Menon', 'Arjun Gupta', 'Neha Iyer',
];

const PAYMENT_METHODS = ['cash', 'card', 'upi'];
const STATUSES = ['completed', 'completed', 'completed', 'completed', 'completed', 'cancelled']; // 83% completed

/**
 * Generate a random number within a range
 */
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random datetime for a given day
 */
function getRandomTimeForDay(date) {
  const newDate = new Date(date);
  // Restaurant likely open 11 AM to 11 PM
  const hour = randomBetween(11, 22);
  const minute = randomBetween(0, 59);
  const second = randomBetween(0, 59);
  newDate.setHours(hour, minute, second);
  return newDate;
}

/**
 * Generate realistic daily sales distribution
 * More orders during lunch (12-2 PM) and dinner (6-9 PM)
 */
function generateDailySalesDistribution(targetAmount) {
  const distribution = {
    morning: 0.05,   // 5% (11-12)
    lunch: 0.35,     // 35% (12-3)
    afternoon: 0.10, // 10% (3-5)
    evening: 0.40,   // 40% (5-9)
    night: 0.10      // 10% (9-11)
  };

  return {
    morning: Math.round(targetAmount * distribution.morning),
    lunch: Math.round(targetAmount * distribution.lunch),
    afternoon: Math.round(targetAmount * distribution.afternoon),
    evening: Math.round(targetAmount * distribution.evening),
    night: Math.round(targetAmount * distribution.night),
  };
}

/**
 * Clear all transaction data
 */
function clearTransactionData(db) {
  console.log('🗑️  Clearing transaction data...');

  const tables = [
    'bill_holds',
    'bills',
    'kot_logs',
    'order_items',
    'orders',
    'customers',
  ];

  for (const table of tables) {
    db.prepare(`DELETE FROM ${table}`).run();
    console.log(`  ✓ Cleared ${table}`);
  }
}

/**
 * Generate synthetic customers
 */
function generateCustomers(db, count = 50) {
  console.log(`\n👥 Generating ${count} customers...`);

  const customers = [];
  for (let i = 0; i < count; i++) {
    const phone = CUSTOMER_PHONES[i % CUSTOMER_PHONES.length].slice(0, -1) + i;
    const name = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length] + ' ' + i;

    const customer = {
      id: uuidv4(),
      phone,
      name,
      email: `customer${i}@example.com`,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO customers (id, phone, name, email, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(customer.id, customer.phone, customer.name, customer.email, customer.is_active, customer.created_at, customer.updated_at);

    customers.push(customer);
  }

  console.log(`  ✓ Created ${count} customers`);
  return customers;
}

/**
 * Generate a random order with 1-4 items
 */
function generateRandomOrder(customers, date) {
  const customer = customers[randomBetween(0, customers.length - 1)];
  const itemCount = randomBetween(1, 4);
  const items = [];
  let totalAmount = 0;

  for (let i = 0; i < itemCount; i++) {
    const product = PRODUCTS[randomBetween(0, PRODUCTS.length - 1)];
    const quantity = randomBetween(1, 3);
    const itemTotal = product.price * quantity;

    items.push({
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: product.price,
      total_price: itemTotal,
    });

    totalAmount += itemTotal;
  }

  return {
    customer_id: customer.id,
    customer_phone: customer.phone,
    items,
    totalAmount: Math.round(totalAmount * 100) / 100,
    status: STATUSES[randomBetween(0, STATUSES.length - 1)],
    payment_method: PAYMENT_METHODS[randomBetween(0, PAYMENT_METHODS.length - 1)],
    created_at: getRandomTimeForDay(date),
  };
}

/**
 * Generate synthetic sales data for a given date
 */
function generateDailySalesData(db, customers, date, targetAmount) {
  const distribution = generateDailySalesDistribution(targetAmount);
  const baseDate = new Date(date);

  const orders = [];
  let currentAmount = 0;
  let ordersGenerated = 0;

  // Generate orders across time periods
  const timeRanges = [
    { period: 'morning', start: 11, end: 12, amount: distribution.morning },
    { period: 'lunch', start: 12, end: 15, amount: distribution.lunch },
    { period: 'afternoon', start: 15, end: 17, amount: distribution.afternoon },
    { period: 'evening', start: 17, end: 21, amount: distribution.evening },
    { period: 'night', start: 21, end: 23, amount: distribution.night },
  ];

  for (const range of timeRanges) {
    let periodAmount = 0;

    while (periodAmount < range.amount) {
      const order = generateRandomOrder(customers, date);

      // Update the created_at time to be within the time range
      const orderDate = new Date(baseDate);
      const hour = randomBetween(range.start, range.end);
      const minute = randomBetween(0, 59);
      orderDate.setHours(hour, minute, randomBetween(0, 59));
      order.created_at = orderDate;

      orders.push(order);
      periodAmount += order.totalAmount;
      currentAmount += order.totalAmount;
      ordersGenerated++;

      // Limit orders per period
      if (orders.filter(o => {
        const h = new Date(o.created_at).getHours();
        return h >= range.start && h < range.end;
      }).length > 30) break;
    }
  }

  // Insert orders and items into database
  for (const order of orders) {
    const orderId = uuidv4();

    db.prepare(`
      INSERT INTO orders (id, customer_id, total_amount, status, payment_method, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      order.customer_id,
      order.totalAmount,
      order.status,
      order.payment_method,
      order.created_at.toISOString(),
      order.created_at.toISOString()
    );

    // Insert order items
    for (const item of order.items) {
      const itemId = uuidv4();
      db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        itemId,
        orderId,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.total_price,
        order.created_at.toISOString()
      );
    }

    // Insert corresponding bill
    if (order.status === 'completed') {
      const billId = uuidv4();
      const billNumber = `B${order.created_at.getTime().toString().slice(-8)}`;

      db.prepare(`
        INSERT INTO bills (id, order_id, bill_number, customer_id, total_amount, payment_method, status, printed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        billId,
        orderId,
        billNumber,
        order.customer_id,
        order.totalAmount,
        order.payment_method,
        'completed',
        order.created_at.toISOString(),
        order.created_at.toISOString(),
        order.created_at.toISOString()
      );
    }
  }

  return {
    ordersCount: ordersGenerated,
    totalAmount: Math.round(currentAmount * 100) / 100,
  };
}

/**
 * Main seeding function
 */
function seedSyntheticData() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Synthetic Data Seeding for B2TW POS               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to database
    const dbPath = join(__dirname, '../../..', 'db', 'pos.sqlite');
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    console.log(`📦 Connected to database: ${dbPath}`);

    // Clear existing data
    clearTransactionData(db);

    // Generate customers
    const customers = generateCustomers(db, 50);

    // Generate sales data for the last 30 days
    console.log('\n📊 Generating 30 days of sales data...');

    const today = new Date();
    let totalRevenue = 0;
    let totalOrders = 0;
    const dailyBreakdown = [];

    for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);

      // Generate random daily sales between 1500 and 6000
      const dailyTarget = randomBetween(1500, 6000);

      const dayData = generateDailySalesData(db, customers, date, dailyTarget);

      totalRevenue += dayData.totalAmount;
      totalOrders += dayData.ordersCount;

      const dateStr = date.toISOString().split('T')[0];
      dailyBreakdown.push({
        date: dateStr,
        orders: dayData.ordersCount,
        revenue: dayData.totalAmount,
      });

      console.log(`  ${dateStr}: ${dayData.ordersCount} orders | ₹${dayData.totalAmount.toFixed(2)}`);
    }

    console.log('\n✅ Seeding complete!');
    console.log('\n📈 Summary:');
    console.log(`  Total Orders: ${totalOrders}`);
    console.log(`  Total Revenue: ₹${totalRevenue.toFixed(2)}`);
    console.log(`  Avg Daily Revenue: ₹${(totalRevenue / 30).toFixed(2)}`);
    console.log(`  Avg Order Value: ₹${(totalRevenue / totalOrders).toFixed(2)}`);
    console.log(`\n  Customers: ${customers.length}`);

    db.close();
    console.log('\n✨ All done! Ready for testing.\n');

  } catch (error) {
    console.error('\n❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

// Run the seeding
seedSyntheticData();
