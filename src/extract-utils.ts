import AdmZip from "adm-zip";
import { createReadStream } from "fs";
import { extract } from "tar";
import { createGunzip } from "zlib";

export async function extractZip(zipFilePath: string, destFolder: string) {
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(destFolder, true);
}

export function extractZipFromBuffer(
    zipFileBuffer: Buffer,
    destFolder: string
) {
    const zip = new AdmZip(zipFileBuffer);
    zip.extractAllTo(destFolder, true);
    return zip.getEntries().map((entry) => {
        return entry.entryName;
    }).join("\n");
}

export async function extractTarGz(
    tarGzFilePath: string,
    destFolder: string
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
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
