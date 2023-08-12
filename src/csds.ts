import EventEmitter from "events";
import { existsSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { IPty } from "node-pty";
import { join, resolve } from "path";
import { spawn } from "./child-process-utils.js";
import { extractZipFromBuffer } from "./extract-utils.js";
import { mkdirRecursive, rmByFileList } from "./fs-utils.js";
import { getLocalIpAddress } from "./os-utils.js";
import { SteamCMD } from "./steamcmd.js";

const serverPublicIpRE = /Public IP is (\d+\.\d+\.\d+\.\d+)/;
const serverOnRE = /GC Connection established for server/;
const CSGODS_APPID = 740;

export enum CSGODSState {
    UNINITIALIZED = 0,
    INITIALIZING_STEAMCMD,
    UPDATING_CSGODS,
    READY,
    TURNING_ON,
    ON,
    TURNING_OFF
}

export declare interface CSGODS {
    on(
        event: "state",
        listener: (state: CSGODSState) => void
    ): this;
    on(
        event: "progress",
        listener: (progress: {
            state: string;
            status: string;
            progress: number;
            current: number;
            total: number;
        }) => void
    ): this;
    on(
        event: "stdout",
        listener: (data: string) => void
    ): this;
}

interface CSGODSOptions {
    launch: string;
    gsltToken?: string;
    steamApiKey?: string;
    port?: number;
    tvPort?: number;
}

export class CSGODS extends EventEmitter {
    state = CSGODSState.UNINITIALIZED;
    publicIpAddress?: string;
    localIpAddress?: string;
    private steamCMD: SteamCMD;
    private csgoPath: string;
    private csgoAddonsPath: string;
    private csgoDSPath: string;
    private instance?: IPty;
    private executable: string;
    options: CSGODSOptions = {
        port: 27015,
        tvPort: 27020,
        steamApiKey: "",
        gsltToken: "",
        launch:
            "-game csgo -console -usercon +game_type 0 +game_mode 1 +map de_dust2 -tickrate 128 -maxplayers_override 12 -norestart -nobreakpad -nocrashdialog"
    };

    constructor(
        platform: "win32" | "linux" = "linux",
        path: string,
        options?: CSGODSOptions
    ) {
        super();
        this.steamCMD = new SteamCMD(platform, path);
        this.csgoAddonsPath = join(path, ".steamcmd/plugins");
        this.csgoDSPath = join(this.steamCMD.path, "steamcmd");
        this.executable = join(
            this.csgoDSPath,
            platform === "win32" ? "srcds.exe" : "srcds_run"
        );
        this.csgoPath = join(this.csgoDSPath, "csgo");
        this.options = options ? { ...this.options, ...options } : this.options;
        this.localIpAddress = getLocalIpAddress(this.options?.port);
    }

    private setState(state: CSGODSState) {
        this.state = state;
        this.emit("state", this.state);
    }

    private async initializeSteamCMD() {
        this.setState(CSGODSState.INITIALIZING_STEAMCMD);
        await this.steamCMD.initialize();
    }

    async updateCSGODS() {
        this.setState(CSGODSState.UPDATING_CSGODS);
        await this.steamCMD.update(CSGODS_APPID, (progress) => {
            this.emit("progress", progress);
        });
        this.fixCSGODS();
        this.setState(CSGODSState.READY);
    }

    /// @see https://github.com/GameServerManagers/LinuxGSM/blob/master/lgsm/functions/fix_csgo.sh
    private fixCSGODS() {
        const libgccPath = join(this.csgoDSPath, "libgcc_s.so.1");
        if (existsSync(libgccPath)) {
            renameSync(libgccPath, `${libgccPath}.bak`);
        }
    }

    async initialize() {
        await this.initializeSteamCMD();
        if (!existsSync(this.csgoAddonsPath)) {
            mkdirRecursive(this.csgoAddonsPath);
        }
        await this.updateCSGODS();
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

    write(file: string, data: string) {
        writeFileSync(resolve(this.csgoPath, file), data, {
            encoding: "utf-8"
        });
    }

    read(file: string) {
        return readFileSync(resolve(this.csgoPath, file), {
            encoding: "utf-8"
        });
    }

    isOn() {
        return this.instance !== undefined;
    }

    start() {
        if (this.instance === undefined && this.state === CSGODSState.READY) {
            this.setState(CSGODSState.TURNING_ON);
            let { launch, steamApiKey, gsltToken, port, tvPort } = this.options;
            if (steamApiKey) {
                launch += ` -authkey ${steamApiKey}`;
            }
            if (gsltToken) {
                launch += ` +sv_setsteamaccount ${gsltToken} -net_port_try 1`;
            }
            if (port) {
                launch += ` -port ${port}`;
            }
            if (tvPort) {
                launch += ` +tv_port ${tvPort}`;
            }
            console.log(`Starting server with launch options: ${launch}`);
            this.instance = spawn(
                this.executable,
                this.options.launch.split(" ")
            );
            this.instance.onExit(() => {
                this.instance = undefined;
                this.setState(CSGODSState.READY);
            });
            this.instance.onData((raw: any) => {
                const data = raw.toString() as string;
                const publicIpMatch = data.match(serverPublicIpRE);
                if (data.match(serverOnRE)) {
                    this.setState(CSGODSState.ON);
                }
                if (publicIpMatch) {
                    this.publicIpAddress = `${publicIpMatch[1]}:${port}`;
                }
                this.emit("stdout", data);
            });
        }
    }

    stop(force = false) {
        if (
            this.instance !== undefined
            && (force || this.state === CSGODSState.ON)
        ) {
            this.setState(CSGODSState.TURNING_OFF);
            if (force) {
                this.instance.kill();
            } else {
                this.console("exit");
            }
            return true;
        }
        return false;
    }

    async restart() {
        return new Promise(resolve => {
            const listener = (state: CSGODSState) => {
                if (state === CSGODSState.ON) {
                    this.off("state", listener);
                    resolve(true);
                }
            };
            this.on("state", listener);
            this.stop();
            this.start();
        });
    }

    status() {
        return {
            on: this.state === CSGODSState.ON,
            localIpAddress: this.localIpAddress,
            publicIpAddress: this.publicIpAddress
        };
    }

    console(line: string) {
        if (this.instance !== undefined) {
            this.instance.write(`${line}\n`);
            return true;
        }
        return false;
    }
}
