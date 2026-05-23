import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Ingest order items from CSV into the order_items table
 * Run: npm run ingest:order-items
 */
export async function ingestOrderItems(csvPath = '/Users/eeshanchatterjee/Documents/Claude/Projects/Bao to the Wings/order_items.csv', dbPath = './data/pos.db') {
  let database = null;
  try {
    console.log('📥 Ingesting order items from CSV...');

    // Create a direct database connection
    database = new Database(dbPath);
    database.pragma('foreign_keys = ON');

    // Wrap in async-like interface
    const db = {
      database,
      async run(sql, params = []) {
        const stmt = database.prepare(sql);
        const result = stmt.run(...params);
        return { changes: result.changes };
      },
      async get(sql, params = []) {
        const stmt = database.prepare(sql);
        return stmt.get(...params) || null;
      },
      async all(sql, params = []) {
        const stmt = database.prepare(sql);
        return stmt.all(...params);
      }
    };

    // Read and parse CSV
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    // Map column names
    const columnMap = {
      'id': 'id',
      'order_id': 'order_id',
      'product_id': 'product_id',
      'quantity': 'quantity',
      'unit_price': 'unit_price',
      'total_price': 'total_price',
      'created_at': 'created_at'
    };

    // Parse CSV rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles basic cases, may need adjustment for complex data)
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));

      // Map to object
      const row = {};
      headers.forEach((header, index) => {
        row[columnMap[header] || header] = values[index] || null;
      });

      rows.push(row);
    }

    console.log(`📊 Parsed ${rows.length} order items from CSV`);

    // Check for existing data
    const existingCount = await db.get('SELECT COUNT(*) as count FROM order_items');
    console.log(`📈 Existing order items in database: ${existingCount.count}`);

    // Insert order items
    let insertedCount = 0;
    let skippedCount = 0;
    const failedRows = [];

    for (const row of rows) {
      try {
        // Check if order item already exists
        const existing = await db.get('SELECT id FROM order_items WHERE id = ?', [row.id]);
        if (existing) {
          skippedCount++;
          continue;
        }

        // Insert order item
        await db.run(
          `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.order_id,
            row.product_id,
            parseInt(row.quantity),
            parseFloat(row.unit_price),
            parseFloat(row.total_price),
            row.created_at
          ]
        );
        insertedCount++;
      } catch (err) {
        console.error(`❌ Failed to insert row: ${JSON.stringify(row)}`);
        console.error(`   Error: ${err.message}`);
        failedRows.push({ row, error: err.message });
      }
    }

    console.log(`\n✅ Order items import complete:`);
    console.log(`   ✓ Inserted: ${insertedCount} items`);
    console.log(`   ⊘ Skipped: ${skippedCount} items (already exist)`);
    console.log(`   ✗ Failed: ${failedRows.length} items`);

    if (failedRows.length > 0) {
      console.log('\n❌ Failed rows:');
      failedRows.forEach(({ row, error }) => {
        console.log(`   - ${row.id}: ${error}`);
      });
    }

    // Show summary stats
    const finalCount = await db.get('SELECT COUNT(*) as count FROM order_items');
    const totalRevenue = await db.get('SELECT SUM(total_price) as total FROM order_items');
    const topProducts = await db.all(`
      SELECT p.name, COUNT(*) as count, SUM(oi.total_price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY oi.product_id
      ORDER BY revenue DESC
      LIMIT 10
    `);

    console.log(`\n📊 Database Summary:`);
    console.log(`   Total items: ${finalCount.count}`);
    console.log(`   Total revenue: ₹${totalRevenue.total?.toFixed(2) || '0.00'}`);
    console.log(`\n🏆 Top 10 Products by Revenue:`);
    topProducts.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name}: ${p.count} items sold (₹${p.revenue?.toFixed(2) || '0.00'})`);
    });

  } catch (error) {
    console.error('❌ Failed to ingest order items:', error);
    throw error;
  } finally {
    if (database) {
      database.close();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestOrderItems().catch(console.error);
}

export default ingestOrderItems;
