const fs = require('fs');
const path = require('path');

function generateIcons() {
  const mascotPath = path.join(__dirname, '../public/mascot/idle.png');
  const publicDir = path.join(__dirname, '../public');

  try {
    if (!fs.existsSync(mascotPath)) {
      console.error(`✗ Mascot file not found: ${mascotPath}`);
      process.exit(1);
    }

    console.log('Copying mascot/idle.png as PWA icons...\n');

    // Copy mascot to icons (128x128, 192x192, 512x512 variants)
    // For proper resizing, run: npm install sharp
    // Then use Sharp CLI: npx sharp -i public/mascot/idle.png -o public/icon-192.png 192 192

    fs.copyFileSync(mascotPath, path.join(publicDir, 'icon-512.png'));
    console.log('✓ icon-512.png (mascot 512x512)');

    fs.copyFileSync(mascotPath, path.join(publicDir, 'icon-192.png'));
    console.log('✓ icon-192.png (mascot 512x512)');

    fs.copyFileSync(mascotPath, path.join(publicDir, 'icon-maskable-512.png'));
    console.log('✓ icon-maskable-512.png (mascot 512x512)');

    console.log('\n⚠️  Icons are placeholder copies of idle.png.');
    console.log('\nTo generate properly resized icons:');
    console.log('  npm install sharp');
    console.log('  npx sharp -i public/mascot/idle.png -o public/icon-192.png 192 192');
    console.log('  npx sharp -i public/mascot/idle.png -o public/icon-512.png 512 512');
    console.log('\nOr use online tool: https://www.favicon-generator.org/');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generateIcons();
