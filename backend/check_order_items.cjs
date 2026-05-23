const Database = require('better-sqlite3');
const db = new Database('./data/pos.db');

// Check schema
console.log('=== ORDER_ITEMS TABLE SCHEMA ===');
const schema = db.prepare("PRAGMA table_info(order_items)").all();
console.log(JSON.stringify(schema, null, 2));

// Check sample rows with all columns
console.log('\n=== SAMPLE DATA ===');
const samples = db.prepare('SELECT * FROM order_items LIMIT 5').all();
console.log(JSON.stringify(samples, null, 2));

db.close();
