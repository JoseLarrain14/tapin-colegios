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

  // Build a map of font base names to their hashed filenames
  // e.g., "MaterialCommunityIcons" -> "MaterialCommunityIcons.b62641afc9ab487008e996a5c5865e56.ttf"
  const fontNameMap = {};

  for (const fontPath of fonts) {
    const fileName = path.basename(fontPath);
    const destPath = path.join(fontsDir, fileName);
    fs.copyFileSync(fontPath, destPath);
    console.log(`Copied: ${fileName}`);

    // Extract base name (e.g., "MaterialCommunityIcons" from "MaterialCommunityIcons.b62641afc9ab487008e996a5c5865e56.ttf")
    const match = fileName.match(/^([^.]+)\.[a-f0-9]+\.ttf$/);
    if (match) {
      fontNameMap[match[1]] = fileName;
    }
  }

  console.log('Font name map:', fontNameMap);

  // Regex to replace long asset paths with simple /fonts/ paths
  const fontPathRegex = /\/assets\/__node_modules\/[^"'\)]+\/Fonts\/([^"'\)]+\.ttf)/g;

  // Regex to replace CDN URLs with local paths
  // Matches: https://cdn.jsdelivr.net/npm/react-native-vector-icons@X.X.X/Fonts/FontName.ttf
  // Also matches unpkg and other CDNs
  const cdnFontRegex = /https?:\/\/[^'"]+\/(?:react-native-vector-icons|@expo\/vector-icons)[^'"]*\/Fonts\/([^'"]+)\.ttf/g;

  // Update JS bundle to use new font paths
  const expoDir = path.join(distDir, '_expo', 'static', 'js', 'web');
  if (fs.existsSync(expoDir)) {
    const jsFiles = fs.readdirSync(expoDir).filter(f => f.endsWith('.js'));
    for (const jsFile of jsFiles) {
      const jsPath = path.join(expoDir, jsFile);
      let content = fs.readFileSync(jsPath, 'utf8');
      let newContent = content.replace(fontPathRegex, '/fonts/$1');

      if (content !== newContent) {
        fs.writeFileSync(jsPath, newContent);
        console.log(`Updated font paths in JS: ${jsFile}`);
      }
    }
  }

  // Update HTML files to use new font paths (both asset paths AND CDN URLs)
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
    let modified = false;

    // Replace long asset paths
    let newContent = content.replace(fontPathRegex, '/fonts/$1');
    if (newContent !== content) {
      modified = true;
      content = newContent;
    }

    // Replace CDN URLs with local font paths
    newContent = content.replace(cdnFontRegex, (match, fontName) => {
      // Look up the hashed filename for this font
      const hashedFileName = fontNameMap[fontName];
      if (hashedFileName) {
        console.log(`  Replacing CDN URL for ${fontName} -> /fonts/${hashedFileName}`);
        return `/fonts/${hashedFileName}`;
      }
      // If we don't have a local copy, keep the CDN URL
      console.log(`  Warning: No local font found for ${fontName}, keeping CDN URL`);
      return match;
    });

    if (newContent !== content) {
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(htmlPath, newContent);
      console.log(`Updated font paths in HTML: ${path.basename(htmlPath)}`);
    }
  }

  console.log('Font copy completed!');
} else {
  console.log('No assets directory found');
}
