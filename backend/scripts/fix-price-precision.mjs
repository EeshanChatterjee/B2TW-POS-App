import { getDatabase, closeDatabase } from '../src/db/connection.js';

console.log('🔧 Starting price precision fix for existing data...\n');

try {
  const db = await getDatabase('../data/pos.db');

  // Get all order_items
  console.log('📊 Fetching order_items data...');
  const orderItems = await db.all('SELECT * FROM order_items');
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
      await db.run(
        'UPDATE order_items SET total_price = ? WHERE id = ?',
        [correctedTotal, item.id]
      );
      itemsChanged++;
    }
    itemsFixed++;
  }

  console.log(`   ✅ ${itemsFixed} order items processed`);
  console.log(`   🔨 ${itemsChanged} order items corrected\n`);

  // Get all orders
  console.log('📊 Fetching orders data...');
  const orders = await db.all('SELECT * FROM orders');
  console.log(`   Found ${orders.length} orders\n`);

  // Fix each order total_amount
  console.log('🔄 Fixing orders total_amount...');
  let ordersFixed = 0;
  let ordersChanged = 0;

  for (const order of orders) {
    // Calculate sum of all order_items for this order
    const itemsResult = await db.get(
      'SELECT SUM(total_price) as total FROM order_items WHERE order_id = ?',
      [order.id]
    );

    let calculatedTotal = itemsResult?.total || 0;
    // Apply final rounding
    const correctedTotal = Math.round(calculatedTotal * 100) / 100;

    // Only update if value changed
    if (Math.abs(correctedTotal - order.total_amount) > 0.001) {
      await db.run(
        'UPDATE orders SET total_amount = ? WHERE id = ?',
        [correctedTotal, order.id]
      );
      ordersChanged++;
    }
    ordersFixed++;
  }

  console.log(`   ✅ ${ordersFixed} orders processed`);
  console.log(`   🔨 ${ordersChanged} orders corrected\n`);

  // Verify fixes
  console.log('✓ Verification Report:');
  const allItems = await db.all('SELECT * FROM order_items');
  let precisionErrors = 0;
  for (const item of allItems) {
    const expected = Math.round(item.quantity * item.unit_price * 100) / 100;
    if (Math.abs(item.total_price - expected) > 0.001) {
      precisionErrors++;
    }
  }

  const allOrders = await db.all('SELECT COUNT(*) as cnt FROM orders');
  const ordersWithItems = await db.get('SELECT COUNT(DISTINCT order_id) as cnt FROM order_items');

  console.log(`   • Total order items: ${allItems.length}`);
  console.log(`   • Precision errors remaining: ${precisionErrors}`);
  console.log(`   • Orders with items: ${ordersWithItems?.cnt || 0}`);
  console.log(`   • Total orders: ${allOrders[0]?.cnt || 0}\n`);

  // Sample output
  console.log('📋 Sample corrected items:');
  const samples = allItems.slice(0, 5);

  for (const sample of samples) {
    const expected = Math.round(sample.quantity * sample.unit_price * 100) / 100;
    console.log(`   ID: ${sample.id}`);
    console.log(`      Qty: ${sample.quantity}, Unit: ${sample.unit_price}, Total: ${sample.total_price}`);
    console.log(`      ✓ Matches expected: ${Math.abs(sample.total_price - expected) < 0.001}\n`);
  }

  console.log('✅ Price precision fix completed successfully!');
  await closeDatabase();
  process.exit(0);

} catch (error) {
  console.error('❌ Error during price precision fix:', error.message);
  console.error(error);
  process.exit(1);
}
