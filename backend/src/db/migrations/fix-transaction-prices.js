/**
 * Fix Transaction Prices Migration
 *
 * This script ensures that:
 * 1. All order_items unit_price matches current menu prices
 * 2. All order_items total_price is recalculated correctly (quantity * unit_price)
 * 3. All orders total_amount is recalculated from sum of order_items total_price
 * 4. All bills total_amount matches their corresponding orders
 *
 * Run with: node fix-transaction-prices.js
 */

import { getDatabase } from '../connection.js';
import { roundToCents, sumTotalPrices } from '../../utils/priceCalculations.js';

async function fixTransactionPrices() {
  const db = await getDatabase();
  const now = new Date().toISOString();

  console.log('🔧 Starting transaction price fix...\n');

  try {
    // Step 1: Get all orders with their items
    console.log('📋 Fetching all orders and items...');
    const orders = await db.all(
      `SELECT id FROM orders ORDER BY created_at DESC`
    );
    console.log(`   Found ${orders.length} orders\n`);

    let fixedOrderItems = 0;
    let fixedOrders = 0;
    let fixedBills = 0;

    // Step 2: Fix each order
    for (const order of orders) {
      const orderId = order.id;

      // Get all items in this order
      const items = await db.all(
        `SELECT oi.*, p.price as menu_price
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );

      if (items.length === 0) continue;

      // Update each item to match menu price
      let orderItemsTotalPrice = 0;

      for (const item of items) {
        const newUnitPrice = item.menu_price;
        const newTotalPrice = roundToCents(item.quantity * newUnitPrice);

        // Update order_item if price changed
        if (item.unit_price !== newUnitPrice || item.total_price !== newTotalPrice) {
          await db.run(
            `UPDATE order_items
             SET unit_price = ?, total_price = ?
             WHERE id = ?`,
            [newUnitPrice, newTotalPrice, item.id]
          );
          fixedOrderItems++;
          console.log(`   ✓ Fixed item ${item.id}: ₹${item.unit_price} → ₹${newUnitPrice}`);
        }

        orderItemsTotalPrice += newTotalPrice;
      }

      // Step 3: Recalculate order total_amount from order items
      const correctOrderTotal = sumTotalPrices([orderItemsTotalPrice]);

      // Get current order total
      const currentOrder = await db.get(
        `SELECT total_amount FROM orders WHERE id = ?`,
        [orderId]
      );

      if (currentOrder.total_amount !== correctOrderTotal) {
        await db.run(
          `UPDATE orders
           SET total_amount = ?, updated_at = ?
           WHERE id = ?`,
          [correctOrderTotal, now, orderId]
        );
        fixedOrders++;
        console.log(`   ✓ Fixed order ${orderId}: ₹${currentOrder.total_amount} → ₹${correctOrderTotal}`);
      }

      // Step 4: Update corresponding bill if exists
      const bill = await db.get(
        `SELECT id, total_amount FROM bills WHERE order_id = ?`,
        [orderId]
      );

      if (bill && bill.total_amount !== correctOrderTotal) {
        await db.run(
          `UPDATE bills
           SET total_amount = ?, updated_at = ?
           WHERE id = ?`,
          [correctOrderTotal, now, bill.id]
        );
        fixedBills++;
        console.log(`   ✓ Fixed bill ${bill.id}: ₹${bill.total_amount} → ₹${correctOrderTotal}`);
      }
    }

    // Summary Report
    console.log('\n✅ Migration Complete!\n');
    console.log('📊 Summary:');
    console.log(`   • Order Items Fixed: ${fixedOrderItems}`);
    console.log(`   • Orders Fixed: ${fixedOrders}`);
    console.log(`   • Bills Fixed: ${fixedBills}`);
    console.log(`   • Total Orders Checked: ${orders.length}\n`);

    // Verification step
    console.log('🔍 Verification...');

    // Check for any discrepancies
    const discrepancies = await db.all(
      `SELECT
         oi.order_id,
         SUM(oi.total_price) as calculated_total,
         o.total_amount as stored_total
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       GROUP BY oi.order_id
       HAVING ABS(calculated_total - stored_total) > 0.01
       LIMIT 10`
    );

    if (discrepancies.length === 0) {
      console.log('   ✓ No discrepancies found - all prices are consistent!\n');
    } else {
      console.log(`   ⚠️  Found ${discrepancies.length} discrepancies:\n`);
      discrepancies.forEach(d => {
        console.log(`      Order ${d.order_id}: calc ₹${d.calculated_total}, stored ₹${d.stored_total}`);
      });
    }

    console.log('\n✨ All transaction prices are now synced with menu prices!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
fixTransactionPrices();
