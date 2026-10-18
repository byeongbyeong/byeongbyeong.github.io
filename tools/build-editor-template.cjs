const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const hash = crypto.createHash('sha256').update(html).digest('hex');
fs.writeFileSync(path.join(root, 'editor-template.js'), 'window.SORI_TEMPLATE = ' + JSON.stringify({ html, hash }) + ';\n');
console.log('Editor template updated: ' + hash);
