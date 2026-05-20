import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection.js';
import { printBill } from '../utils/printerService.js';

const router = express.Router();

/**
 * POST /api/bills
 * Create a bill from an order
 * Body: { order_id, customer_phone (optional) }
 */
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { order_id, customer_phone } = req.body;

    if (!order_id) {
      return res.sendError('order_id is required', 400);
    }

    // Get order
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [order_id]);
    if (!order) {
      return res.sendError('Order not found', 404);
    }

    // Get order items
    const items = await db.all(
      'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [order_id]
    );

    // Get customer info if available
    let customer = null;
    if (order.customer_id) {
      customer = await db.get('SELECT * FROM customers WHERE id = ?', [order.customer_id]);
    } else if (customer_phone) {
      customer = await db.get('SELECT * FROM customers WHERE phone = ?', [customer_phone]);
    }

    // Get next bill number
    const billCountResult = await db.get('SELECT COUNT(*) as count FROM bills');
    const bill_number = `B${String(billCountResult.count + 1).padStart(6, '0')}`;

    const billId = uuidv4();
    const now = new Date().toISOString();

    // Create bill record
    await db.run(
      `INSERT INTO bills (id, order_id, bill_number, customer_id, total_amount, payment_method, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [billId, order_id, bill_number, order.customer_id || null, order.total_amount, order.payment_method, 'pending', now]
    );

    res.sendSuccess({
      bill_id: billId,
      bill_number,
      order_id,
      total_amount: order.total_amount,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })),
      customer,
      message: 'Bill created successfully'
    }, 201);
  } catch (error) {
    res.sendError('Failed to create bill', 500, error.message);
  }
});

/**
 * GET /api/bills/:id
 * Get bill details
 */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const bill = await db.get(
      'SELECT * FROM bills WHERE id = ?',
      [id]
    );

    if (!bill) {
      return res.sendError('Bill not found', 404);
    }

    // Get order and items
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [bill.order_id]);
    const items = await db.all(
      'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [bill.order_id]
    );

    // Get customer info
    let customer = null;
    if (bill.customer_id) {
      customer = await db.get('SELECT * FROM customers WHERE id = ?', [bill.customer_id]);
    }

    res.sendSuccess({
      ...bill,
      items,
      customer
    });
  } catch (error) {
    res.sendError('Failed to fetch bill', 500, error.message);
  }
});

/**
 * GET /api/bills
 * Get all bills with optional filters
 * Query params: status, limit, offset
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM bills WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const bills = await db.all(query, params);

    res.sendSuccess({
      count: bills.length,
      bills
    });
  } catch (error) {
    res.sendError('Failed to fetch bills', 500, error.message);
  }
});

/**
 * POST /api/bills/:id/print
 * Print a bill to the thermal printer
 */
router.post('/:id/print', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [id]);
    if (!bill) {
      return res.sendError('Bill not found', 404);
    }

    // Get bill details
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [bill.order_id]);
    const items = await db.all(
      'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [bill.order_id]
    );

    const customer = bill.customer_id
      ? await db.get('SELECT * FROM customers WHERE id = ?', [bill.customer_id])
      : null;

    // Format bill data
    const billData = {
      bill_number: bill.bill_number,
      date: new Date(bill.created_at).toLocaleString('en-IN'),
      items: items.map(item => ({
        name: item.name,
        qty: item.quantity,
        price: item.unit_price,
        total: item.total_price
      })),
      subtotal: order.total_amount,
      tax: 0, // TODO: Calculate tax if needed
      total: order.total_amount,
      payment_method: order.payment_method,
      customer_name: customer?.name || 'Guest'
    };

    // Print bill (will log if printer not available)
    try {
      await printBill(billData);
    } catch (printerError) {
      console.warn('Printer warning:', printerError.message);
      // Continue even if printer fails - bill is still created
    }

    // Update bill status
    await db.run(
      'UPDATE bills SET status = ?, printed_at = ?, updated_at = ? WHERE id = ?',
      ['printed', new Date().toISOString(), new Date().toISOString(), id]
    );

    res.sendSuccess({
      bill_id: id,
      message: 'Bill printed successfully'
    });
  } catch (error) {
    res.sendError('Failed to print bill', 500, error.message);
  }
});

/**
 * POST /api/bills/:id/cancel
 * Cancel a bill
 * Body: { reason (optional) }
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { reason } = req.body;

    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [id]);
    if (!bill) {
      return res.sendError('Bill not found', 404);
    }

    if (bill.status === 'cancelled') {
      return res.sendError('Bill is already cancelled', 400);
    }

    await db.run(
      'UPDATE bills SET status = ?, notes = ?, cancelled_at = ?, updated_at = ? WHERE id = ?',
      ['cancelled', reason || null, new Date().toISOString(), new Date().toISOString(), id]
    );

    res.sendSuccess({
      bill_id: id,
      message: 'Bill cancelled successfully'
    });
  } catch (error) {
    res.sendError('Failed to cancel bill', 500, error.message);
  }
});

export default router;
