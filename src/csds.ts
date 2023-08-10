import EventEmitter from "events";
import { SteamCMD } from "./steamcmd.js";

enum CSGODSState {
    UNINITIALIZED,
    INITIALIZING_STEAMCMD,
    UPDATING_CSGODS,
    READY
}

const progressRE =
    /Update state \((0x\d+)\) (\w+), progress: (\d+.\d+) \((\d+) \/ (\d+)\)$/;

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

    private async initializeSteamCMD() {
        this.state = CSGODSState.INITIALIZING_STEAMCMD;
        await this.steamCMD.initialize();
    }

    private async updateCSGODS() {
        this.state = CSGODSState.UPDATING_CSGODS;
        await this.steamCMD.run(
            "+login anonymous +app_update 740 +quit",
            data => {
                data.split("\n").forEach(line => {
                    const progressMatches = line.trim().match(progressRE);
                    if (progressMatches) {
                        const [, state, status, progress, current, total] =
                            progressMatches;
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
            }
        );
        this.state = CSGODSState.READY;
    }

    async initialize() {
        await this.initializeSteamCMD();
        await this.updateCSGODS();
    }
}
