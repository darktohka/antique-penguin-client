const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const fullAppName = 'Antique Penguin'
const appName = 'antique';

function isLinux() {
    return process.platform === 'linux';
}

async function packAppImage({artifactPaths}) {
    if (!isLinux()) {
        return;
    }

    for (const artifactPath of artifactPaths) {
        const dir = path.dirname(artifactPath);
        let baseName = path.basename(artifactPath);

        // Replace Antique Penguin-version.AppImage with antique-version.AppImage
        if (baseName.includes(fullAppName)) {
            const newBaseName = baseName.replace(fullAppName, appName);
            const newArtifactPath = path.join(dir, newBaseName);
            fs.renameSync(artifactPath, newArtifactPath);
            baseName = newBaseName;
        }

        // Create tar file for AppImage
        child_process.exec(`tar -cvf ${baseName}.tar ${baseName}`, {cwd: dir});
    }
}

async function afterBuild(config) {
    await packAppImage(config);
}

module.exports = afterBuild;
