/// <reference types="node" />
/// <reference types="node" />
import EventEmitter from "events";
export declare enum CSGODSState {
    UNINITIALIZED = 0,
    INITIALIZING_STEAMCMD = 1,
    UPDATING_CSGODS = 2,
    READY = 3,
    TURNING_ON = 4,
    ON = 5,
    TURNING_OFF = 6
}
export declare class CSGODS extends EventEmitter {
    state: CSGODSState;
    private steamCMD;
    private csgoPath;
    private csgoAddonsPath;
    private csgoServerPath;
    private csgoServer;
    options: {
        launch: string;
    };
    constructor(platform: "win32" | "linux" | undefined, path: string, options?: {
        launch: string;
    });
    private setState;
    private initializeSteamCMD;
    updateCSGODS(): Promise<void>;
    initialize(): Promise<void>;
    installAddon(pluginName: string, zipFileBuffer: Buffer): void;
    deleteAddon(pluginName: string): void;
    listAddons(): string[];
    write(file: string, data: string): void;
    read(file: string): string;
    isOn(): boolean;
    start(): void;
    stop(force?: boolean): void;
    console(line: string): void;
}
