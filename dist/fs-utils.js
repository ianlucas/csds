import { existsSync, mkdirSync, readdirSync, rmdirSync, statSync, unlinkSync } from "fs";
import { resolve } from "path";
export function mkdirRecursive(path) {
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
