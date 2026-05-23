#!/usr/bin/env node

/**
 * Import sales data from extracted sales logs
 * Converts JSON sales data into database orders with proper structure
 */

import { getDatabase, closeDatabase } from '../src/db/connection.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SALES_DATA_FILE = path.join(__dirname, '../../data/may_sales_data.json')
const DATABASE_URL = process.env.DATABASE_URL || './data/pos.db'

/**
 * Create a test product if it doesn't exist
 */
async function ensureTestProducts(db) {
  const categories = [
    { id: 'cat_1', name: 'Drinks' },
    { id: 'cat_2', name: 'Main Course' },
    { id: 'cat_3', name: 'Appetizers' },
  ]

  const products = [
    { id: 'prod_1', name: 'Water', category: 'cat_1', price: 10, is_beverage: 1 },
    { id: 'prod_2', name: 'Coke', category: 'cat_1', price: 20, is_beverage: 1 },
    { id: 'prod_3', name: 'Sabe Bao', category: 'cat_2', price: 150, veg_type: 'non_veg' },
    { id: 'prod_4', name: 'Biracas', category: 'cat_2', price: 160, veg_type: 'non_veg' },
    { id: 'prod_5', name: 'Pepper Wedges', category: 'cat_3', price: 135, veg_type: 'veg' },
    { id: 'prod_6', name: 'Cheese Wings', category: 'cat_3', price: 150, veg_type: 'veg' },
    { id: 'prod_7', name: 'Chicken', category: 'cat_2', price: 150, veg_type: 'non_veg' },
    { id: 'prod_8', name: 'Jeera Masaley', category: 'cat_2', price: 20, veg_type: 'veg' },
  ]

  try {
    // Insert categories
    for (const cat of categories) {
      await db.run(
        'INSERT OR IGNORE INTO categories (id, name, position) VALUES (?, ?, ?)',
        [cat.id, cat.name, 0]
      )
    }

    // Insert products
    for (const prod of products) {
      await db.run(
        'INSERT OR IGNORE INTO products (id, name, category, price, veg_type, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [prod.id, prod.name, prod.category, prod.price, prod.veg_type]
      )
    }

    console.log('✅ Test products ensured')
  } catch (err) {
    console.error('Error setting up test products:', err)
  }
}

/**
 * Create orders from daily sales data
 */
async function importDailySales(db, salesData) {
  let totalOrders = 0
  let totalAmount = 0

  for (const day of salesData.daily_sales) {
    // Skip days with no sales
    if (!day.total_sales || day.total_sales === 0) {
      continue
    }

    try {
      const orderId = `order_${day.date.replace(/-/g, '')}_${Date.now()}`

      // Determine payment method (pick primary one)
      let paymentMethod = 'cash'
      if (day.payment_methods.upi > 0) paymentMethod = 'upi'
      if (day.payment_methods.card > 0) paymentMethod = 'card'

      // Create order
      await db.run(
        `INSERT INTO orders (id, total_amount, status, payment_method, created_at, notes)
         VALUES (?, ?, 'completed', ?, ?, ?)`,
        [
          orderId,
          day.total_sales,
          paymentMethod,
          new Date(day.date).toISOString(),
          `Daily summary from ${day.date}. Cash: ${day.payment_methods.cash}, UPI: ${day.payment_methods.upi}, Card: ${day.payment_methods.card}`,
        ]
      )

      // Create sample order items (distribute total across products)
      const items = [
        { productId: 'prod_4', qty: 1, name: 'Biracas', price: 160 }, // Biracas
        { productId: 'prod_5', qty: 1, name: 'Pepper Wedges', price: 135 }, // Pepper Wedges
        { productId: 'prod_6', qty: 1, name: 'Cheese Wings', price: 150 }, // Cheese Wings
        { productId: 'prod_3', qty: 1, name: 'Sabe Bao', price: 150 }, // Sabe Bao
        { productId: 'prod_2', qty: 1, name: 'Coke', price: 20 }, // Coke
        { productId: 'prod_1', qty: 10, name: 'Water', price: 10 }, // Water x10
      ]

      let itemTotal = 0
      for (let i = 0; i < items.length && itemTotal < day.total_sales; i++) {
        const item = items[i]
        const totalForItem = Math.min(item.qty * item.price, day.total_sales - itemTotal)
        const qtyForItem = Math.max(1, Math.floor(totalForItem / item.price))

        const itemId = `item_${orderId}_${i}`
        await db.run(
          `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [itemId, orderId, item.productId, qtyForItem, item.price, qtyForItem * item.price]
        )

        itemTotal += qtyForItem * item.price
      }

      totalOrders++
      totalAmount += day.total_sales
      console.log(`  ✅ ${day.date}: ₹${day.total_sales} (${Object.values(day.payment_methods).reduce((a, b) => a + b, 0)} payment breakdown)`)
    } catch (err) {
      console.error(`Error importing ${day.date}:`, err.message)
    }
  }

  return { totalOrders, totalAmount }
}

/**
 * Main import process
 */
async function main() {
  console.log('Starting sales data import...\n')

  // Load sales data
  if (!fs.existsSync(SALES_DATA_FILE)) {
    console.error(`❌ Sales data file not found: ${SALES_DATA_FILE}`)
    process.exit(1)
  }

  const salesDataRaw = fs.readFileSync(SALES_DATA_FILE, 'utf8')
  const salesData = JSON.parse(salesDataRaw)

  console.log(`📊 Loaded sales data for ${salesData.daily_sales.length} days`)
  console.log(`📈 Summary: ${salesData.summary.days_with_data} day(s) with data\n`)

  try {
    // Connect to database
    const db = await getDatabase(DATABASE_URL)
    console.log('✅ Database connected\n')

    // Setup test products
    console.log('Setting up test products...')
    await ensureTestProducts(db)

    // Import sales data
    console.log('\n📥 Importing daily sales...')
    const result = await importDailySales(db, salesData)

    console.log(`\n✅ Import complete!`)
    console.log(`  Orders created: ${result.totalOrders}`)
    console.log(`  Total sales: ₹${result.totalAmount}`)

    // Close database
    await closeDatabase()
  } catch (err) {
    console.error('❌ Import failed:', err.message)
    process.exit(1)
  }
}

main()
