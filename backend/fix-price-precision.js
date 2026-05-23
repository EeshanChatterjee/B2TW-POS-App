import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../data/pos.db');

console.log('🔧 Starting price precision fix for existing data...\n');

try {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Get all order_items
  console.log('📊 Fetching order_items data...');
  const orderItems = db.prepare('SELECT * FROM order_items').all();
  console.log(`   Found ${orderItems.length} order items\n`);

  // Fix each order_item
  console.log('🔄 Fixing order_items precision...');
  let itemsFixed = 0;
  let itemsChanged = 0;

  for (const item of orderItems) {
    // Apply cents-based rounding
    const itemCents = Math.round(item.quantity * item.unit_price * 100);
    const correctedTotal = itemCents / 100;

    // Only update if value changed
    if (Math.abs(correctedTotal - item.total_price) > 0.001) {
      db.prepare(
        'UPDATE order_items SET total_price = ? WHERE id = ?'
      ).run(correctedTotal, item.id);
      itemsChanged++;
    }
    itemsFixed++;
  }

  console.log(`   ✅ ${itemsFixed} order items processed`);
  console.log(`   🔨 ${itemsChanged} order items corrected\n`);

  // Get all orders
  console.log('📊 Fetching orders data...');
  const orders = db.prepare('SELECT * FROM orders').all();
  console.log(`   Found ${orders.length} orders\n`);

  // Fix each order total_amount
  console.log('🔄 Fixing orders total_amount...');
  let ordersFixed = 0;
  let ordersChanged = 0;

  for (const order of orders) {
    // Calculate sum of all order_items for this order
    const itemsResult = db.prepare(
      'SELECT SUM(total_price) as total FROM order_items WHERE order_id = ?'
    ).get(order.id);

    let calculatedTotal = itemsResult?.total || 0;
    // Apply final rounding
    const correctedTotal = Math.round(calculatedTotal * 100) / 100;

    // Only update if value changed
    if (Math.abs(correctedTotal - order.total_amount) > 0.001) {
      db.prepare(
        'UPDATE orders SET total_amount = ? WHERE id = ?'
      ).run(correctedTotal, order.id);
      ordersChanged++;
    }
    ordersFixed++;
  }

  console.log(`   ✅ ${ordersFixed} orders processed`);
  console.log(`   🔨 ${ordersChanged} orders corrected\n`);

  // Verify fixes
  console.log('✓ Verification Report:');
  const verification = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM order_items) as total_items,
      (SELECT COUNT(*) FROM order_items
       WHERE ABS(total_price - (ROUND(quantity * unit_price * 100.0) / 100.0)) > 0.001) as precision_errors,
      (SELECT COUNT(DISTINCT order_id) FROM order_items) as orders_with_items,
      (SELECT COUNT(*) FROM orders) as total_orders
  `).get();

  console.log(`   • Total order items: ${verification.total_items}`);
  console.log(`   • Precision errors remaining: ${verification.precision_errors}`);
  console.log(`   • Orders with items: ${verification.orders_with_items}`);
  console.log(`   • Total orders: ${verification.total_orders}\n`);

  // Sample output
  console.log('📋 Sample corrected items:');
  const samples = db.prepare(
    'SELECT id, quantity, unit_price, total_price FROM order_items LIMIT 5'
  ).all();

  for (const sample of samples) {
    const expected = Math.round(sample.quantity * sample.unit_price * 100) / 100;
    console.log(`   ID: ${sample.id}`);
    console.log(`      Qty: ${sample.quantity}, Unit: ${sample.unit_price}, Total: ${sample.total_price}`);
    console.log(`      ✓ Matches expected: ${Math.abs(sample.total_price - expected) < 0.001}\n`);
  }

  console.log('✅ Price precision fix completed successfully!');
  db.close();

} catch (error) {
  console.error('❌ Error during price precision fix:', error.message);
  process.exit(1);
}
