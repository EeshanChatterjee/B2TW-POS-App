import express from 'express';
import { randomUUID } from 'crypto';
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

    let query = 'SELECT * FROM products WHERE is_active = true';
    const params = [];

    if (category) {
      query += ' AND category = $' + (params.length + 1);
      params.push(category);
    }

    query += ' ORDER BY position';

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
      'SELECT * FROM products WHERE id = $1 AND is_active = true',
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
 * Get all categories in custom order
 */
router.get('/categories/list', async (req, res) => {
  try {
    const db = await getDatabase();

    const categories = await db.all(
      'SELECT id, name, position FROM categories ORDER BY position'
    );

    res.sendSuccess({
      count: categories.length,
      categories: categories.map(c => c.name),
      categoryDetails: categories
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
    const { name, category, price, description, is_active, veg_type, position } = req.body;

    // Validation
    if (!name || !category || price === undefined) {
      return res.sendError('Missing required fields: name, category, price', 400);
    }

    if (isNaN(price) || price < 0) {
      return res.sendError('Price must be a positive number', 400);
    }

    // Round price to 2 decimal places
    const roundedPrice = Math.round(price * 100) / 100;

    // Generate a UUID for the product
    const productId = randomUUID();

    const result = await db.run(
      `INSERT INTO products (id, name, category, price, description, is_active, veg_type, position, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [productId, name, category, roundedPrice, description || null, is_active !== false ? true : false, veg_type || 'not_applicable', position || 0, new Date().toISOString()]
    );

    res.sendSuccess({
      id: productId,
      message: 'Product created successfully'
    }, 201);
  } catch (error) {
    res.sendError('Failed to create product', 500, error.message);
  }
});

/**
 * PUT /api/products/:id
 * Update a product (admin only)
 * Body: { name, category, price, description, is_active, position, veg_type }
 */
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { name, category, price, description, is_active, position, veg_type } = req.body;

    // Check if product exists
    const product = await db.get('SELECT * FROM products WHERE id = $1', [id]);
    if (!product) {
      return res.sendError('Product not found', 404);
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (price !== undefined) {
      if (isNaN(price) || price < 0) {
        return res.sendError('Price must be a positive number', 400);
      }
      // Round price to 2 decimal places
      const roundedPrice = Math.round(price * 100) / 100;
      updates.push(`price = $${paramCount++}`);
      values.push(roundedPrice);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active ? true : false);
    }
    if (position !== undefined) {
      updates.push(`position = $${paramCount++}`);
      values.push(position);
    }
    if (veg_type !== undefined) {
      updates.push(`veg_type = $${paramCount++}`);
      values.push(veg_type);
    }

    if (updates.length === 0) {
      return res.sendError('No fields to update', 400);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await db.run(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    res.sendSuccess({ message: 'Product updated successfully' });
  } catch (error) {
    res.sendError('Failed to update product', 500, error.message);
  }
});

/**
 * POST /api/products/batch/reorder
 * Batch update positions for multiple products
 * Body: { updates: [{ id, position }, ...] }
 */
router.post('/batch/reorder', async (req, res) => {
  try {
    const db = await getDatabase();
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.sendError('Invalid updates array', 400);
    }

    // Update each product's position
    for (const update of updates) {
      const { id, position } = update;
      if (id === undefined || position === undefined) {
        return res.sendError('Each update must have id and position', 400);
      }

      await db.run(
        'UPDATE products SET position = $1, updated_at = $2 WHERE id = $3',
        [position, new Date().toISOString(), id]
      );
    }

    res.sendSuccess({ message: 'Products reordered successfully', count: updates.length });
  } catch (error) {
    res.sendError('Failed to reorder products', 500, error.message);
  }
});

/**
 * POST /api/categories/batch/reorder
 * Batch update positions for multiple categories
 * Body: { updates: [{ id, position }, ...] }
 */
router.post('/categories/batch/reorder', async (req, res) => {
  try {
    const db = await getDatabase();
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.sendError('Invalid updates array', 400);
    }

    // Update each category's position
    for (const update of updates) {
      const { id, position } = update;
      if (id === undefined || position === undefined) {
        return res.sendError('Each update must have id and position', 400);
      }

      await db.run(
        'UPDATE categories SET position = ?, updated_at = ? WHERE id = ?',
        [position, new Date().toISOString(), id]
      );
    }

    res.sendSuccess({ message: 'Categories reordered successfully', count: updates.length });
  } catch (error) {
    res.sendError('Failed to reorder categories', 500, error.message);
  }
});

/**
 * PUT /api/products/:id/change-category
 * Change a product's category and move it to the bottom of the new category
 * Body: { category }
 */
router.put('/:id/change-category', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.sendError('Category is required', 400);
    }

    // Check if product exists
    const product = await db.get('SELECT * FROM products WHERE id = $1', [id]);
    if (!product) {
      return res.sendError('Product not found', 404);
    }

    // If already in the same category, no change needed
    if (product.category === category) {
      return res.sendSuccess({ message: 'Product already in this category' });
    }

    // Find the maximum position in the new category
    const maxPositionResult = await db.get(
      'SELECT MAX(position) as max_position FROM products WHERE category = $1 AND is_active = true',
      [category]
    );

    const newPosition = (maxPositionResult?.max_position ?? -1) + 1;

    // Update product with new category and position
    await db.run(
      'UPDATE products SET category = $1, position = $2, updated_at = $3 WHERE id = $4',
      [category, newPosition, new Date().toISOString(), id]
    );

    res.sendSuccess({
      message: 'Product category changed successfully',
      new_category: category,
      new_position: newPosition
    });
  } catch (error) {
    res.sendError('Failed to change product category', 500, error.message);
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

    // Handle deletion by name and category for corrupted items with null ids
    if (id === 'null' || id === null || id === 'undefined') {
      const { name, category } = req.query;
      if (!name || !category) {
        return res.sendError('For null IDs, name and category query params are required', 400);
      }

      const product = await db.get('SELECT * FROM products WHERE id IS NULL AND name = $1 AND category = $2', [name, category]);
      if (!product) {
        return res.sendError('Product not found', 404);
      }

      await db.run(
        'UPDATE products SET is_active = false, updated_at = $1 WHERE id IS NULL AND name = $2 AND category = $3',
        [new Date().toISOString(), name, category]
      );

      return res.sendSuccess({ message: 'Product deleted successfully' });
    }

    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.sendError('Product not found', 404);
    }

    await db.run(
      'UPDATE products SET is_active = false, updated_at = $1 WHERE id = $2',
      [new Date().toISOString(), id]
    );

    res.sendSuccess({ message: 'Product deleted successfully' });
  } catch (error) {
    res.sendError('Failed to delete product', 500, error.message);
  }
});

export default router;
