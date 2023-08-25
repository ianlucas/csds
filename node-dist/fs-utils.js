"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rmByFileList = exports.mkdirRecursive = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
function mkdirRecursive(path) {
    const folders = path.split("/");
    let currentPath = "";
    for (const folder of folders) {
        currentPath += folder + "/";
        if (!(0, fs_1.existsSync)(currentPath)) {
            (0, fs_1.mkdirSync)(currentPath);
        }
    }
}
exports.mkdirRecursive = mkdirRecursive;
function rmByFileList(basePath, fileList) {
    const files = fileList.split("\n").map((filePath) => filePath.trim());
    for (const filePath of files) {
        const absolutePath = (0, path_1.resolve)(basePath, filePath);
        try {
            const stats = (0, fs_1.statSync)(absolutePath);
            if (stats.isFile()) {
                (0, fs_1.unlinkSync)(absolutePath);
                console.log(`Deleted file: ${absolutePath}`);
            }
            else if (stats.isDirectory()) {
                const dirContents = (0, fs_1.readdirSync)(absolutePath);
                if (dirContents.length === 0) {
                    (0, fs_1.rmdirSync)(absolutePath);
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
exports.rmByFileList = rmByFileList;
