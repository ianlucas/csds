import EventEmitter from "events";
import { SteamCMD } from "./steamcmd.js";

export enum CSGODSState {
    UNINITIALIZED,
    INITIALIZING_STEAMCMD,
    UPDATING_CSGODS,
    READY
}

export class CSGODS extends EventEmitter {
    state = CSGODSState.UNINITIALIZED;
    steamCMD: SteamCMD;
    steamCMDState: string = "";
    progress: number = 0;
    current: number = 0;
    total: number = 0;

    constructor(platform: "win32" | "linux" = "linux", path: string) {
        super();
        this.steamCMD = new SteamCMD(platform, path);
    }

    private setState(state: CSGODSState) {
        this.state = state;
        this.emit("state", this.state);
    }

    private async initializeSteamCMD() {
        this.setState(CSGODSState.INITIALIZING_STEAMCMD);
        await this.steamCMD.initialize();
    }

    private async updateCSGODS() {
        this.setState(CSGODSState.UPDATING_CSGODS);
        await this.steamCMD.update(740, (progress) => {
            this.emit("progress", progress);
        });
        this.setState(CSGODSState.READY);
    }

    async initialize() {
        await this.initializeSteamCMD();
        await this.updateCSGODS();
    }
}
