#!/usr/bin/env python3

"""
Synthetic Data Seeding Script for B2TW POS
Clears all transaction data and generates realistic test data
Daily sales: 1.5k - 6k
Generates data for the last 30 days
"""

import sqlite3
import uuid
import random
from datetime import datetime, timedelta
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent.parent / "data" / "pos.db"

# Product catalog with prices (GST-inclusive)
PRODUCTS = [
    # BAO (₹150 with 5% GST)
    {'id': 'prod-001', 'name': 'Chicken Bao', 'price': 150, 'is_beverage': 0},
    {'id': 'prod-002', 'name': 'Soya Bao', 'price': 150, 'is_beverage': 0},
    {'id': 'prod-003', 'name': 'Paneer Bao', 'price': 150, 'is_beverage': 0},
    {'id': 'prod-004', 'name': 'Sabz Bao', 'price': 150, 'is_beverage': 0},
    {'id': 'prod-005', 'name': 'Corn Bao', 'price': 150, 'is_beverage': 0},

    # CHICKEN WINGS (₹180 with 5% GST)
    {'id': 'prod-010', 'name': 'Korean Wings', 'price': 180, 'is_beverage': 0},
    {'id': 'prod-011', 'name': 'Kimchi Wings', 'price': 180, 'is_beverage': 0},
    {'id': 'prod-012', 'name': 'Honey Chilli Chicken', 'price': 180, 'is_beverage': 0},
    {'id': 'prod-013', 'name': 'Sriracha Wings', 'price': 180, 'is_beverage': 0},
    {'id': 'prod-015', 'name': 'Mango Habenaro Wings', 'price': 180, 'is_beverage': 0},

    # KOREAN RAMEN (₹180 with 5% GST)
    {'id': 'prod-006', 'name': 'Kimchi Non Veg Ramen', 'price': 180, 'is_beverage': 0},
    {'id': 'prod-007', 'name': 'Cheese Non Veg Ramen', 'price': 180, 'is_beverage': 0},
    {'id': 'prod-008', 'name': 'Kimchi Veg Ramen', 'price': 180, 'is_beverage': 0},
    {'id': 'prod-009', 'name': 'Cheese Veg Ramen', 'price': 180, 'is_beverage': 0},

    # BEVERAGES
    {'id': 'prod-043', 'name': 'Coke 20', 'price': 20, 'is_beverage': 1},
    {'id': 'prod-044', 'name': 'Sprite 20', 'price': 20, 'is_beverage': 1},
    {'id': 'prod-045', 'name': 'ThumsUp 20', 'price': 20, 'is_beverage': 1},
    {'id': 'prod-034', 'name': 'Mojito Boba', 'price': 175, 'is_beverage': 1},
    {'id': 'prod-035', 'name': 'Ocean Boba', 'price': 175, 'is_beverage': 1},

    # LITE BITES (₹135 with 5% GST)
    {'id': 'prod-020', 'name': 'Chicken Popcorn', 'price': 135, 'is_beverage': 0},
    {'id': 'prod-021', 'name': 'Cheese Pizza Pop', 'price': 135, 'is_beverage': 0},
    {'id': 'prod-022', 'name': 'Veg Spring Roll', 'price': 135, 'is_beverage': 0},
]

CUSTOMER_NAMES = [
    'Raj Kumar', 'Priya Singh', 'Amit Patel', 'Sneha Sharma', 'Vikram Reddy',
    'Anjali Desai', 'Rohit Nair', 'Kavya Menon', 'Arjun Gupta', 'Neha Iyer',
]

PAYMENT_METHODS = ['cash', 'card', 'upi']
STATUSES = ['completed'] * 5 + ['cancelled']  # 83% completed

def calculate_unit_price(menu_price):
    """Calculate pre-tax unit price from GST-inclusive menu price"""
    return round(menu_price / 1.05, 2)

def calculate_gst(unit_price):
    """Calculate 5% GST on unit price"""
    return round(unit_price * 0.05, 2)

def calculate_total_price(unit_price):
    """Calculate total price (unit price + GST) for one unit"""
    gst = calculate_gst(unit_price)
    return round(unit_price + gst, 2)

def get_random_time_for_day(date):
    """Generate a random time within restaurant hours (11 AM - 11 PM)"""
    hour = random.randint(11, 22)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return date.replace(hour=hour, minute=minute, second=second)

