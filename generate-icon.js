const fs = require('fs');
const { exec } = require('child_process');

// Read the SVG content
const svgContent = fs.readFileSync('./media/icon.svg', 'utf8');

// Create a simple HTML page with the SVG
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>SVG to PNG Converter</title>
  <style>
    body { margin: 0; padding: 0; }
    #canvas { display: block; }
  </style>
</head>
<body>
  <div id="svg-container">${svgContent}</div>
  <canvas id="canvas" width="128" height="128"></canvas>
  <script>
    // Function to convert SVG to PNG
    function convertSvgToPng() {
      const svgElement = document.querySelector('svg');
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create an image from the SVG
      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = function() {
        // Draw the image on the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to PNG data URL
        const pngData = canvas.toDataURL('image/png');
        
        // Output the base64 data
        console.log(pngData);
      };
      
      img.src = url;
    }
    
    // Call the conversion function when the page loads
    window.onload = convertSvgToPng;
  </script>
</body>
</html>
`;

// Write the HTML file
fs.writeFileSync('./temp-icon-generator.html', html);

console.log('HTML file created. Opening in browser...');
console.log('Please copy the data URL output from the browser console and use it to create your PNG file.');

// Open the HTML file in the default browser
if (process.platform === 'darwin') {
  exec('open ./temp-icon-generator.html');
} else if (process.platform === 'win32') {
  exec('start ./temp-icon-generator.html');
} else {
  exec('xdg-open ./temp-icon-generator.html');
} 