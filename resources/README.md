# Menu Resources

This folder is for storing menu resources like PDF files.

## Setting up the Menu

### Step 1: Add Menu PDF
1. Place your menu PDF file here as `menu.pdf`
   - File name should be exactly: `menu.pdf`
   - The PDF should contain menu items with prices

### Step 2: Parse the Menu
Once you have the PDF in this folder, run:

```bash
cd backend
npm run menu:parse
```

This will:
- Extract all items and prices from the PDF
- Auto-detect categories (e.g., "Beverages", "Main", "Sides")
- Populate the database with all menu items
- Replace the default sample products

### Step 3: Verify in App
Restart the frontend dev server and check the Teller Screen - your menu items should appear in the Product Grid.

## Menu PDF Format

The parser expects a format like:

```
MAIN ITEMS
Bao - Chicken 150
Bao - Vegetarian 120

BEVERAGES
Sprite 50
Coke 50
```

Or with currency symbols:
```
MAIN ITEMS
Bao - Chicken ₹150
Bao - Vegetarian ₹120
```

The parser automatically:
- Detects category headers (lines in CAPS or ending with `:`)
- Extracts item names and prices
- Categorizes beverages automatically if "Beverage" is in the category name

## Troubleshooting

- **PDF not found**: Make sure the file is named exactly `menu.pdf`
- **No items parsed**: Check that prices are numbers at the end of each line
- **Wrong categories**: Edit the PDF or reorganize the items by category header

## Manual Alternative

If the PDF parser doesn't work perfectly, you can:
1. Export menu items as a CSV from a spreadsheet
2. Or manually edit `backend/src/db/init.js` and add items to the `sampleProducts` array
3. Then run `npm run db:init` to reinitialize
