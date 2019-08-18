const path = require("path");
const fs = require("fs-extra");
const { version: appVersion } = require("../package.json");
const colors = require("colors/safe");

updateVersion();

function updateVersion() {
    const versionFilePath = path.join(`${__dirname}/../src/version.ts`);

    const src = `/**
 * Do not change this manually.
 *
 *
 * version number taken from package.json
 * changed by pre-build script.
 * @type {string}
 */
export const version = '${appVersion}';
`;

    // ensure version module pulls value from package.json
    fs.writeFile(versionFilePath, src, { flag: "w" }, function(err) {
        if (err) {
            return console.log(colors.red(err));
        }

        console.log(colors.green(`Updating application version ${colors.yellow(appVersion)}`));
        console.log(
            `${colors.green("Writing version module to ")}${colors.yellow(versionFilePath)}\n`
        );
    });
}
