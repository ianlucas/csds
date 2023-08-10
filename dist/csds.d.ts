/// <reference types="node" />
import EventEmitter from "events";
import { SteamCMD } from "./steamcmd.js";
declare enum CSGODSState {
    UNINITIALIZED = 0,
    INITIALIZING_STEAMCMD = 1,
    UPDATING_CSGODS = 2,
    READY = 3
}
export declare class CSGODS extends EventEmitter {
    state: CSGODSState;
    steamCMD: SteamCMD;
    steamCMDState: string;
    progress: number;
    current: number;
    total: number;
    constructor(platform: "win32" | "linux" | undefined, path: string);
    private initializeSteamCMD;
    private updateCSGODS;
    initialize(): Promise<void>;
}
export {};
