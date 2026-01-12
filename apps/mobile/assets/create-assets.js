const fs = require('fs');
const path = require('path');

// Minimal valid PNG - coral colored square
const png32 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIklEQVR4nGNgGAWjYBSMglEwCkbBKBgFo2AUjIJRQE8AAAU4AAHLNKOrAAAAAElFTkSuQmCC', 'base64');

const assetsDir = __dirname;

// Create icon.png and splash.png (same placeholder)
const files = ['icon.png', 'splash.png', 'adaptive-icon.png'];

files.forEach(file => {
  const filePath = path.join(assetsDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, png32);
    console.log('Created', file);
  } else {
    console.log('Already exists:', file);
  }
});
