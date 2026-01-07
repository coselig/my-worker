const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'coselig_staff_portal_frontend', 'build', 'web');

function getFiles(dir, prefix = '') {
  const files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getFiles(fullPath, prefix + item + '/'));
    } else {
      const key = prefix + item;
      const value = fs.readFileSync(fullPath, 'base64');
      files.push({ key, value, base64: true });
    }
  }
  return files;
}

const files = getFiles(buildDir);
fs.writeFileSync('assets.json', JSON.stringify(files, null, 2));
console.log(`Generated assets.json with ${files.length} files`);