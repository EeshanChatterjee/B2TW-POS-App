#!/usr/bin/env python3
import sqlite3
import random
import uuid
from datetime import datetime

db_path = './data/pos.db'

def generate_invoice():
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

        # Randomly select 1-3 items
        num_items = random.randint(1, min(3, len(items)))
        selected_items = random.sample(items, num_items)

        # Create order
        now = datetime.now()
        order_id = str(uuid.uuid4())
        created_at = now.isoformat()

        print('\n' + '='*75)
        print('INVOICE FOR TODAY')
        print('='*75)
        print(f'Order ID: {order_id}')
        print(f'Date & Time: {now.strftime("%Y-%m-%d %H:%M:%S")}')
        print('-'*75)

        invoice_items = []
        order_total = 0
        order_gst = 0

        for product_id, name, menu_price, category in selected_items:
            # PRICING RULE: menu_price is TOTAL price (with GST)
            # Calculate unit_price (pre-tax) = menu_price / 1.05
            # Calculate GST amount = menu_price - unit_price
            unit_price = menu_price / 1.05
            gst = menu_price - unit_price
            total_price = menu_price  # Should equal unit_price + gst

            invoice_items.append({
                'product_id': product_id,
                'name': name,
                'category': category,
                'quantity': 1,
                'menu_price': menu_price,
                'unit_price': unit_price,
                'gst': gst,
                'total_price': total_price
            })
            order_total += total_price
            order_gst += gst

        # Display invoice
        print(f'{"Item":<40} {"Qty":>4} {"Base (₹)":>12} {"GST (₹)":>12} {"Total (₹)":>12}')
        print('-'*75)
        for item in invoice_items:
            print(f'{item["name"]:<40} {item["quantity"]:>4} {item["unit_price"]:>11.2f} {item["gst"]:>11.2f} {item["total_price"]:>11.2f}')

        print('-'*75)
        base_total = sum(i['unit_price'] for i in invoice_items)
        print(f'{"TOTAL":<40} {"":<4} {base_total:>11.2f} {order_gst:>11.2f} {order_total:>11.2f}')
        print('='*75 + '\n')

        # Verify calculation
        print('✓ CALCULATION VERIFICATION:')
        for item in invoice_items:
            check = item['unit_price'] + item['gst']
            status = '✓' if abs(check - item['total_price']) < 0.01 else '✗'
            print(f'  {status} {item["name"]}: {item["unit_price"]:.2f} + {item["gst"]:.2f} = {check:.2f} (expected {item["total_price"]:.2f})')

        print('\n' + '-'*75)
        print('Inserting order into database...')

        # Insert into database
        cursor.execute('''
            INSERT INTO orders (id, customer_id, total_amount, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (order_id, None, order_total, 'completed', created_at, created_at))

        # Insert order items
        for item in invoice_items:
            item_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (item_id, order_id, item['product_id'], item['quantity'], item['unit_price'], item['total_price'], created_at))

        conn.commit()
        print(f'✓ Order #{order_id} inserted successfully')
        print(f'✓ Invoice with {len(invoice_items)} item(s) created')
        print(f'✓ Total Amount: ₹{order_total:.2f} (Base: ₹{base_total:.2f} + GST: ₹{order_gst:.2f})')
        print('-'*75 + '\n')

        conn.close()

    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == '__main__':
    generate_invoice()
