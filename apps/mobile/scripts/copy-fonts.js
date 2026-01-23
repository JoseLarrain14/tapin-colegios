const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const fontsDir = path.join(distDir, 'fonts');

// Create fonts directory
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Find and copy font files
function findFonts(dir, fonts = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findFonts(fullPath, fonts);
    } else if (file.endsWith('.ttf')) {
      fonts.push(fullPath);
    }
  }
  return fonts;
}

const assetsDir = path.join(distDir, 'assets');
if (fs.existsSync(assetsDir)) {
  const fonts = findFonts(assetsDir);

  console.log(`Found ${fonts.length} fonts`);

  for (const fontPath of fonts) {
    const fileName = path.basename(fontPath);
    const destPath = path.join(fontsDir, fileName);
    fs.copyFileSync(fontPath, destPath);
    console.log(`Copied: ${fileName}`);
  }

  // Update JS bundle to use new font paths
  const expoDir = path.join(distDir, '_expo', 'static', 'js', 'web');
  if (fs.existsSync(expoDir)) {
    const jsFiles = fs.readdirSync(expoDir).filter(f => f.endsWith('.js'));
    for (const jsFile of jsFiles) {
      const jsPath = path.join(expoDir, jsFile);
      let content = fs.readFileSync(jsPath, 'utf8');

      // Replace long asset paths with simple /fonts/ paths
      const regex = /\/assets\/__node_modules\/[^"']+\/Fonts\/([^"']+\.ttf)/g;
      const newContent = content.replace(regex, '/fonts/$1');

      if (content !== newContent) {
        fs.writeFileSync(jsPath, newContent);
        console.log(`Updated font paths in: ${jsFile}`);
      }
    }
  }

  console.log('Font copy completed!');
} else {
  console.log('No assets directory found');
}
