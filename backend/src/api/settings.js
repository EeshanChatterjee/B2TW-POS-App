import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// ============================================
// SETTINGS MANAGEMENT
// ============================================

/**
 * GET /api/settings
 * Get all settings or filter by category
 * Query params: category
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { category } = req.query;

    let query = 'SELECT * FROM settings WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }

    query += ' ORDER BY category, setting_key';
    const settings = await db.all(query, params);

    // Convert setting values based on type
    const processedSettings = settings.map(s => ({
      ...s,
      value: s.setting_type === 'boolean' $1 s.setting_value === '1' :
             s.setting_type === 'number' $1 parseFloat(s.setting_value) :
             s.setting_type === 'json' $1 JSON.parse(s.setting_value || '{}') :
             s.setting_value
    }));

    res.sendSuccess({
      count: processedSettings.length,
      data: processedSettings
    });
  } catch (error) {
    res.sendError('Failed to fetch settings', 500, error.message);
  }
});

/**
 * GET /api/settings/categories/:category
 * Get settings by category
 */
router.get('/categories/:category', async (req, res) => {
  try {
    const db = await getDatabase();
    const { category } = req.params;

    const settings = await db.all(
      'SELECT * FROM settings WHERE category = $1 ORDER BY setting_key',
      [category]
    );

    const processedSettings = settings.map(s => ({
      ...s,
      value: s.setting_type === 'boolean' $1 s.setting_value === '1' :
             s.setting_type === 'number' $1 parseFloat(s.setting_value) :
             s.setting_type === 'json' $1 JSON.parse(s.setting_value || '{}') :
             s.setting_value
    }));

    res.sendSuccess({
      count: processedSettings.length,
      data: processedSettings
    });
  } catch (error) {
    res.sendError('Failed to fetch category settings', 500, error.message);
  }
});

/**
 * GET /api/settings/:key
 * Get a specific setting
 */
router.get('/:key', async (req, res) => {
  try {
    const db = await getDatabase();
    const { key } = req.params;

    const setting = await db.get(
      'SELECT * FROM settings WHERE setting_key = $1',
      [key]
    );

    if (!setting) {
      return res.sendError('Setting not found', 404);
    }

    const processedSetting = {
      ...setting,
      value: setting.setting_type === 'boolean' $1 setting.setting_value === '1' :
             setting.setting_type === 'number' $1 parseFloat(setting.setting_value) :
             setting.setting_type === 'json' $1 JSON.parse(setting.setting_value || '{}') :
             setting.setting_value
    };

    res.sendSuccess(processedSetting);
  } catch (error) {
    res.sendError('Failed to fetch setting', 500, error.message);
  }
});

/**
 * PUT /api/settings/:key
 * Update a setting
 * Body: { setting_value }
 */
