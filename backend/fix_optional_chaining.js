import fs from 'fs';
import path from 'path';

const apiDir = './src/api';
const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(apiDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Fix broken optional chaining: $n. back to ?.
  content = content.replace(/\$\d+\./g, (match) => {
    // Get the number
    const num = match.match(/\d+/)[0];
    // Check context - if it's followed by a property name, it was wrongly replaced
    return `?. `;
  });
  
  // More targeted fix: result$N back to result?.
  content = content.replace(/result\$(\d+)\./g, 'result?.');
  content = content.replace(/product\$(\d+)\./g, 'product?.');
  content = content.replace(/maxPositionResult\$(\d+)\./g, 'maxPositionResult?.');
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed optional chaining in ${file}`);
});
