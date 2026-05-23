import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

/**
 * Forward-fill transaction data from May through today
 * Analyzes existing patterns and generates synthetic data for missing dates
 */
export async function forwardFillTransactions(dbPath = './data/pos.db') {
  let database = null;
  try {
    console.log('📊 Analyzing May transaction patterns...');

    database = new Database(dbPath);
    database.pragma('foreign_keys = ON');

    // Get all existing orders
    const existingOrders = database.prepare(`
      SELECT o.id, o.customer_id, o.total_amount, o.status, o.payment_method, o.created_at
      FROM orders o
      ORDER BY o.created_at
    `).all();

    // Get all order items
    const existingItems = database.prepare(`
      SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price
      FROM order_items oi
    `).all();

    // Get all products
    const products = database.prepare('SELECT id, name, price FROM products').all();

    console.log(`Found ${existingOrders.length} orders and ${existingItems.length} order items`);

    // Analyze daily patterns
    const dailyStats = {};
    existingOrders.forEach(order => {
      const date = order.created_at.split(' ')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          orders: [],
          totalRevenue: 0,
          paymentMethods: {},
          itemCount: 0
        };
      }
      dailyStats[date].orders.push(order);
      dailyStats[date].totalRevenue += order.total_amount;
      dailyStats[date].paymentMethods[order.payment_method] = (dailyStats[date].paymentMethods[order.payment_method] || 0) + 1;
    });

    // Count items per order
    existingItems.forEach(item => {
      const order = existingOrders.find(o => o.id === item.order_id);
      if (order) {
        const date = order.created_at.split(' ')[0];
        dailyStats[date].itemCount += item.quantity;
      }
    });

    // Calculate averages
    const dates = Object.keys(dailyStats).sort();
    const avgOrdersPerDay = existingOrders.length / dates.length;
    const avgRevenuePerDay = existingOrders.reduce((sum, o) => sum + o.total_amount, 0) / dates.length;
    const avgPaymentMethods = {};

    Object.keys(dailyStats).forEach(date => {
      Object.entries(dailyStats[date].paymentMethods).forEach(([method, count]) => {
        avgPaymentMethods[method] = (avgPaymentMethods[method] || 0) + count;
      });
    });

    // Normalize payment methods
    const totalPayments = Object.values(avgPaymentMethods).reduce((a, b) => a + b, 0);
    Object.keys(avgPaymentMethods).forEach(method => {
      avgPaymentMethods[method] = avgPaymentMethods[method] / totalPayments;
    });

    // Get product usage patterns
    const productUsage = {};
    existingItems.forEach(item => {
      if (!productUsage[item.product_id]) {
        productUsage[item.product_id] = { count: 0, totalPrice: 0 };
      }
      productUsage[item.product_id].count += item.quantity;
      productUsage[item.product_id].totalPrice += item.total_price;
    });

    console.log(`\n📈 Pattern Analysis:`);
    console.log(`   Avg orders/day: ${avgOrdersPerDay.toFixed(1)}`);
    console.log(`   Avg revenue/day: ₹${avgRevenuePerDay.toFixed(2)}`);
    console.log(`   Payment methods: ${Object.entries(avgPaymentMethods).map(([m, p]) => `${m} ${(p*100).toFixed(0)}%`).join(', ')}`);

    // Determine date range (April 1 through today)
    const startDate = new Date('2026-04-01');
    const today = new Date('2026-05-23');

    console.log(`\n📅 Filling data from ${startDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}...`);

    // Generate data for missing dates
    let generatedOrders = 0;
    let generatedItems = 0;
    const failedRows = [];

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      if (dailyStats[dateStr]) {
        console.log(`⊘ ${dateStr} - already has data`);
        continue;
      }

      // Generate orders for this day
      const ordersForDay = Math.round(avgOrdersPerDay + (Math.random() - 0.5) * 2);

      for (let i = 0; i < ordersForDay; i++) {
        try {
          const orderId = randomUUID();
          const hour = Math.floor(Math.random() * 22) + 1; // 1-22
          const minute = Math.floor(Math.random() * 60);
          const second = Math.floor(Math.random() * 60);
          const timestamp = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

          // Select payment method based on distribution
          const rand = Math.random();
          let paymentMethod = 'cash';
          let cumulative = 0;
          for (const [method, prob] of Object.entries(avgPaymentMethods)) {
            cumulative += prob;
            if (rand < cumulative) {
              paymentMethod = method;
              break;
            }
          }

          // Generate order items
          const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
          let orderTotal = 0;
          const items = [];

          for (let j = 0; j < itemCount; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 of each
            const itemTotal = quantity * product.price;
            items.push({
              id: randomUUID(),
              product_id: product.id,
              quantity,
              unit_price: product.price,
              total_price: itemTotal
            });
            orderTotal += itemTotal;
          }

          // Insert order
          database.prepare(`
            INSERT INTO orders (id, total_amount, status, payment_method, created_at, updated_at)
            VALUES (?, ?, 'completed', ?, ?, ?)
          `).run(orderId, orderTotal, paymentMethod, timestamp, timestamp);

          generatedOrders++;

          // Insert order items
          items.forEach(item => {
            database.prepare(`
              INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(item.id, orderId, item.product_id, item.quantity, item.unit_price, item.total_price, timestamp);
            generatedItems++;
          });

        } catch (err) {
          failedRows.push({ error: err.message });
        }
      }

      console.log(`✓ ${dateStr} - generated ${ordersForDay} orders`);
    }

    // Summary
    const finalStats = database.prepare(`
      SELECT
        COUNT(DISTINCT DATE(created_at)) as days,
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
    `).get();

    console.log(`\n✅ Forward-fill complete:`);
    console.log(`   ✓ Generated: ${generatedOrders} orders, ${generatedItems} items`);
    console.log(`   ✗ Failed: ${failedRows.length}`);

    console.log(`\n📊 Updated Database Summary:`);
    console.log(`   Days with data: ${finalStats.days}`);
    console.log(`   Total orders: ${finalStats.total_orders}`);
    console.log(`   Total revenue: ₹${finalStats.total_revenue?.toFixed(2) || '0.00'}`);
    console.log(`   Avg order value: ₹${finalStats.avg_order_value?.toFixed(2) || '0.00'}`);

  } catch (error) {
    console.error('❌ Forward-fill failed:', error);
    throw error;
  } finally {
    if (database) {
      database.close();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  forwardFillTransactions().catch(console.error);
}

export default forwardFillTransactions;