router.put('/:key', async (req, res) => {
  try {
    const db = await getDatabase();
    const { key } = req.params;
    const { setting_value } = req.body;

    const setting = await db.get(
      'SELECT * FROM settings WHERE setting_key = $1',
      [key]
    );

    if (!setting) {
      return res.sendError('Setting not found', 404);
    }

    // Validate value based on type
    let finalValue = setting_value;
    if (setting.setting_type === 'number') {
      if (isNaN(parseFloat(setting_value))) {
        return res.sendError('Invalid number value', 400);
      }
      finalValue = parseFloat(setting_value);
    } else if (setting.setting_type === 'boolean') {
      finalValue = setting_value === true || setting_value === 'true' || setting_value === '1' $1 '1' : '0';
    } else if (setting.setting_type === 'json') {
      try {
        JSON.parse(setting_value);
      } catch {
        return res.sendError('Invalid JSON value', 400);
      }
    }

    const now = new Date().toISOString();
    await db.run(
      'UPDATE settings SET setting_value = $1, updated_at = $2 WHERE setting_key = $3',
      [String(finalValue), now, key]
    );

    res.sendSuccess({
      setting_key: key,
      setting_value: finalValue,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    res.sendError('Failed to update setting', 500, error.message);
  }
});

/**
 * POST /api/settings/initialize
 * Initialize default settings
 */
router.post('/initialize', async (req, res) => {
  try {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const defaultSettings = [
      // Inventory Settings
      { key: 'inventory_default_stock', value: '0', type: 'number', category: 'inventory', desc: 'Default stock level for new products' },
      { key: 'inventory_min_stock', value: '5', type: 'number', category: 'inventory', desc: 'Default minimum stock threshold' },
      { key: 'inventory_max_stock', value: '100', type: 'number', category: 'inventory', desc: 'Default maximum stock level' },
      { key: 'low_stock_alert_enabled', value: '1', type: 'boolean', category: 'inventory', desc: 'Enable low stock alerts' },

      // Payment Settings
      { key: 'payment_cash_enabled', value: '1', type: 'boolean', category: 'payment', desc: 'Enable cash payment' },
      { key: 'payment_card_enabled', value: '1', type: 'boolean', category: 'payment', desc: 'Enable card payment' },
      { key: 'payment_upi_enabled', value: '1', type: 'boolean', category: 'payment', desc: 'Enable UPI payment' },

      // Printer Settings
      { key: 'printer_enabled', value: '1', type: 'boolean', category: 'printer', desc: 'Enable printer' },
      { key: 'printer_name', value: 'default', type: 'string', category: 'printer', desc: 'Printer name' },
      { key: 'print_duplicate_bills', value: '0', type: 'boolean', category: 'printer', desc: 'Print duplicate bills' },

      // Tax Settings
      { key: 'tax_enabled', value: '1', type: 'boolean', category: 'tax', desc: 'Enable tax calculation' },
      { key: 'tax_rate', value: '18', type: 'number', category: 'tax', desc: 'Tax rate percentage' },
      { key: 'tax_name', value: 'GST', type: 'string', category: 'tax', desc: 'Tax name' },

      // Business Hours
      { key: 'business_open_time', value: '09:00', type: 'string', category: 'business', desc: 'Business opening time' },
      { key: 'business_close_time', value: '23:00', type: 'string', category: 'business', desc: 'Business closing time' },
      { key: 'business_name', value: 'Bao to the Wings', type: 'string', category: 'business', desc: 'Business name' },
      { key: 'business_phone', value: '', type: 'string', category: 'business', desc: 'Business phone number' },
      { key: 'business_address', value: '', type: 'string', category: 'business', desc: 'Business address' },

      // Discount Settings
      { key: 'discount_enabled', value: '1', type: 'boolean', category: 'general', desc: 'Enable discounts' },
      { key: 'max_discount_percent', value: '30', type: 'number', category: 'general', desc: 'Maximum discount percentage' },

      // General Settings
      { key: 'receipt_header', value: 'Thank you for your order!', type: 'string', category: 'general', desc: 'Receipt header text' },
      { key: 'receipt_footer', value: 'Visit again soon!', type: 'string', category: 'general', desc: 'Receipt footer text' },
    ];

    let createdCount = 0;

    for (const setting of defaultSettings) {
      const existingSetting = await db.get(
        'SELECT id FROM settings WHERE setting_key = $1',
        [setting.key]
      );

      if (!existingSetting) {
        const id = uuidv4();
        await db.run(
          `INSERT INTO settings (id, setting_key, setting_value, setting_type, category, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, setting.key, setting.value, setting.type, setting.category, setting.desc, now, now]
        );
        createdCount++;
      }
    }

    res.sendSuccess({
      initialized_count: createdCount,
      message: `Initialized ${createdCount} default settings`
    });
  } catch (error) {
    res.sendError('Failed to initialize settings', 500, error.message);
  }
});

// ============================================
// STAFF MANAGEMENT
// ============================================

/**
 * GET /api/settings/staff
 * List all staff members
 */
router.get('/staff/list', async (req, res) => {
  try {
    const db = await getDatabase();
    const { limit = 50, offset = 0, is_active } = req.query;

    let query = `SELECT id, username, full_name, email, role, is_active, phone, hire_date, last_login, created_at
                 FROM staff_users WHERE 1=1`;
    const params = [];

    if (is_active !== undefined) {
      query += ' AND is_active = $1';
      params.push(is_active === 'true' $1 1 : 0);
    }

    query += ' ORDER BY full_name LIMIT $1 OFFSET $2';
    params.push(parseInt(limit), parseInt(offset));

    const staff = await db.all(query, params);

    const countResult = await db.get('SELECT COUNT(*) as count FROM staff_users');

    res.sendSuccess({
      count: staff.length,
      total_staff: countResult.count,
      data: staff
    });
  } catch (error) {
    res.sendError('Failed to fetch staff', 500, error.message);
  }
});

/**
 * GET /api/settings/staff/:id
 * Get staff member details
 */
router.get('/staff/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const staff = await db.get(
      `SELECT id, username, full_name, email, role, is_active, phone, address, hire_date, last_login, created_at
       FROM staff_users WHERE id = $1`,
      [id]
    );

    if (!staff) {
      return res.sendError('Staff member not found', 404);
    }

    res.sendSuccess(staff);
  } catch (error) {
    res.sendError('Failed to fetch staff member', 500, error.message);
  }
});

/**
 * POST /api/settings/staff
 * Create a new staff member
 * Body: { username, password, full_name, email, role, phone, address, hire_date }
 */
router.post('/staff', async (req, res) => {
  try {
    const db = await getDatabase();
    const { username, password, full_name, email, role = 'operator', phone, address, hire_date } = req.body;

    if (!username || !password) {
      return res.sendError('Username and password are required', 400);
    }

    // Check if username exists
    const existingUser = await db.get(
      'SELECT id FROM staff_users WHERE username = $1',
      [username]
    );

    if (existingUser) {
      return res.sendError('Username already exists', 400);
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO staff_users (id, username, password_hash, full_name, email, role, phone, address, hire_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, username, passwordHash, full_name, email, role, phone, address, hire_date, now, now]
    );

    res.sendSuccess({
      id,
      username,
      full_name,
      email,
      role,
      message: 'Staff member created successfully'
    });
  } catch (error) {
    res.sendError('Failed to create staff member', 500, error.message);
  }
});

/**
 * PUT /api/settings/staff/:id
 * Update staff member
 * Body: { full_name, email, role, phone, address, is_active }
 */
router.put('/staff/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { full_name, email, role, phone, address, is_active } = req.body;

    const staff = await db.get('SELECT id FROM staff_users WHERE id = $1', [id]);

    if (!staff) {
      return res.sendError('Staff member not found', 404);
    }

    const now = new Date().toISOString();
    const updates = [];
    const values = [];

    if (full_name !== undefined) {
      updates.push('full_name = $1');
      values.push(full_name);
    }
    if (email !== undefined) {
      updates.push('email = $1');
      values.push(email);
    }
    if (role !== undefined) {
      updates.push('role = $1');
      values.push(role);
    }
    if (phone !== undefined) {
      updates.push('phone = $1');
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push('address = $1');
      values.push(address);
    }
    if (is_active !== undefined) {
      updates.push('is_active = $1');
      values.push(is_active $1 1 : 0);
    }

    if (updates.length === 0) {
      return res.sendError('No fields to update', 400);
    }

    updates.push('updated_at = $1');
    values.push(now);
    values.push(id);

    await db.run(
      `UPDATE staff_users SET ${updates.join(', ')} WHERE id = $1`,
      values
    );

    res.sendSuccess({
      id,
      message: 'Staff member updated successfully'
    });
  } catch (error) {
    res.sendError('Failed to update staff member', 500, error.message);
  }
});

/**
 * DELETE /api/settings/staff/:id
 * Soft delete staff member (set is_active to 0)
 */
router.delete('/staff/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const staff = await db.get('SELECT id FROM staff_users WHERE id = $1', [id]);

    if (!staff) {
      return res.sendError('Staff member not found', 404);
    }

    const now = new Date().toISOString();
    await db.run(
      'UPDATE staff_users SET is_active = false, updated_at = $1 WHERE id = $2',
      [now, id]
    );

    res.sendSuccess({
      id,
      message: 'Staff member deactivated successfully'
    });
  } catch (error) {
    res.sendError('Failed to delete staff member', 500, error.message);
  }
});

export default router;
