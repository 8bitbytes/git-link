import * as fs from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';

interface PackageJson {
    name: string;
    version: string;
    publisher: string;
    [key: string]: unknown;
}

// Read command line arguments
const altPublisher = process.argv[2];
if (!altPublisher) {
    console.error('Please provide an alternative publisher name');
    console.error('Usage: ts-node scripts/package-alt.ts <publisher-name>');
    process.exit(1);
}

// Read the original package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const originalPackageJson = fs.readFileSync(packageJsonPath, 'utf8');
const packageData = JSON.parse(originalPackageJson) as PackageJson;

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
    process.exit(1);
} finally {
    // Restore the original package.json
    packageData.publisher = originalPublisher;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
    console.log('\nRestored original package.json');
} 