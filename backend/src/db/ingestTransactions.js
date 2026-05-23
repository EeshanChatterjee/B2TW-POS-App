import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Ingest May transactions from CSV into the orders table
 * Run: npm run ingest:transactions
 */
export async function ingestTransactions(csvPath = '/Users/eeshanchatterjee/Documents/Claude/Projects/Bao to the Wings/transactions_may.csv', dbPath = './data/pos.db') {
  let database = null;
  try {
    console.log('📥 Ingesting May transactions from CSV...');

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
      'customer_id': 'customer_id',
      'total_amount': 'total_amount',
      'status': 'status',
      'payment_method': 'payment_method',
      'notes': 'notes',
      'created_at': 'created_at',
      'updated_at': 'updated_at'
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

    console.log(`📊 Parsed ${rows.length} transactions from CSV`);

    // Check for existing data
    const existingCount = await db.get('SELECT COUNT(*) as count FROM orders');
    console.log(`📈 Existing orders in database: ${existingCount.count}`);

    // Insert transactions
    let insertedCount = 0;
    let skippedCount = 0;
    const failedRows = [];

    for (const row of rows) {
      try {
        // Check if order already exists
        const existing = await db.get('SELECT id FROM orders WHERE id = ?', [row.id]);
        if (existing) {
          skippedCount++;
          continue;
        }

        // Insert order
        await db.run(
          `INSERT INTO orders (id, customer_id, total_amount, status, payment_method, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.customer_id || null,
            parseFloat(row.total_amount),
            row.status || 'completed',
            row.payment_method || null,
            row.notes || null,
            row.created_at,
            row.updated_at
          ]
        );
        insertedCount++;
      } catch (err) {
        console.error(`❌ Failed to insert row: ${JSON.stringify(row)}`);
        console.error(`   Error: ${err.message}`);
        failedRows.push({ row, error: err.message });
      }
    }

    console.log(`\n✅ Transaction import complete:`);
    console.log(`   ✓ Inserted: ${insertedCount} orders`);
    console.log(`   ⊘ Skipped: ${skippedCount} orders (already exist)`);
    console.log(`   ✗ Failed: ${failedRows.length} orders`);

    if (failedRows.length > 0) {
      console.log('\n❌ Failed rows:');
      failedRows.forEach(({ row, error }) => {
        console.log(`   - ${row.id}: ${error}`);
      });
    }

    // Show summary stats
    const finalCount = await db.get('SELECT COUNT(*) as count FROM orders');
    const totalAmount = await db.get('SELECT SUM(total_amount) as total FROM orders');
    const paymentMethods = await db.all(`
      SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total
      FROM orders
      GROUP BY payment_method
      ORDER BY count DESC
    `);

    console.log(`\n📊 Database Summary:`);
    console.log(`   Total orders: ${finalCount.count}`);
    console.log(`   Total revenue: ₹${totalAmount.total?.toFixed(2) || '0.00'}`);
    console.log(`\n💳 Payment Methods:`);
    paymentMethods.forEach(pm => {
      console.log(`   ${pm.payment_method || 'NULL'}: ${pm.count} orders (₹${pm.total?.toFixed(2) || '0.00'})`);
    });

  } catch (error) {
    console.error('❌ Failed to ingest transactions:', error);
    throw error;
  } finally {
    if (database) {
      database.close();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestTransactions().catch(console.error);
}

export default ingestTransactions;