def generate_daily_sales_distribution(target_amount):
    """Generate realistic daily sales distribution"""
    return {
        'morning': int(target_amount * 0.05),    # 5% (11-12)
        'lunch': int(target_amount * 0.35),      # 35% (12-3)
        'afternoon': int(target_amount * 0.10),  # 10% (3-5)
        'evening': int(target_amount * 0.40),    # 40% (5-9)
        'night': int(target_amount * 0.10),      # 10% (9-11)
    }

def clear_transaction_data(conn):
    """Clear all transaction data"""
    print('🗑️  Clearing transaction data...')

    tables = [
        'bill_holds',
        'bills',
        'kot_logs',
        'order_items',
        'orders',
        'customers',
    ]

    cursor = conn.cursor()
    for table in tables:
        cursor.execute(f'DELETE FROM {table}')
        print(f'  ✓ Cleared {table}')

    conn.commit()

def seed_products(conn):
    """Insert base products into the database"""
    print('\n🏪 Seeding products...')

    cursor = conn.cursor()

    # Check if products already exist
    cursor.execute('SELECT COUNT(*) FROM products')
    if cursor.fetchone()[0] > 0:
        print('  ✓ Products already exist')
        return

    now = datetime.now().isoformat()

    for idx, product in enumerate(PRODUCTS):
        product_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO products (id, name, category, price, is_beverage, is_active, position, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            product['id'],
            product['name'],
            'Food',
            product['price'],
            product['is_beverage'],
            1,
            idx,
            now,
            now
        ))

    conn.commit()
    print(f'  ✓ Created {len(PRODUCTS)} products')

def generate_customers(conn, count=50):
    """Generate synthetic customers"""
    print(f'\n👥 Generating {count} customers...')

    customers = []
    cursor = conn.cursor()

    for i in range(count):
        phone = f'987654{i:04d}'
        name = f'{CUSTOMER_NAMES[i % len(CUSTOMER_NAMES)]} {i}'
        email = f'customer{i}@example.com'
        customer_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT INTO customers (id, phone, name, email, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (customer_id, phone, name, email, 1, now, now))

        customers.append({'id': customer_id, 'phone': phone, 'name': name})

    conn.commit()
    print(f'  ✓ Created {count} customers')
    return customers

def generate_random_order(customers, date):
    """Generate a random order with 1-4 items"""
    customer = random.choice(customers)
    item_count = random.randint(1, 4)
    items = []
    total_amount = 0

    for _ in range(item_count):
        product = random.choice(PRODUCTS)
        quantity = random.randint(1, 3)

        # Calculate prices with correct GST structure
        # menu_price is GST-inclusive, we need to split it
        unit_price = calculate_unit_price(product['price'])  # pre-tax price
        gst_per_unit = calculate_gst(unit_price)  # 5% tax
        total_per_unit = unit_price + gst_per_unit  # pre-tax + tax
        item_total = round(total_per_unit * quantity, 2)  # multiply by quantity

        items.append({
            'product_id': product['id'],
            'product_name': product['name'],
            'quantity': quantity,
            'unit_price': unit_price,
            'total_price': item_total,
        })

        total_amount += item_total

    return {
        'customer_id': customer['id'],
        'customer_phone': customer['phone'],
        'items': items,
        'total_amount': round(total_amount, 2),
        'status': random.choice(STATUSES),
        'payment_method': random.choice(PAYMENT_METHODS),
        'created_at': get_random_time_for_day(date),
    }

