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

  // Regex to replace long asset paths with simple /fonts/ paths
  const fontPathRegex = /\/assets\/__node_modules\/[^"'\)]+\/Fonts\/([^"'\)]+\.ttf)/g;

  // Update JS bundle to use new font paths
  const expoDir = path.join(distDir, '_expo', 'static', 'js', 'web');
  if (fs.existsSync(expoDir)) {
    const jsFiles = fs.readdirSync(expoDir).filter(f => f.endsWith('.js'));
    for (const jsFile of jsFiles) {
      const jsPath = path.join(expoDir, jsFile);
      let content = fs.readFileSync(jsPath, 'utf8');
      const newContent = content.replace(fontPathRegex, '/fonts/$1');

      if (content !== newContent) {
        fs.writeFileSync(jsPath, newContent);
        console.log(`Updated font paths in JS: ${jsFile}`);
      }
    }
  }

  // Update HTML files to use new font paths
  function findHtmlFiles(dir, htmlFiles = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findHtmlFiles(fullPath, htmlFiles);
      } else if (file.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
    return htmlFiles;
  }

  const htmlFiles = findHtmlFiles(distDir);
  console.log(`Found ${htmlFiles.length} HTML files`);

  for (const htmlPath of htmlFiles) {
    let content = fs.readFileSync(htmlPath, 'utf8');
    const newContent = content.replace(fontPathRegex, '/fonts/$1');

    if (content !== newContent) {
      fs.writeFileSync(htmlPath, newContent);
      console.log(`Updated font paths in HTML: ${path.basename(htmlPath)}`);
    }
  }

  console.log('Font copy completed!');
} else {
  console.log('No assets directory found');
}
