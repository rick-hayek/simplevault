const fs = require('fs');
const path = require('path');

const rootPackage = require('../package.json');
const version = rootPackage.version;

console.log(`Syncing version ${version} to all packages...`);

const packagesDir = path.join(__dirname, '../packages');
const packages = fs.readdirSync(packagesDir);

packages.forEach(pkg => {
    const pkgPath = path.join(packagesDir, pkg, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const oldVersion = pkgJson.version;
        pkgJson.version = version;
        fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 4) + '\n');
        console.log(`Updated ${pkg}: ${oldVersion} -> ${version}`);
    }
});

console.log('Version sync complete.');
