import express from 'express';
import { getDatabase } from '../db/connection.js';

const router = express.Router();

/**
 * GET /api/products
 * Get all products with optional category filtering
 * Query params: category (optional)
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { category } = req.query;

    let query = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, name';

    const products = await db.all(query, params);

    res.sendSuccess({
      count: products.length,
      products
    });
  } catch (error) {
    res.sendError('Failed to fetch products', 500, error.message);
  }
});

/**
 * GET /api/products/:id
 * Get a single product by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const product = await db.get(
      'SELECT * FROM products WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!product) {
      return res.sendError('Product not found', 404);
    }

    res.sendSuccess(product);
  } catch (error) {
    res.sendError('Failed to fetch product', 500, error.message);
  }
});

/**
 * GET /api/categories
 * Get all unique product categories
 */
router.get('/categories/list', async (req, res) => {
  try {
    const db = await getDatabase();

    const categories = await db.all(
      'SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category'
    );

    res.sendSuccess({
      count: categories.length,
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    res.sendError('Failed to fetch categories', 500, error.message);
  }
});

/**
 * POST /api/products
 * Create a new product (admin only)
 * Body: { name, category, price, description, is_active }
 */
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { name, category, price, description, is_active } = req.body;

    // Validation
    if (!name || !category || price === undefined) {
      return res.sendError('Missing required fields: name, category, price', 400);
    }

    if (isNaN(price) || price < 0) {
      return res.sendError('Price must be a positive number', 400);
    }

    const result = await db.run(
      `INSERT INTO products (name, category, price, description, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, category, price, description || null, is_active !== false ? 1 : 0, new Date().toISOString()]
    );

    res.sendSuccess({
      id: result.lastID,
      message: 'Product created successfully'
    }, 201);
  } catch (error) {
    res.sendError('Failed to create product', 500, error.message);
  }
});

/**
 * PUT /api/products/:id
 * Update a product (admin only)
 * Body: { name, category, price, description, is_active }
 */
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { name, category, price, description, is_active } = req.body;

    // Check if product exists
    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.sendError('Product not found', 404);
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (price !== undefined) {
      if (isNaN(price) || price < 0) {
        return res.sendError('Price must be a positive number', 400);
      }
      updates.push('price = ?');
      values.push(price);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.sendError('No fields to update', 400);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.run(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.sendSuccess({ message: 'Product updated successfully' });
  } catch (error) {
    res.sendError('Failed to update product', 500, error.message);
  }
});

/**
 * DELETE /api/products/:id
 * Soft delete a product (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.sendError('Product not found', 404);
    }

    await db.run(
      'UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );

    res.sendSuccess({ message: 'Product deleted successfully' });
  } catch (error) {
    res.sendError('Failed to delete product', 500, error.message);
  }
});

export default router;
