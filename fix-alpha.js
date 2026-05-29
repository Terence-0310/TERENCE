const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

function replaceInFiles() {
  const dirs = ['./src/fe/components', './app'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    walkDir(dir, filePath => {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content.replace(/var\(--primary-alpha-([0-9.]+)\)/g, (match, p1) => {
          return `rgba(37,99,235,${p1})`;
        });
        if (content !== newContent) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`Updated ${filePath}`);
        }
      }
    });
  });
}

replaceInFiles();
