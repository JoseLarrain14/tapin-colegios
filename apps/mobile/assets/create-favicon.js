const fs = require('fs');
const path = require('path');

// Minimal valid PNG - 32x32 coral colored square
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIklEQVR4nGNgGAWjYBSMglEwCkbBKBgFo2AUjIJRQE8AAAU4AAHLNKOrAAAAAElFTkSuQmCC', 'base64');

const faviconPath = path.join(__dirname, 'favicon.png');
fs.writeFileSync(faviconPath, png);
console.log('Created favicon.png');
