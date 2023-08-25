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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SteamCMD = void 0;
const fs_1 = require("fs");
const https_1 = require("https");
const path_1 = require("path");
const child_process_utils_js_1 = require("./child-process-utils.js");
const extract_utils_js_1 = require("./extract-utils.js");
const fs_utils_js_1 = require("./fs-utils.js");
const STEAMCMD_LINUX_URL = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz";
const STEAMCMD_WINDOWS_URL = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip";
const progressRE = /Update state \((0x\d+)\) (\w+), progress: (\d+.\d+) \((\d+) \/ (\d+)\)/;
class SteamCMD {
    constructor(platform = "linux", path) {
        this.path = (0, path_1.join)(path, ".steamcmd");
        this.executable = (0, path_1.join)(this.path, platform === "win32" ? "steamcmd.exe" : "steamcmd.sh");
        this.platform = platform;
    }
    download() {
        return new Promise((resolve, reject) => {
            console.log("Downloading SteamCMD...");
            const url = this.platform === "win32"
                ? STEAMCMD_WINDOWS_URL
                : STEAMCMD_LINUX_URL;
            const filePath = (0, path_1.join)(this.path, (0, path_1.basename)(url));
            const file = (0, fs_1.createWriteStream)(filePath);
            (0, https_1.get)(url, (response) => {
                response.pipe(file);
                file.on("finish", () => {
                    console.log(`SteamCMD donwloaded to ${filePath}`);
                    file.close();
                    resolve(filePath);
                }).on("error", (error) => {
                    (0, fs_1.unlinkSync)(filePath);
                    reject(error);
                });
            });
        });
    }
    extract(steamCMDCompressedFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Extracting SteamCMD...");
            const extract = this.platform === "win32" ? extract_utils_js_1.extractZip : extract_utils_js_1.extractTarGz;
            yield extract(steamCMDCompressedFilePath, this.path);
            (0, fs_1.unlinkSync)(steamCMDCompressedFilePath);
            console.log("SteamCMD extracted.");
        });
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, fs_1.existsSync)(this.executable)) {
                (0, fs_utils_js_1.mkdirRecursive)(this.path);
                yield this.extract(yield this.download());
            }
        });
    }
    exec(commands, onData) {
        return __awaiter(this, void 0, void 0, function* () {
            commands = `+force_install_dir ${this.path}/steamcmd ${commands}`;
            console.log("Running SteamCMD with commands:", commands);
            return new Promise((resolve) => {
                const child = (0, child_process_utils_js_1.spawn)(this.executable, commands.split(" "));
                child.onData((data) => {
                    onData(data.toString());
                });
                child.onExit(({ exitCode }) => {
                    resolve(exitCode === 0);
                });
            });
        });
    }
    updateApp(appId, onProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.exec(`+login anonymous +app_update ${appId} +quit`, data => {
                data.split("\n").forEach(line => {
                    const progressMatches = line.trim().match(progressRE);
                    if (progressMatches) {
                        const [, state, status, progress, current, total] = progressMatches;
                        onProgress({
                            state,
                            status,
                            progress: parseFloat(progress),
                            current: parseInt(current),
                            total: parseInt(total)
                        });
                    }
                });
            });
        });
    }
}
exports.SteamCMD = SteamCMD;
