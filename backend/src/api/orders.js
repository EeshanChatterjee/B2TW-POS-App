import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection.js';

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
    const { items, customer_id, payment_method } = req.body;

    const orderId = uuidv4();
    const now = new Date().toISOString();
    let total_amount = 0;

    // Create order record
    await db.run(
      `INSERT INTO orders (id, customer_id, payment_method, status, total_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, customer_id || null, payment_method, 'pending', 0, now, now]
    );

    // Add order items and calculate total
    for (const item of items) {
      const itemTotal = item.quantity * item.price;
      total_amount += itemTotal;

      const itemId = uuidv4();
      await db.run(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, orderId, item.product_id, item.quantity, item.price, itemTotal, now]
      );
    }

    // Update order total
    await db.run(
      'UPDATE orders SET total_amount = ?, updated_at = ? WHERE id = ?',
      [total_amount, now, orderId]
    );

    res.sendSuccess({
      order_id: orderId,
      total_amount,
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
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    if (!order) {
      return res.sendError('Order not found', 404);
    }

    const items = await db.all(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    res.sendSuccess({
      ...order,
      items
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
      query += ' AND status = ?';
      params.push(status);
    }

    if (customer_id) {
      query += ' AND customer_id = ?';
      params.push(customer_id);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const orders = await db.all(query, params);

    res.sendSuccess({
      count: orders.length,
      orders
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

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.sendError('Order not found', 404);
    }

    await db.run(
      'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
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

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.sendError('Order not found', 404);
    }

    await db.run(
      'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
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

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.sendError('Order not found', 404);
    }

    const items = await db.all(
      'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
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
       VALUES (?, ?, ?, ?, ?)`,
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
