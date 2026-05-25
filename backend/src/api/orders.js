import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection.js';
import {
  roundToCents,
  calculateBasePrice,
  calculateGSTAmount,
  getPriceBreakdown,
  sumTotalPrices
} from '../utils/priceCalculations.js';

/**
 * Generate anonymous customer ID for walk-in customers
 * Format: CUSTYYYYMMDDXXX where XXX is a counter for that day
 */
async function generateAnonymousCustomerId(db) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

  // Count existing customers for this date
  const result = await db.get(
    `SELECT COUNT(*) as count FROM customers
     WHERE id LIKE $1 || '%'`,
    [`CUST${dateStr}`]
  );

  const counter = (result?.count || 0) + 1;
  const customerId = `CUST${dateStr}${String(counter).padStart(3, '0')}`;

  return customerId;
}

/**
 * Format order item with price breakdown (base + GST calculated on-the-fly)
 * @param {Object} item - Order item from database
 * @returns {Object} Formatted item with total_price and breakdown
 */
function formatOrderItem(item) {
  const breakdown = getPriceBreakdown(item.total_price);
  return {
    ...item,
    total_price: item.total_price,
    base_price: breakdown.base_price,
    gst_amount: breakdown.gst_amount
  };
}

/**
 * Format order with price breakdown (base + GST calculated on-the-fly)
 * @param {Object} order - Order from database
 * @returns {Object} Formatted order with total_price and breakdown
 */
function formatOrder(order) {
  const breakdown = getPriceBreakdown(order.total_amount);
  return {
    ...order,
    total_price: order.total_amount,
    base_price: breakdown.base_price,
    gst_amount: breakdown.gst_amount
  };
}

// Validation helper
function validateOrderRequest(req, res) {
  const { items, payment_method } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.sendError('Order must contain at least one item', 400);
    return false;
  }

  if (!payment_method) {
    res.sendError('Payment method is required', 400);
    return false;
  }

  for (const item of items) {
    if (!item.product_id || item.quantity === undefined || item.price === undefined) {
      res.sendError('Each item must have product_id, quantity, and price', 400);
      return false;
    }
  }

  return true;
}

const router = express.Router();

/**
 * POST /api/orders
 * Create a new order
 * Body: { items: [{ product_id, quantity, price }], customer_id (optional), payment_method }
 */
router.post('/', async (req, res) => {
  try {
    // Validate request
    if (!validateOrderRequest(req, res)) {
      return;
    }

    const db = await getDatabase();
    let { items, customer_id, payment_method } = req.body;

    const orderId = uuidv4();
    const now = new Date().toISOString();
    let total_amount = 0;

    // Generate anonymous customer ID if not provided
    if (!customer_id) {
      customer_id = await generateAnonymousCustomerId(db);

      // Create customer record for this anonymous customer
      await db.run(
        `INSERT INTO customers (id, name, created_at)
         VALUES ($1, $2, $3)`,
        [customer_id, 'Walk-in Customer', now]
      );
    }

    // Create order record
    await db.run(
      `INSERT INTO orders (id, customer_id, payment_method, status, total_amount, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [orderId, customer_id, payment_method, 'pending', 0, now, now]
    );

    // Add order items and calculate total
    // All prices are stored and communicated as total_price (GST-inclusive)
    for (const item of items) {
      // Use cents-based rounding to prevent floating-point precision errors
      const itemTotal = roundToCents(item.quantity * item.price);
      total_amount += itemTotal;

      const itemId = uuidv4();
      await db.run(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [itemId, orderId, item.product_id, item.quantity, item.price, itemTotal, now]
      );
    }

    // Use sumTotalPrices for safe aggregation to prevent floating-point errors
    const roundedTotal = sumTotalPrices([total_amount]);

    // Update order total
    await db.run(
      'UPDATE orders SET total_amount = $1, updated_at = $2 WHERE id = $3',
      [roundedTotal, now, orderId]
    );

    const priceBreakdown = getPriceBreakdown(roundedTotal);

    res.sendSuccess({
      order_id: orderId,
      total_price: roundedTotal,
      ...priceBreakdown,
      status: 'pending',
      message: 'Order created successfully'
    }, 201);
  } catch (error) {
    console.error('Order creation error:', error);
    res.sendError('Failed to create order', 500, error.message);
  }
});

/**
 * GET /api/orders/:id
 * Get order details with items
 */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const order = await db.get(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (!order) {
      return res.sendError('Order not found', 404);
    }

    const items = await db.all(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );

    const formattedOrder = formatOrder(order);
    const formattedItems = items.map(item => formatOrderItem(item));

    res.sendSuccess({
      ...formattedOrder,
      items: formattedItems
    });
  } catch (error) {
    res.sendError('Failed to fetch order', 500, error.message);
  }
});

/**
 * GET /api/orders
 * Get all orders with optional filters
 * Query params: status (pending/completed/cancelled), customer_id, limit, offset
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { status, customer_id, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = $1';
      params.push(status);
    }

    if (customer_id) {
      query += ' AND customer_id = $1';
      params.push(customer_id);
    }

    query += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    params.push(parseInt(limit), parseInt(offset));

    const orders = await db.all(query, params);
    const formattedOrders = orders.map(order => formatOrder(order));

    res.sendSuccess({
      count: formattedOrders.length,
      orders: formattedOrders
    });
  } catch (error) {
    res.sendError('Failed to fetch orders', 500, error.message);
  }
});

/**
 * PUT /api/orders/:id
 * Update order status
 * Body: { status: 'pending' | 'completed' | 'cancelled' }
 */
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.sendError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const order = await db.get('SELECT * FROM orders WHERE id = $1', [id]);
    if (!order) {
      return res.sendError('Order not found', 404);
    }

    await db.run(
      'UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3',
      [status, new Date().toISOString(), id]
    );

    res.sendSuccess({ message: `Order marked as ${status}` });
  } catch (error) {
    res.sendError('Failed to update order', 500, error.message);
  }
});

/**
 * POST /api/orders/:id/complete
 * Mark order as completed
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const order = await db.get('SELECT * FROM orders WHERE id = $1', [id]);
    if (!order) {
      return res.sendError('Order not found', 404);
    }

    await db.run(
      'UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3',
      ['completed', new Date().toISOString(), id]
    );

    res.sendSuccess({ message: 'Order completed' });
  } catch (error) {
    res.sendError('Failed to complete order', 500, error.message);
  }
});

/**
 * POST /api/orders/:id/print-kot
 * Print Kitchen Order Ticket (KOT) for an order
 */
router.post('/:id/print-kot', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const order = await db.get('SELECT * FROM orders WHERE id = $1', [id]);
    if (!order) {
      return res.sendError('Order not found', 404);
    }

    const items = await db.all(
      'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
      [id]
    );

    // Log KOT (Kitchen Order Ticket) print request
    console.log('🖨️ KOT Print Request:', {
      order_id: id,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity
      })),
      timestamp: new Date().toISOString()
    });

    // Create KOT log entry
    const kotId = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO kot_logs (id, order_id, status, printed_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [kotId, id, 'printed', now, now]
    );

    res.sendSuccess({
      message: 'KOT printed successfully',
      kot_id: kotId,
      order_id: id,
      item_count: items.length
    });
  } catch (error) {
    res.sendError('Failed to print KOT', 500, error.message);
  }
});

export default router;
