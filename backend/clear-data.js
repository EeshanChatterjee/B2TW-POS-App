import Database from 'better-sqlite3';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = './data/pos.db';

try {
  const db = new Database(dbPath);

  console.log('Deleting all data from order_items...');
  db.prepare('DELETE FROM order_items').run();

  console.log('Deleting all data from orders...');
  db.prepare('DELETE FROM orders').run();

  console.log('✓ All data cleared successfully');
  db.close();
  process.exit(0);
} catch (error) {
  console.error('Error clearing data:', error);
  process.exit(1);
}
