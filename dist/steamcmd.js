import { createWriteStream, existsSync, unlinkSync } from "fs";
import { get } from "https";
import { basename, join } from "path";
import { spawn } from "./child-process-utils.js";
import { extractTarGz, extractZip } from "./extract-utils.js";
import { mkdirRecursive } from "./fs-utils.js";
const STEAMCMD_LINUX_URL = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz";
const STEAMCMD_WINDOWS_URL = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip";
const progressRE = /Update state \((0x\d+)\) (\w+), progress: (\d+.\d+) \((\d+) \/ (\d+)\)/;
export class SteamCMD {
    path;
    executable;
    platform;
    constructor(platform = "linux", path) {
        this.path = join(path, ".steamcmd");
        this.executable = join(this.path, platform === "win32" ? "steamcmd.exe" : "steamcmd.sh");
        this.platform = platform;
    }
    download() {
        return new Promise((resolve, reject) => {
            console.log("Downloading SteamCMD...");
            const url = this.platform === "win32"
                ? STEAMCMD_WINDOWS_URL
                : STEAMCMD_LINUX_URL;
            const filePath = join(this.path, basename(url));
            const file = createWriteStream(filePath);
            get(url, (response) => {
                response.pipe(file);
                file.on("finish", () => {
                    console.log(`SteamCMD donwloaded to ${filePath}`);
                    file.close();
                    resolve(filePath);
                }).on("error", (error) => {
                    unlinkSync(filePath);
                    reject(error);
                });
            });
        });
    }
    async extract(steamCMDCompressedFilePath) {
        console.log("Extracting SteamCMD...");
        const extract = this.platform === "win32" ? extractZip : extractTarGz;
        await extract(steamCMDCompressedFilePath, this.path);
        unlinkSync(steamCMDCompressedFilePath);
        console.log("SteamCMD extracted.");
    }
    async update() {
        if (!existsSync(this.executable)) {
            mkdirRecursive(this.path);
            await this.extract(await this.download());
        }
    }
    async exec(commands, onData) {
        commands = `+force_install_dir ${this.path}/steamcmd ${commands}`;
        console.log("Running SteamCMD with commands:", commands);
        return new Promise((resolve) => {
            const child = spawn(this.executable, commands.split(" "));
            child.onData((data) => {
                onData(data.toString());
            });
            child.onExit(({ exitCode }) => {
                resolve(exitCode === 0);
            });
        });
    }
    async updateApp(appId, onProgress) {
        await this.exec(`+login anonymous +app_update ${appId} +quit`, data => {
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
    }
}
