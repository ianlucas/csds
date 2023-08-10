import { ChildProcessWithoutNullStreams } from "child_process";
import EventEmitter from "events";
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { spawn } from "./child-process-utils.js";
import { extractZipFromBuffer } from "./extract-utils.js";
import { mkdirRecursive, rmByFileList } from "./fs-utils.js";
import { SteamCMD } from "./steamcmd.js";

export enum CSGODSState {
    UNINITIALIZED = 0,
    INITIALIZING_STEAMCMD,
    UPDATING_CSGODS,
    READY,
    TURNING_ON,
    ON,
    TURNING_OFF
}

export class CSGODS extends EventEmitter {
    state = CSGODSState.UNINITIALIZED;
    private steamCMD: SteamCMD;
    private csgoPath: string;
    private csgoAddonsPath: string;
    private csgoServerPath: string;
    private csgoServer: ChildProcessWithoutNullStreams | null = null;
    options = {
        launch:
            "-game csgo -console -usercon +game_type 0 +game_mode 1 +mapgroup mg_active +map de_dust2 -tickrate 128 -maxplayers_override 16 -norestart -nobreakpad -nocrashdialog -nohltv -net_port_try -ip"
    };

    constructor(
        platform: "win32" | "linux" = "linux",
        path: string,
        options?: { launch: string; }
    ) {
        super();
        this.steamCMD = new SteamCMD(platform, path);
        this.csgoAddonsPath = join(path, ".steamcmd/plugins");
        this.csgoServerPath = join(
            this.steamCMD.path,
            "steamcmd/steamapps/common/Counter-Strike Global Offensive"
        );
        this.csgoPath = join(this.csgoServerPath, "csgo");
        if (options) {
            this.options = options;
        }
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
        await this.steamCMD.update(740, (progress) => {
            this.emit("progress", progress);
        });
        this.setState(CSGODSState.READY);
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
        return this.csgoServer !== null;
    }

    start() {
        if (this.csgoServer === null && this.state === CSGODSState.READY) {
            this.setState(CSGODSState.TURNING_ON);
            this.csgoServer = spawn(
                join(this.csgoServerPath, "srcds_run"),
                this.options.launch.split(" ")
            );
            // @TODO: Read stdout to check if server is on.
        }
    }

    stop(force = false) {
        if (
            this.csgoServer !== null && (force || this.state === CSGODSState.ON)
        ) {
            this.setState(CSGODSState.TURNING_OFF);
            this.csgoServer.on("exit", () => {
                this.csgoServer = null;
                this.setState(CSGODSState.READY);
            });
            this.csgoServer.kill();
        }
    }

    console(line: string) {
        if (this.csgoServer !== null) {
            this.csgoServer.stdin.write(`${line}\n`);
        }
    }
}
