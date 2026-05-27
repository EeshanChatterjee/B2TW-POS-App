import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection.js';

const router = express.Router();

/**
 * GET /api/inventory
 * Get all product inventory
 * Query params: category, low_stock_only, limit, offset
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { category, low_stock_only, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT i.*, p.name, p.category, p.price,
             (i.current_stock <= i.min_stock) as is_low_stock,
             (i.current_stock = 0) as is_out_of_stock
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND p.category = $1';
      params.push(category);
    }

    if (low_stock_only === 'true') {
      query += ' AND (i.current_stock <= i.min_stock OR i.current_stock = 0)';
    }

    query += ' ORDER BY p.category, p.name LIMIT $1 OFFSET $2';
    params.push(parseInt(limit), parseInt(offset));

    const inventoryResult = await db.query(query, params);
    const inventory = inventoryResult.rows;

    // Count totals
    const countResultQuery = await db.query(
      'SELECT COUNT(*) as total FROM inventory'
    );
    const countResult = countResultQuery.rows[0] || { total: 0 };
    const lowStockResultQuery = await db.query(
      'SELECT COUNT(*) as count FROM inventory WHERE current_stock <= min_stock'
    );
    const lowStockResult = lowStockResultQuery.rows[0] || { count: 0 };

    res.sendSuccess({
      count: inventory.length,
      total_products: countResult.total,
      low_stock_count: lowStockResult.count,
      data: inventory
    });
  } catch (error) {
    res.sendError('Failed to fetch inventory', 500, error.message);
  }
});

/**
 * GET /api/inventory/:productId
 * Get inventory for a specific product
 */
router.get('/:productId', async (req, res) => {
  try {
    const db = await getDatabase();
    const { productId } = req.params;

    const inventoryResult = await db.query(
      `SELECT i.*, p.name, p.category, p.price
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.product_id = $1`,
      [productId]
    );
    const inventory = inventoryResult.rows[0];

    if (!inventory) {
      return res.sendError('Inventory not found', 404);
    }

    // Get recent logs
    const logsResult = await db.query(
      `SELECT * FROM inventory_logs WHERE product_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [productId]
    );
    const logs = logsResult.rows;

    res.sendSuccess({
      inventory,
      recent_logs: logs
    });
  } catch (error) {
    res.sendError('Failed to fetch inventory', 500, error.message);
  }
});

/**
 * POST /api/inventory/:productId/adjust
 * Adjust inventory for a product
 * Body: { quantity_change, reason, transaction_type }
 */
router.post('/:productId/adjust', async (req, res) => {
  try {
    const db = await getDatabase();
    const { productId } = req.params;
    const { quantity_change, reason, transaction_type = 'adjustment' } = req.body;

    if (quantity_change === undefined || quantity_change === null) {
      return res.sendError('quantity_change is required', 400);
    }

    if (!reason) {
      return res.sendError('reason is required', 400);
    }

    // Get current inventory
    const inventoryResult = await db.query(
      'SELECT * FROM inventory WHERE product_id = $1',
      [productId]
    );
    const inventory = inventoryResult.rows[0];

    if (!inventory) {
      return res.sendError('Product inventory not found', 404);
    }

    const previousStock = inventory.current_stock;
    const newStock = previousStock + quantity_change;

    if (newStock < 0) {
      return res.sendError('Insufficient stock - adjustment would result in negative inventory', 400);
    }

    // Update inventory
    const now = new Date().toISOString();
    await db.query(
      'UPDATE inventory SET current_stock = $1, updated_at = $2 WHERE product_id = $3',
      [newStock, now, productId]
    );

    // Log the transaction
    const logId = uuidv4();
    await db.query(
      `INSERT INTO inventory_logs (id, product_id, transaction_type, quantity_change, previous_stock, new_stock, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [logId, productId, transaction_type, quantity_change, previousStock, newStock, reason, now]
    );

    // Check for low stock and create alert if needed
    if (newStock <= inventory.min_stock && previousStock > inventory.min_stock) {
      const alertId = uuidv4();
      const alertType = newStock === 0 ? 'out_of_stock' : 'low_stock';
      await db.query(
        `INSERT INTO inventory_alerts (id, product_id, alert_type, current_stock, threshold_level, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [alertId, productId, alertType, newStock, inventory.min_stock, 1, now, now]
      );
    } else if (newStock > inventory.min_stock) {
      // Acknowledge any active low stock alerts
      await db.query(
        'UPDATE inventory_alerts SET is_active = false, acknowledged_at = $1 WHERE product_id = $2 AND is_active = true',
        [now, productId]
      );
    }

    res.sendSuccess({
      product_id: productId,
      previous_stock: previousStock,
      new_stock: newStock,
      change: quantity_change,
      log_id: logId,
      message: 'Inventory adjusted successfully'
    });
  } catch (error) {
    res.sendError('Failed to adjust inventory', 500, error.message);
  }
});

/**
 * GET /api/inventory/alerts/active
 * Get active low stock alerts
 */
router.get('/alerts/active', async (req, res) => {
  try {
    const db = await getDatabase();
    const { limit = 50, offset = 0 } = req.query;

    const alertsResult = await db.query(
      `SELECT ia.*, p.name, p.category, i.current_stock, i.min_stock
       FROM inventory_alerts ia
       JOIN products p ON ia.product_id = p.id
       JOIN inventory i ON ia.product_id = i.product_id
       WHERE ia.is_active = true
       ORDER BY ia.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    const alerts = alertsResult.rows;

    const countResultQuery = await db.query(
      'SELECT COUNT(*) as count FROM inventory_alerts WHERE is_active = true'
    );
    const countResult = countResultQuery.rows[0];

    res.sendSuccess({
      count: alerts.length,
      total_active: countResult.count,
      data: alerts
    });
  } catch (error) {
    res.sendError('Failed to fetch alerts', 500, error.message);
  }
});

/**
 * POST /api/inventory/alerts/:alertId/acknowledge
 * Acknowledge a low stock alert
 */
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const db = await getDatabase();
    const { alertId } = req.params;
    const { acknowledged_by } = req.body;

    const alertResult = await db.query(
      'SELECT * FROM inventory_alerts WHERE id = $1',
      [alertId]
    );
    const alert = alertResult.rows[0];

    if (!alert) {
      return res.sendError('Alert not found', 404);
    }

    const now = new Date().toISOString();
    await db.query(
      'UPDATE inventory_alerts SET is_active = false, acknowledged_at = $1, acknowledged_by = $2, updated_at = $3 WHERE id = $4',
      [now, acknowledged_by || null, now, alertId]
    );

    res.sendSuccess({
      alert_id: alertId,
      message: 'Alert acknowledged'
    });
  } catch (error) {
    res.sendError('Failed to acknowledge alert', 500, error.message);
  }
});

