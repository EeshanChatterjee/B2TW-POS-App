import express from 'express';
import { getDatabase } from '../db/connection.js';

const router = express.Router();

/**
 * GET /api/customers/search
 * Search for customers by phone number or name
 * Query params: q (required) - search query (phone or name)
 */
router.get('/search', async (req, res) => {
  try {
    const db = await getDatabase();
    const { q } = req.query;

    if (!q) {
      return res.sendSuccess({
        count: 0,
        customers: []
      });
    }

    // Search by phone (exact match or prefix) or name (contains)
    const customers = await db.all(
      `SELECT id, name, phone FROM customers
       WHERE is_active = 1
       AND (phone LIKE ? OR name LIKE ?)
       ORDER BY phone`,
      [`${q}%`, `%${q}%`]
    );

    res.sendSuccess({
      count: customers.length,
      customers
    });
  } catch (error) {
    res.sendError('Failed to search customers', 500, error.message);
  }
});

/**
 * GET /api/customers/:id
 * Get a single customer by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const customer = await db.get(
      'SELECT * FROM customers WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!customer) {
      return res.sendError('Customer not found', 404);
    }

    res.sendSuccess(customer);
  } catch (error) {
    res.sendError('Failed to fetch customer', 500, error.message);
  }
});

/**
 * GET /api/customers/phone/:phone
 * Get a customer by phone number
 */
router.get('/phone/:phone', async (req, res) => {
  try {
    const db = await getDatabase();
    const { phone } = req.params;

    const customer = await db.get(
      'SELECT * FROM customers WHERE phone = ? AND is_active = 1',
      [phone]
    );

    if (!customer) {
      return res.sendSuccess(null);
    }

    res.sendSuccess(customer);
  } catch (error) {
    res.sendError('Failed to fetch customer by phone', 500, error.message);
  }
});

/**
 * POST /api/customers
 * Create a new customer
 * Body: { phone (required), name (optional), email (optional) }
 */
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { phone, name, email } = req.body;

    if (!phone) {
      return res.sendError('Phone number is required', 400);
    }

    // Check if customer with this phone already exists
    const existing = await db.get(
      'SELECT id FROM customers WHERE phone = ?',
      [phone]
    );

    if (existing) {
      return res.sendError('Customer with this phone already exists', 409);
    }

    const customerId = `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await db.run(
      `INSERT INTO customers (id, phone, name, email, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [customerId, phone, name || null, email || null]
    );

    const customer = await db.get(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );

    res.sendSuccess(customer);
  } catch (error) {
    res.sendError('Failed to create customer', 500, error.message);
  }
});

/**
 * PUT /api/customers/:id
 * Update a customer
 */
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { name, email } = req.body;

    const customer = await db.get(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    if (!customer) {
      return res.sendError('Customer not found', 404);
    }

    await db.run(
      `UPDATE customers SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name || customer.name, email || customer.email, id]
    );

    const updated = await db.get(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    res.sendSuccess(updated);
  } catch (error) {
    res.sendError('Failed to update customer', 500, error.message);
  }
});

/**
 * GET /api/customers/:id/history
 * Get order history for a customer
 */
router.get('/:id/history', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const customer = await db.get(
      'SELECT * FROM customers WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!customer) {
      return res.sendError('Customer not found', 404);
    }

    const orders = await db.all(
      `SELECT o.id, o.total_amount, o.payment_method, o.status, o.created_at
       FROM orders o
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC
       LIMIT 20`,
      [id]
    );

    res.sendSuccess({
      customer,
      orders,
      order_count: orders.length
    });
  } catch (error) {
    res.sendError('Failed to fetch customer history', 500, error.message);
  }
});

export default router;
