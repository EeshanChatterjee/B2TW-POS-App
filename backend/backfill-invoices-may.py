#!/usr/bin/env python3
import sqlite3
import random
import uuid
from datetime import datetime, timedelta

db_path = './data/pos.db'

def backfill_invoices():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get all active products
        cursor.execute('''
            SELECT id, name, price, category
            FROM products
            WHERE is_active = 1
            ORDER BY id
        ''')
        items = cursor.fetchall()

        if not items:
            print('No active products available')
            return

        # Today is May 23, 2026. Create invoices for May 1-22 (22 days)
        # IMPORTANT: Each invoice MUST have a customer_id in format CUSTYYYYMMDDXXX
        # Example: CUST20260501001, CUST20260501002, etc. (NEVER NULL)
        start_date = datetime(2026, 5, 1)
        end_date = datetime(2026, 5, 22)

        current_date = start_date
        total_orders_created = 0
        total_amount = 0

        print('\n' + '='*75)
        print('BACKFILLING INVOICES FOR MAY 1-22, 2026')
        print('='*75 + '\n')

        while current_date <= end_date:
            day_str = current_date.strftime("%Y-%m-%d")
            day_date_format = current_date.strftime("%Y%m%d")

            # Random 3-15 invoices per day
            num_invoices = random.randint(3, 15)
            day_total = 0

            for invoice_num in range(num_invoices):
                # Random time during the day (8am to 10pm)
                hour = random.randint(8, 22)
                minute = random.randint(0, 59)
                second = random.randint(0, 59)

                invoice_time = current_date.replace(hour=hour, minute=minute, second=second)
                created_at = invoice_time.isoformat()

                # Generate customer ID in format CUSTYYYYMMDDXXX (e.g., CUST20260501001)
                customer_id = f"CUST{day_date_format}{str(invoice_num + 1).zfill(3)}"

                # Randomly select 1-3 items
                num_items = random.randint(1, 3)
                selected_items = random.sample(items, min(num_items, len(items)))

                # Create order
                order_id = str(uuid.uuid4())
                order_total = 0

                invoice_items = []
                for product_id, name, menu_price, category in selected_items:
                    quantity = random.randint(1, 3)
                    # PRICING RULE: menu_price is TOTAL price (with GST)
                    unit_price = menu_price / 1.05
                    gst = menu_price - unit_price
                    total_price = menu_price * quantity

                    invoice_items.append({
                        'product_id': product_id,
                        'quantity': quantity,
                        'unit_price': unit_price,
                        'total_price': total_price
                    })
                    order_total += total_price

                # Insert order
                cursor.execute('''
                    INSERT INTO orders (id, customer_id, total_amount, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (order_id, customer_id, order_total, 'completed', created_at, created_at))

                # Insert order items
                for item in invoice_items:
                    item_id = str(uuid.uuid4())
                    cursor.execute('''
                        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (item_id, order_id, item['product_id'], item['quantity'], item['unit_price'], item['total_price'], created_at))

                total_orders_created += 1
                day_total += order_total

            total_amount += day_total
            print(f'✓ {day_str}: {num_invoices} invoices created → ₹{day_total:.2f}')
            current_date += timedelta(days=1)

        conn.commit()

        print(f'\n{"="*75}')
        print(f'✓ Created {total_orders_created} total invoice(s)')
        print(f'✓ Total Amount: ₹{total_amount:.2f}')
        print(f'✓ Period: May 1 - May 22, 2026')
        print(f'{"="*75}\n')

        print('Now creating bills for all orders...\n')

        # Create bills for all orders without bills
        cursor.execute('''
            SELECT o.id, o.total_amount, o.customer_id, o.payment_method, o.created_at
            FROM orders o
            LEFT JOIN bills b ON o.id = b.order_id
            WHERE b.id IS NULL
            ORDER BY o.created_at DESC
        ''')

        orders = cursor.fetchall()
        bill_count = 0
        bill_total = 0

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
            bill_total += total_amount_order

        conn.commit()

        print(f'✓ Created {bill_count} bill(s)')
        print(f'✓ Total Bill Amount: ₹{bill_total:.2f}')
        print(f'{"="*75}\n')

        conn.close()

    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == '__main__':
    backfill_invoices()
