import fs from 'fs';
import path from 'path';

const apiDir = './src/api';
const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(apiDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace 1 with true and 0 with false for boolean fields
  // is_active = 1 or is_active = 0
  content = content.replace(/is_active\s*=\s*1(?![\d])/g, 'is_active = true');
  content = content.replace(/is_active\s*=\s*0(?![\d])/g, 'is_active = false');
  content = content.replace(/is_active\s*\?\s*1\s*:\s*0/g, 'is_active ? true : false');
  content = content.replace(/is_active\s*\?\s*true\s*:\s*false/g, 'is_active ? true : false');
  // Replace 1 and 0 in WHERE clauses  
  content = content.replace(/is_active\s*=\s*true/g, 'is_active = true');
  content = content.replace(/is_active\s*=\s*false/g, 'is_active = false');
  // is_beverage replacements
  content = content.replace(/is_beverage\s*=\s*1(?![\d])/g, 'is_beverage = true');
  content = content.replace(/is_beverage\s*=\s*0(?![\d])/g, 'is_beverage = false');
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed booleans in ${file}`);
});
