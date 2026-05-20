import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './connection.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse menu PDF and populate database with items
 * Run: node parseMenu.js
 */
export async function parseMenuFromPDF(menuPdfPath) {
  try {
    console.log('📄 Parsing menu PDF...');

    // Use Python to extract text from PDF
    const pythonScript = `
import pdfplumber
import json
import sys

try:
    with pdfplumber.open('${menuPdfPath}') as pdf:
        items = []
        current_category = None

        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue

            lines = text.strip().split('\\n')

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Try to parse lines as "Name - Price" or "Name Price"
                # Categories might be in CAPS or bold (we'll infer from context)

                # Check if it looks like a category (all caps or ends with colon)
                if line.isupper() or line.endswith(':'):
                    current_category = line.replace(':', '').strip()
                    continue

                # Try to extract price (look for numbers at the end)
                parts = line.rsplit(None, 1)  # Split from right to get last word
                if len(parts) == 2:
                    name, price_str = parts
                    try:
                        price = float(price_str.replace('₹', '').replace('Rs', '').strip())
                        items.append({
                            'name': name.strip(),
                            'price': price,
                            'category': current_category or 'Uncategorized'
                        })
                    except ValueError:
                        # Not a price, might be part of the name
                        pass

        print(json.dumps(items, ensure_ascii=False, indent=2))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    const result = execSync(`python3 << 'PYTHONEOF'
${pythonScript}
PYTHONEOF
`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });

    const items = JSON.parse(result);

    if (items.error) {
      throw new Error(items.error);
    }

    console.log(`✅ Found ${items.length} menu items`);

    // Populate database
    const db = await getDatabase();

    // Clear existing products
    await db.run('DELETE FROM products');
    console.log('🗑️  Cleared existing products');

    // Insert parsed items
    let categoryMap = {};
    let categoryCount = 0;

    for (const item of items) {
      const productId = uuidv4();
      const category = item.category || 'Other';

      const isBeverage = category.toLowerCase().includes('beverage') ||
                         category.toLowerCase().includes('drink');

      await db.run(
        `INSERT INTO products (id, name, category, price, is_beverage, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [productId, item.name, category, item.price, isBeverage ? 1 : 0]
      );

      if (!categoryMap[category]) {
        categoryMap[category] = 0;
        categoryCount++;
      }
      categoryMap[category]++;
    }

    console.log('✅ Database populated with menu items');
    console.log(`\n📊 Summary:`);
    for (const [category, count] of Object.entries(categoryMap)) {
      console.log(`   ${category}: ${count} items`);
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to parse menu:', error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const resourcesPath = join(__dirname, '../../resources/menu.pdf');
  parseMenuFromPDF(resourcesPath)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export default parseMenuFromPDF;
