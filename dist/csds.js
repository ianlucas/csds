import EventEmitter from "events";
import { SteamCMD } from "./steamcmd.js";
var CSGODSState;
(function (CSGODSState) {
    CSGODSState[CSGODSState["UNINITIALIZED"] = 0] = "UNINITIALIZED";
    CSGODSState[CSGODSState["INITIALIZING_STEAMCMD"] = 1] = "INITIALIZING_STEAMCMD";
    CSGODSState[CSGODSState["UPDATING_CSGODS"] = 2] = "UPDATING_CSGODS";
    CSGODSState[CSGODSState["READY"] = 3] = "READY";
})(CSGODSState || (CSGODSState = {}));
const progressRE = /Update state \((0x\d+)\) (\w+), progress: (\d+.\d+) \((\d+) \/ (\d+)\)$/;
export class CSGODS extends EventEmitter {
    state = CSGODSState.UNINITIALIZED;
    steamCMD;
    steamCMDState = "";
    progress = 0;
    current = 0;
    total = 0;
    constructor(platform = "linux", path) {
        super();
        this.steamCMD = new SteamCMD(platform, path);
    }
    async initializeSteamCMD() {
        this.state = CSGODSState.INITIALIZING_STEAMCMD;
        await this.steamCMD.initialize();
    }
    async updateCSGODS() {
        this.state = CSGODSState.UPDATING_CSGODS;
        await this.steamCMD.run("+login anonymous +app_update 740 +quit", data => {
            data.split("\n").forEach(line => {
                const progressMatches = line.trim().match(progressRE);
                if (progressMatches) {
                    const [, state, status, progress, current, total] = progressMatches;
                    this.steamCMDState = state;
                    this.progress = parseFloat(progress);
                    this.current = parseInt(current);
                    this.total = parseInt(total);
                    this.emit("progress", {
                        state,
                        progress: this.progress,
                        current: this.current,
                        total: this.total
                    });
                }
            });
            this.emit("steamcmd:data", data);
        });
        this.state = CSGODSState.READY;
    }
    async initialize() {
        await this.initializeSteamCMD();
        await this.updateCSGODS();
    }
}
