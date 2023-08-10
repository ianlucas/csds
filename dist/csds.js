import EventEmitter from "events";
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { spawn } from "./child-process-utils.js";
import { extractZipFromBuffer } from "./extract-utils.js";
import { mkdirRecursive, rmByFileList } from "./fs-utils.js";
import { SteamCMD } from "./steamcmd.js";
export var CSGODSState;
(function (CSGODSState) {
    CSGODSState[CSGODSState["UNINITIALIZED"] = 0] = "UNINITIALIZED";
    CSGODSState[CSGODSState["INITIALIZING_STEAMCMD"] = 1] = "INITIALIZING_STEAMCMD";
    CSGODSState[CSGODSState["UPDATING_CSGODS"] = 2] = "UPDATING_CSGODS";
    CSGODSState[CSGODSState["READY"] = 3] = "READY";
    CSGODSState[CSGODSState["TURNING_ON"] = 4] = "TURNING_ON";
    CSGODSState[CSGODSState["ON"] = 5] = "ON";
    CSGODSState[CSGODSState["TURNING_OFF"] = 6] = "TURNING_OFF";
})(CSGODSState || (CSGODSState = {}));
export class CSGODS extends EventEmitter {
    state = CSGODSState.UNINITIALIZED;
    steamCMD;
    csgoPath;
    csgoAddonsPath;
    csgoServerPath;
    csgoServer = null;
    options = {
        launch: "-game csgo -console -usercon +game_type 0 +game_mode 1 +mapgroup mg_active +map de_dust2 -tickrate 128 -maxplayers_override 16 -norestart -nobreakpad -nocrashdialog -nohltv -net_port_try -ip"
    };
    constructor(platform = "linux", path, options) {
        super();
        this.steamCMD = new SteamCMD(platform, path);
        this.csgoAddonsPath = join(path, ".steamcmd/plugins");
        this.csgoServerPath = join(this.steamCMD.path, "steamcmd/steamapps/common/Counter-Strike Global Offensive");
        this.csgoPath = join(this.csgoServerPath, "csgo");
        if (options) {
            this.options = options;
        }
    }
    setState(state) {
        this.state = state;
        this.emit("state", this.state);
    }
    async initializeSteamCMD() {
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
    installAddon(pluginName, zipFileBuffer) {
        const fileList = extractZipFromBuffer(zipFileBuffer, this.csgoPath);
        const fileListPath = resolve(this.csgoAddonsPath, `${pluginName}.txt`);
        writeFileSync(fileListPath, fileList, { encoding: "utf-8" });
    }
    deleteAddon(pluginName) {
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
    write(file, data) {
        writeFileSync(resolve(this.csgoPath, file), data, {
            encoding: "utf-8"
        });
    }
    read(file) {
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
            this.csgoServer = spawn(join(this.csgoServerPath, "srcds_run"), this.options.launch.split(" "));
            // @TODO: Read stdout to check if server is on.
        }
    }
    stop(force = false) {
        if (this.csgoServer !== null && (force || this.state === CSGODSState.ON)) {
            this.setState(CSGODSState.TURNING_OFF);
            this.csgoServer.on("exit", () => {
                this.csgoServer = null;
                this.setState(CSGODSState.READY);
            });
            this.csgoServer.kill();
        }
    }
    console(line) {
        if (this.csgoServer !== null) {
            this.csgoServer.stdin.write(`${line}\n`);
        }
    }
}
