import AdminZip from "adm-zip";
import { createReadStream, existsSync, mkdirSync } from "fs";
import { extract } from "tar";
import { createGunzip } from "zlib";
export function mkdirRecursively(path) {
    const folders = path.split("/");
    let currentPath = "";
    for (const folder of folders) {
        currentPath += folder + "/";
        if (!existsSync(currentPath)) {
            mkdirSync(currentPath);
        }
    }
}
export async function extractZip(zipFilePath, destFolder) {
    const zip = new AdminZip(zipFilePath);
    zip.extractAllTo(destFolder, true);
}
export async function extractTarGz(tarGzFilePath, destFolder) {
    return new Promise((resolve, reject) => {
        const readStream = createReadStream(tarGzFilePath);
        const gunzipStream = createGunzip();
        const extractStream = extract({ cwd: destFolder });
        readStream
            .pipe(gunzipStream)
            .pipe(extractStream)
            .on("finish", () => {
            resolve();
        })
            .on("error", (error) => {
            reject(error);
        });
    });
}