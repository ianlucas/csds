import EventEmitter from "events";
import { createWriteStream, existsSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { get } from "https";
import { IPty } from "node-pty";
import { basename, join, resolve } from "path";
import { spawn } from "./child-process-utils.js";
import { extractZipFromBuffer } from "./extract-utils.js";
import { mkdirRecursive, rmByFileList } from "./fs-utils.js";
import { getLocalIpAddress } from "./os-utils.js";
import { SteamCMD } from "./steamcmd.js";

const CSGODS_CONSOLE_URL =
    "https://github.com/ianlucas/csds/raw/main/ext/srcds_console.exe";
const serverPublicIpRE = /Public IP is (\d+\.\d+\.\d+\.\d+)/;
const serverOnRE = /GC Connection established for server/;

export const CSGODS_APPID = 740;
export const CSGODS_STATUS_STALE = 0;
export const CSGODS_STATUS_UPDATING_STEAMCMD = 1;
export const CSGODS_STATUS_UPDATING_CSGODS = 2;
export const CSGODS_STATUS_READY = 3;
export const CSGODS_STATUS_GOING_ONLINE = 4;
export const CSGODS_STATUS_ONLINE = 5;
export const CSGODS_STATUS_GOING_OFFLINE = 6;

export declare interface CSGODS {
    on(
        event: "state",
        listener: (state: {
            status: number;
            progress: number;
        }) => void
    ): this;
    on(
        event: "stdout",
        listener: (data: string) => void
    ): this;
}

export interface CSGODSOptions {
    gsltToken?: string;
    steamApiKey?: string;
    port?: number;
    tvPort?: number;
    game?: string;
    console?: boolean;
    usercon?: boolean;
    gameType?: number;
    gameMode?: number;
    map?: string;
    tickrate?: number;
    maxPlayersOverride?: number;
    noRestart?: boolean;
    noBreakpad?: boolean;
    noCrashDialog?: boolean;
}

export const CSGODS_LAUNCH_OPTIONS_ARGUMENTS = {
    gsltToken: "+sv_setsteamaccount",
    steamApiKey: "-authkey",
    port: "-port",
    tvPort: "+tv_port",
    game: "-game",
    console: "-console",
    usercon: "-usercon",
    gameType: "+game_type",
    gameMode: "+game_mode",
    map: "+map",
    tickrate: "-tickrate",
    maxPlayersOverride: "-maxplayers_override",
    noRestart: "-norestart",
    noBreakpad: "-nobreakpad",
    noCrashDialog: "-nocrashdialog"
};

export class CSGODS extends EventEmitter {
    state = {
        status: CSGODS_STATUS_STALE,
        progress: 0
    };
    publicIpAddress?: string;
    localIpAddress?: string;
    private platform: "win32" | "linux";
    private steamCMD: SteamCMD;
    private csgoPath: string;
    private csgoAddonsPath: string;
    private csgoDSPath: string;
    private instance?: IPty;
    private executable: string;
    private options: CSGODSOptions = {
        port: 27015,
        tvPort: 27020,
        game: "csgo",
        console: true,
        usercon: true,
        gameType: 0,
        gameMode: 1,
        map: "de_dust2",
        tickrate: 128,
        maxPlayersOverride: 12,
        noRestart: true,
        noBreakpad: true,
        noCrashDialog: true
    };

    constructor(
        platform: "win32" | "linux" = "linux",
        path: string,
        options?: CSGODSOptions
    ) {
        super();
        this.platform = platform;
        this.steamCMD = new SteamCMD(platform, path);
        this.csgoAddonsPath = join(path, ".steamcmd/plugins");
        this.csgoDSPath = join(this.steamCMD.path, "steamcmd");
        this.executable = join(
            this.csgoDSPath,
            platform === "win32" ? "srcds_console.exe" : "srcds_run"
        );
        this.options = { ...this.options, ...options };
        this.csgoPath = join(this.csgoDSPath, "csgo");
    }

    private setState(state: Partial<typeof this.state>) {
        Object.assign(this.state, state);
        this.emit("state", this.state);
    }

    private async updateSteamCMD() {
        this.setState({ status: CSGODS_STATUS_UPDATING_STEAMCMD });
        await this.steamCMD.update();
    }

    async update() {
        if (
            this.state.status === CSGODS_STATUS_UPDATING_STEAMCMD
            || this.state.status === CSGODS_STATUS_READY
        ) {
            this.setState({ status: CSGODS_STATUS_UPDATING_CSGODS });
            await this.steamCMD.updateApp(CSGODS_APPID, ({ progress }) => {
                this.setState({ progress });
            });
            await this.fixCSGODS();
            this.setState({ status: CSGODS_STATUS_READY });
        }
    }

    /// @see https://forums.alliedmods.net/showthread.php?t=287902
    private async downloadCSGODSConsole(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log("Downloading CSGODS Console for Windows...");
            const file = createWriteStream(this.executable);
            get(CSGODS_CONSOLE_URL, (response) => {
                response.pipe(file);
                file.on("finish", () => {
                    console.log(
                        `CSGODS Console donwloaded to ${this.executable}`
                    );
                    file.close();
                    resolve();
                }).on("error", (error) => {
                    unlinkSync(this.executable);
                    reject(error);
                });
            });
        });
    }

    /// @see https://github.com/GameServerManagers/LinuxGSM/blob/master/lgsm/functions/fix_csgo.sh
    private async fixCSGODS() {
        const libgccPath = join(this.csgoDSPath, "bin/libgcc_s.so.1");
        if (existsSync(libgccPath)) {
            renameSync(libgccPath, `${libgccPath}.bak`);
        }
        if (this.platform === "win32" && !existsSync(this.executable)) {
            await this.downloadCSGODSConsole();
        }
    }

    private makeLaunchOptions(options: CSGODSOptions) {
        return Object.keys(options).map(key => {
            const value = options[key as keyof CSGODSOptions];
            const argumentName =
                CSGODS_LAUNCH_OPTIONS_ARGUMENTS[key as keyof CSGODSOptions];
            if (typeof value === "boolean") {
                return value ? argumentName : "";
            }
            if (typeof value === undefined) {
                return "";
            }
            return `${argumentName} ${value}`;
        }).filter(Boolean).join(" ");
    }

    async initialize() {
        await this.updateSteamCMD();
        if (!existsSync(this.csgoAddonsPath)) {
            mkdirRecursive(this.csgoAddonsPath);
        }
        await this.update();
    }

    installAddon(pluginName: string, zipFileBuffer: Buffer) {
        const fileList = extractZipFromBuffer(zipFileBuffer, this.csgoPath);
        const fileListPath = resolve(this.csgoAddonsPath, `${pluginName}.txt`);
        writeFileSync(fileListPath, fileList, { encoding: "utf-8" });
    }

    deleteAddon(pluginName: string) {
        const fileListPath = resolve(this.csgoAddonsPath, `${pluginName}.txt`);
        if (existsSync(fileListPath)) {
            const fileList = readFileSync(fileListPath, { encoding: "utf-8" });
            rmByFileList(this.csgoPath, fileList);
            unlinkSync(fileListPath);
        }
    }

    listAddons() {
        return readdirSync(this.csgoAddonsPath).map((fileName) => {
            return fileName.replace(/\.txt$/, "");
        });
    }

    writeFile(file: string, data: string) {
        writeFileSync(resolve(this.csgoPath, file), data, {
            encoding: "utf-8"
        });
    }

    readFile(file: string) {
        return readFileSync(resolve(this.csgoPath, file), {
            encoding: "utf-8"
        });
    }

    start(options?: CSGODSOptions) {
        if (!this.instance && this.state.status === CSGODS_STATUS_READY) {
            this.setState({ status: CSGODS_STATUS_GOING_ONLINE });
            const launchOptions = this.makeLaunchOptions({
                ...this.options,
                ...options
            }).split(" ");
            console.log(
                `Starting server with launch options: ${
                    launchOptions.join(" ")
                }`
            );
            this.instance = spawn(this.executable, launchOptions);
            this.instance.onExit(() => {
                this.instance = undefined;
                this.setState({ status: CSGODS_STATUS_READY });
            });
            this.instance.onData((raw: any) => {
                const data = raw.toString() as string;
                const publicIpMatch = data.match(serverPublicIpRE);
                if (data.match(serverOnRE)) {
                    this.setState({ status: CSGODS_STATUS_ONLINE });
                }
                if (publicIpMatch) {
                    this.publicIpAddress = `${
                        publicIpMatch[1]
                    }:${this.options?.port}`;
                    this.localIpAddress = getLocalIpAddress(this.options?.port);
                }
                this.emit("stdout", data);
            });
        }
    }

    stop(force = false) {
        if (
            this.instance !== undefined
            && (force || this.state.status === CSGODS_STATUS_ONLINE)
        ) {
            this.setState({ status: CSGODS_STATUS_GOING_OFFLINE });
            if (force) {
                this.instance.kill();
            } else {
                this.sendConsoleCommand("exit");
            }
            return true;
        }
        return false;
    }

    async restart() {
        return new Promise(resolve => {
            const listener = ({ status }: typeof this.state) => {
                if (status === CSGODS_STATUS_ONLINE) {
                    this.off("state", listener);
                    resolve(true);
                }
            };
            this.on("state", listener);
            this.stop();
            this.start();
        });
    }

    retrieveStatus() {
        return {
            on: this.state.status === CSGODS_STATUS_ONLINE,
            localIpAddress: this.localIpAddress,
            publicIpAddress: this.publicIpAddress
        };
    }

    sendConsoleCommand(line: string) {
        if (this.instance !== undefined) {
            this.instance.write(`${line}\r\n`);
            return true;
        }
        return false;
    }
}
