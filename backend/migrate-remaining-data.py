#!/usr/bin/env python3
"""
Migrate remaining data after partial migration
Skips: categories, products, customers, staff_users
Migrates: orders, order_items, bills, kot_logs
"""

import sqlite3
import psycopg2
import os
import sys

# Database URLs
SQLITE_DB = './data/pos.db'
POSTGRES_URL = os.environ.get('DATABASE_URL')

if not POSTGRES_URL:
    print("❌ ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

def get_table_columns(cursor, table_name):
    """Get column names from SQLite table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]

def migrate_data():
    """Main migration function"""
    print("\n" + "="*80)
    print("MIGRATING REMAINING DATA (Orders, Order Items, Bills, KOT Logs)")
    print("="*80 + "\n")

    try:
        # Connect to both databases
        print("📦 Connecting to databases...")
        sqlite_conn = sqlite3.connect(SQLITE_DB)
        sqlite_conn.row_factory = sqlite3.Row
        sqlite_cursor = sqlite_conn.cursor()

        postgres_conn = psycopg2.connect(POSTGRES_URL, sslmode='require')
        postgres_cursor = postgres_conn.cursor()
        print("✅ Connected to both databases\n")

        # Migration plan
        migration_steps = [
            ("orders", migrate_orders),
            ("order_items", migrate_order_items),
            ("bills", migrate_bills),
            ("kot_logs", migrate_kot_logs),
        ]

        # Execute migrations
        for table_name, migration_func in migration_steps:
            try:
                migration_func(sqlite_cursor, postgres_cursor, postgres_conn)
            except Exception as e:
                print(f"❌ Error migrating {table_name}: {str(e)}")
                postgres_conn.rollback()
                raise

        print("\n" + "="*80)
        print("✅ MIGRATION COMPLETE")
        print("="*80 + "\n")

        # Print summary
        print_summary(sqlite_cursor, postgres_cursor)

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)
    finally:
        sqlite_conn.close()
        postgres_conn.close()


def migrate_orders(sqlite_cursor, postgres_cursor, postgres_conn):
    """Migrate orders table"""
    print("🔄 Migrating orders...")

    # Get available columns
    columns = get_table_columns(sqlite_cursor, 'orders')
    select_columns = ['id', 'customer_id', 'total_amount', 'status', 'payment_method', 'notes', 'created_at', 'updated_at']
    available_columns = [col for col in select_columns if col in columns]

    sqlite_cursor.execute(f"SELECT {', '.join(available_columns)} FROM orders")
    orders = sqlite_cursor.fetchall()

    for order in orders:
        postgres_cursor.execute("""
            INSERT INTO orders (id, customer_id, total_amount, status, payment_method, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            order['id'], order['customer_id'], order['total_amount'],
            order['status'], order['payment_method'], order['notes'], order['created_at'], order['updated_at']
        ))

    postgres_conn.commit()
    print(f"✅ Migrated {len(orders)} orders")


def migrate_order_items(sqlite_cursor, postgres_cursor, postgres_conn):
    """Migrate order_items table"""
    print("🔄 Migrating order items...")

    sqlite_cursor.execute("""
        SELECT id, order_id, product_id, quantity, unit_price, gst, total_price, created_at
        FROM order_items
    """)
    items = sqlite_cursor.fetchall()

    for item in items:
        postgres_cursor.execute("""
            INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, gst, total_price, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            item['id'], item['order_id'], item['product_id'], item['quantity'],
            item['unit_price'], item['gst'], item['total_price'], item['created_at']
        ))

    postgres_conn.commit()
    print(f"✅ Migrated {len(items)} order items")


def migrate_bills(sqlite_cursor, postgres_cursor, postgres_conn):
    """Migrate bills table"""
    print("🔄 Migrating bills...")

    sqlite_cursor.execute("""
        SELECT id, order_id, bill_number, customer_id, total_amount, payment_method, status, notes, created_at, updated_at
        FROM bills
    """)
    bills = sqlite_cursor.fetchall()

    for bill in bills:
        postgres_cursor.execute("""
            INSERT INTO bills (id, order_id, bill_number, customer_id, total_amount, payment_method, status, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            bill['id'], bill['order_id'], bill['bill_number'], bill['customer_id'],
            bill['total_amount'], bill['payment_method'], bill['status'],
            bill['notes'], bill['created_at'], bill['updated_at']
        ))

    postgres_conn.commit()
    print(f"✅ Migrated {len(bills)} bills")


def migrate_kot_logs(sqlite_cursor, postgres_cursor, postgres_conn):
    """Migrate KOT logs table"""
    print("🔄 Migrating KOT logs...")

    sqlite_cursor.execute("""
        SELECT id, order_id, status, printed_at, completed_at, created_at
        FROM kot_logs
    """)
    kot_logs = sqlite_cursor.fetchall()

    for log in kot_logs:
        postgres_cursor.execute("""
            INSERT INTO kot_logs (id, order_id, status, printed_at, completed_at, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            log['id'], log['order_id'], log['status'], log['printed_at'],
            log['completed_at'], log['created_at']
        ))

    postgres_conn.commit()
    print(f"✅ Migrated {len(kot_logs)} KOT logs")


def print_summary(sqlite_cursor, postgres_cursor):
    """Print migration summary"""
    print("📊 Data Summary:\n")

    tables = ['orders', 'order_items', 'bills', 'kot_logs']

    for table in tables:
        sqlite_cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
        sqlite_count = sqlite_cursor.fetchone()['count']

        postgres_cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
        postgres_count = postgres_cursor.fetchone()[0]

        status = "✅" if sqlite_count == postgres_count else "⚠️"
        print(f"  {status} {table:15} | SQLite: {sqlite_count:5} | PostgreSQL: {postgres_count:5}")


if __name__ == '__main__':
    migrate_data()
