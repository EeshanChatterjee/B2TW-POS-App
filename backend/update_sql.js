import fs from 'fs';
import path from 'path';

const apiDir = './src/api';
const filesToUpdate = ['bills.js', 'customers.js', 'inventory.js', 'orders.js', 'reports.js', 'settings.js'];

filesToUpdate.forEach(file => {
  const filePath = path.join(apiDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace all ? with numbered placeholders
  // Count ? in the entire file and replace them sequentially within each statement
  let lines = content.split('\n');
  let result = [];
  
  for (let line of lines) {
    if (line.includes('?')) {
      let count = 1;
      line = line.replace(/\?/g, () => `$${count++}`);
    }
    result.push(line);
  }
  
  fs.writeFileSync(filePath, result.join('\n'), 'utf-8');
  console.log(`Updated ${file}`);
});
