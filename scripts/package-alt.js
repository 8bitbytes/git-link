const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Read command line arguments
const altPublisher = process.argv[2];
if (!altPublisher) {
    console.error('Please provide an alternative publisher name');
    console.error('Usage: node scripts/package-alt.js <publisher-name>');
    process.exit(1);
}

// Read the original package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const originalPackageJson = fs.readFileSync(packageJsonPath, 'utf8');
const packageData = JSON.parse(originalPackageJson);

// Store the original publisher
const originalPublisher = packageData.publisher;

try {
    // Update the publisher
    packageData.publisher = altPublisher;
    
    // Write the modified package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
    
    // Run vsce package
    console.log(`Creating VSIX with publisher: ${altPublisher}`);
    execSync('vsce package', { stdio: 'inherit' });
    
    // Rename the generated VSIX to include the publisher
    const vsixName = `${packageData.name}-${packageData.version}.vsix`;
    const newVsixName = `${packageData.name}-${altPublisher}-${packageData.version}.vsix`;
    fs.renameSync(vsixName, newVsixName);
    
    console.log(`\nSuccessfully created: ${newVsixName}`);
} catch (error) {
    console.error('Error creating package:', error);
} finally {
    // Restore the original package.json
    packageData.publisher = originalPublisher;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
    console.log('\nRestored original package.json');
} 