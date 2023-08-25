"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTarGz = exports.extractZipFromBuffer = exports.extractZip = void 0;
const adm_zip_1 = __importDefault(require("adm-zip"));
const fs_1 = require("fs");
const tar_1 = require("tar");
const zlib_1 = require("zlib");
function extractZip(zipFilePath, destFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        const zip = new adm_zip_1.default(zipFilePath);
        zip.extractAllTo(destFolder, true);
    });
}
exports.extractZip = extractZip;
function extractZipFromBuffer(zipFileBuffer, destFolder) {
    const zip = new adm_zip_1.default(zipFileBuffer);
    zip.extractAllTo(destFolder, true);
    return zip.getEntries().map((entry) => {
        return entry.entryName;
    }).join("\n");
}
exports.extractZipFromBuffer = extractZipFromBuffer;
function extractTarGz(tarGzFilePath, destFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const readStream = (0, fs_1.createReadStream)(tarGzFilePath);
            const gunzipStream = (0, zlib_1.createGunzip)();
            const extractStream = (0, tar_1.extract)({ cwd: destFolder });
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
    });
}
exports.extractTarGz = extractTarGz;
