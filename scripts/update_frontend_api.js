const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'frontend', 'src');
const oldValue = 'http://localhost:5000/api';
const newValue = '${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api';
let changed = 0;

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.split(oldValue).join(newValue);
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    changed += 1;
  }
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (full.endsWith('.js') || full.endsWith('.jsx')) {
      replaceInFile(full);
    }
  }
}

walk(root);
console.log(`Replaced in ${changed} files`);