/**
 * GET /api/inventory/logs
 * Get inventory transaction logs with filters
 * Query params: product_id, transaction_type, days, limit, offset
 */
router.get('/logs/history', async (req, res) => {
  try {
    const db = await getDatabase();
    const { product_id, transaction_type, days = 30, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT il.*, p.name, p.category, au.username as adjusted_by_name
      FROM inventory_logs il
      JOIN products p ON il.product_id = p.id
      LEFT JOIN admin_users au ON il.adjusted_by = au.id
      WHERE il.created_at >= NOW() - INTERVAL '1 day' * $1
    `;
    const params = [parseInt(days)];

    if (product_id) {
      query += ' AND il.product_id = $' + (params.length + 1);
      params.push(product_id);
    }

    if (transaction_type) {
      query += ' AND il.transaction_type = $' + (params.length + 1);
      params.push(transaction_type);
    }

    query += ' ORDER BY il.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const logsResult = await db.query(query, params);
    const logs = logsResult.rows;

    res.sendSuccess({
      count: logs.length,
      days: parseInt(days),
      data: logs
    });
  } catch (error) {
    res.sendError('Failed to fetch logs', 500, error.message);
  }
});

/**
 * GET /api/inventory/categories
 * Get inventory summary by category
 */
router.get('/summary/categories', async (req, res) => {
  try {
    const db = await getDatabase();

    const categoriesResult = await db.query(
      `SELECT p.category,
              COUNT(DISTINCT i.product_id) as product_count,
              SUM(i.current_stock) as total_stock,
              AVG(i.current_stock) as avg_stock,
              COUNT(CASE WHEN i.current_stock <= i.min_stock THEN 1 END) as low_stock_count,
              COUNT(CASE WHEN i.current_stock = 0 THEN 1 END) as out_of_stock_count
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       GROUP BY p.category
       ORDER BY p.category`
    );
    const categories = categoriesResult.rows;

    res.sendSuccess({
      data: categories
    });
  } catch (error) {
    res.sendError('Failed to fetch category summary', 500, error.message);
  }
});

/**
 * POST /api/inventory/initialize
 * Initialize inventory for all products (admin only)
 * Body: { default_stock, min_stock, max_stock }
 */
router.post('/initialize', async (req, res) => {
  try {
    const db = await getDatabase();
    const { default_stock = 0, min_stock = 5, max_stock = 100 } = req.body;

    // Get all products without inventory
    const productsResult = await db.query(
      `SELECT id FROM products WHERE id NOT IN (SELECT product_id FROM inventory)`
    );
    const products = productsResult.rows;

    const now = new Date().toISOString();
    let createdCount = 0;

    for (const product of products) {
      const invId = uuidv4();
      await db.query(
        `INSERT INTO inventory (id, product_id, current_stock, min_stock, max_stock, reorder_level, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [invId, product.id, default_stock, min_stock, max_stock, Math.ceil(min_stock * 1.5), now, now]
      );
      createdCount++;
    }

    res.sendSuccess({
      initialized_count: createdCount,
      message: `Initialized inventory for ${createdCount} products`
    });
  } catch (error) {
    res.sendError('Failed to initialize inventory', 500, error.message);
  }
});

export default router;
