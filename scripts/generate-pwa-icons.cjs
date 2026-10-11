const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateIcons() {
  const svgPath = path.resolve(__dirname, '../public/favicon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generating PWA Desktop and Mobile Icons from favicon.svg...');

  const targets = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 },
  ];

  for (const t of targets) {
    const outPath = path.resolve(__dirname, `../public/${t.name}`);
    await sharp(svgBuffer)
      .resize(t.size, t.size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`Generated: ${t.name} (${t.size}x${t.size})`);
  }

  console.log('All PWA Icons Generated Successfully!');
}

generateIcons().catch(console.error);
