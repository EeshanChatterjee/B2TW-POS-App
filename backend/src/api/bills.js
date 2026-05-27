import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection.js';
import PrinterService from '../utils/printerService.js';

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
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.sendError('Order not found', 404);
    }

    // Get order items
    const itemsResult = await db.query(
      'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
      [order_id]
    );
    const items = itemsResult.rows;

    // Get customer info if available
    let customer = null;
    if (order.customer_id) {
      const customerResult = await db.query('SELECT * FROM customers WHERE id = $1', [order.customer_id]);
      customer = customerResult.rows[0];
    } else if (customer_phone) {
      const customerResult = await db.query('SELECT * FROM customers WHERE phone = $1', [customer_phone]);
      customer = customerResult.rows[0];
    }

    // Get next bill number
    const billCountResultQuery = await db.query('SELECT COUNT(*) as count FROM bills');
    const billCountResult = billCountResultQuery.rows[0];
    const bill_number = `B${String(billCountResult.count + 1).padStart(6, '0')}`;

    const billId = uuidv4();
    const now = new Date().toISOString();

    // Calculate GST breakdown
    let totalBaseAmount = 0;
    let totalGstAmount = 0;
    const itemsWithGst = items.map(item => {
      const itemBaseAmount = item.total_price / 1.05;
      const itemGstAmount = item.total_price - itemBaseAmount;
      totalBaseAmount += itemBaseAmount;
      totalGstAmount += itemGstAmount;

      return {
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        base_unit_price: parseFloat((item.unit_price / 1.05).toFixed(2)),
        total_price: item.total_price,
        base_total: parseFloat(itemBaseAmount.toFixed(2)),
        gst_total: parseFloat(itemGstAmount.toFixed(2))
      };
    });

    const subtotalBase = parseFloat(totalBaseAmount.toFixed(2));
    const gstAmount = parseFloat(totalGstAmount.toFixed(2));
    console.log('📋 Bill GST Breakdown:', { subtotalBase, gstAmount, total: order.total_amount, itemCount: items.length });

    // Create bill record
    await db.query(
      `INSERT INTO bills (id, order_id, bill_number, customer_id, total_amount, payment_method, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [billId, order_id, bill_number, order.customer_id || null, order.total_amount, order.payment_method, 'paid', now]
    );

    res.sendSuccess({
      bill_id: billId,
      bill_number,
      order_id,
      items: itemsWithGst,
      subtotal_base: subtotalBase,
      gst_amount: gstAmount,
      total_amount: order.total_amount,
      customer,
      message: 'Bill created successfully'
    }, 201);
  } catch (error) {
    res.sendError('Failed to create bill', 500, error.message);
  }
});

/**
 * GET /api/bills/held
 * Get all held bills
 */
router.get('/held', async (req, res) => {
  try {
    const db = await getDatabase();
    const { limit = 50, offset = 0 } = req.query;

    const heldBillsResult = await db.query(
      `SELECT b.*, bh.id as hold_id, bh.reason, bh.held_at, bh.notes
       FROM bills b
       JOIN bill_holds bh ON b.id = bh.bill_id
       WHERE b.status = 'held' AND bh.resumed_at IS NULL
       ORDER BY bh.held_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    const heldBills = heldBillsResult.rows;

    const countResultQuery = await db.query(
      `SELECT COUNT(*) as count FROM bills WHERE status = 'held'`
    );
    const countResult = countResultQuery.rows[0];

    res.sendSuccess({
      count: heldBills.length,
      total_held: countResult.count,
      bills: heldBills
    });
  } catch (error) {
    res.sendError('Failed to fetch held bills', 500, error.message);
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

    const billResult = await db.query(
      'SELECT * FROM bills WHERE id = $1',
      [id]
    );
    const bill = billResult.rows[0];

    if (!bill) {
      return res.sendError('Bill not found', 404);
    }

    // Get order and items
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [bill.order_id]);
    const order = orderResult.rows[0];
    const itemsResult = await db.query(
      'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
      [bill.order_id]
    );
    const items = itemsResult.rows;

    // Get customer info
    let customer = null;
    if (bill.customer_id) {
      const customerResult = await db.query('SELECT * FROM customers WHERE id = $1', [bill.customer_id]);
      customer = customerResult.rows[0];
    }

    // Calculate GST breakdown
    let totalBaseAmount = 0;
    let totalGstAmount = 0;
    const itemsWithGst = items.map(item => {
      const itemBaseAmount = item.total_price / 1.05;
      const itemGstAmount = item.total_price - itemBaseAmount;
      totalBaseAmount += itemBaseAmount;
      totalGstAmount += itemGstAmount;

      return {
        ...item,
        base_total: parseFloat(itemBaseAmount.toFixed(2)),
        gst_total: parseFloat(itemGstAmount.toFixed(2))
      };
    });

    res.sendSuccess({
      ...bill,
      items: itemsWithGst,
      subtotal_base: parseFloat(totalBaseAmount.toFixed(2)),
      gst_amount: parseFloat(totalGstAmount.toFixed(2)),
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
      query += ' AND status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    params.push(parseInt(limit), parseInt(offset));

    const billsResult = await db.query(query, params);
    const bills = billsResult.rows;

    // Calculate GST breakdown for each bill
    const billsWithGst = bills.map(bill => {
      const baseAmount = bill.total_amount / 1.05;
      const gstAmount = bill.total_amount - baseAmount;
      return {
        ...bill,
        subtotal_base: parseFloat(baseAmount.toFixed(2)),
        gst_amount: parseFloat(gstAmount.toFixed(2))
      };
    });

    res.sendSuccess({
      count: billsWithGst.length,
      bills: billsWithGst
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

    const billResult = await db.query('SELECT * FROM bills WHERE id = $1', [id]);
    const bill = billResult.rows[0];
    if (!bill) {
      return res.sendError('Bill not found', 404);
    }

    // Get bill details
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [bill.order_id]);
    const order = orderResult.rows[0];
    const itemsResult = await db.query(
      'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
      [bill.order_id]
    );
    const items = itemsResult.rows;

    let customer = null;
    if (bill.customer_id) {
      const customerResult = await db.query('SELECT * FROM customers WHERE id = $1', [bill.customer_id]);
      customer = customerResult.rows[0];
    }

    // Format bill data with GST splitting
    // All prices include 5% GST: base = price / 1.05, gst = price - base
    let totalBaseAmount = 0;
    let totalGstAmount = 0;

    const itemsWithGst = items.map(item => {
      const itemBaseAmount = item.total_price / 1.05;
      const itemGstAmount = item.total_price - itemBaseAmount;
      totalBaseAmount += itemBaseAmount;
      totalGstAmount += itemGstAmount;

      return {
        name: item.name,
        qty: item.quantity,
        price: item.unit_price,
        base_price: item.unit_price / 1.05,
        total: item.total_price,
        base_total: itemBaseAmount,
        gst_total: itemGstAmount
      };
    });

    const billData = {
      bill_number: bill.bill_number,
      date: new Date(bill.created_at).toLocaleString('en-IN'),
      items: itemsWithGst,
      subtotal_base: parseFloat(totalBaseAmount.toFixed(2)),
      gst_amount: parseFloat(totalGstAmount.toFixed(2)),
      total: order.total_amount,
      payment_method: order.payment_method,
      customer_name: customer?.name || 'Guest'
    };

    // Print bill (will log if printer not available)
    try {
      const printerPort = process.env.PRINTER_PORT || '/dev/ttyUSB0';
      const printer = new PrinterService(printerPort);

      if (await printer.initialize()) {
        await printer.printBill({
          bill_number: billData.bill_number,
          items: billData.items.map(item => ({
            product_name: item.name,
            quantity: item.qty,
            unit_price: item.price,
            base_total: item.base_total,
            gst_total: item.gst_total,
            total: item.total
          })),
          subtotal_base: billData.subtotal_base,
          gst_amount: billData.gst_amount,
          total: billData.total,
          customer_phone: customer?.phone
        });
      }
      printer.close();
    } catch (printerError) {
      console.warn('Printer warning:', printerError.message);
      // Continue even if printer fails - bill is still created
    }

    // Update bill updated_at timestamp
    await db.query(
      'UPDATE bills SET updated_at = $1 WHERE id = $2',
      [new Date().toISOString(), id]
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
 * POST /api/bills/:id/hold
 * Hold/pause a bill
 * Body: { reason, notes (optional) }
 */
router.post('/:id/hold', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.sendError('Hold reason is required', 400);
    }

    const billResult = await db.query('SELECT * FROM bills WHERE id = $1', [id]);
    const bill = billResult.rows[0];
    if (!bill) {
      return res.sendError('Bill not found', 404);
    }

    // Create hold record
    const holdId = uuidv4();
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO bill_holds (id, bill_id, reason, held_at, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [holdId, id, reason, now, notes || null, now, now]
    );

    // Update bill status to held
    await db.query(
      'UPDATE bills SET status = $1, updated_at = $2 WHERE id = $3',
      ['held', now, id]
    );

    res.sendSuccess({
      bill_id: id,
      hold_id: holdId,
      message: 'Bill held successfully'
    }, 201);
  } catch (error) {
    res.sendError('Failed to hold bill', 500, error.message);
  }
});

/**
 * POST /api/bills/:id/resume
 * Resume a held bill
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const billResult = await db.query('SELECT * FROM bills WHERE id = $1', [id]);
    const bill = billResult.rows[0];
    if (!bill) {
      return res.sendError('Bill not found', 404);
    }

    if (bill.status !== 'held') {
      return res.sendError('Bill is not on hold', 400);
    }

    // Get the current hold
    const holdResult = await db.query(
      `SELECT * FROM bill_holds WHERE bill_id = $1 AND resumed_at IS NULL ORDER BY held_at DESC LIMIT 1`,
      [id]
    );
    const hold = holdResult.rows[0];

    if (!hold) {
      return res.sendError('No active hold found for this bill', 400);
    }

    const now = new Date().toISOString();

    // Update hold to mark as resumed
    await db.query(
      'UPDATE bill_holds SET resumed_at = $1, updated_at = $2 WHERE id = $3',
      [now, now, hold.id]
    );

    // Update bill status back to paid
    await db.query(
      'UPDATE bills SET status = $1, updated_at = $2 WHERE id = $3',
      ['paid', now, id]
    );

    res.sendSuccess({
      bill_id: id,
      hold_id: hold.id,
      message: 'Bill resumed successfully'
    });
  } catch (error) {
    res.sendError('Failed to resume bill', 500, error.message);
  }
});

/**
/**
/**
 * GET /api/bills/:id/holds
 * Get hold history for a bill
 */
router.get('/:id/holds', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const billResult = await db.query('SELECT * FROM bills WHERE id = $1', [id]);
    const bill = billResult.rows[0];
    if (!bill) {
      return res.sendError('Bill not found', 404);
    }

    const holdsResult = await db.query(
      `SELECT * FROM bill_holds WHERE bill_id = $1 ORDER BY held_at DESC`,
      [id]
    );
    const holds = holdsResult.rows;

    res.sendSuccess({
      bill_id: id,
      bill_number: bill.bill_number,
      current_status: bill.status,
      holds: holds,
      total_holds: holds.length
    });
  } catch (error) {
    res.sendError('Failed to fetch bill holds', 500, error.message);
  }
});

export default router;
