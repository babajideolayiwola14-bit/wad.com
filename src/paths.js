const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

module.exports = { ROOT, PUBLIC_DIR, UPLOADS_DIR };
