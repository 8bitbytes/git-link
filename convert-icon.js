const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, 'media', 'icon.svg');
const pngPath = path.join(__dirname, 'media', 'icon.png');

// Read the SVG file
const svgBuffer = fs.readFileSync(svgPath);

// Convert SVG to PNG with different sizes
async function convertToPng() {
  try {
    // Create 128x128 PNG (default size)
    await sharp(svgBuffer)
      .png()
      .toFile(pngPath);
    
    console.log(`Successfully created PNG icon at ${pngPath}`);
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
  }
}

convertToPng(); 