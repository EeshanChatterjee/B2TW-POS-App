#!/usr/bin/env python3
"""
Extract sales data from sales log images using OCR (Tesseract).
Processes all dated folders in the Blue_Ridge_Images directory and extracts:
- Product names, quantities, prices
- Payment method breakdown (Cash, UPI, Card)
- Total amount
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
import pytesseract
from PIL import Image
import sys

# Configuration
IMAGES_BASE_PATH = Path.home() / "Documents" / "Claude" / "Projects" / "Bao to the Wings" / "Blue_Ridge_Images" / "2026-05"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "extracted_sales_data.json"

def extract_text_from_image(image_path):
    """Extract text from image using Tesseract OCR."""
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        print(f"Error extracting text from {image_path}: {e}")
        return ""

def parse_sales_log(text):
    """
    Parse sales log text to extract:
    - Items sold (product, qty, price)
    - Total amount
    - Payment breakdown (Cash, UPI, Card)
    """
    lines = text.strip().split('\n')

    items = []
    totals = {
        'total': 0,
        'cash': 0,
        'upi': 0,
        'card': 0,
        'cash_box': 0
    }

    # Look for payment summary lines
    for line in lines:
        line_lower = line.lower().strip()

        # Extract totals
        if 'total' in line_lower and '=' in line:
            match = re.search(r'=\s*(\d+)', line)
            if match:
                totals['total'] = int(match.group(1))
        elif 'cash sale' in line_lower and '=' in line:
            match = re.search(r'=\s*(\d+)', line)
            if match:
                totals['cash'] = int(match.group(1))
        elif 'upi' in line_lower and '=' in line:
            match = re.search(r'=\s*(\d+)', line)
            if match:
                totals['upi'] = int(match.group(1))
        elif 'card' in line_lower and '=' in line:
            match = re.search(r'=\s*(\d+)', line)
            if match:
                totals['card'] = int(match.group(1))
        elif 'cash box' in line_lower and '=' in line:
            match = re.search(r'=\s*(\d+)', line)
            if match:
                totals['cash_box'] = int(match.group(1))

    return {
        'items': items,
        'totals': totals,
        'raw_text': text
    }

def process_date_folder(date_path):
    """Process all images in a dated folder."""
    if not date_path.is_dir():
        return None

    date_str = date_path.name  # e.g., "2026-05-19"
    print(f"Processing {date_str}...")

    images = sorted([f for f in date_path.glob("image_msg_*.jpg")])

    if not images:
        print(f"  No images found in {date_str}")
        return None

    day_sales = {
        'date': date_str,
        'images_processed': len(images),
        'sales_logs': []
    }

    for img_file in images:
        print(f"  Extracting from {img_file.name}...")
        text = extract_text_from_image(str(img_file))
        parsed = parse_sales_log(text)

        day_sales['sales_logs'].append({
            'image': img_file.name,
            'parsed_data': parsed['totals'],
            'raw_text': parsed['raw_text']
        })

    return day_sales

def main():
    """Main extraction process."""
    print("Starting sales data extraction from images...")
    print(f"Source: {IMAGES_BASE_PATH}\n")

    if not IMAGES_BASE_PATH.exists():
        print(f"Error: Images directory not found at {IMAGES_BASE_PATH}")
        sys.exit(1)

    # Collect all dated folders (2026-04-30 through 2026-05-22)
    date_folders = sorted([d for d in IMAGES_BASE_PATH.iterdir()
                          if d.is_dir() and re.match(r'\d{4}-\d{2}-\d{2}', d.name)])

    all_sales = []

    for date_folder in date_folders:
        result = process_date_folder(date_folder)
        if result:
            all_sales.append(result)

    # Save results
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(all_sales, f, indent=2)

    print(f"\n✅ Extraction complete!")
    print(f"Processed {len(all_sales)} days")
    print(f"Results saved to: {OUTPUT_FILE}")

    # Print summary
    total_sales = 0
    total_days = 0
    for day in all_sales:
        day_total = sum(log['parsed_data']['total'] for log in day['sales_logs'])
        if day_total > 0:
            print(f"  {day['date']}: ₹{day_total}")
            total_sales += day_total
            total_days += 1

    print(f"\nTotal from {total_days} days: ₹{total_sales}")

if __name__ == "__main__":
    main()
