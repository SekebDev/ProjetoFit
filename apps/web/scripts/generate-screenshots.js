const path = require('path');
const fs = require('fs');

// Simple 1x1 placeholder PNG (can be replaced with real screenshots)
const placeholderPng = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0A, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
  0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00,
  0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

async function generateScreenshots() {
  const publicDir = path.join(__dirname, '../public');

  try {
    // Create placeholder screenshots
    fs.writeFileSync(path.join(publicDir, 'screenshot-540.png'), placeholderPng);
    console.log('✓ Created screenshot-540.png (placeholder)');

    fs.writeFileSync(path.join(publicDir, 'screenshot-1280.png'), placeholderPng);
    console.log('✓ Created screenshot-1280.png (placeholder)');

    console.log('\n⚠️  Placeholder screenshots created.');
    console.log('\nTo generate real screenshots, you can:');
    console.log('1. Take screenshots manually from http://localhost:3000');
    console.log('2. Use tools like:');
    console.log('   - Playwright: npx playwright test --update-snapshots');
    console.log('   - Sharp: npx sharp -i public/icon-512.png -o public/screenshot-540.png 540 720');
    console.log('   - Puppeteer/Lighthouse for production screenshots');
    console.log('\n✓ Manifest already references these screenshots.');

  } catch (error) {
    console.error('Error generating screenshots:', error.message);
    process.exit(1);
  }
}

generateScreenshots();
