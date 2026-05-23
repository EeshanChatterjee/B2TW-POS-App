#!/usr/bin/env python3
import sqlite3
import uuid
from datetime import datetime

db_path = './data/pos.db'

def create_bills_for_orders():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get all orders without bills (orders created today)
        cursor.execute('''
            SELECT o.id, o.total_amount, o.customer_id, o.payment_method, o.created_at
            FROM orders o
            LEFT JOIN bills b ON o.id = b.order_id
            WHERE b.id IS NULL
            AND DATE(o.created_at) = DATE('now')
            ORDER BY o.created_at DESC
        ''')

        orders = cursor.fetchall()

        if not orders:
            print('No orders without bills found')
            return

        print(f'\n✓ Found {len(orders)} order(s) to create bills for\n')

        bill_count = 0
        total_amount = 0

        for order_id, total_amount_order, customer_id, payment_method, created_at in orders:
            bill_id = str(uuid.uuid4())

            # Get current bill count for numbering
            cursor.execute('SELECT COUNT(*) as count FROM bills')
            bill_number = f"B{str(cursor.fetchone()[0] + 1).zfill(6)}"

            now = datetime.now().isoformat()

            cursor.execute('''
                INSERT INTO bills (id, order_id, bill_number, customer_id, total_amount, payment_method, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (bill_id, order_id, bill_number, customer_id, total_amount_order, payment_method, 'paid', created_at, now))

            bill_count += 1
            total_amount += total_amount_order
            print(f'✓ Bill {bill_number} created for Order {order_id[:8]}... (₹{total_amount_order:.2f})')

        conn.commit()
        print(f'\n{"="*60}')
        print(f'✓ Created {bill_count} bill(s)')
        print(f'✓ Total Amount: ₹{total_amount:.2f}')
        print(f'{"="*60}\n')

        conn.close()

    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == '__main__':
    create_bills_for_orders()
