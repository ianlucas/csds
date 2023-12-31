import AdmZip from "adm-zip";
import { createReadStream, existsSync, mkdirSync, readdirSync, rmdirSync, statSync, unlinkSync } from "fs";
import { resolve } from "path";
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
export function rmByFileList(basePath, fileList) {
    const files = fileList.split("\n").map((filePath) => filePath.trim());
    for (const filePath of files) {
        const absolutePath = resolve(basePath, filePath);
        try {
            const stats = statSync(absolutePath);
            if (stats.isFile()) {
                unlinkSync(absolutePath);
                console.log(`Deleted file: ${absolutePath}`);
            }
            else if (stats.isDirectory()) {
                const dirContents = readdirSync(absolutePath);
                if (dirContents.length === 0) {
                    rmdirSync(absolutePath);
                    console.log(`Deleted empty directory: ${absolutePath}`);
                }
                else {
                    console.log(`Skipped non-empty directory: ${absolutePath}`);
                }
            }
        }
        catch (error) {
            console.error(`Error deleting ${absolutePath}:`, error);
        }
    }
}
export async function extractZip(zipFilePath, destFolder) {
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(destFolder, true);
}
export function extractZipFromBuffer(zipFileBuffer, destFolder) {
    const zip = new AdmZip(zipFileBuffer);
    zip.extractAllTo(destFolder, true);
    return zip.getEntries().map((entry) => {
        return entry.entryName;
    }).join("\n");
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
