/**
 * Validate Transaction Prices
 *
 * This script analyzes the current state of transaction prices without making changes.
 * It identifies:
 * 1. Order items with prices that don't match menu prices
 * 2. Orders with incorrect total_amount calculations
 * 3. Bills with incorrect amounts
 *
 * Run with: node validate-transaction-prices.js
 */

import { getDatabase } from '../connection.js';
import { sumTotalPrices, getPriceBreakdown } from '../../utils/priceCalculations.js';

async function validateTransactionPrices() {
  const db = await getDatabase();

  console.log('\n🔍 Validating Transaction Prices...\n');

  try {
    // Get all orders
    const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
    console.log(`📋 Total Orders: ${orders.length}\n`);

    let itemsWithIncorrectPrice = [];
    let ordersWithIncorrectTotal = [];
    let billsWithIncorrectAmount = [];

    // Check each order
    for (const order of orders) {
      // Get order items with menu prices
      const items = await db.all(
        `SELECT oi.*, p.price as menu_price, p.name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      if (items.length === 0) continue;

      // Check if any item has wrong price
      for (const item of items) {
        if (item.unit_price !== item.menu_price) {
          itemsWithIncorrectPrice.push({
            orderId: order.id,
            itemId: item.id,
            product: item.name,
            storedPrice: item.unit_price,
            menuPrice: item.menu_price,
            quantity: item.quantity,
            createdAt: order.created_at
          });
        }
      }

      // Calculate correct order total
      const correctTotal = sumTotalPrices(
        items.map(i => i.quantity * i.menu_price)
      );

      if (Math.abs(order.total_amount - correctTotal) > 0.01) {
        ordersWithIncorrectTotal.push({
          orderId: order.id,
          storedTotal: order.total_amount,
          correctTotal: correctTotal,
          difference: order.total_amount - correctTotal,
          itemCount: items.length,
          createdAt: order.created_at
        });
      }

      // Check bill if exists
      const bill = await db.get(
        'SELECT * FROM bills WHERE order_id = ?',
        [order.id]
      );

      if (bill && bill.total_amount !== order.total_amount) {
        billsWithIncorrectAmount.push({
          billId: bill.id,
          orderId: order.id,
          billAmount: bill.total_amount,
          orderAmount: order.total_amount,
          difference: bill.total_amount - order.total_amount
        });
      }
    }

    // Display Results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (itemsWithIncorrectPrice.length === 0) {
      console.log('✅ ORDER ITEMS: All prices match menu prices\n');
    } else {
      console.log(`⚠️  ORDER ITEMS: Found ${itemsWithIncorrectPrice.length} items with incorrect prices\n`);
      itemsWithIncorrectPrice.slice(0, 10).forEach(item => {
        console.log(`   Order: ${item.orderId}`);
        console.log(`   Product: ${item.product} (Qty: ${item.quantity})`);
        console.log(`   Stored: ₹${item.storedPrice}, Menu: ₹${item.menuPrice}`);
        console.log(`   Date: ${new Date(item.createdAt).toLocaleString('en-IN')}\n`);
      });
      if (itemsWithIncorrectPrice.length > 10) {
        console.log(`   ... and ${itemsWithIncorrectPrice.length - 10} more\n`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (ordersWithIncorrectTotal.length === 0) {
      console.log('✅ ORDERS: All totals are correctly calculated\n');
    } else {
      console.log(`⚠️  ORDERS: Found ${ordersWithIncorrectTotal.length} orders with incorrect totals\n`);
      ordersWithIncorrectTotal.slice(0, 10).forEach(order => {
        const sign = order.difference > 0 ? '+' : '';
        console.log(`   Order: ${order.orderId}`);
        console.log(`   Stored: ₹${order.storedTotal.toFixed(2)}, Correct: ₹${order.correctTotal.toFixed(2)}`);
        console.log(`   Difference: ${sign}₹${order.difference.toFixed(2)}`);
        console.log(`   Items: ${order.itemCount}, Date: ${new Date(order.createdAt).toLocaleString('en-IN')}\n`);
      });
      if (ordersWithIncorrectTotal.length > 10) {
        console.log(`   ... and ${ordersWithIncorrectTotal.length - 10} more\n`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (billsWithIncorrectAmount.length === 0) {
      console.log('✅ BILLS: All amounts match their orders\n');
    } else {
      console.log(`⚠️  BILLS: Found ${billsWithIncorrectAmount.length} bills with mismatched amounts\n`);
      billsWithIncorrectAmount.slice(0, 10).forEach(bill => {
        const sign = bill.difference > 0 ? '+' : '';
        console.log(`   Bill: ${bill.billId}`);
        console.log(`   Bill Amount: ₹${bill.billAmount.toFixed(2)}, Order Amount: ₹${bill.orderAmount.toFixed(2)}`);
        console.log(`   Difference: ${sign}₹${bill.difference.toFixed(2)}\n`);
      });
      if (billsWithIncorrectAmount.length > 10) {
        console.log(`   ... and ${billsWithIncorrectAmount.length - 10} more\n`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 SUMMARY:\n');
    console.log(`   Total Orders Checked: ${orders.length}`);
    console.log(`   Order Items with Wrong Prices: ${itemsWithIncorrectPrice.length}`);
    console.log(`   Orders with Wrong Totals: ${ordersWithIncorrectTotal.length}`);
    console.log(`   Bills with Wrong Amounts: ${billsWithIncorrectAmount.length}\n`);

    if (itemsWithIncorrectPrice.length === 0 &&
        ordersWithIncorrectTotal.length === 0 &&
        billsWithIncorrectAmount.length === 0) {
      console.log('🎉 All transaction prices are consistent and correct!\n');
    } else {
      console.log('💡 Run: node fix-transaction-prices.js\n   to fix all discrepancies\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during validation:', error);
    process.exit(1);
  }
}

// Run the validation
validateTransactionPrices();