def generate_daily_sales_data(conn, customers, date, target_amount):
    """Generate synthetic sales data for a given date"""
    distribution = generate_daily_sales_distribution(target_amount)

    orders = []
    current_amount = 0
    orders_generated = 0

    time_ranges = [
        {'period': 'morning', 'start': 11, 'end': 12, 'amount': distribution['morning']},
        {'period': 'lunch', 'start': 12, 'end': 15, 'amount': distribution['lunch']},
        {'period': 'afternoon', 'start': 15, 'end': 17, 'amount': distribution['afternoon']},
        {'period': 'evening', 'start': 17, 'end': 21, 'amount': distribution['evening']},
        {'period': 'night', 'start': 21, 'end': 23, 'amount': distribution['night']},
    ]

    cursor = conn.cursor()

    for range_info in time_ranges:
        period_amount = 0

        while period_amount < range_info['amount']:
            order = generate_random_order(customers, date)

            # Adjust time to be within range
            order_date = order['created_at']
            hour = random.randint(range_info['start'], range_info['end'])
            order_date = order_date.replace(hour=hour, minute=random.randint(0, 59))
            order['created_at'] = order_date

            orders.append(order)
            period_amount += order['total_amount']
            current_amount += order['total_amount']
            orders_generated += 1

            # Limit orders per period
            period_orders = [o for o in orders if range_info['start'] <= o['created_at'].hour < range_info['end']]
            if len(period_orders) > 30:
                break

    # Insert into database
    for order in orders:
        order_id = str(uuid.uuid4())

        cursor.execute('''
            INSERT INTO orders (id, customer_id, total_amount, status, payment_method, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            order_id,
            order['customer_id'],
            order['total_amount'],
            order['status'],
            order['payment_method'],
            order['created_at'].isoformat(),
            order['created_at'].isoformat()
        ))

        # Insert order items
        for item in order['items']:
            item_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                item_id,
                order_id,
                item['product_id'],
                item['quantity'],
                item['unit_price'],
                item['total_price'],
                order['created_at'].isoformat()
            ))

        # Insert bill if order is completed
        if order['status'] == 'completed':
            bill_id = str(uuid.uuid4())
            bill_number = f"B{str(int(order['created_at'].timestamp()))[-8:]}"

            cursor.execute('''
                INSERT INTO bills (id, order_id, bill_number, customer_id, total_amount, payment_method, status, printed_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                bill_id,
                order_id,
                bill_number,
                order['customer_id'],
                order['total_amount'],
                order['payment_method'],
                'completed',
                order['created_at'].isoformat(),
                order['created_at'].isoformat(),
                order['created_at'].isoformat()
            ))

    conn.commit()

    return {
        'orders_count': orders_generated,
        'total_amount': round(current_amount, 2),
    }

def main():
    """Main seeding function"""
    print('\n╔════════════════════════════════════════════════════════╗')
    print('║     Synthetic Data Seeding for B2TW POS               ║')
    print('╚════════════════════════════════════════════════════════╝\n')

    try:
        # Ensure database directory exists
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)

        # Connect to database
        conn = sqlite3.connect(str(DB_PATH))
        conn.execute('PRAGMA foreign_keys = ON')

        print(f'📦 Connected to database: {DB_PATH}')

        # Initialize schema if needed
        schema_path = Path(__file__).parent / 'schema.sql'
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'")
        if not cursor.fetchone():
            print('\n📋 Initializing database schema...')
            with open(schema_path, 'r') as f:
                schema = f.read()
            cursor.executescript(schema)
            conn.commit()
            print('  ✓ Database schema created')

        # Clear existing data
        clear_transaction_data(conn)

        # Seed products
        seed_products(conn)

        # Generate customers
        customers = generate_customers(conn, 50)

        # Generate sales data for last 30 days
        print('\n📊 Generating 30 days of sales data...')

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        total_revenue = 0
        total_orders = 0

        for days_ago in range(29, -1, -1):
            date = today - timedelta(days=days_ago)
            daily_target = random.randint(1500, 6000)

            day_data = generate_daily_sales_data(conn, customers, date, daily_target)

            total_revenue += day_data['total_amount']
            total_orders += day_data['orders_count']

            date_str = date.strftime('%Y-%m-%d')
            print(f'  {date_str}: {day_data["orders_count"]} orders | ₹{day_data["total_amount"]:.2f}')

        print('\n✅ Seeding complete!')
        print('\n📈 Summary:')
        print(f'  Total Orders: {total_orders}')
        print(f'  Total Revenue: ₹{total_revenue:.2f}')
        print(f'  Avg Daily Revenue: ₹{(total_revenue / 30):.2f}')
        print(f'  Avg Order Value: ₹{(total_revenue / total_orders):.2f}')
        print(f'  Customers: {len(customers)}')

        conn.close()
        print('\n✨ All done! Ready for testing.\n')

    except Exception as e:
        print(f'\n❌ Error seeding data: {e}')
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == '__main__':
    main()
