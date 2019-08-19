"use strict";
const path = require("path");
const { version: appVersion } = require("../package.json");
const fs = require("fs-extra");
const archiver = require("archiver");
const zipFileName = `v${appVersion}.zip`;

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const destFolder = resolveApp("v" + appVersion);
const srcFolder = resolveApp("dist");
packXR();

const archive = archiver("zip", {
    zlib: { level: 9 }
});



function packXR() {
    // verify source dir is there
    if (!fs.existsSync(srcFolder)){
        throw new Error(`the specified source path (${srcFolder}) does not exist`);
    }
    // create target dir if needed
    if (!fs.existsSync(destFolder)){
        fs.mkdirSync(destFolder);
    }

    return Promise.resolve()
        .then(function() {
            console.log("copying assets from " + srcFolder + " to " + destFolder);
            return fs.copySync(srcFolder, destFolder);
        })
        .then(function() {
            console.log("creating " + zipFileName + " from dir " + destFolder);
            const archiveOutput = fs.createWriteStream(zipFileName);
            archive.pipe(archiveOutput);
            archive.directory(destFolder, false);
            return archive.finalize();
        })
        .then(function() {
            console.log("deleting dir " + destFolder);
            fs.remove(destFolder);
            console.log('completed successfully.');
        })
        .catch(function(e) {
            console.log(e);
        });
}

